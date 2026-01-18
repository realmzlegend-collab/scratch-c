const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ error: 'Authentication required. Please log in.' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || '83223668db45ae24af4481d9bcbfe1d9');
        const user = await User.findById(decoded.id);

        if (!user) {
            throw new Error();
        }

        req.user = user;
        req.token = token;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
};

const adminMiddleware = (req, res, next) => {
    if (!req.user || !req.user.isAdmin) {
        return res.status(403).json({ error: 'Access denied. Admin only.' });
    }
    next();
};

module.exports = { authMiddleware, adminMiddleware };
