const QRCode = require('qrcode');
const { TronWeb } = require('tronweb');
const Web3 = require('web3');
const User = require('../models/userModel');

// Inicializar TronWeb y Web3 usando las variables de entorno
const tronWeb = new TronWeb({
    fullHost: process.env.TRON_FULL_HOST,
    privateKey: process.env.TRON_PRIVATE_KEY
});
const web3Bsc = new Web3(process.env.BSC_URL);

// Función para generar una billetera temporal
exports.generateWallet = async (req, res) => {
    try {
        // Generar una billetera TRON
        const tronWallet = await tronWeb.createAccount();
        
        // Generar una billetera BSC
        const bscWallet = web3Bsc.eth.accounts.create();

        // Generar códigos QR para las direcciones de las billeteras
        const tronQR = await QRCode.toDataURL(tronWallet.address.base58);
        const bscQR = await QRCode.toDataURL(bscWallet.address);

        // Obtener el usuario autenticado
        const user = await User.findById(req.user);
        if (!user) {
            return res.status(404).json({ msg: 'Usuario no encontrado' });
        }

        // Añadir las billeteras generadas al usuario
        user.wallets.push({
            tronAddress: tronWallet.address.base58,
            tronPrivateKey: tronWallet.privateKey,
            bscAddress: bscWallet.address,
            bscPrivateKey: bscWallet.privateKey,
            createdAt: new Date()
        });

        // Registrar la transacción de generación de billetera en el historial
        user.transactions.push({
            type: 'generate_wallet',
            details: `Billeteras generadas - TRON: ${tronWallet.address.base58}, BSC: ${bscWallet.address}`,
            amount: 0,  // No aplica monto a la generación de billeteras
            createdAt: new Date()
        });

        // Guardar los cambios en la base de datos
        await user.save();

        // Responder con las billeteras generadas y los códigos QR
        res.json({
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
        res.status(500).send('Error al generar billetera temporal');
    }
};


// Función para verificar el saldo de las billeteras del usuario autenticado
exports.checkBalance = async (req, res) => {
    try {
        // Obtener el usuario autenticado
        const user = await User.findById(req.user);
        if (!user) {
            return res.status(404).json({ msg: 'Usuario no encontrado' });
        }

        // Obtenemos todas las billeteras del usuario
        const walletBalances = [];
        for (const wallet of user.wallets) {
            const tronBalance = await tronWeb.trx.getBalance(wallet.tronAddress);
            const bscBalance = await web3Bsc.eth.getBalance(wallet.bscAddress);

            walletBalances.push({
                tronAddress: wallet.tronAddress,
                tronBalance: tronBalance / 1e6, // Convertir de sun a TRX
                bscAddress: wallet.bscAddress,
                bscBalance: web3Bsc.utils.fromWei(bscBalance, 'ether') // Convertir de wei a BNB
            });
        }

        // Responder con los saldos de las billeteras
        res.json({ wallets: walletBalances });
    } catch (error) {
        console.error('Error al verificar los saldos:', error);
        res.status(500).send('Error al verificar los saldos');
    }
};

exports.transactionHistory = async (req, res) => {
    try {
        const user = await User.findById(req.user);
        if (!user) {
            return res.status(404).json({ msg: 'Usuario no encontrado' });
        }

        res.json({ transactions: user.transactions });
    } catch (error) {
        console.error('Error al obtener el historial de transacciones:', error);
        res.status(500).send('Error en el servidor');
    }
};

// Función para transferir fondos
exports.transferFunds = async (req, res) => {
    const { tronWallet, bscWallet } = req.body;

    try {
        // Transferencia TRON (solo si el saldo es mayor a cero)
        const tronBalance = await tronWeb.trx.getBalance(tronWallet.address);
        if (tronBalance > 0) {
            const transaction = await tronWeb.transactionBuilder.sendTrx(
                process.env.MAIN_TRON_WALLET,
                tronBalance,
                tronWallet.address
            );
            const signedTransaction = await tronWeb.trx.sign(transaction, tronWallet.privateKey);
            await tronWeb.trx.sendRawTransaction(signedTransaction);
        }

        // Transferencia BSC (solo si el saldo es mayor a cero)
        const bscBalance = await web3Bsc.eth.getBalance(bscWallet.address);
        if (bscBalance > 0) {
            const signedTransaction = await web3Bsc.eth.accounts.signTransaction({
                to: process.env.MAIN_BSC_WALLET,
                value: bscBalance,
                gas: 21000,
                gasPrice: await web3Bsc.eth.getGasPrice()
            }, bscWallet.privateKey);
            await web3Bsc.eth.sendSignedTransaction(signedTransaction.rawTransaction);
        }

        res.send('Fondos transferidos exitosamente.');
    } catch (error) {
        console.error('Error al transferir fondos:', error);
        res.status(500).send('Error al transferir fondos');
    }
};
