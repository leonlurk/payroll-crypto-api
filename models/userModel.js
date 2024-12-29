// Importar mongoose
const mongoose = require('mongoose');

// Definir el esquema de usuario
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    tronWallet: { type: String, default: null },
    bscWallet: { type: String, default: null },
    mainWallet: {
      address: { type: String, default: null }, // Dirección de la billetera principal
      name: { type: String, default: 'Principal' }, // Nombre de la billetera principal
    },
  }, { timestamps: true });

// Crear el modelo de usuario
const User = mongoose.model('User', userSchema);

// Exportar el modelo de usuario
module.exports = mongoose.model('User', userSchema);
