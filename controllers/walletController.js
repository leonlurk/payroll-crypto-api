const QRCode = require('qrcode');
const { TronWeb } = require('tronweb');
const Web3 = require('web3');
const { CryptoWalletModel, CryptoTransactionModel } = require('../models/supabaseModel');
const logger = require('../utils/logger');
const { validationResult } = require('express-validator');

// Inicializar Web3 para BSC con API key si está disponible
const bscUrl = process.env.BSC_API_KEY 
    ? `https://bsc-dataseed1.ninicoin.io/` // Usar endpoint público más confiable
    : (process.env.BSC_URL || 'https://bsc-dataseed.binance.org/');
const web3Bsc = new Web3(bscUrl);

// Función helper para obtener TronWeb instance
const getTronWeb = () => {
    const config = {
        fullHost: process.env.TRON_FULL_HOST || 'https://api.trongrid.io'
    };
    
    // Agregar headers con API key si está disponible
    if (process.env.TRON_API_KEY) {
        config.headers = { 'TRON-PRO-API-KEY': process.env.TRON_API_KEY };
    }
    
    return new TronWeb(config);
};

// Función helper para obtener TronWeb con private key (para transferencias)
const getTronWebWithKey = (privateKey) => {
    const config = {
        fullHost: process.env.TRON_FULL_HOST || 'https://api.trongrid.io',
        privateKey: privateKey
    };
    
    // Agregar headers con API key si está disponible
    if (process.env.TRON_API_KEY) {
        config.headers = { 'TRON-PRO-API-KEY': process.env.TRON_API_KEY };
    }
    
    return new TronWeb(config);
};

// Función para generar una billetera temporal
exports.generateWallet = async (req, res) => {
    try {
        // Validación de entrada
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false,
                errors: errors.array() 
            });
        }

        const userId = req.user;
        logger.info(`Generating wallet for user: ${userId}`);

        // Generar una billetera TRON
        const tronWeb = getTronWeb();
        const tronWallet = await tronWeb.createAccount();
        
        // Generar una billetera BSC
        const bscWallet = web3Bsc.eth.accounts.create();

        // Generar códigos QR para las direcciones de las billeteras
        const tronQR = await QRCode.toDataURL(tronWallet.address.base58);
        const bscQR = await QRCode.toDataURL(bscWallet.address);

        // Guardar la wallet en Supabase con claves cifradas
        const walletData = {
            user_id: userId,
            tron_address: tronWallet.address.base58,
            tron_private_key: tronWallet.privateKey,
            bsc_address: bscWallet.address,
            bsc_private_key: bscWallet.privateKey
        };

        const savedWallet = await CryptoWalletModel.create(walletData);

        // Registrar la transacción de generación de billetera
        await CryptoTransactionModel.create({
            user_id: userId,
            wallet_id: savedWallet.id,
            type: 'generate_wallet',
            details: `Billeteras generadas - TRON: ${tronWallet.address.base58}, BSC: ${bscWallet.address}`,
            amount: 0,
            status: 'completed'
        });

        logger.info(`Wallets generated successfully for user: ${userId}`);

        // Responder con las billeteras generadas y los códigos QR (sin claves privadas)
        res.json({
            success: true,
            wallets: {
                tron: {
                    address: tronWallet.address.base58,
                    qrCode: tronQR
                },
                bsc: {
                    address: bscWallet.address,
                    qrCode: bscQR
                }
            },
            wallet_id: savedWallet.id,
            message: 'Billeteras generadas exitosamente. Las claves privadas están seguras en el servidor.'
        });
    } catch (error) {
        logger.error('Error generating wallet:', error);
        res.status(500).json({ 
            success: false,
            msg: 'Error al generar billetera temporal' 
        });
    }
};

// Función para verificar el saldo de las billeteras del usuario autenticado
exports.checkBalance = async (req, res) => {
    try {
        const userId = req.user;
        logger.info(`Checking balance for user: ${userId}`);

        // Obtener todas las wallets activas del usuario desde Supabase
        const userWallets = await CryptoWalletModel.findByUserId(userId);

        if (!userWallets || userWallets.length === 0) {
            return res.json({ 
                success: true,
                wallets: [],
                message: 'No hay wallets generadas'
            });
        }

        // Verificar saldos en blockchain
        const walletBalances = [];
        const tronWeb = getTronWeb();
        
        for (const wallet of userWallets) {
            try {
                const tronBalance = await tronWeb.trx.getBalance(wallet.tron_address);
                const bscBalance = await web3Bsc.eth.getBalance(wallet.bsc_address);

                walletBalances.push({
                    id: wallet.id,
                    tronAddress: wallet.tron_address,
                    tronBalance: tronBalance / 1e6, // Convertir de sun a TRX
                    bscAddress: wallet.bsc_address,
                    bscBalance: web3Bsc.utils.fromWei(bscBalance, 'ether'), // Convertir de wei a BNB
                    createdAt: wallet.created_at
                });
            } catch (error) {
                logger.error(`Error checking balance for wallet: ${wallet.tron_address}`, error);
                walletBalances.push({
                    id: wallet.id,
                    tronAddress: wallet.tron_address,
                    tronBalance: 'Error',
                    bscAddress: wallet.bsc_address,
                    bscBalance: 'Error',
                    createdAt: wallet.created_at
                });
            }
        }

        res.json({ 
            success: true,
            wallets: walletBalances 
        });
    } catch (error) {
        logger.error('Error checking balances:', error);
        res.status(500).json({ 
            success: false,
            msg: 'Error al verificar los saldos' 
        });
    }
};

// Función para obtener historial de transacciones
exports.transactionHistory = async (req, res) => {
    try {
        const userId = req.user;
        
        // Obtener transacciones desde Supabase
        const transactions = await CryptoTransactionModel.findByUserId(userId);

        res.json({ 
            success: true,
            transactions: transactions 
        });
    } catch (error) {
        logger.error('Error fetching transaction history:', error);
        res.status(500).json({ 
            success: false,
            msg: 'Error en el servidor' 
        });
    }
};

// Función para transferir fondos (ahora con manejo de transacciones mejorado)
exports.transferFunds = async (req, res) => {
    const { walletId } = req.body;

    try {
        const userId = req.user;
        logger.info(`Transfer funds request for user: ${userId}, wallet: ${walletId}`);

        // Validación de entrada
        if (!walletId) {
            return res.status(400).json({ 
                success: false,
                msg: 'ID de billetera requerido' 
            });
        }

        // Obtener wallet con claves privadas descifradas
        const wallet = await CryptoWalletModel.findByIdWithDecryption(walletId);
        
        if (!wallet || wallet.user_id !== userId) {
            return res.status(404).json({ 
                success: false,
                msg: 'Billetera no encontrada o no tienes permisos' 
            });
        }

        let tronTransferred = false;
        let bscTransferred = false;
        let totalTransferred = 0;

        // Transferencia TRON
        try {
            const tronWeb = getTronWeb();
            const tronBalance = await tronWeb.trx.getBalance(wallet.tron_address);
            
            if (tronBalance > 1000000) { // Dejar 1 TRX para fees
                const tronWebWithKey = getTronWebWithKey(wallet.tron_private_key);
                const transaction = await tronWebWithKey.transactionBuilder.sendTrx(
                    process.env.MAIN_TRON_WALLET,
                    tronBalance - 1000000,
                    wallet.tron_address
                );
                const signedTransaction = await tronWebWithKey.trx.sign(transaction, wallet.tron_private_key);
                const result = await tronWebWithKey.trx.sendRawTransaction(signedTransaction);
                
                if (result.result) {
                    tronTransferred = true;
                    totalTransferred += (tronBalance - 1000000) / 1e6;
                    logger.info(`TRON transfer successful: ${(tronBalance - 1000000) / 1e6} TRX`);
                }
            }
        } catch (error) {
            logger.error('TRON transfer error:', error);
        }

        // Transferencia BSC
        try {
            const bscBalance = await web3Bsc.eth.getBalance(wallet.bsc_address);
            const gasPrice = await web3Bsc.eth.getGasPrice();
            const gasLimit = 21000;
            const gasCost = gasPrice * gasLimit;

            if (bscBalance > gasCost) {
                const valueToSend = bscBalance - gasCost;
                const signedTransaction = await web3Bsc.eth.accounts.signTransaction({
                    to: process.env.MAIN_BSC_WALLET,
                    value: valueToSend,
                    gas: gasLimit,
                    gasPrice: gasPrice
                }, wallet.bsc_private_key);
                
                const receipt = await web3Bsc.eth.sendSignedTransaction(signedTransaction.rawTransaction);
                
                if (receipt.status) {
                    bscTransferred = true;
                    totalTransferred += parseFloat(web3Bsc.utils.fromWei(valueToSend, 'ether'));
                    logger.info(`BSC transfer successful: ${web3Bsc.utils.fromWei(valueToSend, 'ether')} BNB`);
                }
            }
        } catch (error) {
            logger.error('BSC transfer error:', error);
        }

        // Registrar la transacción en Supabase
        if (tronTransferred || bscTransferred) {
            await CryptoTransactionModel.create({
                user_id: userId,
                wallet_id: walletId,
                type: 'transfer_funds',
                details: `Fondos transferidos - TRON: ${tronTransferred}, BSC: ${bscTransferred}`,
                amount: totalTransferred,
                status: 'completed'
            });

            // Marcar wallet como inactiva después de transferir
            await CryptoWalletModel.deactivate(walletId);
        }

        res.json({
            success: true,
            message: 'Proceso de transferencia completado',
            transfers: {
                tron: tronTransferred,
                bsc: bscTransferred,
                totalAmount: totalTransferred
            }
        });
    } catch (error) {
        logger.error('Error transferring funds:', error);
        res.status(500).json({ 
            success: false,
            msg: 'Error al transferir fondos' 
        });
    }
};

// Función para webhook de depósito confirmado
exports.confirmDeposit = async (req, res) => {
    const { walletAddress, amount, txHash, network } = req.body;

    try {
        const userId = req.user;
        logger.info(`Deposit confirmation: ${amount} on ${network} to ${walletAddress} for user: ${userId}`);

        // Registrar la confirmación del depósito
        await CryptoTransactionModel.create({
            user_id: userId,
            type: 'deposit_detected',
            details: `Depósito confirmado en ${network}`,
            amount: parseFloat(amount),
            network: network,
            tx_hash: txHash,
            wallet_address: walletAddress,
            status: 'completed'
        });

        res.json({
            success: true,
            message: 'Depósito confirmado',
            data: {
                walletAddress,
                amount,
                txHash,
                network
            }
        });
    } catch (error) {
        logger.error('Error confirming deposit:', error);
        res.status(500).json({ 
            success: false,
            msg: 'Error al confirmar depósito' 
        });
    }
};

// Función para verificar el estado de transacciones y depósitos
exports.checkTransactionStatus = async (req, res) => {
    try {
        const userId = req.user;
        const { tronAddress, bscAddress } = req.query;

        if (!tronAddress && !bscAddress) {
            return res.status(400).json({
                success: false,
                msg: 'Se requiere al menos una dirección (TRON o BSC)'
            });
        }

        logger.info(`Checking transaction status for user: ${userId}, TRON: ${tronAddress}, BSC: ${bscAddress}`);

        // Usar wallets fijas de la empresa para recepción de depósitos
        const FIXED_TRON_WALLET = 'TEaQgjdWECF4fjzgscF6pA5v2GQvPPhBpR';
        const FIXED_BSC_WALLET = '0x38CfeC0B9199d6cA2944df012621F7C60be4b0d9'; // Wallet BSC de la empresa
        
        // Si la dirección solicitada no es una de las wallets fijas, rechazar
        if ((tronAddress && tronAddress !== FIXED_TRON_WALLET) || 
            (bscAddress && bscAddress !== FIXED_BSC_WALLET)) {
            return res.json({
                success: true,
                confirmed: false,
                message: 'Wallet no autorizada para depósitos'
            });
        }

        // Para propósitos de tracking, creamos un wallet ID virtual
        const matchingWallet = {
            id: `fixed_wallet_${userId}`,
            tron_address: FIXED_TRON_WALLET,
            bsc_address: FIXED_BSC_WALLET
        };

        // Verificar balances en blockchain para detectar depósitos
        const tronWeb = getTronWeb();
        let depositDetected = false;
        let transactionData = null;

        try {
            // Verificar balance TRON si se proporcionó la dirección
            if (tronAddress) {
                const tronBalance = await tronWeb.trx.getBalance(tronAddress);
                const tronBalanceInTrx = tronBalance / 1e6;
                
                if (tronBalanceInTrx > 0) {
                    // Buscar transacciones TRON recientes
                    const tronTransactions = await tronWeb.trx.getTransactionsFromAddress(tronAddress, 10);
                    
                    if (tronTransactions && tronTransactions.length > 0) {
                        const recentDeposit = tronTransactions.find(tx => 
                            tx.raw_data.contract[0].parameter.value.to_address === tronWeb.address.toHex(tronAddress)
                        );
                        
                        if (recentDeposit) {
                            depositDetected = true;
                            transactionData = {
                                amount: tronBalanceInTrx,
                                network: 'TRON',
                                wallet_address: tronAddress,
                                tx_hash: recentDeposit.txID,
                                timestamp: new Date(recentDeposit.raw_data.timestamp)
                            };
                        }
                    }
                }
            }

            // Verificar balance BSC si se proporcionó la dirección y no se detectó depósito en TRON
            if (bscAddress && !depositDetected) {
                const bscBalance = await web3Bsc.eth.getBalance(bscAddress);
                const bscBalanceInBnb = parseFloat(web3Bsc.utils.fromWei(bscBalance, 'ether'));
                
                if (bscBalanceInBnb > 0) {
                    // Para BSC, verificamos el balance actual como indicador de depósito
                    depositDetected = true;
                    transactionData = {
                        amount: bscBalanceInBnb,
                        network: 'BSC',
                        wallet_address: bscAddress,
                        tx_hash: null, // Se podría obtener con más análisis de transacciones
                        timestamp: new Date()
                    };
                }
            }

        } catch (blockchainError) {
            logger.error('Error checking blockchain balances:', blockchainError);
        }

        // Si se detectó un depósito, registrarlo en la base de datos
        if (depositDetected && transactionData) {
            // Verificar si ya existe una transacción registrada para evitar duplicados
            const existingTransaction = await CryptoTransactionModel.findByTxHash(transactionData.tx_hash);
            
            if (!existingTransaction) {
                await CryptoTransactionModel.create({
                    user_id: userId,
                    wallet_id: matchingWallet.id,
                    type: 'deposit_detected',
                    details: `Depósito detectado automáticamente en ${transactionData.network}`,
                    amount: transactionData.amount,
                    network: transactionData.network,
                    tx_hash: transactionData.tx_hash,
                    wallet_address: transactionData.wallet_address,
                    status: 'completed'
                });

                logger.info(`New deposit detected and registered: ${transactionData.amount} ${transactionData.network} for user ${userId}`);
            }
        }

        res.json({
            success: true,
            confirmed: depositDetected,
            transaction: transactionData
        });

    } catch (error) {
        logger.error('Error checking transaction status:', error);
        res.status(500).json({
            success: false,
            msg: 'Error al verificar el estado de la transacción'
        });
    }
};