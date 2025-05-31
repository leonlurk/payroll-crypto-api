const cron = require('node-cron');
const axios = require('axios');
const { parseUnits, formatUnits } = require('ethers');
const BigNumber = require('bignumber.js');
const TempPayment = require('../models/tempPaymentModel');
const mongoose = require('mongoose');
const blockchainConfig = require('../config/blockchainConfig');
const { TronWeb } = require('tronweb');
const ethers = require('ethers');

// Remove console logs for ethers.utils as it doesn't exist

// <-- Initialize TronWeb -->
// Ensure TRON_FULL_HOST is in your .env for this service too
const tronWeb = new TronWeb({
    fullHost: process.env.TRON_FULL_HOST || 'https://api.shasta.trongrid.io',
    // privateKey is not needed for reading transactions
});

// IMPORTANT: Import or define the actual check functions
// Since they are complex and require blockchain interaction details (API keys, node URLs, specific contract addresses)
// we will use placeholders defined conceptually in walletController.js
// In a real app, these might be in their own blockchainService.js file

// Placeholder: Assume these functions exist and perform blockchain checks
// They should return { hash, receivedAmount, blockNumber, isConfirmed } or null
async function checkBscPayment(payment) {
    const networkConfig = blockchainConfig.networks.BSC;
    const recipientAddress = payment.paymentData.mainWallet.address;
    const currency = payment.paymentData.currency;
    const tokenInfo = blockchainConfig.getTokenInfo('BSC', currency);

    if (!tokenInfo) {
        console.error(`[Monitor-BSC] Unsupported currency ${currency} for payment ${payment.uniqueId}`);
        return null;
    }

    const expectedAmountWeiStr = parseUnits(payment.paymentData.amount.toString(), tokenInfo.decimals).toString();
    const expectedAmountBig = new BigNumber(expectedAmountWeiStr);

    let apiParams = {
        module: 'account',
        address: recipientAddress,
        starttimestamp: Math.floor(payment.createdAt.getTime() / 1000), // BSCScan uses seconds timestamp
        endtimestamp: Math.floor(payment.expiresAt.getTime() / 1000) + 300, // Add 5 min buffer
        sort: 'desc', // Get newest first
        apikey: networkConfig.apiKey,
    };
    let isTokenTransfer = (currency !== networkConfig.nativeCurrency);

    if (isTokenTransfer) {
        apiParams.action = 'tokentx';
        apiParams.contractaddress = tokenInfo.contractAddress;
    } else {
        apiParams.action = 'txlist'; // For native BNB
    }

    try {
        console.log(`[Monitor-BSC] Querying ${networkConfig.apiUrl} for ${currency} to ${recipientAddress} for payment ${payment.uniqueId}`);
        const response = await axios.get(networkConfig.apiUrl, { params: apiParams });

        if (response.data.status !== '1' && response.data.message !== 'No transactions found') {
            console.error(`[Monitor-BSC] API Error for ${payment.uniqueId}: ${response.data.message}`);
            return null;
        }
        if (!response.data.result || response.data.result.length === 0) {
            console.log(`[Monitor-BSC] No relevant transactions found yet for ${payment.uniqueId}`);
            return null;
        }

        // Iterate through transactions to find a match
        for (const tx of response.data.result) {
            // Check recipient (case-insensitive comparison for addresses)
            if (!tx.to || tx.to.toLowerCase() !== recipientAddress.toLowerCase()) {
                continue;
            }
            // Check token contract if applicable
            if (isTokenTransfer && (!tx.contractAddress || tx.contractAddress.toLowerCase() !== tokenInfo.contractAddress.toLowerCase())) {
                continue;
            }
            // Check timestamp again just in case API filter wasn't perfect
            const txTimestamp = parseInt(tx.timeStamp, 10);
            if (txTimestamp < Math.floor(payment.createdAt.getTime() / 1000) || txTimestamp > Math.floor(payment.expiresAt.getTime() / 1000) + 300) {
                continue;
            }

            const receivedAmountBig = new BigNumber(tx.value);

            // Check amount match (allow for exact match only for now)
            if (receivedAmountBig.isEqualTo(expectedAmountBig)) {
                const confirmations = parseInt(tx.confirmations, 10);
                const isConfirmed = confirmations >= networkConfig.confirmations;
                console.log(`[Monitor-BSC] Found potential match for ${payment.uniqueId}: Tx ${tx.hash}, Confirmations: ${confirmations}, Confirmed: ${isConfirmed}`);

                return {
                    hash: tx.hash,
                    receivedAmount: formatUnits(receivedAmountBig.toFixed(), tokenInfo.decimals),
                    blockNumber: parseInt(tx.blockNumber, 10),
                    isConfirmed: isConfirmed
                };
            } else {
                console.log(`[Monitor-BSC] Tx ${tx.hash} for ${payment.uniqueId} amount mismatch. Expected: ${expectedAmountBig.toFixed()}, Received: ${receivedAmountBig.toFixed()}`);
                // TODO: Potentially handle under/overpayments later by storing this tx if confirmed?
            }
        }
        console.log(`[Monitor-BSC] No matching confirmed transaction found yet for ${payment.uniqueId}`);
        return null; // No matching transaction found in the results

    } catch (error) {
        console.error(`[Monitor-BSC] Failed to check BSC payment ${payment.uniqueId}:`, error.message);
        if (error.response) {
             console.error("[Monitor-BSC] API Response Error Data:", error.response.data);
        }
        return null;
    }
}

async function checkTronPayment(payment) {
    // --- Re-initialize TronWeb LOCALLY within the function --- 
    const localTronWeb = new TronWeb({
        fullHost: process.env.TRON_FULL_HOST || 'https://api.shasta.trongrid.io',
        // No private key needed here
    });
    console.log('[checkTronPayment] typeof localTronWeb.address:', typeof localTronWeb?.address); // Debug
    console.log('[checkTronPayment] typeof localTronWeb.address.fromHex:', typeof localTronWeb?.address?.fromHex); // Debug
    // --- End Local Init ---

    const utils = ethers.utils; // Get utils
    const networkConfig = blockchainConfig.networks.Tron;
    const recipientAddress = payment.paymentData.mainWallet.address; // Base58 format
    const currency = payment.paymentData.currency;
    const tokenInfo = blockchainConfig.getTokenInfo('Tron', currency);

    if (!tokenInfo || typeof tokenInfo.decimals === 'undefined') { // More robust check
        console.error(`[Monitor-Tron] Invalid tokenInfo or decimals undefined for currency ${currency}, payment ${payment.uniqueId}. TokenInfo:`, tokenInfo);
        return null;
    }

    let expectedAmountSunBig;
    try {
        // Ensure amount is a string before parsing
        const amountStr = payment.paymentData.amount?.toString(); 
        if (typeof amountStr !== 'string') {
             throw new Error(`Amount is not valid or cannot be converted to string: ${payment.paymentData.amount}`);
        }
        const expectedAmountSunEthers = parseUnits(amountStr, tokenInfo.decimals); // Parse with ethers
        expectedAmountSunBig = new BigNumber(expectedAmountSunEthers.toString()); // Convert to bignumber.js
    } catch (parseError) {
        console.error(`
--- [Monitor-Tron] FATAL ERROR during parseUnits for ${payment.uniqueId} ---`);
        console.error(`[Monitor-Tron] Error Message:`, parseError.message);
        console.error(`[Monitor-Tron] Amount Value: ${payment.paymentData.amount}, Type: ${typeof payment.paymentData.amount}`);
        console.error(`[Monitor-Tron] Decimals Value: ${tokenInfo?.decimals}, Type: ${typeof tokenInfo?.decimals}`);
        console.error(`[Monitor-Tron] Stack Trace:`, parseError.stack);
        console.error(`--- [End FATAL ERROR] ---`);
        // Mark payment as error to prevent retries on this specific issue
        await TempPayment.findByIdAndUpdate(payment._id, { status: 'error', lastCheckedAt: new Date() }); 
        return null; // Stop processing this payment
    }
    
    const minTimestamp = payment.createdAt.getTime(); // TronGrid uses milliseconds
    // Check slightly beyond expiry
    const maxTimestamp = payment.expiresAt.getTime() + (5 * 60 * 1000); 

    let apiUrl = '';
    let isTokenTransfer = (currency !== networkConfig.nativeCurrency);
    let headers = {};
    if (networkConfig.apiKey) {
        headers['TRON-PRO-API-KEY'] = networkConfig.apiKey;
    }

    // Construct API URL and parameters
    if (isTokenTransfer) {
        apiUrl = `${networkConfig.apiUrl}/v1/accounts/${recipientAddress}/transactions/trc20`;
    } else {
        apiUrl = `${networkConfig.apiUrl}/v1/accounts/${recipientAddress}/transactions`; // For native TRX
    }
    const apiParams = {
        limit: 50, // Adjust as needed
        // order_by: 'block_timestamp,desc', // Get newest first (default is usually desc)
        min_block_timestamp: minTimestamp,
        max_block_timestamp: maxTimestamp, // Filter by timestamp
        // only_to: true, // Filter only incoming transactions
    };
    if (isTokenTransfer) {
         apiParams.contract_address = tokenInfo.contractAddress;
         apiParams.only_to = true; // TRC20 endpoint requires this filter direction
    } else {
         apiParams.only_to = true; // Native TRX also filter incoming
    }

    try {
        console.log(`[Monitor-Tron] Querying ${apiUrl} for ${currency} to ${recipientAddress} for payment ${payment.uniqueId}`);
        const response = await axios.get(apiUrl, { params: apiParams, headers: headers });

        if (!response.data.success) {
            console.error(`[Monitor-Tron] API Error for ${payment.uniqueId}: ${response.data.error || 'Unknown error'}`);
            return null;
        }
        if (!response.data.data || response.data.data.length === 0) {
            console.log(`[Monitor-Tron] No relevant transactions found yet for ${payment.uniqueId}`);
            return null;
        }

        // Iterate through transactions
        for (const tx of response.data.data) {
            let txHash, blockNumber, receivedAmountSunBig, txConfirmed, txTimestamp;

            if (isTokenTransfer) {
                // Check TRC20 specifics
                 if (tx.type !== 'Transfer' || tx.to.toLowerCase() !== recipientAddress.toLowerCase() || 
                     !tx.token_info || tx.token_info.address !== tokenInfo.contractAddress) { // Double check recipient and token
                    continue;
                }
                txHash = tx.transaction_id;
                blockNumber = tx.block_timestamp; // TronGrid often uses timestamp as block identifier here
                receivedAmountSunBig = new BigNumber(tx.value);
                txTimestamp = tx.block_timestamp; 
                // TronGrid TRC20 doesn't explicitly give block number or confirmations easily in this endpoint
                // We rely on the query filtering and assume if it's returned, it's likely confirmed (Tron confirms fast)
                // For higher security, you might need another call to get tx info by hash
                 txConfirmed = true; // Assumption - verify if higher security needed

            } else {
                // --- Native TRX Logic with Enhanced Checks ---
                console.log(`[Debug Tron Native] Processing txID: ${tx.txID}`); // Log tx ID
                if (!tx.raw_data || !tx.raw_data.contract || tx.raw_data.contract.length === 0 || tx.raw_data.contract[0].type !== 'TransferContract') {
                    // console.log(`[Debug Tron] Skipping tx ${tx.txID} - Not a TransferContract`);
                    continue;
                }
                // Check if parameter and value exist
                if (!tx.raw_data.contract[0].parameter || !tx.raw_data.contract[0].parameter.value) {
                     console.warn(`[Monitor-Tron] Skipping tx ${tx.txID} - Missing parameter or value for TransferContract.`);
                     continue;
                }
                const contractData = tx.raw_data.contract[0].parameter.value;
                
                // Check if to_address and amount exist
                if (!contractData.to_address || typeof contractData.amount === 'undefined') {
                     console.warn(`[Monitor-Tron] Skipping tx ${tx.txID} - Missing to_address or amount in TransferContract value.`);
                     continue;
                }

                // --- Enhanced Check before fromHex --- 
                let txToAddressBase58;
                try {
                    console.log(`[Debug Tron Native] contractData.to_address: ${contractData.to_address} (Type: ${typeof contractData.to_address})`); // Log the value
                    if (typeof contractData.to_address !== 'string' || !contractData.to_address.startsWith('41')) {
                        throw new Error(`Invalid to_address format: not a string or doesn't start with 41.`);
                    }
                    if (typeof localTronWeb?.address?.fromHex !== 'function') {
                        throw new Error(`localTronWeb.address.fromHex is not a function!`);
                    }
                    txToAddressBase58 = localTronWeb.address.fromHex(contractData.to_address);
                    console.log(`[Debug Tron Native] Converted to_address: ${txToAddressBase58}`); // Log success
                } catch (addrError) {
                    console.warn(`[Monitor-Tron] Skipping tx ${tx.txID} - Error during address conversion: ${addrError.message}`);
                    console.warn(`[Monitor-Tron] problematic to_address: ${contractData?.to_address}`); // Log problematic address
                    continue; // Skip this transaction
                }
                 // --- End Enhanced Check ---

                if (txToAddressBase58 !== recipientAddress) {
                    // console.log(`[Debug Tron] Skipping tx ${tx.txID} - Recipient mismatch (Expected: ${recipientAddress}, Got: ${txToAddressBase58})`);
                    continue; // Ensure recipient matches
                }
                
                // --- Log and Validate Data before Assignment ---
                console.log(`[Debug Tron Native] tx.txID: ${tx.txID}, contractData.amount: ${contractData.amount} (Type: ${typeof contractData.amount})`);
                console.log(`[Debug Tron Native] tx.txID: ${tx.txID}, tx.ret: ${JSON.stringify(tx.ret)}`);
                console.log(`[Debug Tron Native] tx.txID: ${tx.txID}, tx.blockNumber: ${tx.blockNumber}`);

                // Assign basic info
                txHash = tx.txID;
                blockNumber = tx.blockNumber; 
                txTimestamp = tx.block_timestamp;

                // Safely parse amount
                try {
                    if (typeof contractData.amount === 'undefined' || contractData.amount === null) {
                         throw new Error(`Amount is undefined or null.`);
                    }
                    receivedAmountSunBig = new BigNumber(contractData.amount); // Removed || '0' as BigNumber handles valid formats
                    console.log(`[Debug Tron Native] tx.txID: ${tx.txID}, Parsed amount (bignumber.js): ${receivedAmountSunBig.toFixed()}`);
                } catch (bnError) {
                    console.warn(`[Monitor-Tron] Skipping tx ${tx.txID} - Error creating BigNumber from amount: ${bnError.message}`);
                    console.warn(`[Monitor-Tron] problematic amount: ${contractData?.amount}`);
                    continue; // Skip this tx if amount is invalid
                }

                // Determine confirmation
                txConfirmed = tx.ret && tx.ret.length > 0 && tx.ret[0].contractRet === 'SUCCESS' && blockNumber > 0;
                console.log(`[Debug Tron Native] tx.txID: ${tx.txID}, Determined txConfirmed: ${txConfirmed}`);
                // --- End Log and Validate ---
            }
            
            // Check timestamp again
            if (txTimestamp < minTimestamp || txTimestamp > maxTimestamp) {
                 console.log(`[Debug Tron Native] Skipping tx ${tx.txID} - Timestamp out of range`);
                 continue;
            }

            // Check amount match
            if (receivedAmountSunBig.isEqualTo(expectedAmountSunBig)) {
                console.log(`[Monitor-Tron] Found potential match for ${payment.uniqueId}: Tx ${txHash}, Confirmed: ${txConfirmed}`);
                return {
                    hash: txHash,
                    receivedAmount: formatUnits(receivedAmountSunBig.toFixed(), tokenInfo.decimals),
                    blockNumber: blockNumber,
                    isConfirmed: txConfirmed
                };
            } else {
                 console.log(`[Monitor-Tron] Tx ${txHash} for ${payment.uniqueId} amount mismatch. Expected: ${expectedAmountSunBig.toFixed()}, Received: ${receivedAmountSunBig.toFixed()}`);
                 // Handle under/overpayment?
            }
        }
        console.log(`[Monitor-Tron] No matching confirmed transaction found yet for ${payment.uniqueId}`);
        return null;

    } catch (error) {
        console.error(`[Monitor-Tron] Failed to check Tron payment ${payment.uniqueId}:`, error.message);
         if (error.response) {
             console.error("[Monitor-Tron] API Response Error Data:", error.response.data);
        }
        return null;
    }
}

// Placeholder: Amount comparison needs real implementation with BigNumber
function determineFinalStatus(paymentData, receivedAmountStr) {
    if (receivedAmountStr === null || receivedAmountStr === undefined) return 'pending';

    const { network, currency, amount: expectedAmount } = paymentData;
    const tokenInfo = blockchainConfig.getTokenInfo(network, currency);

    if (!tokenInfo) {
        console.error(`[Monitor-Status] Cannot determine final status: Unknown currency ${currency} on network ${network}`);
        return 'error'; // Or handle as appropriate
    }

    try {
        // Use ethers parseUnits to handle decimals correctly initially
        const expectedAmountEthers = parseUnits(expectedAmount.toString(), tokenInfo.decimals);
        const receivedAmountEthers = parseUnits(receivedAmountStr, tokenInfo.decimals);
        // Convert to bignumber.js for comparison
        const expectedAmountBig = new BigNumber(expectedAmountEthers.toString());
        const receivedAmountBig = new BigNumber(receivedAmountEthers.toString());

        console.log(`[Monitor-Status] Comparing amounts (bignumber.js): Expected=${expectedAmountBig.toFixed()}, Received=${receivedAmountBig.toFixed()} (Decimals: ${tokenInfo.decimals})`);

        // --- Use bignumber.js comparison methods --- 
        if (receivedAmountBig.isEqualTo(expectedAmountBig)) {
            return 'completed';
        } else if (receivedAmountBig.isLessThan(expectedAmountBig)) {
            return 'underpaid';
        } else {
            return 'overpaid';
        }
    } catch (error) {
        console.error(`[Monitor-Status] Error comparing amounts for currency ${currency} (Decimals: ${tokenInfo.decimals}):`, error);
        return 'error';
    }
}

// Placeholder: Notification function
async function sendPaymentNotification(payment, status) {
    console.log(`🔔 NOTIFICATION: Payment ${payment.uniqueId} status changed to ${status}. Tx: ${payment.transactionHash || 'N/A'}`);
    // TODO: Implement actual notification logic (email, webhook, etc.)
    // Consider associating payment with user email if needed
}

// Function to process a single payment
async function processPayment(payment) {
    console.log(`[Monitor] Processing payment ${payment.uniqueId} (Status: ${payment.status}, Network: ${payment.paymentData.network})`);
    let transactionFound = null;
    try {
        if (payment.paymentData.network === 'BSC') {
            transactionFound = await checkBscPayment(payment);
        } else if (payment.paymentData.network === 'Tron') {
            transactionFound = await checkTronPayment(payment);
        }

        if (transactionFound && transactionFound.isConfirmed) {
            // Use the detailed paymentData for determineFinalStatus
            const finalStatus = determineFinalStatus(payment.paymentData, transactionFound.receivedAmount);

            await TempPayment.findByIdAndUpdate(payment._id, {
                status: finalStatus,
                transactionHash: transactionFound.hash,
                receivedAmount: transactionFound.receivedAmount, // Store formatted string
                confirmedBlock: transactionFound.blockNumber,
                lastCheckedAt: new Date()
            }, { new: true });

            console.log(`[Monitor] Payment ${payment.uniqueId} status updated to ${finalStatus}`);
            // Pass the updated payment document to notification if needed
            const updatedPayment = await TempPayment.findById(payment._id); 
            await sendPaymentNotification(updatedPayment, finalStatus);

        } else {
            await TempPayment.findByIdAndUpdate(payment._id, { lastCheckedAt: new Date() });
        }

    } catch (error) {
        console.error(`[Monitor] Error processing payment ${payment.uniqueId}:`, error);
        await TempPayment.findByIdAndUpdate(payment._id, { status: 'error', lastCheckedAt: new Date() });
    }
}

// Function to check for expired payments
async function checkExpiredPayments() {
    console.log("[Monitor] Checking for expired payments...");
    try {
        const result = await TempPayment.updateMany(
            { status: 'pending', expiresAt: { $lt: new Date() } },
            { $set: { status: 'expired', lastCheckedAt: new Date() } }
        );
        if (result.modifiedCount > 0) {
            console.log(`[Monitor] Marked ${result.modifiedCount} pending payments as expired.`);
            // Optional: Notify about expired payments if needed
        }
    } catch (error) {
        console.error("[Monitor] Error checking for expired payments:", error);
    }
}

// Define the main cron task
const cronTask = async () => {
    console.log("--- [Monitor] Starting payment check cycle --- ");
    
    // First, mark expired payments
    await checkExpiredPayments();

    // Then, find pending payments to check
    const pendingPayments = await TempPayment.find({
        status: 'pending' // Already filtered out expired ones
    }).limit(100); // Process in batches

    console.log(`[Monitor] Found ${pendingPayments.length} pending payments to check.`);

    // Process payments sequentially for simplicity, or use Promise.allSettled for concurrency
    for (const payment of pendingPayments) {
        await processPayment(payment);
    }

    console.log("--- [Monitor] Finished payment check cycle --- ");
};

// Function to start the monitoring
function startMonitoring() {
    // Schedule the task to run every minute (adjust as needed)
    // Use '*/5 * * * *' for every 5 minutes, etc.
    cron.schedule('* * * * *', cronTask, {
        scheduled: true,
        timezone: "Etc/UTC" // Explicitly set timezone if needed
    });

    console.log("✅ Payment Monitoring Service Started (runs every minute).");

    // Optional: Run once immediately on start?
    // cronTask(); 
}

module.exports = {
    startMonitoring
}; 