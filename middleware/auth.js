const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

module.exports = async function (req, res, next) {
    // Obtener el token desde el encabezado
    const token = req.header('x-auth-token');

    // 📌 Verificar si el token no existe
    if (!token) {
        return res.status(401).json({ msg: 'No hay token, autorización denegada' });
    }

    try {
        // 📌 Verificar y decodificar el token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.userId; // Asignar el `userId` al objeto `req`

        // 📌 Verificar si el usuario aún existe en la base de datos
        const user = await User.findById(req.user);
        if (!user) {
            return res.status(401).json({ msg: 'Usuario no encontrado, acceso denegado' });
        }

        next(); // Continuar con la siguiente función en la ruta
    } catch (error) {
        console.error('❌ Error en la autenticación:', error.message);
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ msg: '⚠️ Token expirado, por favor inicia sesión nuevamente' });
        }

        res.status(401).json({ msg: 'Token no válido' });
    }
};
