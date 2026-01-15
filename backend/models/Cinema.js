const mongoose = require('mongoose');
const cinemaSchema = new mongoose.Schema({
    title: String,
    googleDriveLink: String,
    votes: { type: Number, default: 0 }
});
module.exports = mongoose.models.Cinema || mongoose.model('Cinema', cinemaSchema);
