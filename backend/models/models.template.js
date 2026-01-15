const { mongoose } = require('../lib/mongoose');
const { Schema } = mongoose;

const TemplateSchema = new Schema({
  title: String,
  content: String,
}, { timestamps: true });

module.exports = mongoose.models?.Template || mongoose.model('Template', TemplateSchema);
