require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { connectDB } = require('./db');
const User = require('./models/User');
const Ani = require('./models/Ani');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'bir-ani-secret-key-degistir';

app.use(cors());
app.use(express.json());

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ hata: 'Oturum gerekli' });
  }
  try {
    const token = auth.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ hata: 'Geçersiz token' });
  }
}

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, sifre } = req.body;
    if (!email || !sifre) {
      return res.status(400).json({ hata: 'Email ve şifre gerekli' });
    }
    if (sifre.length < 4) {
      return res.status(400).json({ hata: 'Şifre en az 4 karakter olmalı' });
    }
    const emailNorm = email.trim().toLowerCase();
    const varMi = await User.findOne({ email: emailNorm });
    if (varMi) {
      return res.status(400).json({ hata: 'Bu email zaten kayıtlı' });
    }
    const hash = await bcrypt.hash(sifre, 10);
    await User.create({ email: emailNorm, sifre: hash });
    const token = jwt.sign({ email: emailNorm }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { email: emailNorm } });
  } catch (e) {
    res.status(500).json({ hata: 'Sunucu hatası' });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, sifre } = req.body;
    if (!email || !sifre) {
      return res.status(400).json({ hata: 'Email ve şifre gerekli' });
    }
    const emailNorm = email.trim().toLowerCase();
    const user = await User.findOne({ email: emailNorm });
    if (!user || !(await bcrypt.compare(sifre, user.sifre))) {
      return res.status(401).json({ hata: 'Email veya şifre hatalı' });
    }
    const token = jwt.sign({ email: emailNorm }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { email: emailNorm } });
  } catch (e) {
    res.status(500).json({ hata: 'Sunucu hatası' });
  }
});

// GET /api/me
app.get('/api/me', authMiddleware, (req, res) => {
  res.json({ email: req.user.email });
});

// GET /api/anilar
app.get('/api/anilar', authMiddleware, async (req, res) => {
  try {
    const list = await Ani.find({ userEmail: req.user.email })
      .sort({ createdAt: -1 })
      .lean();
    const formatted = list.map((a) => ({
      id: a._id.toString(),
      baslik: a.baslik,
      metin: a.metin,
      tarih: a.tarih,
    }));
    res.json(formatted);
  } catch (e) {
    res.status(500).json({ hata: 'Sunucu hatası' });
  }
});

// POST /api/anilar
app.post('/api/anilar', authMiddleware, async (req, res) => {
  try {
    const { baslik, metin } = req.body;
    if (!baslik?.trim() && !metin?.trim()) {
      return res.status(400).json({ hata: 'Başlık veya metin gerekli' });
    }
    const ani = await Ani.create({
      baslik: (baslik || '').trim() || 'Başlıksız',
      metin: (metin || '').trim(),
      tarih: new Date().toLocaleDateString('tr-TR'),
      userEmail: req.user.email,
    });
    res.json({
      id: ani._id.toString(),
      baslik: ani.baslik,
      metin: ani.metin,
      tarih: ani.tarih,
    });
  } catch (e) {
    res.status(500).json({ hata: 'Sunucu hatası' });
  }
});

// DELETE /api/anilar/:id
app.delete('/api/anilar/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ hata: 'Geçersiz id' });
    }
    const sonuc = await Ani.deleteOne({ _id: id, userEmail: req.user.email });
    if (sonuc.deletedCount === 0) {
      return res.status(404).json({ hata: 'Anı bulunamadı' });
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ hata: 'Sunucu hatası' });
  }
});

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Bir Anı API: http://localhost:${PORT}`);
  });
});
