// config/blockchainConfig.js
require('dotenv').config(); // Ensure environment variables are loaded

const blockchainConfig = {
    networks: {
        BSC: {
            nativeCurrency: 'BNB',
            confirmations: parseInt(process.env.BSC_CONFIRMATIONS || '15', 10),
            apiUrl: process.env.BSCSCAN_API_URL || 'https://api.bscscan.com/api',
            apiKey: process.env.BSCSCAN_API_KEY,
            tokens: {
                // Add other tokens here, mapping the 'currency' string from paymentData
                'USDT': {
                    contractAddress: process.env.TOKEN_CONTRACT_USDT_BSC, // Loaded from .env
                    decimals: 18 // Standard USDT on BSC usually has 18 decimals (VERIFY THIS!)
                },
                // Example: BUSD
                // 'BUSD': {
                //     contractAddress: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', // Mainnet BUSD example
                //     decimals: 18
                // }
            },
            nativeDecimals: 18 // BNB decimals
        },
        Tron: {
            nativeCurrency: 'TRX',
            confirmations: parseInt(process.env.TRON_CONFIRMATIONS || '20', 10),
            apiUrl: process.env.TRONGRID_API_URL || 'https://api.trongrid.io',
            apiKey: process.env.TRONGRID_API_KEY, // May not be strictly needed for reads
            tokens: {
                'USDT': {
                    contractAddress: process.env.TOKEN_CONTRACT_USDT_TRON, // Loaded from .env
                    decimals: 6 // USDT on Tron usually has 6 decimals (VERIFY THIS!)
                },
                // Add other TRC20 tokens here
            },
            nativeDecimals: 6 // TRX decimals
        }
    },
    paymentTTLMinutes: parseInt(process.env.PAYMENT_TTL_MINUTES || '15', 10),

    // Helper to get token info
    getTokenInfo: function(network, currency) {
        if (!this.networks[network]) return null;
        if (currency === this.networks[network].nativeCurrency) {
            return { decimals: this.networks[network].nativeDecimals, contractAddress: null };
        }
        return this.networks[network].tokens[currency] || null;
    }
};

// Basic validation
if (blockchainConfig.networks.BSC.apiKey === 'YOUR_BSCSCAN_API_KEY_HERE' || !blockchainConfig.networks.BSC.apiKey) {
    console.warn("⚠️ WARNING: BSCSCAN_API_KEY not set in .env. Monitoring BSC might fail or be rate-limited.");
}
if (!blockchainConfig.networks.BSC.tokens['USDT']?.contractAddress) {
     console.warn("⚠️ WARNING: TOKEN_CONTRACT_USDT_BSC not set in .env. Cannot monitor USDT on BSC.");
}
if (!blockchainConfig.networks.Tron.tokens['USDT']?.contractAddress) {
     console.warn("⚠️ WARNING: TOKEN_CONTRACT_USDT_TRON not set in .env. Cannot monitor USDT on Tron.");
}


module.exports = blockchainConfig; 