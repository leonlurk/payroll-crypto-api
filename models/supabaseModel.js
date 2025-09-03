const supabase = require('../config/supabase');
const encryption = require('../utils/encryption');
const logger = require('../utils/logger');

class CryptoWalletModel {
    /**
     * Crear una nueva wallet en Supabase
     * @param {Object} walletData - Datos de la wallet
     * @param {string} walletData.user_id - ID del usuario
     * @param {string} walletData.tron_address - Dirección TRON
     * @param {string} walletData.tron_private_key - Clave privada TRON (se cifrará)
     * @param {string} walletData.bsc_address - Dirección BSC
     * @param {string} walletData.bsc_private_key - Clave privada BSC (se cifrará)
     */
    static async create(walletData) {
        try {
            // Cifrar las claves privadas
            const encryptedTronKey = encryption.encrypt(walletData.tron_private_key);
            const encryptedBscKey = encryption.encrypt(walletData.bsc_private_key);

            const { data, error } = await supabase
                .from('crypto_wallets')
                .insert([
                    {
                        user_id: walletData.user_id,
                        tron_address: walletData.tron_address,
                        bsc_address: walletData.bsc_address,
                        tron_private_key_encrypted: encryptedTronKey.encrypted,
                        tron_private_key_iv: encryptedTronKey.iv,
                        tron_private_key_auth_tag: encryptedTronKey.authTag,
                        bsc_private_key_encrypted: encryptedBscKey.encrypted,
                        bsc_private_key_iv: encryptedBscKey.iv,
                        bsc_private_key_auth_tag: encryptedBscKey.authTag
                    }
                ])
                .select('*')
                .single();

            if (error) {
                logger.error('Error creating wallet in Supabase:', error);
                throw error;
            }

            logger.info(`Wallet created successfully for user: ${walletData.user_id}`);
            return data;
        } catch (error) {
            logger.error('Error in CryptoWalletModel.create:', error);
            throw error;
        }
    }

    /**
     * Obtener todas las wallets activas de un usuario
     * @param {string} userId - ID del usuario
     */
    static async findByUserId(userId) {
        try {
            const { data, error } = await supabase
                .from('crypto_wallets')
                .select('*')
                .eq('user_id', userId)
                .eq('is_active', true)
                .order('created_at', { ascending: false });

            if (error) {
                logger.error('Error fetching wallets from Supabase:', error);
                throw error;
            }

            return data || [];
        } catch (error) {
            logger.error('Error in CryptoWalletModel.findByUserId:', error);
            throw error;
        }
    }

    /**
     * Obtener una wallet específica y descifrar sus claves privadas
     * @param {string} walletId - ID de la wallet
     */
    static async findByIdWithDecryption(walletId) {
        try {
            const { data, error } = await supabase
                .from('crypto_wallets')
                .select('*')
                .eq('id', walletId)
                .eq('is_active', true)
                .single();

            if (error) {
                logger.error('Error fetching wallet from Supabase:', error);
                throw error;
            }

            if (!data) {
                return null;
            }

            // Descifrar las claves privadas
            const tronPrivateKey = encryption.decrypt({
                encrypted: data.tron_private_key_encrypted,
                iv: data.tron_private_key_iv,
                authTag: data.tron_private_key_auth_tag
            });

            const bscPrivateKey = encryption.decrypt({
                encrypted: data.bsc_private_key_encrypted,
                iv: data.bsc_private_key_iv,
                authTag: data.bsc_private_key_auth_tag
            });

            return {
                ...data,
                tron_private_key: tronPrivateKey,
                bsc_private_key: bscPrivateKey
            };
        } catch (error) {
            logger.error('Error in CryptoWalletModel.findByIdWithDecryption:', error);
            throw error;
        }
    }

    /**
     * Marcar una wallet como inactiva
     * @param {string} walletId - ID de la wallet
     */
    static async deactivate(walletId) {
        try {
            const { data, error } = await supabase
                .from('crypto_wallets')
                .update({ is_active: false })
                .eq('id', walletId)
                .select('*')
                .single();

            if (error) {
                logger.error('Error deactivating wallet in Supabase:', error);
                throw error;
            }

            return data;
        } catch (error) {
            logger.error('Error in CryptoWalletModel.deactivate:', error);
            throw error;
        }
    }
}

class CryptoTransactionModel {
    /**
     * Crear una nueva transacción
     * @param {Object} transactionData - Datos de la transacción
     */
    static async create(transactionData) {
        try {
            const { data, error } = await supabase
                .from('crypto_transactions')
                .insert([transactionData])
                .select('*')
                .single();

            if (error) {
                logger.error('Error creating transaction in Supabase:', error);
                throw error;
            }

            logger.info(`Transaction created successfully: ${data.id}`);
            return data;
        } catch (error) {
            logger.error('Error in CryptoTransactionModel.create:', error);
            throw error;
        }
    }

    /**
     * Obtener todas las transacciones de un usuario
     * @param {string} userId - ID del usuario
     */
    static async findByUserId(userId) {
        try {
            const { data, error } = await supabase
                .from('crypto_transactions')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) {
                logger.error('Error fetching transactions from Supabase:', error);
                throw error;
            }

            return data || [];
        } catch (error) {
            logger.error('Error in CryptoTransactionModel.findByUserId:', error);
            throw error;
        }
    }

    /**
     * Actualizar el estado de una transacción
     * @param {string} transactionId - ID de la transacción
     * @param {string} status - Nuevo estado
     * @param {Object} additionalData - Datos adicionales a actualizar
     */
    static async updateStatus(transactionId, status, additionalData = {}) {
        try {
            const updateData = {
                status,
                ...additionalData
            };

            const { data, error } = await supabase
                .from('crypto_transactions')
                .update(updateData)
                .eq('id', transactionId)
                .select('*')
                .single();

            if (error) {
                logger.error('Error updating transaction in Supabase:', error);
                throw error;
            }

            return data;
        } catch (error) {
            logger.error('Error in CryptoTransactionModel.updateStatus:', error);
            throw error;
        }
    }

    /**
     * Buscar una transacción por hash de transacción
     * @param {string} txHash - Hash de la transacción
     */
    static async findByTxHash(txHash) {
        try {
            if (!txHash) return null;

            const { data, error } = await supabase
                .from('crypto_transactions')
                .select('*')
                .eq('tx_hash', txHash)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
                logger.error('Error fetching transaction by txHash from Supabase:', error);
                throw error;
            }

            return data;
        } catch (error) {
            logger.error('Error in CryptoTransactionModel.findByTxHash:', error);
            throw error;
        }
    }
}

class UserModel {
    // Exponer instancia de supabase para consultas directas
    static supabase = supabase;
    /**
     * Obtener un usuario por email (usando Supabase Auth)
     * @param {string} email - Email del usuario
     */
    static async findByEmail(email) {
        try {
            const { data, error } = await supabase.auth.admin.listUsers();
            
            if (error) {
                logger.error('Error fetching users from Supabase:', error);
                throw error;
            }

            const user = data.users.find(u => u.email === email);
            return user || null;
        } catch (error) {
            logger.error('Error in UserModel.findByEmail:', error);
            throw error;
        }
    }

    /**
     * Crear un usuario en Supabase Auth
     * @param {Object} userData - Datos del usuario
     * @param {string} userData.email - Email del usuario
     * @param {string} userData.password - Contraseña del usuario
     */
    static async create(userData) {
        try {
            const { data, error } = await supabase.auth.admin.createUser({
                email: userData.email,
                password: userData.password,
                email_confirm: true // Auto-confirmar email en desarrollo
            });

            if (error) {
                logger.error('Error creating user in Supabase:', error);
                throw error;
            }

            logger.info(`User created successfully: ${userData.email}`);
            return data.user;
        } catch (error) {
            logger.error('Error in UserModel.create:', error);
            throw error;
        }
    }

    /**
     * Verificar contraseña de usuario (usando Supabase Auth)
     * @param {string} email - Email del usuario
     * @param {string} password - Contraseña a verificar
     */
    static async verifyPassword(email, password) {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) {
                logger.error('Error verifying password in Supabase:', error);
                return false;
            }

            return data.user;
        } catch (error) {
            logger.error('Error in UserModel.verifyPassword:', error);
            return false;
        }
    }

    /**
     * Verificar token de Supabase y obtener usuario
     * @param {string} token - Token de acceso de Supabase
     */
    static async verifySupabaseToken(token) {
        try {
            const { data, error } = await supabase.auth.getUser(token);

            if (error) {
                logger.error('Error verifying token in Supabase:', error);
                return false;
            }

            return data.user;
        } catch (error) {
            logger.error('Error in UserModel.verifySupabaseToken:', error);
            return false;
        }
    }
}

module.exports = {
    CryptoWalletModel,
    CryptoTransactionModel,
    UserModel
};