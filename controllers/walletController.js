const QRCode = require('qrcode');
const { TronWeb } = require('tronweb');
const Web3 = require('web3').default;
const User = require('../models/userModel');
const crypto = require('crypto');
const TempPayment = require('../models/tempPaymentModel');
const path = require("path");

// Inicializar TronWeb y Web3 usando las variables de entorno
const tronWeb = new TronWeb({
    fullHost: process.env.TRON_FULL_HOST,
    privateKey: process.env.TRON_PRIVATE_KEY
});

const web3Bsc = new Web3(new Web3.providers.HttpProvider(process.env.BSC_URL));

// Determinar la URL del frontend basada en el entorno
const FRONTEND_URL = (process.env.FRONTEND_BASE_URL || 'https://api-payment-site.netlify.app').replace(/\/$/, "");
console.log("✅ FRONTEND_URL en WalletController:", FRONTEND_URL);

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
    console.log("FRONTEND_URL:", FRONTEND_URL);

    const { amount, currency, network } = req.body;

    try {
        const userId = req.user;
        const uniqueId = crypto.randomBytes(16).toString('hex');

        const user = await User.findById(userId);
        if (!user || !user.mainWallet) {
            console.log("⚠️ Usuario no encontrado o billetera principal no configurada:", user);
            return res.status(400).json({ msg: 'No se ha configurado una billetera principal para este usuario' });
        }

        const qrPayload = { amount, currency, network, address: user.mainWallet };
        const qrCode = await QRCode.toDataURL(JSON.stringify(qrPayload));

        const tempPayment = new TempPayment({
            uniqueId,
            paymentData: {
                amount,
                currency,
                network,
                mainWallet: user.mainWallet,
                userName: user.name,
                qrCode,
            }
        });

        await tempPayment.save();

        // 🔥 Usar `path.posix.join()` para evitar `//`
        const url = path.posix.join(FRONTEND_URL, "payment", uniqueId);
        console.log("✅ URL generada correctamente:", url);

        res.json({ url });
    } catch (error) {
        console.error('❌ Error al generar la página de pago:', error);
        res.status(500).json({ msg: 'Error al generar la página de pago' });
    }
};

// Endpoint para obtener los datos del pago desde un uniqueId
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
