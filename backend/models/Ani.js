const mongoose = require('mongoose');

const aniSchema = new mongoose.Schema({
  baslik: { type: String, default: 'Başlıksız' },
  metin: { type: String, default: '' },
  tarih: { type: String },
  userEmail: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Ani', aniSchema);
