const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { auth } = require('../middleware/auth');

// Protected routes
router.get('/:id', auth, userController.getUserById);
router.put('/profile', auth, userController.updateProfile);
router.get('/transactions', auth, userController.getUserTransactions);
router.get('/books', auth, userController.getUserBooks);
router.get('/items', auth, userController.getUserItems);

module.exports = router;
