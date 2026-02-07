# Bir Anı 📝

React Native (Expo) ile geliştirilmiş, anılarınızı fotoğraflarla kaydedebileceğiniz mobil uygulama.

## Özellikler

- 🔐 **Email/Şifre ile giriş ve kayıt** – Güvenli kimlik doğrulama
- 📸 **Fotoğraflı anılar** – Her anıya birden fazla fotoğraf ekleyebilirsiniz
- 🔍 **Arama** – Anılarınızda başlık ve metin araması
- 👤 **Profil** – İsim, soyisim ve email bilgileriniz
- 📱 **Responsive tasarım** – Farklı ekran boyutlarına uyumlu
- ☁️ **Bulut senkronizasyonu** – Supabase ile verileriniz güvende

## Teknolojiler

- **React Native** + **Expo**
- **Supabase** (Auth, PostgreSQL, Storage)
- **expo-image-picker** – Galeriden fotoğraf seçimi
- **expo-file-system** – Görsel önbellekleme

## Kurulum

### Gereksinimler

- Node.js (v18+)
- npm veya yarn
- [Expo Go](https://expo.dev/go) uygulaması (mobilde test için)

### 1. Projeyi klonlayın

```bash
git clone https://github.com/egeyazilimcilik/bir-ani.git
cd bir-ani
```

### 2. Bağımlılıkları yükleyin

```bash
npm install
```

### 3. Supabase kurulumu

1. [supabase.com](https://supabase.com) üzerinden ücretsiz proje oluşturun
2. **SQL Editor**'da `supabase-schema.sql` dosyasındaki SQL'i çalıştırın
3. Detaylı kurulum için `SUPABASE-KURULUM.md` dosyasına bakın

### 4. Ortam değişkenleri

`.env.example` dosyasını kopyalayıp `.env` oluşturun:

```bash
cp .env.example .env
```

`.env` dosyasına Supabase bilgilerinizi ekleyin:

```
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
```

Bu değerleri Supabase Dashboard > Settings > API sayfasından alabilirsiniz.

### 5. Uygulamayı çalıştırın

```bash
npm start
```

QR kodu Expo Go ile tarayarak mobilde test edebilirsiniz.

**Android:**
```bash
npm run android
```

**iOS:**
```bash
npm run ios
```

## Proje yapısı

```
bir-ani/
├── App.js           # Ana uygulama bileşeni
├── supabase.js      # Supabase client
├── supabase-schema.sql   # Veritabanı şeması
├── SUPABASE-KURULUM.md   # Supabase kurulum rehberi
├── .env.example     # Örnek ortam değişkenleri
└── assets/          # İkonlar ve görseller
```

## Lisans

MIT
