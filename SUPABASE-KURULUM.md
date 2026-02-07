# Supabase Kurulumu

Uygulama artık Supabase kullanıyor. Auth ve veritabanı için backend gerekmez.

## 1. Supabase Projesi Oluşturma

1. [supabase.com](https://supabase.com) adresine gidin
2. "Start your project" ile ücretsiz hesap oluşturun
3. "New Project" > Organizasyon seçin > Proje adı girin (örn: bir-ani) > Create

## 2. Veritabanı ve Storage

Supabase Dashboard > **SQL Editor** > Yeni sorgu oluşturun.

`supabase-schema.sql` dosyasındaki SQL'i kopyalayıp çalıştırın.

**Storage bucket manuel oluşturma** (SQL çalışmazsa): Dashboard > Storage > **New bucket** > İsim: `ani-fotolar` > **Public bucket** işaretleyin > Create.

Bu işlem:
- Anılar tablosunu oluşturur (fotolar sütunu dahil)
- Storage bucket'ı (`ani-fotolar`) ve politikalarını tanımlar

## 3. Ortam Değişkenleri (Detaylı)

Ortam değişkenleri, uygulamanızın Supabase'e bağlanması için gerekli URL ve API anahtarını saklar. Bu bilgiler `.env` dosyasında tutulur ve gizli kalır (Git'e eklenmez).

### Adım 1: .env Dosyası Oluşturma

Proje klasörünüzde (App.js'in bulunduğu `bir-ani` klasörü) `.env` dosyası oluşturun:

**Windows (PowerShell):**
```powershell
Copy-Item .env.example .env
```

**Windows (CMD):**
```cmd
copy .env.example .env
```

**Mac/Linux:**
```bash
cp .env.example .env
```

Alternatif: `.env` adında yeni bir dosya oluşturup içine aşağıdaki satırları yazabilirsiniz.

---

### Adım 2: Supabase Dashboard'dan Değerleri Alma

**Project URL (Sunucu Adresi) Nerede?**

1. Tarayıcıda [supabase.com/dashboard](https://supabase.com/dashboard) açın
2. Giriş yaptıysanız projeleriniz listelenir — **projenize tıklayın** (örn: "bir-ani")
3. Sol kenar çubuğunda en altta **⚙️ Settings** (ayarlar/dişli) ikonuna tıklayın
4. Açılan menüde **API** sekmesine tıklayın
5. Sayfa yüklendiğinde en üstte **"Project URL"** başlığı görünür — altında `https://xxxxx.supabase.co` formatında adres vardır
6. Bu adresin yanındaki **kopyala (copy)** ikonuna tıklayarak kopyalayın

**Eğer bulamıyorsanız:**
- Sol menüde **Project Settings** veya sadece **Settings** yazıyor olabilir
- İçeride **General**, **API**, **Database** gibi sekmeler var — **API** sekmesine girin
- Project URL sayfanın **üst kısmında**, "Configuration" bölümünde yer alır
- Adres her zaman `https://` ile başlar ve `.supabase.co` ile biter

Bu sayfada şunları göreceksiniz:

| Alan | Açıklama | Örnek |
|------|----------|-------|
| **Project URL** | Supabase sunucunuzun adresi. `https://` ile başlar. | `https://abcdefgh.supabase.co` |
| **Project API keys** | API anahtarları listesi | |
| → **anon public** | Genel (public) anahtar. Uygulamada kullanılır. Güvenli—RLS ile korunur. | `eyJhbGciOiJIUzI1NiIs...` uzun bir JWT |
| → **service_role** | Bu anahtarı **asla** istemcide kullanmayın. Sadece sunucu tarafında kullanılır. | Kullanmayın |

5. **Project URL** değerini kopyalayın (örn: `https://xyzabc123.supabase.co`)
6. **anon public** anahtarının yanındaki **Copy** butonuna tıklayın

---

### Adım 3: .env Dosyasına Değerleri Yazma

`.env` dosyasını bir metin editörüyle açın ve şu satırları ekleyin (kendi değerlerinizle değiştirin):

```
EXPO_PUBLIC_SUPABASE_URL=https://BURAYA_PROJECT_URL_YAPIŞTIRIN.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=BURAYA_ANON_KEY_YAPIŞTIRIN
```

**Örnek (gerçek değerler farklı olacaktır):**
```
EXPO_PUBLIC_SUPABASE_URL=https://kjnxqmplzy.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqbnhxbXBsenkiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjoxODE1NTc2MDAwfQ.xxxxxx
```

**Önemli kurallar:**
- Değerlerin etrafında tırnak (`"` veya `'`) kullanmayın
- `=` işaretinden sonra boşluk bırakmayın
- Satır sonunda gereksiz boşluk olmasın
- `EXPO_PUBLIC_` öneki **zorunludur**—Expo sadece bu önekle başlayan değişkenleri uygulamaya gönderir

---

### Adım 4: Değişiklikten Sonra

`.env` dosyasını kaydettikten sonra:

1. Expo sunucusu çalışıyorsa **yeniden başlatın** (Ctrl+C ile durdurun, `npm start` ile tekrar başlatın)
2. Ortam değişkenleri sadece uygulama başlarken yüklenir; değişikliklerin etkili olması için yeniden başlatma gerekir

---

### Sorun Giderme

| Sorun | Çözüm |
|-------|-------|
| "Invalid API key" hatası | Anon key'i tekrar kopyalayın; başında/sonunda boşluk olmamalı |
| Bağlantı kurulamıyor | Project URL'nin `https://` ile başladığından emin olun |
| Değerler uygulanmıyor | `.env` dosyasının proje kökünde olduğunu kontrol edin; Expo'yu yeniden başlatın |

## 4. Email Auth Ayarı

Supabase Dashboard > **Authentication** > **Providers** > Email:
- "Confirm email" kapalı bırakılabilir (test için)
- "Enable Email provider" açık olmalı

## 5. Çalıştırma

```bash
npm start
```

Uygulama Supabase'e bağlanacak. Backend sunucusu çalıştırmanıza gerek yok.
