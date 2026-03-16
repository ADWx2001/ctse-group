const express = require('express');
const router = express.Router();
const { register, login, validate } = require('../controllers/authController');

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', register);

// @route   POST /api/auth/login
// @desc    Login and receive JWT token
// @access  Public
router.post('/login', login);

// @route   GET /api/auth/validate
// @desc    Validate a JWT token (used internally by other microservices)
// @access  Internal / Bearer Token
router.get('/validate', validate);

module.exports = router;
