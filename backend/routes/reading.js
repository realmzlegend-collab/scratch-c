const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const Book = require('../models/Book');

// Get all books
router.get('/books', authMiddleware, async (req, res) => {
    try {
        const books = await Book.find({ active: true });
        res.json({ success: true, data: books });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get single book content
router.get('/books/:id', authMiddleware, async (req, res) => {
    try {
        const book = await Book.findById(req.params.id);
        if (!book) return res.status(404).json({ success: false, error: 'Book not found' });
        res.json({ success: true, data: book });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router; // This line makes it work with server.js
