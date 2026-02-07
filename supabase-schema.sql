-- Supabase SQL Editor'da çalıştırın (Dashboard > SQL Editor)

-- Anılar tablosu
CREATE TABLE IF NOT EXISTS anilar (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  baslik TEXT DEFAULT 'Başlıksız',
  metin TEXT DEFAULT '',
  tarih TEXT,
  fotolar JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fotolar sütunu yoksa ekle (mevcut tablolar için)
ALTER TABLE anilar ADD COLUMN IF NOT EXISTS fotolar JSONB DEFAULT '[]';

-- Storage bucket: ani-fotolar (public = herkes okuyabilsin)
INSERT INTO storage.buckets (id, name, public) VALUES ('ani-fotolar', 'ani-fotolar', true) ON CONFLICT (id) DO NOTHING;

-- Storage RLS: Önce varsa kaldır, sonra oluştur
DROP POLICY IF EXISTS "Kullanıcı kendi fotolarını yükleyebilir" ON storage.objects;
DROP POLICY IF EXISTS "ani-fotolar upload" ON storage.objects;
DROP POLICY IF EXISTS "Herkes fotoları okuyabilir" ON storage.objects;
-- Giriş yapmış kullanıcılar ani-fotolar bucket'ına yükleyebilir
CREATE POLICY "ani-fotolar upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'ani-fotolar' AND auth.role() = 'authenticated');
-- Herkes fotoları okuyabilir (public bucket)
CREATE POLICY "Herkes fotoları okuyabilir" ON storage.objects FOR SELECT USING (bucket_id = 'ani-fotolar');

-- Row Level Security (RLS) aktif et
ALTER TABLE anilar ENABLE ROW LEVEL SECURITY;

-- Anılar politikaları: Önce varsa kaldır, sonra oluştur (tekrar çalıştırılabilir)
DROP POLICY IF EXISTS "Kullanıcı kendi anılarını görebilir" ON anilar;
DROP POLICY IF EXISTS "Kullanıcı kendi anılarını görünür" ON anilar;
CREATE POLICY "Kullanıcı kendi anılarını görebilir" ON anilar FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Kullanıcı anı ekleyebilir" ON anilar;
CREATE POLICY "Kullanıcı anı ekleyebilir" ON anilar FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Kullanıcı kendi anılarını silebilir" ON anilar;
CREATE POLICY "Kullanıcı kendi anılarını silebilir" ON anilar FOR DELETE USING (auth.uid() = user_id);
