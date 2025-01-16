// Importar librerías
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const userRoutes = require('./routes/userRoutes');
const walletRoutes = require('./routes/walletRoutes');

// Verificar variables de entorno cargadas
console.log("Variables de entorno cargadas:");
console.log("MONGO_URI:", process.env.MONGO_URI);
console.log("JWT_SECRET:", process.env.JWT_SECRET);
console.log("PORT:", process.env.PORT);
console.log("FRONTEND_URL:", process.env.FRONTEND_URL);

// Inicializar aplicación Express
const app = express();

// Configuración de CORS
const allowedOrigins = [
    'http://localhost:3001', // Desarrollo local
    'https://api-payment-site.netlify.app' // Nuevo dominio de producción
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

// Redirigir cualquier solicitud que no sea API al frontend
app.get('/payment/:uniqueId', (req, res) => {
    console.log(`Redirigiendo a: https://api-payment-site.netlify.app/payment/${req.params.uniqueId}`);
    res.redirect(`https://api-payment-site.netlify.app/payment/${req.params.uniqueId}`);
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
