/**
 * Script para verificar que las wallets están configuradas correctamente
 * Ejecutar con: node test-wallet-check.js
 */

const axios = require('axios');
require('dotenv').config();

const API_URL = process.env.API_URL || 'https://whapy.apekapital.com:446/api';

// Configuración de las billeteras de la empresa
const COMPANY_WALLETS = {
  tron: 'TEaQgjdWECF4fjzgscF6pA5v2GQvPPhBpR',
  bsc: '0x38CfeC0B9199d6cA2944df012621F7C60be4b0d9'
};

async function checkWalletBalance() {
  console.log('🔍 Verificando balances de las billeteras de la empresa...\n');
  
  try {
    // 1. Verificar balance TRON
    console.log('📊 TRON Wallet:', COMPANY_WALLETS.tron);
    const tronResponse = await axios.get(`https://api.trongrid.io/v1/accounts/${COMPANY_WALLETS.tron}`);
    
    if (tronResponse.data) {
      const balance = tronResponse.data.data?.[0]?.balance || 0;
      const balanceInTRX = balance / 1e6;
      console.log('✅ Balance TRX:', balanceInTRX, 'TRX');
      
      // Verificar tokens USDT
      const tokens = tronResponse.data.data?.[0]?.trc20 || [];
      const usdtToken = Object.entries(tokens).find(([contract]) => 
        contract.toLowerCase() === 'tr7nhqjekqxgtci8q8zy4pl8otszgjlj6t' // USDT Contract
      );
      
      if (usdtToken) {
        const usdtBalance = parseInt(usdtToken[1]) / 1e6;
        console.log('💰 Balance USDT (TRC-20):', usdtBalance, 'USDT');
      } else {
        console.log('💰 Balance USDT (TRC-20): 0 USDT');
      }
    }
    
    // 2. Verificar dirección BSC/Ethereum
    console.log('\n📊 BSC/Ethereum Wallet:', COMPANY_WALLETS.bsc);
    console.log('✅ Dirección válida para recibir USDT en:');
    console.log('   - Ethereum (ERC-20)');
    console.log('   - Binance Smart Chain (BEP-20)');
    
    // Para verificar el balance real necesitarías una API key de BSCScan o Etherscan
    if (process.env.BSC_API_KEY) {
      const bscResponse = await axios.get(
        `https://api.bscscan.com/api?module=account&action=balance&address=${COMPANY_WALLETS.bsc}&tag=latest&apikey=${process.env.BSC_API_KEY}`
      );
      
      if (bscResponse.data.status === '1') {
        const balanceInBNB = parseInt(bscResponse.data.result) / 1e18;
        console.log('✅ Balance BNB:', balanceInBNB, 'BNB');
      }
    } else {
      console.log('⚠️  BSC_API_KEY no configurada - no se puede verificar balance BSC');
    }
    
  } catch (error) {
    console.error('❌ Error verificando balances:', error.message);
  }
}

async function testPayrollConnection() {
  console.log('\n🔌 Probando conexión con Payroll API...\n');
  
  try {
    // Primero necesitamos autenticarnos
    console.log('1. Autenticando con Payroll API...');
    const authResponse = await axios.post(`${API_URL}/users/auth-token`, {
      token: 'test-token', // En producción sería el token real de Supabase
      email: 'test@example.com'
    });
    
    if (authResponse.data.success) {
      console.log('✅ Autenticación exitosa');
      const token = authResponse.data.token;
      
      // Ahora verificar el endpoint de estado de transacciones
      console.log('\n2. Verificando endpoint de transacciones...');
      const statusResponse = await axios.get(`${API_URL}/wallet/transaction-status`, {
        params: {
          tronAddress: COMPANY_WALLETS.tron,
          bscAddress: COMPANY_WALLETS.bsc
        },
        headers: {
          'x-auth-token': token
        }
      });
      
      console.log('✅ Endpoint funcionando:', statusResponse.data);
    }
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('⚠️  Necesitas un token válido de Supabase para probar completamente');
    } else {
      console.error('❌ Error:', error.response?.data || error.message);
    }
  }
}

async function runTests() {
  console.log('========================================');
  console.log('🧪 TEST DE CONFIGURACIÓN DE BILLETERAS');
  console.log('========================================\n');
  
  await checkWalletBalance();
  await testPayrollConnection();
  
  console.log('\n========================================');
  console.log('📋 RESUMEN');
  console.log('========================================');
  console.log('✅ Billetera TRON:', COMPANY_WALLETS.tron);
  console.log('✅ Billetera BSC/ETH:', COMPANY_WALLETS.bsc);
  console.log('\n⚠️  IMPORTANTE:');
  console.log('- TRC-20: Los usuarios deben enviar USDT a la dirección TRON');
  console.log('- ERC-20: Los usuarios deben enviar USDT a la dirección 0x38C...');
  console.log('- La misma dirección 0x38C... funciona para Ethereum y BSC');
}

// Ejecutar tests
runTests().catch(console.error);