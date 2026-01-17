const express = require('express');
const router = express.Router();

// Public routes that don't require Telegram auth
router.get('/info', (req, res) => {
    res.json({
        app: 'Scratch C',
        version: '1.0.0',
        description: 'Earn credits by reading and watching content'
    });
});

router.get('/status', (req, res) => {
    res.json({
        status: 'online',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
