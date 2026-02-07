# Bir Anı Backend

Express API sunucusu. Auth ve anı verileri **MongoDB Atlas** (online) üzerinde saklanır.

## MongoDB Atlas Kurulumu

1. [cloud.mongodb.com](https://cloud.mongodb.com) adresine gidin
2. Ücretsiz hesap oluşturun
3. "Build a Database" > Free tier seçin > Create
4. Kullanıcı adı ve şifre belirleyin (bunları not alın)
5. "Network Access" > "Add IP Address" > "Allow Access from Anywhere" (0.0.0.0/0)
6. "Database" > "Connect" > "Drivers" > Node.js seçin
7. Connection string'i kopyalayın (mongodb+srv://...)
8. Şifreyi connection string içinde `<password>` yerine yazın

## Kurulum

```bash
cd backend
npm install
cp .env.example .env
```

`.env` dosyasını açın ve `MONGODB_URI` değerini MongoDB Atlas connection string ile değiştirin:

```
MONGODB_URI=mongodb+srv://kullanici:SIFRENIZ@cluster0.xxxxx.mongodb.net/bir-ani?retryWrites=true&w=majority
```

Ardından:

```bash
npm start
```

Sunucu varsayılan olarak `http://localhost:3000` adresinde çalışır.

## Ortam Değişkenleri (.env)

| Değişken | Açıklama |
|----------|----------|
| MONGODB_URI | MongoDB Atlas bağlantı adresi (zorunlu) |
| JWT_SECRET | JWT imzalama anahtarı |
| PORT | Sunucu portu (varsayılan: 3000) |

## API Endpointleri

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | /api/auth/register | Yeni kullanıcı kaydı |
| POST | /api/auth/login | Giriş |
| GET | /api/me | Oturum bilgisi (Bearer token gerekli) |
| GET | /api/anilar | Anıları listele (Bearer token gerekli) |
| POST | /api/anilar | Yeni anı ekle (Bearer token gerekli) |
| DELETE | /api/anilar/:id | Anı sil (Bearer token gerekli) |

## Veri Depolama

Tüm veriler (kullanıcılar, anılar) **MongoDB Atlas** bulut veritabanında saklanır. Sunucuyu kapatsanız bile veriler korunur.

## Fiziksel Cihazdan Bağlantı

Telefon/tablet ile test için:
1. Bilgisayar ve cihaz aynı Wi-Fi ağında olmalı
2. `api.js` içindeki `API_URL` değerini bilgisayarınızın yerel IP'si ile değiştirin
3. Backend'i çalıştırın, uygulamayı cihazda açın
