const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

// Función para registrar un nuevo usuario
exports.registerUser = async (req, res) => {
    const { name, email, password } = req.body;

    try {
        // Verificar si el usuario ya existe
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ msg: 'El usuario ya está registrado' });
        }

        // Crear un nuevo usuario
        user = new User({
            name,
            email,
            password: await bcrypt.hash(password, 10) // Hashear la contraseña
        });

        await user.save();

        // Generar un token JWT
        const payload = { userId: user.id };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.json({ token });
    } catch (error) {
        console.error('Error al registrar usuario:', error);
        res.status(500).send('Error en el servidor');
    }
};

exports.getUserDetails = async (req, res) => {
    try {
        const user = await User.findById(req.user).select('-password');
        if (!user) {
            return res.status(404).json({ msg: 'Usuario no encontrado' });
        }
        res.json(user);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error del servidor');
    }
};


// Actualizar la billetera principal
exports.updateMainWallet = async (req, res) => {
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



// Función para iniciar sesión
exports.loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
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

        // Generar un token JWT
        const payload = { userId: user.id };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.json({ token });
    } catch (error) {
        console.error('Error al iniciar sesión:', error);
        res.status(500).send('Error en el servidor');
    }
};
