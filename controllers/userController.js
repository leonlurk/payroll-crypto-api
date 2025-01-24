const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

// ✅ Función para registrar un nuevo usuario
const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Verificar si el usuario ya existe
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ msg: 'El usuario ya está registrado' });
        }

        // Hashear la contraseña antes de guardarla
        const hashedPassword = await bcrypt.hash(password, 10);

        // Crear un nuevo usuario
        user = new User({
            name,
            email,
            password: hashedPassword
        });

        // 🔥 Generamos un token único SOLO una vez y lo guardamos en la base de datos
        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);
        user.token = token;
        await user.save();

        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            token: user.token  // 🔥 Devolvemos el token único generado
        });
    } catch (error) {
        console.error('❌ Error en registerUser:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
};

// ✅ Función para obtener detalles del usuario
const getUserDetails = async (req, res) => {
    try {
        const user = await User.findById(req.user).select('-password');
        if (!user) {
            return res.status(404).json({ msg: 'Usuario no encontrado' });
        }
        res.json(user);
    } catch (error) {
        console.error('❌ Error en getUserDetails:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
};

// ✅ Función para actualizar la billetera principal
const updateMainWallet = async (req, res) => {
    try {
        const { userId } = req.params;
        const { address, name } = req.body;

        console.log(`🔄 Intentando actualizar billetera principal para usuario: ${userId}`);
        console.log(`📌 Datos recibidos - Address: ${address}, Name: ${name}`);

        // Validar que los datos sean correctos
        if (!address || !name) {
            return res.status(400).json({ error: "❌ Dirección y nombre de la billetera son requeridos" });
        }

        // Buscar usuario y actualizar su mainWallet
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ msg: '⚠️ Usuario no encontrado' });
        }

        user.mainWallet = { address, name };
        await user.save();  // Guardar en MongoDB

        console.log(`✅ Billetera actualizada correctamente: ${JSON.stringify(user.mainWallet)}`);

        res.json({ msg: 'Billetera principal actualizada correctamente', user });
    } catch (error) {
        console.error('❌ Error al actualizar la billetera principal:', error.message);
        res.status(500).json({ msg: 'Error en el servidor' });
    }
};

// ✅ Función para iniciar sesión (devuelve siempre el mismo token)
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Verificar si el usuario existe
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ msg: 'Credenciales inválidas' });
        }

        // Comparar la contraseña ingresada con la almacenada
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Credenciales inválidas' });
        }

        // 🔥 Devolvemos siempre el mismo token almacenado en la base de datos
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            token: user.token  // 🔥 Token único y permanente
        });
    } catch (error) {
        console.error('❌ Error en loginUser:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};

// ✅ Exportar todas las funciones correctamente
module.exports = {
    registerUser,
    loginUser,
    getUserDetails,
    updateMainWallet
};
