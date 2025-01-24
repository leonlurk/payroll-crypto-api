const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

module.exports = async function (req, res, next) {
    const token = req.header('x-auth-token');

    if (!token) {
        return res.status(401).json({ msg: 'No hay token, autorización denegada' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);

        // 📌 Verificar que el token realmente pertenezca al usuario
        if (!user || user.token !== token) {
            return res.status(401).json({ msg: 'Token no válido o ha sido revocado' });
        }

        req.user = decoded.userId;
        next();
    } catch (error) {
        res.status(401).json({ msg: 'Error en la autenticación: token inválido' });
    }
};
