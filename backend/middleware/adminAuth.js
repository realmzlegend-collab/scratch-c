const adminAuth = (req, res, next) => {
    // Check if user is admin
    if (!req.user.isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
    }
    next();
};

module.exports = adminAuth;