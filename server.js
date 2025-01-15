// Importar librerías
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const userRoutes = require('./routes/userRoutes');
const walletRoutes = require('./routes/walletRoutes');

// Inicializar aplicación Express
const app = express();

// Configuración de CORS
app.use(cors({ origin: 'http://localhost:3001' }));

// Middleware para parsear JSON
app.use(express.json());

// Redirigir cualquier solicitud que no sea API al frontend
app.get('/payment/:uniqueId', (req, res) => {
    res.redirect(`http://localhost:3001/payment/${req.params.uniqueId}`);
});

// Conexión a la base de datos MongoDB
mongoose.connect(process.env.MONGO_URI)
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
