// controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const pool = require('../config/db');
require('dotenv').config();

// Rastgele doğrulama kodu oluşturma fonksiyonu
const generateVerificationCode = () => Math.floor(100000 + Math.random() * 900000).toString();

const sendVerificationEmail = async (email, code) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Doğrulama Kodu',
        text: `Doğrulama Kodunuz: ${code}`,
    };

    await transporter.sendMail(mailOptions);
};

// Kayıt fonksiyonu
const registerUser = async (req, res) => {
    const { first_name, last_name, email, phone, password } = req.body;

    try {
        const userCheck = await pool.query('SELECT * FROM users.users WHERE email = $1', [email]);
        if (userCheck.rows.length > 0) {
            return res.status(400).json({ message: 'Bu e-posta zaten kayıtlı.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const verificationCode = generateVerificationCode();

        await pool.query(
            'INSERT INTO users.users (first_name, last_name, email, phone, password, verification_code) VALUES ($1, $2, $3, $4, $5, $6)',
            [first_name, last_name, email, phone, hashedPassword, verificationCode]
        );

        await sendVerificationEmail(email, verificationCode);

        res.status(201).json({ message: 'Kayıt başarılı! E-posta adresinizi doğrulamanız gerekiyor.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Sunucu hatası.' });
    }
};

// Kod doğrulama fonksiyonu
const verifyCode = async (req, res) => {
    const { email, code } = req.body;

    try {
        const user = await pool.query('SELECT * FROM users.users WHERE email = $1', [email]);

        if (user.rows.length === 0) {
            return res.status(400).json({ message: 'Kullanıcı bulunamadı.' });
        }

        if (user.rows[0].verification_code === code) {
            await pool.query('UPDATE users.users SET is_verified = true WHERE email = $1', [email]);
            return res.status(200).json({ message: 'Doğrulama başarılı. Giriş yapabilirsiniz.' });
        } else {
            return res.status(400).json({ message: 'Doğrulama kodu hatalı.' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Sunucu hatası.' });
    }
};

// Giriş fonksiyonu
const loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await pool.query('SELECT * FROM users.users WHERE email = $1', [email]);

        if (user.rows.length === 0) {
            return res.status(400).json({ message: 'E-posta veya şifre hatalı.' });
        }

        if (!user.rows[0].is_verified) {
            return res.status(400).json({ message: 'E-posta doğrulaması yapılmamış.' });
        }

        const isMatch = await bcrypt.compare(password, user.rows[0].password);
        if (!isMatch) {
            return res.status(400).json({ message: 'E-posta veya şifre hatalı.' });
        }

        const token = jwt.sign({ id: user.rows[0].id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.status(200).json({ message: 'Giriş başarılı!', token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Sunucu hatası.' });
    }
};

module.exports = {
    registerUser,
    verifyCode,
    loginUser,
};
