const { db, admin } = require('../config/firebaseConfig');

/**
 * Guarda información de un pago en Firebase Firestore
 * @param {Object} payment - Objeto de pago completo
 * @returns {Promise<string>} - ID del documento creado
 */
async function savePaymentToFirestore(payment) {
  try {
    // Crear una versión limpia del objeto de pago para Firestore
    const paymentData = {
      uniqueId: payment.uniqueId,
      status: payment.status,
      amount: payment.paymentData.amount,
      currency: payment.paymentData.currency,
      network: payment.paymentData.network,
      recipientAddress: payment.paymentData.mainWallet.address,
      userName: payment.paymentData.userName,
      createdAt: admin.firestore.Timestamp.fromDate(payment.createdAt),
      expiresAt: admin.firestore.Timestamp.fromDate(payment.expiresAt),
      lastUpdated: admin.firestore.Timestamp.now(),
      paymentHash: payment.paymentHash || null,
      userId: payment.userId || null
    };

    // Guardar en la colección 'payments'
    const docRef = await db.collection('payments').doc(payment.uniqueId).set(paymentData);
    console.log(`✅ Pago guardado en Firestore con ID: ${payment.uniqueId}`);
    return payment.uniqueId;
  } catch (error) {
    console.error("❌ Error al guardar pago en Firestore:", error);
    throw error;
  }
}

/**
 * Actualiza el estado de un pago en Firestore
 * @param {string} uniqueId - ID único del pago
 * @param {string} status - Nuevo estado del pago
 * @param {Object} additionalData - Datos adicionales para actualizar
 * @returns {Promise<void>}
 */
async function updatePaymentStatus(uniqueId, status, additionalData = {}) {
  try {
    const updateData = {
      status: status,
      lastUpdated: admin.firestore.Timestamp.now(),
      ...additionalData
    };
    
    await db.collection('payments').doc(uniqueId).update(updateData);
    console.log(`✅ Estado del pago ${uniqueId} actualizado a ${status} en Firestore`);
  } catch (error) {
    console.error(`❌ Error al actualizar estado del pago ${uniqueId} en Firestore:`, error);
    throw error;
  }
}

/**
 * Obtiene un pago de Firestore por su ID único
 * @param {string} uniqueId - ID único del pago
 * @returns {Promise<Object|null>} - Datos del pago o null si no existe
 */
async function getPaymentById(uniqueId) {
  try {
    const docSnapshot = await db.collection('payments').doc(uniqueId).get();
    
    if (!docSnapshot.exists) {
      console.log(`⚠️ Pago ${uniqueId} no encontrado en Firestore`);
      return null;
    }
    
    return docSnapshot.data();
  } catch (error) {
    console.error(`❌ Error al obtener pago ${uniqueId} de Firestore:`, error);
    throw error;
  }
}

module.exports = {
  savePaymentToFirestore,
  updatePaymentStatus,
  getPaymentById
}; 