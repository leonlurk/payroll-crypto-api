const mongoose = require('mongoose');

const tempPaymentSchema = new mongoose.Schema({
    uniqueId: { type: String, required: true, unique: true },
    paymentData: {
        amount: { type: Number, required: true },
        currency: { type: String, required: true },
        network: { type: String, required: true }, // e.g., 'Tron', 'BSC'
        mainWallet: {
            address: { type: String, required: true },
            name: { type: String } // Optional name for the wallet
        },
        userName: { type: String },
        qrCode: { type: String } // QR code as base64 data URI
    },
    // --- New Fields Start ---
    status: {
        type: String,
        enum: ['pending', 'completed', 'expired', 'underpaid', 'overpaid', 'error'],
        default: 'pending',
        required: true
    },
    transactionHash: { type: String, default: null }, // Hash of the fulfilling transaction
    receivedAmount: { type: String, default: null }, // Store as string to handle large numbers/decimals precisely
    confirmedBlock: { type: Number, default: null }, // Block number when confirmed
    expiresAt: { type: Date, required: true }, // Timestamp when the payment request expires
    createdAt: { type: Date, default: Date.now },
    lastCheckedAt: { type: Date, default: null } // Last time the monitor checked this payment
    // --- New Fields End ---
});

// Optional: Index expiresAt and status for faster querying by the monitor
tempPaymentSchema.index({ status: 1, expiresAt: 1 });

module.exports = mongoose.model('TempPayment', tempPaymentSchema);
