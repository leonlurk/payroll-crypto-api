-- Schema SQL para Supabase
-- Ejecutar estos comandos en el SQL Editor de Supabase

-- 1. Tabla para wallets temporales de crypto
CREATE TABLE IF NOT EXISTS crypto_wallets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Direcciones de las wallets
    tron_address TEXT NOT NULL,
    bsc_address TEXT NOT NULL,
    
    -- Claves privadas cifradas
    tron_private_key_encrypted TEXT NOT NULL,
    tron_private_key_iv TEXT NOT NULL,
    tron_private_key_auth_tag TEXT NOT NULL,
    
    bsc_private_key_encrypted TEXT NOT NULL,
    bsc_private_key_iv TEXT NOT NULL,
    bsc_private_key_auth_tag TEXT NOT NULL,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Índices para búsquedas rápidas
    UNIQUE(tron_address),
    UNIQUE(bsc_address)
);

-- 2. Tabla para transacciones de crypto
CREATE TABLE IF NOT EXISTS crypto_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    wallet_id UUID REFERENCES crypto_wallets(id) ON DELETE SET NULL,
    
    -- Información de la transacción
    type VARCHAR(50) NOT NULL, -- 'generate_wallet', 'transfer_funds', 'deposit_detected'
    details TEXT,
    amount DECIMAL(18, 8) DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'USD',
    
    -- Información blockchain
    network VARCHAR(20), -- 'TRON', 'BSC'
    tx_hash TEXT,
    wallet_address TEXT,
    
    -- Estado
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'completed', 'failed'
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a las tablas
CREATE TRIGGER update_crypto_wallets_updated_at
    BEFORE UPDATE ON crypto_wallets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_crypto_transactions_updated_at
    BEFORE UPDATE ON crypto_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- 4. Políticas de Row Level Security (RLS)
ALTER TABLE crypto_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE crypto_transactions ENABLE ROW LEVEL SECURITY;

-- Política para crypto_wallets: usuarios solo pueden ver sus propias wallets
CREATE POLICY "Users can view their own wallets" ON crypto_wallets
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own wallets" ON crypto_wallets
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallets" ON crypto_wallets
    FOR UPDATE USING (auth.uid() = user_id);

-- Política para crypto_transactions: usuarios solo pueden ver sus propias transacciones
CREATE POLICY "Users can view their own transactions" ON crypto_transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions" ON crypto_transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 5. Índices para performance
CREATE INDEX IF NOT EXISTS idx_crypto_wallets_user_id ON crypto_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_crypto_wallets_active ON crypto_wallets(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_crypto_transactions_user_id ON crypto_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_crypto_transactions_wallet_id ON crypto_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_crypto_transactions_status ON crypto_transactions(status);
CREATE INDEX IF NOT EXISTS idx_crypto_transactions_type ON crypto_transactions(type);

-- 6. Función para limpiar wallets antiguas (opcional)
CREATE OR REPLACE FUNCTION cleanup_old_wallets()
RETURNS void AS $$
BEGIN
    -- Marcar como inactivas las wallets más antiguas de 7 días sin transacciones
    UPDATE crypto_wallets 
    SET is_active = false 
    WHERE created_at < NOW() - INTERVAL '7 days'
    AND id NOT IN (
        SELECT DISTINCT wallet_id 
        FROM crypto_transactions 
        WHERE wallet_id IS NOT NULL 
        AND created_at > NOW() - INTERVAL '7 days'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentarios para documentación
COMMENT ON TABLE crypto_wallets IS 'Almacena wallets temporales generadas para depósitos crypto';
COMMENT ON TABLE crypto_transactions IS 'Historial de todas las transacciones relacionadas con crypto';
COMMENT ON COLUMN crypto_wallets.tron_private_key_encrypted IS 'Clave privada TRON cifrada con AES-256-GCM';
COMMENT ON COLUMN crypto_wallets.bsc_private_key_encrypted IS 'Clave privada BSC cifrada con AES-256-GCM';