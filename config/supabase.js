const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Verificar que las variables de entorno existan
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error('❌ Faltan las variables de Supabase en .env');
    console.error('Necesitas agregar:');
    console.error('SUPABASE_URL=tu-url-de-supabase');
    console.error('SUPABASE_SERVICE_KEY=tu-service-role-key');
    process.exit(1);
}

// Crear cliente de Supabase con Service Role Key (para el backend)
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

module.exports = supabase;