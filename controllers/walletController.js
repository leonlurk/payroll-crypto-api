const QRCode = require('qrcode');
const { TronWeb } = require('tronweb');
const Web3 = require('web3').default;
const User = require('../models/userModel');
const crypto = require('crypto');
const TempPayment = require('../models/tempPaymentModel');
const path = require("path");

// Placeholder: Load necessary config like confirmations needed
const BSC_CONFIRMATIONS = parseInt(process.env.BSC_CONFIRMATIONS || '15', 10);
const TRON_CONFIRMATIONS = parseInt(process.env.TRON_CONFIRMATIONS || '20', 10);
const PAYMENT_TTL_MINUTES = parseInt(process.env.PAYMENT_TTL_MINUTES || '15', 10);

// Inicializar TronWeb y Web3 usando las variables de entorno
const tronWeb = new TronWeb({
    fullHost: process.env.TRON_FULL_HOST,
    privateKey: process.env.TRON_PRIVATE_KEY
});

const web3Bsc = new Web3(new Web3.providers.HttpProvider(process.env.BSC_URL));

// Determinar la URL del frontend basada en el entorno
const BASE_URL = 'https://payroll-crypto-api.onrender.com';
console.log("✅ BASE_URL configurada para producción:", BASE_URL);

// Función para generar una billetera temporal
exports.generateWallet = async (req, res) => {
    try {
        const userId = req.user;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ msg: 'Usuario no encontrado' });
        }

        const tronWallet = await tronWeb.createAccount();
        const bscWallet = web3Bsc.eth.accounts.create();

        const tronQR = await QRCode.toDataURL(tronWallet.address.base58);
        const bscQR = await QRCode.toDataURL(bscWallet.address);

        user.tronWallet = tronWallet.address.base58;
        user.bscWallet = bscWallet.address;
        await user.save();

        res.json({
            msg: 'Billeteras temporales generadas y asociadas al usuario',
            tron: { address: tronWallet.address.base58, qrCode: tronQR },
            bsc: { address: bscWallet.address, qrCode: bscQR }
        });
    } catch (error) {
        console.error('❌ Error al generar billetera temporal:', error);
        res.status(500).json({ msg: 'Error al generar billetera temporal' });
    }
};

// Función para transferir fondos
exports.transferFunds = async (req, res) => {
    const { tronWallet, bscWallet } = req.body;

    try {
        const userId = req.user;
        const user = await User.findById(userId);
        if (!user || !user.mainWallet) {
            return res.status(400).json({ msg: 'No se ha configurado una billetera principal para este usuario' });
        }

        const mainWalletAddress = user.mainWallet;
        const tronBalance = await tronWeb.trx.getBalance(tronWallet.address);
        const bscBalance = await web3Bsc.eth.getBalance(bscWallet.address);

        if (tronBalance > 0) {
            const transaction = await tronWeb.transactionBuilder.sendTrx(mainWalletAddress, tronBalance, tronWallet.address);
            const signedTransaction = await tronWeb.trx.sign(transaction, tronWallet.privateKey);
            await tronWeb.trx.sendRawTransaction(signedTransaction);
        }

        if (bscBalance > 0) {
            const signedTransaction = await web3Bsc.eth.accounts.signTransaction({
                to: mainWalletAddress,
                value: bscBalance,
                gas: 21000,
                gasPrice: await web3Bsc.eth.getGasPrice()
            }, bscWallet.privateKey);
            await web3Bsc.eth.sendSignedTransaction(signedTransaction.rawTransaction);
        }

        res.json({ msg: "Fondos transferidos exitosamente a la billetera principal" });
    } catch (error) {
        console.error("❌ Error al transferir fondos:", error);
        res.status(500).json({ msg: "Error al transferir fondos" });
    }
};

// Endpoint para generar una URL de pago temporal
exports.generatePaymentPage = async (req, res) => {
    console.log("📌 Generando URL de pago...");
    const BASE_URL = process.env.BASE_URL || 'https://payroll-crypto-api.onrender.com'; // Use BASE_URL consistently

    const { amount, currency, network } = req.body;

    // Basic validation
    if (!amount || !currency || !network) {
        return res.status(400).json({ msg: 'Amount, currency, and network are required.' });
    }
    if (network !== 'Tron' && network !== 'BSC') {
        return res.status(400).json({ msg: 'Invalid network specified. Use Tron or BSC.' });
    }

    try {
        const userId = req.user;
        const uniqueId = crypto.randomBytes(16).toString('hex');
        const expiresAt = new Date(Date.now() + PAYMENT_TTL_MINUTES * 60 * 1000); // Set expiration time

        const user = await User.findById(userId);
        if (!user || !user.mainWallet || !user.mainWallet.address) {
            console.log("⚠️ Usuario no encontrado o billetera principal no configurada para:", userId);
            return res.status(400).json({ msg: 'User not found or main wallet not configured for this user' });
        }

        const qrCode = await QRCode.toDataURL(user.mainWallet.address);

        const tempPayment = new TempPayment({
            uniqueId,
            paymentData: {
                amount,
                currency,
                network,
                mainWallet: user.mainWallet,
                userName: user.name,
                qrCode,
            },
            status: 'pending', // Initial status
            expiresAt: expiresAt // Set expiration
        });

        await tempPayment.save();

        const url = `${BASE_URL}/payment/${uniqueId}`;
        console.log("✅ URL de pago generada correctamente:", url);

        res.status(201).json({ url, uniqueId, expiresAt }); // Return uniqueId and expiry too
    } catch (error) {
        console.error('❌ Error al generar la página de pago:', error);
        res.status(500).json({ msg: 'Error generating payment page' }); // Corrected error message
    }
};

// Endpoint para obtener los datos del pago desde un uniqueId (Used by the payment page)
exports.getPaymentData = async (req, res) => {
    const { uniqueId } = req.params;

    try {
        const payment = await TempPayment.findOne({ uniqueId });

        if (!payment) {
            return res.status(404).json({ msg: 'No se encontró la información del pago o ha expirado' });
        }

        res.json(payment.paymentData);
    } catch (error) {
        console.error('❌ Error al obtener los datos del pago:', error);
        res.status(500).json({ msg: 'Error al obtener los datos del pago' });
    }
};

// Endpoint para que el sistema/usuario consulte el estado de un pago
exports.getPaymentStatusByUniqueId = async (req, res) => {
    const { uniqueId } = req.params;
    console.log(`🔎 Checking status for payment uniqueId: ${uniqueId}`);

    try {
        const payment = await TempPayment.findOne({ uniqueId }, 'status uniqueId expiresAt transactionHash receivedAmount paymentData.amount paymentData.currency paymentData.network createdAt lastCheckedAt'); // Select specific fields

        if (!payment) {
            return res.status(404).json({ msg: 'Payment request not found' });
        }

        res.json({
            uniqueId: payment.uniqueId,
            status: payment.status,
            network: payment.paymentData.network,
            expectedAmount: payment.paymentData.amount,
            currency: payment.paymentData.currency,
            receivedAmount: payment.receivedAmount,
            transactionHash: payment.transactionHash,
            createdAt: payment.createdAt,
            expiresAt: payment.expiresAt,
            lastCheckedAt: payment.lastCheckedAt
        });

    } catch (error) {
        console.error(`❌ Error fetching status for payment ${uniqueId}:`, error);
        res.status(500).json({ msg: 'Error fetching payment status' });
    }
};

// --- Placeholder Functions for Monitoring Logic --- 
// These would ideally live in a separate service/utility file 
// and be called by the cron job.

async function checkBscPayment(payment) {
    console.log(`[Monitor] Checking BSC payment: ${payment.uniqueId} for address ${payment.paymentData.mainWallet.address}`);
    // TODO: Implement actual BSC blockchain query logic
    // 1. Use web3Bsc or BSCScan API to find transactions to payment.paymentData.mainWallet.address
    //    - Filter by transactions after payment.createdAt and before payment.expiresAt
    //    - If checking tokens (e.g., USDT), filter by the correct token contract address and Transfer event signature.
    //    - Consider fetching transactions in a time window around payment creation.
    // 2. Find a matching transaction (correct amount, currency/token)
    // 3. Check confirmations: Get transaction block number and current block number.
    //    If (currentBlock - txBlock) >= BSC_CONFIRMATIONS, then isConfirmed = true.
    // 4. Handle decimals correctly when comparing amounts.

    // --- Placeholder Response ---
    // Replace this with actual results based on blockchain data
    // Example: return { hash: '0xabc...', receivedAmount: '10000000', blockNumber: 123456, isConfirmed: true };
    // Or return null if no confirmed, matching transaction found yet.
    return null; 
}

async function checkTronPayment(payment) {
    console.log(`[Monitor] Checking Tron payment: ${payment.uniqueId} for address ${payment.paymentData.mainWallet.address}`);
    // TODO: Implement actual Tron blockchain query logic
    // 1. Use tronWeb or TronGrid API to find transactions to payment.paymentData.mainWallet.address (use base58 format)
    //    - Filter by timestamp (greater than payment.createdAt.getTime() / 1000)
    //    - Handle native TRX (check transaction type/value) vs. TRC20 tokens (check triggerSmartContract events for Transfer(address,address,uint256))
    //    - Filter by the correct TRC20 token contract address if applicable.
    // 2. Find a matching transaction (correct amount, currency/token)
    // 3. Check confirmations: TronGrid API often provides confirmation status directly, or compare block numbers if needed.
    //    Ensure block is confirmed (e.g., `confirmed: true` in TronGrid response) and check if solid block is sufficiently ahead if needed.
    // 4. Handle decimals correctly (TRX=6, USDT TRC20 usually=6).

    // --- Placeholder Response ---
    // Replace this with actual results based on blockchain data
    // Example: return { hash: 'abcdef123...', receivedAmount: '10000000', blockNumber: 456789, isConfirmed: true };
    // Or return null if no confirmed, matching transaction found yet.
    return null;
}

function determineFinalStatus(expectedAmount, receivedAmountStr) {
    if (receivedAmountStr === null || receivedAmountStr === undefined) return 'pending'; // Should not happen if called after finding tx
    
    // TODO: IMPORTANT! Implement robust comparison considering decimals for different currencies/tokens.
    // This is a simplified example assuming direct numeric comparison is possible after conversion.
    // You NEED to fetch expected decimals based on payment.paymentData.currency and payment.paymentData.network
    const received = parseFloat(receivedAmountStr); // UNSAFE - Need proper BigNumber handling
    const expected = parseFloat(expectedAmount);

    // Add a small tolerance for potential floating point issues if necessary, or better use BigNumber library
    const tolerance = 0.000001; 

    if (Math.abs(received - expected) < tolerance) {
        return 'completed';
    } else if (received < expected) {
        return 'underpaid';
    } else {
        return 'overpaid';
    }
}

// Add the new/modified functions to exports if they aren't already included
// Make sure generateWallet and transferFunds are still exported if needed
module.exports = {
    generateWallet: exports.generateWallet,
    transferFunds: exports.transferFunds,
    generatePaymentPage: exports.generatePaymentPage,
    getPaymentData: exports.getPaymentData,
    getPaymentStatusByUniqueId: exports.getPaymentStatusByUniqueId,
    // Note: The check/determine functions are not exported as they are intended for internal use by the monitor service
};
