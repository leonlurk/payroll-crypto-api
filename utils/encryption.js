const crypto = require('crypto');

const algorithm = 'aes-256-gcm';

class Encryption {
    constructor() {
        const key = process.env.ENCRYPTION_KEY;
        if (!key || key.length !== 32) {
            throw new Error('ENCRYPTION_KEY must be exactly 32 characters in .env');
        }
        this.key = Buffer.from(key);
    }

    encrypt(text) {
        try {
            const iv = crypto.randomBytes(16);
            const cipher = crypto.createCipheriv(algorithm, this.key, iv);
            
            let encrypted = cipher.update(text, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            
            const authTag = cipher.getAuthTag();
            
            return {
                encrypted,
                iv: iv.toString('hex'),
                authTag: authTag.toString('hex')
            };
        } catch (error) {
            console.error('Encryption error:', error);
            throw new Error('Failed to encrypt data');
        }
    }

    decrypt(encryptedData) {
        try {
            const { encrypted, iv, authTag } = encryptedData;
            
            const decipher = crypto.createDecipheriv(
                algorithm, 
                this.key, 
                Buffer.from(iv, 'hex')
            );
            
            decipher.setAuthTag(Buffer.from(authTag, 'hex'));
            
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            
            return decrypted;
        } catch (error) {
            console.error('Decryption error:', error);
            throw new Error('Failed to decrypt data');
        }
    }

    encryptWallet(wallet) {
        return {
            address: wallet.address,
            privateKey: this.encrypt(wallet.privateKey),
            createdAt: wallet.createdAt
        };
    }

    decryptWallet(encryptedWallet) {
        return {
            address: encryptedWallet.address,
            privateKey: this.decrypt(encryptedWallet.privateKey),
            createdAt: encryptedWallet.createdAt
        };
    }
}

module.exports = new Encryption();