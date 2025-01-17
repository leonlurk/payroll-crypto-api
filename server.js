// Importar librerías
require('dotenv').config();
console.log("⚠️ Todas las variables de entorno:", process.env);
const PaymentModel = require('./models/tempPaymentModel'); // Ajusta la ruta si es necesario
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const userRoutes = require('./routes/userRoutes');
const walletRoutes = require('./routes/walletRoutes');

// Detectar entorno (local o producción)
const isProduction = process.env.ENV === 'production';
const FRONTEND_URL = process.env.FRONTEND_BASE_URL || process.env.PROD_FRONTEND_URL || process.env.LOCAL_FRONTEND_URL;

console.log("Variables de entorno cargadas:");
console.log("MONGO_URI:", process.env.MONGO_URI);
console.log("JWT_SECRET:", process.env.JWT_SECRET);
console.log("PORT:", process.env.PORT);
console.log("FRONTEND_URL en uso:", FRONTEND_URL);

// Inicializar aplicación Express
const app = express();

// Configuración de CORS
const allowedOrigins = [
    'http://localhost:3001', // Desarrollo local
    'https://api-payment-site.netlify.app' // Producción
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.error(`Origen no permitido por CORS: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    }
}));

// Middleware para parsear JSON
app.use(express.json());

app.get('/api/wallet/payment-data/:uniqueId', async (req, res) => {
    try {
        const { uniqueId } = req.params;
        console.log("📌 Buscando pago con Unique ID:", uniqueId);

        const payment = await PaymentModel.findOne({ uniqueId });
        if (!payment) {
            return res.status(404).json({ error: "⚠️ Pago no encontrado" });
        }

        res.json(payment); // 🚀 Asegura que siempre devuelve JSON
    } catch (error) {
        console.error("❌ Error en /payment-data:", error);
        res.status(500).json({ error: "Error en el servidor" });
    }
});


// Redirigir cualquier solicitud que no sea API al frontend correcto
app.get('/api/wallet/generate-payment-url/:uniqueId', (req, res) => {
    const { uniqueId } = req.params;
    console.log("📌 Generando URL para Unique ID:", uniqueId);

    // 🔥 Corrige el doble slash con `.replace()`
    const cleanUrl = `${FRONTEND_URL}/payment/${uniqueId}`.replace(/([^:])\/\//g, "$1/");

    console.log("✅ URL corregida (sin doble slash):", cleanUrl);

    res.json({ paymentUrl: cleanUrl });
});



// Conexión a la base de datos MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then(() => console.log('Conectado a la base de datos'))
    .catch((err) => console.error('Error al conectar a la base de datos:', err));

// Definir las rutas de usuario
app.use('/api/users', userRoutes);
app.use('/api/wallet', walletRoutes);

// Ruta de prueba
app.get('/', (req, res) => {
    res.send('¡Bienvenido a la API de Payroll Crypto!');
});

// Definir el puerto
const PORT = process.env.PORT || 3000;

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
