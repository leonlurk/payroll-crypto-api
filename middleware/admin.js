const logger = require('../utils/logger');

// Admin middleware - check if user is admin
module.exports = (req, res, next) => {
    // For now, we'll check if the request has a special admin header
    // In production, you should check the user's role from the database
    const adminKey = req.headers['x-admin-key'];
    
    // You should set this in your .env file
    const ADMIN_KEY = process.env.ADMIN_API_KEY || 'your-secure-admin-key-here';
    
    if (adminKey === ADMIN_KEY) {
        logger.info(`Admin access granted for user ${req.user}`);
        next();
    } else {
        logger.warn(`Unauthorized admin access attempt by user ${req.user}`);
        res.status(403).json({
            success: false,
            message: 'Admin access required'
        });
    }
};