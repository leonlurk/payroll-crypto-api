/**
 * Script de prueba para el endpoint de MT5 Account Created Email
 * Ejecutar con: node test-mt5-account-email.js
 * 
 * Puedes probar con:
 * - node test-mt5-account-email.js DEMO
 * - node test-mt5-account-email.js REAL
 */

const axios = require('axios');

// Configuración
const API_URL = process.env.API_URL || 'http://localhost:3000';
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';
const ACCOUNT_TYPE = process.argv[2] || 'DEMO'; // Tomar tipo de cuenta del argumento o usar DEMO por defecto

// Datos de prueba según el tipo de cuenta
const testData = {
    DEMO: {
        to: {
            email: TEST_EMAIL,
            name: 'Usuario de Prueba'
        },
        accountData: {
            accountType: 'DEMO',
            accountName: 'Mi Cuenta Demo',
            accountNumber: '12345678',
            leverage: '1:100',
            balance: 10000,
            currency: 'USD',
            server: 'AGM-Demo-Server'
        },
        credentials: {
            login: '12345678',
            password: 'Demo@Pass123!',
            investorPassword: 'DemoInv@456#'
        }
    },
    REAL: {
        to: {
            email: TEST_EMAIL,
            name: 'Cliente Real'
        },
        accountData: {
            accountType: 'REAL',
            accountName: 'Cuenta Principal',
            accountNumber: '87654321',
            leverage: '1:50',
            balance: 0,
            currency: 'USD',
            server: 'AGM-Live-Server'
        },
        credentials: {
            login: '87654321',
            password: 'Real@Secure789!',
            investorPassword: 'RealInv@321#'
        }
    }
};

// Pruebas con caracteres especiales
const specialCharTest = {
    to: {
        email: TEST_EMAIL,
        name: 'José María O\'Brien & Co.'
    },
    accountData: {
        accountType: 'DEMO',
        accountName: 'Cuenta "Especial" <Test>',
        accountNumber: '99999999',
        leverage: '1:200',
        balance: 50000,
        currency: 'EUR',
        server: 'AGM-Test-Server'
    },
    credentials: {
        login: '99999999',
        password: 'P@ss<>word&123',
        investorPassword: 'Inv#$%^&*()123'
    }
};

async function testMT5AccountEmail(accountType = 'DEMO') {
    console.log('================================================');
    console.log('🧪 Prueba de Endpoint MT5 Account Created Email');
    console.log('================================================\n');
    
    const data = testData[accountType] || testData.DEMO;
    
    console.log('📧 Email destinatario:', data.to.email);
    console.log('👤 Nombre:', data.to.name);
    console.log('💼 Tipo de cuenta:', data.accountData.accountType);
    console.log('📊 Número de cuenta:', data.accountData.accountNumber);
    console.log('💰 Balance inicial:', data.accountData.balance, data.accountData.currency);
    console.log('🔧 Apalancamiento:', data.accountData.leverage);
    console.log('🖥️ Servidor:', data.accountData.server);
    console.log('🌐 URL del API:', API_URL);
    console.log('\n------------------------------------------------\n');

    try {
        console.log('📤 Enviando solicitud al endpoint...');
        
        const response = await axios.post(`${API_URL}/api/email/mt5-account-created`, data, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ Respuesta exitosa:', response.data);
        
        if (response.data.success) {
            console.log('\n🎉 ¡Email enviado correctamente!');
            console.log('📬 Revisa la bandeja de entrada de:', data.to.email);
            console.log('📋 Message ID:', response.data.messageId);
            
            if (accountType === 'DEMO') {
                console.log('📨 Asunto: ✨ Tu Cuenta Demo MT5 está Lista - Alpha Global Market');
            } else {
                console.log('📨 Asunto: 🎯 Tu Cuenta Real MT5 está Lista - Alpha Global Market');
            }
        }

    } catch (error) {
        console.error('\n❌ Error al enviar email:');
        
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', error.response.data);
            
            // Mostrar errores de validación específicos
            if (error.response.data.message) {
                console.error('   Mensaje:', error.response.data.message);
            }
        } else if (error.request) {
            console.error('   No se recibió respuesta del servidor');
            console.error('   Verifica que el servidor esté corriendo en:', API_URL);
        } else {
            console.error('   Error:', error.message);
        }
    }

    console.log('\n================================================\n');
}

// Función para probar con caracteres especiales
async function testSpecialCharacters() {
    console.log('\n🔤 Probando con caracteres especiales...\n');
    
    try {
        const response = await axios.post(`${API_URL}/api/email/mt5-account-created`, specialCharTest, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Prueba con caracteres especiales exitosa');
        console.log('   Los caracteres especiales fueron sanitizados correctamente');
    } catch (error) {
        console.error('❌ Error en prueba con caracteres especiales:', error.response?.data || error.message);
    }
}

// Función para probar validaciones
async function testValidations() {
    console.log('\n🔍 Probando validaciones...\n');
    
    const invalidTests = [
        {
            name: 'Sin email',
            data: { accountData: testData.DEMO.accountData, credentials: testData.DEMO.credentials },
            expectedError: 'Email del destinatario es requerido'
        },
        {
            name: 'Email inválido',
            data: { 
                to: { email: 'not-an-email', name: 'Test' },
                accountData: testData.DEMO.accountData,
                credentials: testData.DEMO.credentials
            },
            expectedError: 'Formato de email inválido'
        },
        {
            name: 'Sin credenciales',
            data: { 
                to: testData.DEMO.to,
                accountData: testData.DEMO.accountData
            },
            expectedError: 'Credenciales completas son requeridas'
        },
        {
            name: 'Tipo de cuenta inválido',
            data: {
                to: testData.DEMO.to,
                accountData: { ...testData.DEMO.accountData, accountType: 'INVALID' },
                credentials: testData.DEMO.credentials
            },
            expectedError: 'Tipo de cuenta debe ser DEMO o REAL'
        }
    ];
    
    for (const test of invalidTests) {
        try {
            await axios.post(`${API_URL}/api/email/mt5-account-created`, test.data);
            console.log(`❌ ${test.name}: Debería haber fallado`);
        } catch (error) {
            if (error.response?.data?.message === test.expectedError) {
                console.log(`✅ ${test.name}: Validación correcta`);
            } else {
                console.log(`⚠️ ${test.name}: Error diferente al esperado`);
                console.log(`   Esperado: ${test.expectedError}`);
                console.log(`   Recibido: ${error.response?.data?.message}`);
            }
        }
    }
}

// Ejecutar pruebas
async function runTests() {
    console.log('🚀 Iniciando pruebas del endpoint MT5 Account Created\n');
    
    // Prueba principal con el tipo de cuenta especificado
    await testMT5AccountEmail(ACCOUNT_TYPE);
    
    // Si se pasa el argumento "full", ejecutar todas las pruebas
    if (process.argv[3] === 'full') {
        await testSpecialCharacters();
        await testValidations();
        
        // Probar ambos tipos de cuenta
        if (ACCOUNT_TYPE !== 'REAL') {
            console.log('\n📝 Probando cuenta REAL...');
            await testMT5AccountEmail('REAL');
        }
        if (ACCOUNT_TYPE !== 'DEMO') {
            console.log('\n📝 Probando cuenta DEMO...');
            await testMT5AccountEmail('DEMO');
        }
    }
    
    console.log('\n✨ Pruebas completadas\n');
}

// Ejecutar
runTests();