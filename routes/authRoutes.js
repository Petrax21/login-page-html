// routes/authRoutes.js
const express = require('express');
const { registerUser, verifyCode, loginUser } = require('../controllers/authController');

const router = express.Router();

// Kayıt rotası
router.post('/register', registerUser);

// Kod doğrulama rotası
router.post('/verify', verifyCode);

// Giriş rotası
router.post('/login', loginUser);

module.exports = router;
