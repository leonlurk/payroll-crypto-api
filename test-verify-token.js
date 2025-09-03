require('dotenv').config();
const supabase = require('./config/supabase');

const testToken = 'ee389e44-5d3d-4b79-849a-b1d2897cb94f';

async function testVerifyToken() {
    try {
        console.log('Testing token verification...');
        console.log('Token:', testToken);
        
        // Buscar el token en la tabla profiles
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('user_id, email, email_verified, verification_token, verification_sent_at')
            .eq('verification_token', testToken)
            .single();
            
        if (profileError) {
            console.error('Error fetching profile:', profileError);
            
            // Si es error de columna no encontrada, intentar ver qué columnas existen
            if (profileError.message.includes('column')) {
                console.log('\nVerificando columnas de la tabla profiles...');
                const { data: testData, error: testError } = await supabase
                    .from('profiles')
                    .select('*')
                    .limit(1);
                    
                if (testData && testData.length > 0) {
                    console.log('Columnas disponibles:', Object.keys(testData[0]));
                }
            }
            return;
        }
        
        if (!profile) {
            console.log('Token no encontrado en la base de datos');
            
            // Buscar cualquier usuario con token
            const { data: anyProfile, error: anyError } = await supabase
                .from('profiles')
                .select('user_id, email, verification_token')
                .not('verification_token', 'is', null)
                .limit(5);
                
            if (anyProfile && anyProfile.length > 0) {
                console.log('\nUsuarios con tokens de verificación:');
                anyProfile.forEach(p => {
                    console.log(`- Email: ${p.email}, Token: ${p.verification_token}`);
                });
            } else {
                console.log('No hay usuarios con tokens de verificación');
            }
            return;
        }
        
        console.log('Perfil encontrado:', profile);
    } catch (error) {
        console.error('Error:', error);
    }
}

testVerifyToken();