require('dotenv').config();
const supabase = require('./config/supabase');

async function checkToken() {
    const token = 'be84d544-3ef3-4507-9a09-35303645201b';
    const userId = '65904ab4-a5df-410c-8a35-0705303443b7';
    
    console.log('Buscando token:', token);
    console.log('Para usuario ID:', userId);
    
    try {
        // Buscar por token
        console.log('\n1. Buscando por token...');
        const { data: byToken, error: tokenError } = await supabase
            .from('profiles')
            .select('id, email, verification_token, email_verified')
            .eq('verification_token', token);
            
        if (tokenError) {
            console.error('Error buscando por token:', tokenError);
        } else {
            console.log('Resultados por token:', byToken);
        }
        
        // Buscar por user ID
        console.log('\n2. Buscando por user ID...');
        const { data: byId, error: idError } = await supabase
            .from('profiles')
            .select('id, email, verification_token, email_verified, verification_sent_at')
            .eq('id', userId)
            .single();
            
        if (idError) {
            console.error('Error buscando por ID:', idError);
        } else {
            console.log('Perfil del usuario:', byId);
        }
        
        // Buscar por email
        console.log('\n3. Buscando por email...');
        const { data: byEmail, error: emailError } = await supabase
            .from('profiles')
            .select('id, email, verification_token, email_verified')
            .eq('email', 'escalzocamila@gmail.com');
            
        if (emailError) {
            console.error('Error buscando por email:', emailError);
        } else {
            console.log('Resultados por email:', byEmail);
        }
        
    } catch (error) {
        console.error('Error general:', error);
    }
}

checkToken();