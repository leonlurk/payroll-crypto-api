const QRCode = require('qrcode');
const { TronWeb } = require('tronweb'); // Nota: Así se importa correctamente TronWeb
const Web3 = require('web3').default;
const User = require('../models/userModel'); // Ajustar la ruta si es necesario
const crypto = require('crypto');
const TempPayment = require('../models/tempPaymentModel'); // Ajustar la ruta según tu estructura

// Inicializar TronWeb y Web3 usando las variables de entorno
const tronWeb = new TronWeb({
    fullHost: process.env.TRON_FULL_HOST,
    privateKey: process.env.TRON_PRIVATE_KEY
});

const web3Bsc = new Web3(new Web3.providers.HttpProvider(process.env.BSC_URL));

// Función para generar una billetera temporal
exports.generateWallet = async (req, res) => {
    try {
        const userId = req.user; // El middleware `protect` debe establecer el ID del usuario en `req.user`

        // Verificar si el usuario existe
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ msg: 'Usuario no encontrado' });
        }

        // Generar billeteras para TRON y BSC
        const tronWallet = await tronWeb.createAccount(); // Lógica original de TronWeb
        const bscWallet = web3Bsc.eth.accounts.create();

        // Generar códigos QR para las billeteras
        const tronQR = await QRCode.toDataURL(tronWallet.address.base58);
        const bscQR = await QRCode.toDataURL(bscWallet.address);

        // Guardar las billeteras en la base de datos del usuario
        user.tronWallet = tronWallet.address.base58;
        user.bscWallet = bscWallet.address;
        await user.save();

        // Responder con las billeteras generadas
        res.json({
            msg: 'Billeteras temporales generadas y asociadas al usuario',
            tron: {
                address: tronWallet.address.base58,
                privateKey: tronWallet.privateKey,
                qrCode: tronQR
            },
            bsc: {
                address: bscWallet.address,
                privateKey: bscWallet.privateKey,
                qrCode: bscQR
            }
        });
    } catch (error) {
        console.error('Error al generar billetera temporal:', error);
        res.status(500).json({ msg: 'Error al generar billetera temporal' });
    }
};

// Función para transferir fondos
exports.transferFunds = async (req, res) => {
    const { tronWallet, bscWallet } = req.body;

    try {
        const userId = req.user; // ID del usuario autenticado
        const user = await User.findById(userId);

        if (!user || !user.mainWallet) {
            return res.status(400).json({ msg: 'No se ha configurado una billetera principal para este usuario' });
        }

        const mainWalletAddress = user.mainWallet;

        // Obtener saldos
        const tronBalance = await tronWeb.trx.getBalance(tronWallet.address);
        const bscBalance = await web3Bsc.eth.getBalance(bscWallet.address);

        // Transferencia TRON
        if (tronBalance > 0) {
            const transaction = await tronWeb.transactionBuilder.sendTrx(
                mainWalletAddress, tronBalance, tronWallet.address
            );
            const signedTransaction = await tronWeb.trx.sign(transaction, tronWallet.privateKey);
            await tronWeb.trx.sendRawTransaction(signedTransaction);
        }

        // Transferencia BSC
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
        console.error("Error al transferir fondos:", error);
        res.status(500).json({ msg: "Error al transferir fondos" });
    }
};

// Endpoint para generar una URL temporal
exports.generatePaymentPage = async (req, res) => {
    const { amount, currency, network } = req.body;

    try {
        const userId = req.user;
        console.log("Unique ID recibido en backend:", uniqueId);
        const user = await User.findById(userId);
        console.log("Resultado de búsqueda en MongoDB:", payment);
        if (!user || !user.mainWallet) {
               console.log("Resultado de búsqueda en MongoDB:", payment);

            return res.status(400).json({ msg: 'No se ha configurado una billetera principal para este usuario' });
        }

        const uniqueId = crypto.randomBytes(16).toString('hex');

        // Crear el payload del QR con los datos del pago
        const qrPayload = {
            amount,
            currency,
            network,
            address: user.mainWallet.address,
        };

        // Generar el QR como Data URL
        const qrCode = await QRCode.toDataURL(JSON.stringify(qrPayload));

        // Crear el documento temporal en la base de datos
        const tempPayment = new TempPayment({
            uniqueId,
            paymentData: {
                amount,
                currency,
                network,
                mainWallet: user.mainWallet.address,
                userName: user.name,
                qrCode, // Agregar el QR al documento
            }
        });

        await tempPayment.save();

        // Generar la URL
        const url = `${process.env.FRONTEND_BASE_URL}/payment/${uniqueId}`;
        res.json({ url });
    } catch (error) {
        console.error('Error al generar la página de pago:', error);
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
        console.error('Error al obtener los datos del pago:', error);
        res.status(500).json({ msg: 'Error al obtener los datos del pago' });
    }
};
