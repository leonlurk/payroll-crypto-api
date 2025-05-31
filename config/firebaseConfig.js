// config/firebaseConfig.js
const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require('../serviceAccountKey.json');

// Inicializar Firebase Admin con la cuenta de servicio
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://ape-prop.firebaseio.com"
});

// Configuración del proyecto Firebase
const firebaseConfig = {
  projectId: "ape-prop",
  apiKey: "AIzaSyCNX9ICSG9bdJhb6nMPnyuNhbewE_smf_4",
  authDomain: "ape-prop.firebaseapp.com",
  storageBucket: "ape-prop.firebasestorage.app",
  messagingSenderId: "914963337229",
  appId: "1:914963337229:web:cbfb2b1fd203c842070544",
  measurementId: "G-CP394V00F8"
};

// Exportar las instancias de Firebase
const db = admin.firestore();
const auth = admin.auth();
const storage = admin.storage();

module.exports = {
  admin,
  db,
  auth,
  storage,
  firebaseConfig
}; 