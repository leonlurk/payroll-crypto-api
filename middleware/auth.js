const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
    // Obtener el token desde el encabezado
    const token = req.header('x-auth-token');

    // Verificar si no hay token
    if (!token) {
        return res.status(401).json({ msg: 'No hay token, autorización denegada' });
    }

    // Verificar el token
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.userId;
        next();
    } catch (error) {
        res.status(401).json({ msg: 'Token no válido' });
    }
};
