/**
 * Script de prueba para el endpoint de password reset email
 * Ejecutar con: node test-password-reset-email.js
 */

const axios = require('axios');

// Configuración
const API_URL = process.env.API_URL || 'http://localhost:3000';
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';
const TEST_CODE = Math.floor(100000 + Math.random() * 900000).toString(); // Código de 6 dígitos

async function testPasswordResetEmail() {
    console.log('===========================================');
    console.log('🧪 Prueba de Endpoint Password Reset Email');
    console.log('===========================================\n');
    
    console.log('📧 Email de prueba:', TEST_EMAIL);
    console.log('🔢 Código de reset:', TEST_CODE);
    console.log('🌐 URL del API:', API_URL);
    console.log('\n-------------------------------------------\n');

    try {
        console.log('📤 Enviando solicitud al endpoint...');
        
        const response = await axios.post(`${API_URL}/api/email/password-reset`, {
            email: TEST_EMAIL,
            resetCode: TEST_CODE
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ Respuesta exitosa:', response.data);
        
        if (response.data.success) {
            console.log('\n🎉 ¡Email enviado correctamente!');
            console.log('📬 Revisa la bandeja de entrada de:', TEST_EMAIL);
            console.log('🔐 El código de verificación es:', TEST_CODE);
        }

    } catch (error) {
        console.error('❌ Error al enviar email:');
        
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', error.response.data);
        } else if (error.request) {
            console.error('   No se recibió respuesta del servidor');
            console.error('   Verifica que el servidor esté corriendo en:', API_URL);
        } else {
            console.error('   Error:', error.message);
        }
    }

    console.log('\n===========================================\n');
}

// Ejecutar prueba
testPasswordResetEmail();