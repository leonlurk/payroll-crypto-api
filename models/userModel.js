// Importar mongoose
const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    type: String, // Ej: "generate_wallet", "transfer_funds"
    details: String,
    amount: Number,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Definir el esquema de usuario
const walletSchema = new mongoose.Schema({
    tronAddress: String,
    tronPrivateKey: {
        encrypted: String,
        iv: String,
        authTag: String
    },
    bscAddress: String,
    bscPrivateKey: {
        encrypted: String,
        iv: String,
        authTag: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
    },
    wallets: [walletSchema], // Array de billeteras asociadas al usuario
    createdAt: {
        type: Date,
        default: Date.now
    },
    transactions: [transactionSchema]
});

// Crear el modelo de usuario
const User = mongoose.model('User', userSchema);

// Exportar el modelo de usuario
module.exports = User;
