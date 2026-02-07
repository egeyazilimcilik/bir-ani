const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

async function connectDB() {
  if (!MONGODB_URI) {
    console.error('HATA: MONGODB_URI tanımlı değil. .env dosyasına MongoDB Atlas bağlantı adresini ekleyin.');
    console.error('Örnek: MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/bir-ani');
    process.exit(1);
  }
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB Atlas bağlandı');
  } catch (e) {
    console.error('MongoDB bağlantı hatası:', e.message);
    process.exit(1);
  }
}

module.exports = { connectDB };
