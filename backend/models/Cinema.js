const mongoose = require('mongoose');

const cinemaSchema = new mongoose.Schema({
    title: { type: String, required: true },
    videoUrl: { type: String, required: true }, // YouTube or Cloudinary link
    thumbnail: { type: String },
    description: { type: String },
    rewardAmount: { type: Number, default: 5 }, // Amount earned for watching
    votes: { type: Number, default: 0 },
    genre: { type: String },
    status: { type: String, enum: ['published', 'draft', 'archived'], default: 'published' },
    duration: { type: String } // e.g., "1h 30m"
}, { timestamps: true });

module.exports = mongoose.model('Cinema', cinemaSchema);
