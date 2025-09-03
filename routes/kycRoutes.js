const express = require('express');
const router = express.Router();
const kycController = require('../controllers/kycController');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');

// User routes (require authentication)
router.get('/status', authMiddleware, kycController.getUserKYCStatus);

// Admin routes (require authentication and admin role)
router.get('/submissions', authMiddleware, adminMiddleware, kycController.getAllKYCSubmissions);
router.get('/submissions/:id', authMiddleware, adminMiddleware, kycController.getKYCSubmission);
router.post('/submissions/:id/approve', authMiddleware, adminMiddleware, kycController.approveKYC);
router.post('/submissions/:id/reject', authMiddleware, adminMiddleware, kycController.rejectKYC);

module.exports = router;