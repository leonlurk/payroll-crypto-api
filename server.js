// Importar librerías
require('dotenv').config();
console.log("⚠️ Todas las variables de entorno:", process.env);
const PaymentModel = require('./models/tempPaymentModel'); // Ajusta la ruta si es necesario
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const userRoutes = require('./routes/userRoutes');
const walletRoutes = require('./routes/walletRoutes');
const path = require("path");
const paymentMonitor = require('./services/paymentMonitor'); // Import the monitor service
const { db, auth, storage } = require('./config/firebaseConfig'); // Importar Firebase

// Detectar entorno (local o producción)
const isProduction = process.env.ENV === 'production';
console.log("Variables de entorno cargadas:");
console.log("MONGO_URI:", process.env.MONGO_URI);
console.log("JWT_SECRET:", process.env.JWT_SECRET);
console.log("PORT:", process.env.PORT);

// Inicializar aplicación Express
const app = express();

app.use(cors());

// Middleware para parsear JSON
app.use(express.json());

// 🔹 Endpoint para obtener datos de un pago específico
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

// 🔹 Ruta para mostrar la página de pago directamente desde la API
app.get('/payment/:uniqueId', async (req, res) => {
    const { uniqueId } = req.params;

    try {
        // Buscar los datos del pago en la base de datos
        const payment = await PaymentModel.findOne({ uniqueId });

        if (!payment) {
            return res.status(404).send('<h2 style="color: red; text-align: center;">Pago no encontrado o expirado</h2>');
        }

        const { amount, currency, network, userName, qrCode } = payment.paymentData;
        const walletAddress = typeof payment.paymentData.mainWallet === 'string'
            ? payment.paymentData.mainWallet
            : payment.paymentData.mainWallet?.address || "Dirección no configurada";

        
        // Construir la página HTML con los estilos integrados
        const htmlContent = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Pago a ${userName}</title>
            <style>
                /* Fuente de Google */
                @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');

                /* Estilos generales */
                body {
                    margin: 0;
                    padding: 0;
                    font-family: 'Poppins', sans-serif;
                    background: linear-gradient(135deg, #d3f8ff, #f4d4ff);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                }

                .container {
                    text-align: center;
                    background: rgba(0, 0, 0, 0.1);
                    padding: 20px;
                    border-radius: 10px;
                    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
                    width: 100%;
                    max-width: 720px;
                    margin: 20px auto;
                    box-sizing: border-box;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    border: 2px solid #0056b3;
                }

                .details {
                    text-align: left;
                    background: rgba(0, 0, 0, 0.2);
                    padding: 20px;
                    border-radius: 20px;
                    color: white;
                    font-weight: 500;
                    margin-bottom: 20px;
                    width: 100%;
                    box-sizing: border-box;
                }

                .details p {
                    margin: 10px 0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 50px;
                }

                button {
                    margin-top: 20px;
                    background-color: #0056b3;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    font-size: 16px;
                    font-weight: 500;
                    border-radius: 5px;
                    cursor: pointer;
                    transition: background-color 0.3s ease;
                }

                button:hover {
                    background-color: #003f8c;
                }

                .qr-container {
                    margin-top: 20px;
                    text-align: center;
                }

                .qr-container img {
                    max-width: 200px;
                    height: auto;
                    border: 1px solid #ccc;
                    border-radius: 10px;
                }

                @media screen and (max-width: 720px) {
                    .container {
                        max-width: 90%;
                    }
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h2>Pago para ${userName}</h2>
                <div class="details">
                    <p>Monto: <strong>${amount} ${currency}</strong></p>
                    <p>Red: <strong>${network}</strong></p>
                    <p>Dirección de Pago:</p>
                    <input type="text" value="${walletAddress}" id="walletAddress" readonly style="width: 90%; padding: 5px; text-align: center;">
                    <button onclick="copyToClipboard()">Copiar Dirección</button>
                </div>

                <div class="qr-container">
                    <p>Escanea el código QR para pagar:</p>
                    <img src="${qrCode}" alt="Código QR">
                </div>
            </div>

            <script>
                function copyToClipboard() {
                    var copyText = document.getElementById("walletAddress");
                    copyText.select();
                    document.execCommand("copy");
                    alert("Dirección copiada: " + copyText.value);
                }
            </script>
        </body>
        </html>
        `;

        // Enviar el HTML como respuesta
        res.send(htmlContent);

    } catch (error) {
        console.error("❌ Error al generar la página de pago:", error);
        res.status(500).send('<h2 style="color: red; text-align: center;">Error interno del servidor</h2>');
    }
});


// 🔹 Conexión a la base de datos MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('🎉 Conexión a MongoDB establecida con éxito');
    
    // Iniciar el monitor de pagos después de conectar a MongoDB
    paymentMonitor.startMonitoring();

    // 🔹 Iniciar servidor Express
    app.listen(process.env.PORT || 5000, () => {
      console.log(`🚀 API de pago en criptomonedas ejecutándose en el puerto ${process.env.PORT || 5000}`);
      console.log(`📌 Firebase conectada al proyecto: ape-prop`);
    });
  })
  .catch(err => {
    console.error('❌ Error al conectar a MongoDB:', err);
    process.exit(1);
  });

// Ruta para obtener pagos de Firebase
app.get('/api/firebase/payments', async (req, res) => {
  try {
    const { db } = require('./config/firebaseConfig');
    const paymentsSnapshot = await db.collection('payments').get();
    const payments = paymentsSnapshot.docs.map(doc => doc.data());
    
    res.json({ success: true, payments });
  } catch (error) {
    console.error('Error al obtener pagos de Firebase:', error);
    res.status(500).json({ success: false, error: 'Error al obtener pagos' });
  }
});

// Ruta para obtener un pago específico de Firebase
app.get('/api/firebase/payments/:uniqueId', async (req, res) => {
  try {
    const { uniqueId } = req.params;
    const payment = await require('./services/firebaseService').getPaymentById(uniqueId);
    
    if (!payment) {
      return res.status(404).json({ success: false, error: 'Pago no encontrado' });
    }
    
    res.json({ success: true, payment });
  } catch (error) {
    console.error(`Error al obtener pago ${req.params.uniqueId} de Firebase:`, error);
    res.status(500).json({ success: false, error: 'Error al obtener pago' });
  }
});

// 🔹 Definir las rutas de usuario y billetera
app.use('/api/users', userRoutes);
app.use('/api/wallet', walletRoutes);

// 🔹 Ruta de prueba para verificar que el servidor está activo
app.get('/', (req, res) => {
    res.send('🚀 ¡Bienvenido a la API de Payroll Crypto!');
});

console.log("Registrando endpoint /api/health");
app.get('/api/health', (req, res) => {
  console.log("Se recibió una petición GET /api/health");
  res.json({ status: 'ok' });
});
