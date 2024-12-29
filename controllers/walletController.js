const QRCode = require('qrcode');
const { TronWeb } = require('tronweb');
const Web3 = require('web3').default;
const User = require('../models/userModel'); // Cambia la ruta si es necesario

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

        // Generar una billetera TRON
        const tronWallet = await tronWeb.createAccount();

        // Generar una billetera BSC
        const bscWallet = web3Bsc.eth.accounts.create();

        // Generar códigos QR para las direcciones de las billeteras
        const tronQR = await QRCode.toDataURL(tronWallet.address.base58);
        const bscQR = await QRCode.toDataURL(bscWallet.address);

        // Guardar las billeteras generadas en la base de datos
        user.tronWallet = tronWallet.address.base58;
        user.bscWallet = bscWallet.address;
        await user.save();

        // Responder con las billeteras generadas y los códigos QR
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
    const { tronWallet, bscWallet } = req.body; // Datos de las billeteras temporales proporcionados por el cliente

    try {
        // Obtener la billetera principal del usuario
        const userId = req.user.id; // ID del usuario autenticado
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
                mainWalletAddress, // Usar la billetera principal del usuario
                tronBalance,
                tronWallet.address
            );
            const signedTransaction = await tronWeb.trx.sign(transaction, tronWallet.privateKey);
            await tronWeb.trx.sendRawTransaction(signedTransaction);
        }

        // Transferencia BSC
        if (bscBalance > 0) {
            const signedTransaction = await web3Bsc.eth.accounts.signTransaction({
                to: mainWalletAddress, // Usar la billetera principal del usuario
                value: bscBalance,
                gas: 21000,
                gasPrice: await web3Bsc.eth.getGasPrice(),
            }, bscWallet.privateKey);
            await web3Bsc.eth.sendSignedTransaction(signedTransaction.rawTransaction);
        }

        res.json({ msg: "Fondos transferidos exitosamente a la billetera principal" });
    } catch (error) {
        console.error("Error al transferir fondos:", error);
        res.status(500).json({ msg: "Error al transferir fondos" });
    }
};
