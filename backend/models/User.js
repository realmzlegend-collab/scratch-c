const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    balance: { type: Number, default: 0 },
    isAdmin: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

// THIS LINE PREVENTS THE OVERWRITEMODEL ERROR
module.exports = mongoose.models.User || mongoose.model('User', userSchema);
