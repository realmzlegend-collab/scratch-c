const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// Get current movie being watched
router.get('/watching', auth, (req, res) => {
  res.json({
    _id: '123',
    title: 'Featured Movie',
    link: 'https://drive.google.com/file/d/example',
    description: 'Enjoy the show!'
  });
});

// Add a comment to a movie
router.post('/:id/comments', auth, (req, res) => {
  // Logic to save comment in DB linked to movie ID
  res.json({ success: true });
});

module.exports = router;
