const mongoose = require('mongoose');

const tempPaymentSchema = new mongoose.Schema({
    uniqueId: { type: String, required: true, unique: true },
    paymentData: { type: Object, required: true },
    createdAt: { type: Date, default: Date.now, expires: 900 } // Expira en 15 minutos
});

const TempPayment = mongoose.model('TempPayment', tempPaymentSchema);

module.exports = TempPayment;
