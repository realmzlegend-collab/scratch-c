const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
    title: { type: String, required: true },
    author: { type: String, required: true },
    description: { type: String },
    content: { type: String }, // For short stories/content
    coverImage: { type: String },
    category: { type: String },
    earningsPerPage: { type: Number, default: 0.5 }, // User earns this per page read
    costToUpload: { type: Number, default: 100 },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    active: { type: Boolean, default: true },
    readCount: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Book', bookSchema);
