import { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  FlatList,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Dimensions,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from './supabase';

// Supabase Storage URL'inden path çıkarır
function getSupabaseStoragePath(url) {
  const match = String(url || '').match(/ani-fotolar\/(.+)$/);
  return match ? match[1] : null;
}

// Uzak URL'leri indirip dosya URI ile gösterir (React Native Image + Supabase uyumsuzluğunu aşar)
function UriImage({ uri, style, resizeMode }) {
  const u = String(uri || '').trim();
  const isLocal = !u || u.startsWith('data:') || u.startsWith('file:') || u.startsWith('content:');
  const [localFile, setLocalFile] = useState(null);

  useEffect(() => {
    if (!u || isLocal || !u.startsWith('http')) return;
    let cancelled = false;
    const cacheDir = FileSystem.cacheDirectory;
    if (!cacheDir) return;

    async function load() {
      let downloadUrl = u;
      const path = getSupabaseStoragePath(u);
      if (path) {
        const { data } = await supabase.storage.from('ani-fotolar').createSignedUrl(path, 3600);
        if (data?.signedUrl) downloadUrl = data.signedUrl;
      }
      const parts = u.split('/').filter(Boolean);
      const safeName = (parts.slice(-2).join('_') || 'img').replace(/[^a-zA-Z0-9._-]/g, '_');
      const ext = u.toLowerCase().includes('.png') ? 'png' : 'jpg';
      const dir = cacheDir + 'ani_img/';
      const targetUri = dir + safeName + '.' + ext;
      try {
        await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
        const { uri: downloaded } = await FileSystem.downloadAsync(downloadUrl, targetUri, { cache: false });
        if (!cancelled) setLocalFile(downloaded);
      } catch (e) {
        if (!cancelled) setLocalFile(u);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [u]);

  const src = isLocal ? u : localFile;
  if (!src) return null;
  return <Image source={{ uri: src }} style={style} resizeMode={resizeMode} />;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

const wp = (w) => (SCREEN_WIDTH / BASE_WIDTH) * w;
const hp = (h) => (SCREEN_HEIGHT / BASE_HEIGHT) * h;
const fp = (size, factor = 0.5) => size + (wp(size) - size) * factor;

const getFotolarList = (fotolar) => {
  if (!fotolar) return [];
  if (Array.isArray(fotolar)) return fotolar.filter((u) => u && typeof u === 'string');
  if (typeof fotolar === 'string') {
    if (fotolar === '[]' || fotolar === '') return [];
    try {
      const parsed = JSON.parse(fotolar);
      return Array.isArray(parsed) ? parsed.filter((u) => u && typeof u === 'string') : [];
    } catch { return []; }
  }
  return [];
};

export default function App() {
  const [kullanici, setKullanici] = useState(null);
  const [authYuklendi, setAuthYuklendi] = useState(false);
  const [anilar, setAnilar] = useState([]);
  const [arama, setArama] = useState('');
  const [aramaAktif, setAramaAktif] = useState(false);
  const [modalAcik, setModalAcik] = useState(false);
  const [profilAcik, setProfilAcik] = useState(false);
  const [yeniAni, setYeniAni] = useState('');
  const [yeniBaslik, setYeniBaslik] = useState('');
  const [girisModu, setGirisModu] = useState('giris');
  const [girisIsim, setGirisIsim] = useState('');
  const [girisSoyisim, setGirisSoyisim] = useState('');
  const [girisEmail, setGirisEmail] = useState('');
  const [girisSifre, setGirisSifre] = useState('');
  const [authHata, setAuthHata] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);
  const [aniDetayAcik, setAniDetayAcik] = useState(false);
  const [secilenAni, setSecilenAni] = useState(null);
  const [secilenFoto, setSecilenFoto] = useState(null);
  const [yeniFotolar, setYeniFotolar] = useState([]);
  const aramaInputRef = useRef(null);

  useEffect(() => {
    let iptal = false;
    const authKontrol = async () => {
      try {
        const timeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 5000)
        );
        const sessionPromise = supabase.auth.getSession();
        const { data: { session } } = await Promise.race([sessionPromise, timeout]);
        if (iptal) return;
        if (session?.user) {
          const meta = session.user.user_metadata || {};
          setKullanici({
            email: session.user.email,
            isim: meta.isim || '',
            soyisim: meta.soyisim || '',
          });
          const { data: list } = await supabase
            .from('anilar')
            .select('id, baslik, metin, tarih, fotolar')
            .order('created_at', { ascending: false });
          if (!iptal) setAnilar((list || []).map((a) => ({ ...a, fotolar: getFotolarList(a.fotolar) })));
        }
      } catch (e) {
        console.log(e);
      }
      if (!iptal) setAuthYuklendi(true);
    };
    authKontrol();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setKullanici(null);
        setAnilar([]);
      } else if (session?.user) {
        const meta = session.user.user_metadata || {};
        setKullanici({
          email: session.user.email,
          isim: meta.isim || '',
          soyisim: meta.soyisim || '',
        });
        const { data: list } = await supabase
          .from('anilar')
          .select('id, baslik, metin, tarih, fotolar')
          .order('created_at', { ascending: false });
        setAnilar((list || []).map((a) => ({ ...a, fotolar: getFotolarList(a.fotolar) })));
      }
    });
    return () => {
      iptal = true;
      subscription?.unsubscribe();
    };
  }, []);

  const girisYap = async () => {
    setAuthHata('');
    if (!girisEmail.trim() || !girisSifre.trim()) {
      setAuthHata('Email ve şifre gerekli');
      return;
    }
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: girisEmail.trim(),
        password: girisSifre,
      });
      if (error) {
        setAuthHata(error.message === 'Invalid login credentials' ? 'Email veya şifre hatalı' : error.message);
        return;
      }
      const meta = data.user.user_metadata || {};
      setKullanici({
        email: data.user.email,
        isim: meta.isim || '',
        soyisim: meta.soyisim || '',
      });
      const { data: list } = await supabase
        .from('anilar')
        .select('id, baslik, metin, tarih, fotolar')
        .order('created_at', { ascending: false });
      setAnilar((list || []).map((a) => ({ ...a, fotolar: getFotolarList(a.fotolar) })));
      setGirisEmail('');
      setGirisSifre('');
    } catch (e) {
      setAuthHata('Bağlantı hatası');
    }
  };

  const kayitOl = async () => {
    setAuthHata('');
    if (!girisIsim.trim()) {
      setAuthHata('İsim gerekli');
      return;
    }
    if (!girisSoyisim.trim()) {
      setAuthHata('Soy isim gerekli');
      return;
    }
    if (!girisEmail.trim() || !girisSifre.trim()) {
      setAuthHata('Email ve şifre gerekli');
      return;
    }
    if (girisSifre.length < 4) {
      setAuthHata('Şifre en az 4 karakter olmalı');
      return;
    }
    try {
      const { data, error } = await supabase.auth.signUp({
        email: girisEmail.trim(),
        password: girisSifre,
        options: {
          data: {
            isim: girisIsim.trim(),
            soyisim: girisSoyisim.trim(),
          },
        },
      });
      if (error) {
        setAuthHata(error.message.includes('already registered') ? 'Bu email zaten kayıtlı' : error.message);
        return;
      }
      setKullanici({
        email: data.user.email,
        isim: girisIsim.trim(),
        soyisim: girisSoyisim.trim(),
      });
      setAnilar([]);
      setGirisIsim('');
      setGirisSoyisim('');
      setGirisEmail('');
      setGirisSifre('');
    } catch (e) {
      setAuthHata('Bağlantı hatası');
    }
  };

  const cikisYap = async () => {
    await supabase.auth.signOut();
    setKullanici(null);
    setAnilar([]);
    setProfilAcik(false);
  };

  const filtreliAnilar = anilar.filter(
    (a) =>
      a.baslik?.toLowerCase().includes(arama.toLowerCase()) ||
      a.metin?.toLowerCase().includes(arama.toLowerCase())
  );

  const fotoSec = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin gerekli', 'Fotoğraf seçmek için galeri izni gerekli.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets?.length) {
      setYeniFotolar((prev) => [...prev, ...result.assets.map((a) => ({ uri: a.uri, base64: a.base64 }))]);
    }
  };

  const fotoKaldir = (index) => {
    setYeniFotolar((prev) => prev.filter((_, i) => i !== index));
  };

  const getImageData = async (foto, isPng) => {
    const contentType = isPng ? 'image/png' : 'image/jpeg';
    try {
      if (foto?.base64) {
        const res = await fetch(`data:${contentType};base64,${foto.base64}`);
        return await res.arrayBuffer();
      }
      const uri = typeof foto === 'string' ? foto : foto?.uri;
      const res = await fetch(uri);
      return await res.arrayBuffer();
    } catch {
      return null;
    }
  };

  const aniEkle = async () => {
    if (!yeniBaslik.trim() && !yeniAni.trim() && yeniFotolar.length === 0) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setYukleniyor(true);
    try {
      const fotolarUrls = [];
      const timestamp = Date.now();
      for (let i = 0; i < yeniFotolar.length; i++) {
        const foto = yeniFotolar[i];
        const isPng = (typeof foto === 'string' ? foto : foto?.uri || '').toLowerCase().includes('.png');
        const ext = isPng ? 'png' : 'jpg';
        const path = `${user.id}/${timestamp}_${i}.${ext}`;
        const imageData = await getImageData(foto, isPng);
        if (!imageData) continue;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('ani-fotolar')
          .upload(path, imageData, { contentType: isPng ? 'image/png' : 'image/jpeg', upsert: true });
        if (!uploadError && uploadData) {
          const { data: urlData } = supabase.storage.from('ani-fotolar').getPublicUrl(uploadData.path);
          fotolarUrls.push(urlData.publicUrl);
        } else if (foto?.base64) {
          fotolarUrls.push(`data:image/${ext};base64,${foto.base64}`);
        }
      }
      const { data: yeni, error } = await supabase
        .from('anilar')
        .insert({
          user_id: user.id,
          baslik: yeniBaslik.trim() || 'Başlıksız',
          metin: yeniAni.trim(),
          tarih: new Date().toLocaleDateString('tr-TR'),
          fotolar: fotolarUrls,
        })
        .select('id, baslik, metin, tarih, fotolar')
        .single();
      if (!error && yeni) {
        const fotolar = fotolarUrls.length > 0 ? fotolarUrls : getFotolarList(yeni.fotolar);
        setAnilar([{ ...yeni, fotolar }, ...anilar]);
        setYeniBaslik('');
        setYeniAni('');
        setYeniFotolar([]);
        setModalAcik(false);
        if (yeniFotolar.length > 0 && fotolarUrls.length === 0) {
          Alert.alert(
            'Fotoğraflar yüklenemedi',
            'Storage bucket oluşturun: Supabase Dashboard > Storage > New bucket > İsim: ani-fotolar, Public bucket: açık'
          );
        }
      }
    } catch (e) {
      console.log(e);
    }
    setYukleniyor(false);
  };

  const aniSil = async (id) => {
    try {
      const { error } = await supabase.from('anilar').delete().eq('id', id);
      if (!error) setAnilar(anilar.filter((a) => a.id !== id));
    } catch (e) {
      console.log(e);
    }
  };

  if (!authYuklendi) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.yukleniyor}>
          <Text style={styles.yukleniyorMetin}>Yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!kullanici) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.girisContainer}
        >
          <ScrollView contentContainerStyle={styles.girisScroll} keyboardShouldPersistTaps="handled">
            <View style={styles.girisCard}>
              <Text style={styles.girisBaslik}>Bir Anı</Text>
              <Text style={styles.girisAltBaslik}>Anılarınızı kaydedin</Text>

              <View style={styles.girisTablar}>
                <TouchableOpacity
                  style={[styles.girisTab, girisModu === 'giris' && styles.girisTabAktif]}
                  onPress={() => { setGirisModu('giris'); setAuthHata(''); }}
                >
                  <Text style={[styles.girisTabMetin, girisModu === 'giris' && styles.girisTabMetinAktif]}>Giriş Yap</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.girisTab, girisModu === 'kayit' && styles.girisTabAktif]}
                  onPress={() => { setGirisModu('kayit'); setAuthHata(''); }}
                >
                  <Text style={[styles.girisTabMetin, girisModu === 'kayit' && styles.girisTabMetinAktif]}>Kayıt Ol</Text>
                </TouchableOpacity>
              </View>

              {girisModu === 'kayit' && (
                <>
                  <Text style={styles.girisLabel}>İsim</Text>
                  <View style={styles.girisInputWrapper}>
                    <Ionicons name="person-outline" size={wp(20)} color="#6b6b7a" style={styles.girisInputIcon} />
                    <TextInput
                      style={styles.girisInput}
                      placeholder="Adınız"
                      placeholderTextColor="#6b6b7a"
                      value={girisIsim}
                      onChangeText={(t) => { setGirisIsim(t); setAuthHata(''); }}
                      autoCapitalize="words"
                    />
                  </View>
                  <Text style={styles.girisLabel}>Soy isim</Text>
                  <View style={styles.girisInputWrapper}>
                    <Ionicons name="person-outline" size={wp(20)} color="#6b6b7a" style={styles.girisInputIcon} />
                    <TextInput
                      style={styles.girisInput}
                      placeholder="Soyadınız"
                      placeholderTextColor="#6b6b7a"
                      value={girisSoyisim}
                      onChangeText={(t) => { setGirisSoyisim(t); setAuthHata(''); }}
                      autoCapitalize="words"
                    />
                  </View>
                </>
              )}

              <Text style={styles.girisLabel}>Email</Text>
              <View style={styles.girisInputWrapper}>
                <Ionicons name="mail-outline" size={wp(20)} color="#6b6b7a" style={styles.girisInputIcon} />
                <TextInput
                  style={styles.girisInput}
                  placeholder="ornek@email.com"
                  placeholderTextColor="#6b6b7a"
                  value={girisEmail}
                  onChangeText={(t) => { setGirisEmail(t); setAuthHata(''); }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <Text style={styles.girisLabel}>Şifre</Text>
              <View style={styles.girisInputWrapper}>
                <Ionicons name="lock-closed-outline" size={wp(20)} color="#6b6b7a" style={styles.girisInputIcon} />
                <TextInput
                  style={styles.girisInput}
                  placeholder="••••••••"
                  placeholderTextColor="#6b6b7a"
                  value={girisSifre}
                  onChangeText={(t) => { setGirisSifre(t); setAuthHata(''); }}
                  secureTextEntry
                />
              </View>
              {authHata ? <Text style={styles.authHata}>{authHata}</Text> : null}
              {girisModu === 'giris' ? (
                <TouchableOpacity style={styles.girisButon} onPress={girisYap}>
                  <Text style={styles.girisButonMetin}>Giriş Yap</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.girisButon} onPress={kayitOl}>
                  <Text style={styles.girisButonMetin}>Kayıt Ol</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.kayitButon}
                onPress={() => { setGirisModu(girisModu === 'giris' ? 'kayit' : 'giris'); setAuthHata(''); }}
              >
                <Text style={styles.kayitButonMetin}>
                  {girisModu === 'giris' ? 'Hesabınız yok mu? Kayıt Ol' : 'Zaten hesabınız var mı? Giriş Yap'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Üst - Arama + Profil */}
      <View style={styles.ust}>
        <View style={styles.ustRow}>
          <View style={styles.aramaAlan}>
            {aramaAktif ? (
              <View style={styles.aramaWrapper}>
                <Ionicons name="search" size={wp(20)} color="#6b6b7a" style={styles.aramaIcon} />
                <TextInput
                  ref={aramaInputRef}
                  style={styles.aramaInput}
                  placeholder="Anı ara..."
                  placeholderTextColor="#6b6b7a"
                  value={arama}
                  onChangeText={setArama}
                  autoFocus
                  onBlur={() => !arama.trim() && setAramaAktif(false)}
                />
              </View>
            ) : (
              <TouchableOpacity style={styles.aramaButon} onPress={() => setAramaAktif(true)}>
                <Ionicons name="search" size={wp(20)} color="#6b6b7a" style={styles.aramaIcon} />
                <Text style={styles.aramaPlaceholder}>Anı ara...</Text>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={styles.profilButon} onPress={() => setProfilAcik(true)}>
            <Ionicons name="person-circle" size={wp(36)} color="#6b6b7a" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Orta - Anı Listesi */}
      <View style={styles.orta}>
        <FlatList
          data={filtreliAnilar}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.liste}
          ListEmptyComponent={
            <Text style={styles.bosMetin}>
              {arama ? 'Sonuç bulunamadı' : 'Henüz anı yok'}
            </Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.aniKarti}
              onPress={() => {
                setSecilenAni(item);
                setAniDetayAcik(true);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.aniBaslik}>{item.baslik}</Text>
              {item.metin ? (
                <Text style={styles.aniMetin} numberOfLines={3}>
                  {item.metin}
                </Text>
              ) : null}
              {getFotolarList(item.fotolar).length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.aniKartFotolar}>
                  {getFotolarList(item.fotolar).slice(0, 4).map((url, i) => (
                    <TouchableOpacity key={i} onPress={() => setSecilenFoto(String(url))} activeOpacity={0.8} style={styles.aniKartFotoWrapper}>
                      <UriImage uri={String(url).trim()} style={styles.aniKartFoto} resizeMode="cover" />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : null}
              <Text style={styles.aniTarih}>{item.tarih}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Alt - Yeni Anı Ekle */}
      <View style={styles.alt}>
        <TouchableOpacity
          style={styles.ekleButon}
          onPress={() => setModalAcik(true)}
        >
          <Text style={styles.ekleMetin}>+ Yeni Anı Ekle</Text>
        </TouchableOpacity>
      </View>

      {/* Modal - Anı Ekleme */}
      <Modal
        visible={modalAcik}
        transparent
        animationType="slide"
        onRequestClose={() => setModalAcik(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalArkaplan}
        >
          <View style={styles.modalIcerik}>
            <Text style={styles.modalBaslik}>Yeni Anı</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Başlık (isteğe bağlı)"
              placeholderTextColor="#6b6b7a"
              value={yeniBaslik}
              onChangeText={setYeniBaslik}
            />
            <TextInput
              style={[styles.modalInput, styles.modalTextArea]}
              placeholder="Anınızı yazın..."
              placeholderTextColor="#6b6b7a"
              value={yeniAni}
              onChangeText={setYeniAni}
              multiline
            />
            <TouchableOpacity style={styles.fotoEkleButon} onPress={fotoSec}>
              <Ionicons name="images-outline" size={wp(24)} color="#6b6b7a" />
              <Text style={styles.fotoEkleMetin}>Fotoğraf ekle</Text>
            </TouchableOpacity>
            {yeniFotolar.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.fotoOnizlemeListe}>
                {yeniFotolar.map((foto, i) => (
                  <View key={i} style={styles.fotoOnizlemeWrapper}>
                    <UriImage uri={typeof foto === 'string' ? foto : foto?.uri} style={styles.fotoOnizleme} resizeMode="cover" />
                    <TouchableOpacity style={styles.fotoKaldirButon} onPress={() => fotoKaldir(i)}>
                      <Ionicons name="close-circle" size={wp(24)} color="#e84a5f" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            ) : null}
            <View style={styles.modalButonlar}>
              <TouchableOpacity
                style={[styles.modalButon, styles.iptalButon]}
                onPress={() => {
                  setModalAcik(false);
                  setYeniBaslik('');
                  setYeniAni('');
                  setYeniFotolar([]);
                }}
              >
                <Text style={styles.iptalMetin}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButon, styles.kaydetButon]}
                onPress={aniEkle}
              >
                <Text style={styles.kaydetMetin}>Kaydet</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal - Anı Detay (Okuma) */}
      <Modal visible={aniDetayAcik} transparent animationType="fade">
        <TouchableOpacity
          style={styles.aniDetayArkaplan}
          activeOpacity={1}
          onPress={() => setAniDetayAcik(false)}
        >
          <TouchableOpacity
            style={styles.aniDetayKart}
            activeOpacity={1}
            onPress={() => {}}
          >
            {secilenAni ? (
              <ScrollView style={styles.aniDetayScrollWrap} showsVerticalScrollIndicator={false}>
                <Text style={styles.aniDetayBaslik}>{secilenAni.baslik}</Text>
                {getFotolarList(secilenAni.fotolar).length > 0 ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.aniDetayFotolar} nestedScrollEnabled>
                    {getFotolarList(secilenAni.fotolar).map((url, i) => (
                      <TouchableOpacity key={i} onPress={() => setSecilenFoto(String(url))} activeOpacity={0.8}>
                        <UriImage uri={String(url).trim()} style={styles.aniDetayFotoKucuk} resizeMode="cover" />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                ) : null}
                {secilenAni.metin ? (
                  <Text style={styles.aniDetayMetin}>{secilenAni.metin}</Text>
                ) : (
                  <Text style={styles.aniDetayBos}>Metin yok</Text>
                )}
                <Text style={styles.aniDetayTarih}>{secilenAni.tarih}</Text>
                <View style={styles.aniDetayButonlar}>
                  <TouchableOpacity
                    style={styles.aniDetaySil}
                    onPress={() => {
                      aniSil(secilenAni.id);
                      setAniDetayAcik(false);
                    }}
                  >
                    <Ionicons name="trash-outline" size={wp(20)} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.aniDetayKapat}
                    onPress={() => setAniDetayAcik(false)}
                  >
                    <Text style={styles.aniDetayKapatMetin}>Kapat</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            ) : null}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Modal - Fotoğraf Büyütme */}
      <Modal visible={!!secilenFoto} transparent animationType="fade">
        <TouchableOpacity
          style={styles.fotoBuyukArkaplan}
          activeOpacity={1}
          onPress={() => setSecilenFoto(null)}
        >
          {secilenFoto ? (
            <UriImage uri={secilenFoto} style={styles.fotoBuyuk} resizeMode="contain" />
          ) : null}
          <TouchableOpacity style={styles.fotoBuyukKapat} onPress={() => setSecilenFoto(null)}>
            <Ionicons name="close-circle" size={wp(40)} color="#fff" />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Modal - Profil */}
      <Modal visible={profilAcik} transparent animationType="slide">
        <TouchableOpacity
          style={styles.profilArkaplan}
          activeOpacity={1}
          onPress={() => setProfilAcik(false)}
        >
          <TouchableOpacity
            style={styles.profilIcerik}
            activeOpacity={1}
            onPress={() => {}}
          >
            <Text style={styles.profilBaslik}>Profil</Text>
            <View style={styles.profilAvatar}>
              <Ionicons name="person" size={wp(48)} color="#6b6b7a" />
            </View>
            {(kullanici.isim || kullanici.soyisim) ? (
              <Text style={styles.profilIsim}>{[kullanici.isim, kullanici.soyisim].filter(Boolean).join(' ')}</Text>
            ) : null}
            <Text style={styles.profilEmail}>{kullanici.email}</Text>
            <TouchableOpacity style={styles.cikisButon} onPress={cikisYap}>
              <Text style={styles.cikisMetin}>Çıkış Yap</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  yukleniyor: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  yukleniyorMetin: {
    color: '#6b6b7a',
    fontSize: fp(16),
  },
  girisContainer: {
    flex: 1,
  },
  girisScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: wp(24),
    paddingTop: hp(80),
  },
  girisCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: wp(24),
    padding: wp(28),
  },
  girisBaslik: {
    color: '#e8e8ed',
    fontSize: fp(28),
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: hp(8),
  },
  girisAltBaslik: {
    color: '#6b6b7a',
    fontSize: fp(15),
    textAlign: 'center',
    marginBottom: hp(24),
  },
  girisTablar: {
    flexDirection: 'row',
    marginBottom: hp(24),
    backgroundColor: '#0f0f1a',
    borderRadius: wp(12),
    padding: wp(4),
  },
  girisTab: {
    flex: 1,
    paddingVertical: hp(10),
    alignItems: 'center',
    borderRadius: wp(10),
  },
  girisTabAktif: {
    backgroundColor: '#2d2d44',
  },
  girisTabMetin: {
    color: '#6b6b7a',
    fontSize: fp(15),
  },
  girisTabMetinAktif: {
    color: '#e8e8ed',
    fontWeight: '600',
  },
  girisLabel: {
    color: '#a0a0ad',
    fontSize: fp(14),
    fontWeight: '500',
    marginBottom: hp(8),
    marginLeft: wp(4),
  },
  girisInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f0f1a',
    borderRadius: wp(16),
    paddingHorizontal: wp(18),
    marginBottom: hp(20),
    borderWidth: 1,
    borderColor: '#2d2d44',
  },
  girisInputIcon: {
    marginRight: wp(12),
  },
  girisInput: {
    flex: 1,
    paddingVertical: hp(16),
    fontSize: fp(16),
    color: '#e8e8ed',
  },
  authHata: {
    color: '#e84a5f',
    fontSize: fp(14),
    marginBottom: hp(16),
    textAlign: 'center',
  },
  girisButon: {
    backgroundColor: '#2d2d44',
    borderRadius: wp(16),
    paddingVertical: hp(16),
    alignItems: 'center',
    marginBottom: hp(12),
  },
  girisButonMetin: {
    color: '#e8e8ed',
    fontSize: fp(17),
    fontWeight: '600',
  },
  kayitButon: {
    paddingVertical: hp(12),
    alignItems: 'center',
  },
  kayitButonMetin: {
    color: '#6b6b7a',
    fontSize: fp(15),
  },
  ust: {
    paddingHorizontal: wp(16),
    paddingTop: hp(12),
    paddingBottom: wp(12),
  },
  ustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(12),
  },
  aramaAlan: {
    flex: 1,
  },
  profilButon: {
    padding: wp(4),
  },
  aramaWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: wp(16),
    paddingHorizontal: wp(16),
  },
  aramaIcon: {
    marginRight: wp(12),
  },
  aramaInput: {
    flex: 1,
    paddingVertical: hp(14),
    fontSize: fp(16),
    color: '#e8e8ed',
  },
  aramaButon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: wp(16),
    paddingHorizontal: wp(16),
    paddingVertical: hp(14),
  },
  aramaPlaceholder: {
    color: '#6b6b7a',
    fontSize: fp(16),
  },
  orta: {
    flex: 1,
  },
  liste: {
    padding: wp(16),
    paddingBottom: hp(24),
  },
  bosMetin: {
    color: '#6b6b7a',
    textAlign: 'center',
    marginTop: hp(48),
    fontSize: fp(16),
  },
  aniKarti: {
    backgroundColor: '#1a1a2e',
    borderRadius: wp(20),
    padding: wp(18),
    marginBottom: hp(12),
  },
  aniBaslik: {
    color: '#e8e8ed',
    fontSize: fp(18),
    fontWeight: '600',
    marginBottom: hp(6),
  },
  aniMetin: {
    color: '#a0a0ad',
    fontSize: fp(15),
    lineHeight: fp(22),
    marginBottom: hp(8),
  },
  aniTarih: {
    color: '#6b6b7a',
    fontSize: fp(13),
  },
  aniKartFotolar: {
    marginBottom: hp(8),
    marginHorizontal: -wp(2),
  },
  aniKartFotoWrapper: {
    marginRight: wp(6),
  },
  aniKartFoto: {
    width: wp(36),
    height: wp(36),
    borderRadius: wp(8),
  },
  aniDetayArkaplan: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: wp(24),
  },
  aniDetayKart: {
    backgroundColor: '#1a1a2e',
    borderRadius: wp(24),
    padding: wp(24),
    maxHeight: '80%',
  },
  aniDetayBaslik: {
    color: '#e8e8ed',
    fontSize: fp(22),
    fontWeight: '600',
    marginBottom: hp(16),
  },
  aniDetayScrollWrap: {
    maxHeight: hp(500),
  },
  aniDetayFotolar: {
    marginBottom: hp(16),
    minHeight: wp(64),
  },
  aniDetayFotoKucuk: {
    width: wp(56),
    height: wp(56),
    borderRadius: wp(10),
    marginRight: wp(8),
  },
  fotoBuyukArkaplan: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fotoBuyuk: {
    width: '100%',
    height: '80%',
  },
  fotoBuyukKapat: {
    position: 'absolute',
    top: hp(60),
    right: wp(20),
  },
  aniDetayMetin: {
    color: '#a0a0ad',
    fontSize: fp(16),
    lineHeight: fp(26),
    marginBottom: hp(16),
  },
  aniDetayBos: {
    color: '#6b6b7a',
    fontSize: fp(15),
    marginBottom: hp(16),
  },
  aniDetayTarih: {
    color: '#6b6b7a',
    fontSize: fp(14),
    marginBottom: hp(20),
  },
  aniDetayButonlar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(12),
  },
  aniDetaySil: {
    backgroundColor: '#e84a5f',
    borderRadius: wp(12),
    padding: wp(10),
  },
  aniDetayKapat: {
    flex: 1,
    backgroundColor: '#2d2d44',
    borderRadius: wp(16),
    paddingVertical: hp(14),
    alignItems: 'center',
  },
  aniDetayKapatMetin: {
    color: '#e8e8ed',
    fontSize: fp(16),
    fontWeight: '600',
  },
  alt: {
    padding: wp(16),
    paddingTop: hp(12),
  },
  ekleButon: {
    backgroundColor: '#2d2d44',
    borderRadius: wp(20),
    paddingVertical: hp(16),
    alignItems: 'center',
  },
  ekleMetin: {
    color: '#e8e8ed',
    fontSize: fp(17),
    fontWeight: '600',
  },
  modalArkaplan: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalIcerik: {
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: wp(24),
    borderTopRightRadius: wp(24),
    padding: wp(24),
    paddingBottom: hp(40),
  },
  modalBaslik: {
    color: '#e8e8ed',
    fontSize: fp(22),
    fontWeight: '600',
    marginBottom: hp(20),
  },
  modalInput: {
    backgroundColor: '#0f0f1a',
    borderRadius: wp(16),
    paddingHorizontal: wp(18),
    paddingVertical: hp(14),
    fontSize: fp(16),
    color: '#e8e8ed',
    marginBottom: hp(12),
  },
  modalTextArea: {
    minHeight: hp(120),
    textAlignVertical: 'top',
  },
  fotoEkleButon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f0f1a',
    borderRadius: wp(16),
    padding: wp(14),
    marginBottom: hp(12),
    gap: wp(10),
  },
  fotoEkleMetin: {
    color: '#6b6b7a',
    fontSize: fp(15),
  },
  fotoOnizlemeListe: {
    marginBottom: hp(12),
    maxHeight: hp(90),
  },
  fotoOnizlemeWrapper: {
    marginRight: wp(8),
    position: 'relative',
  },
  fotoOnizleme: {
    width: wp(70),
    height: wp(70),
    borderRadius: wp(12),
  },
  fotoKaldirButon: {
    position: 'absolute',
    top: -wp(6),
    right: -wp(6),
  },
  modalButonlar: {
    flexDirection: 'row',
    gap: wp(12),
    marginTop: hp(16),
  },
  modalButon: {
    flex: 1,
    borderRadius: wp(16),
    paddingVertical: hp(14),
    alignItems: 'center',
  },
  iptalButon: {
    backgroundColor: '#2d2d44',
  },
  iptalMetin: {
    color: '#a0a0ad',
    fontSize: fp(16),
  },
  kaydetButon: {
    backgroundColor: '#2d2d44',
  },
  kaydetMetin: {
    color: '#e8e8ed',
    fontSize: fp(16),
    fontWeight: '600',
  },
  profilArkaplan: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  profilIcerik: {
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: wp(24),
    borderTopRightRadius: wp(24),
    padding: wp(28),
    paddingBottom: hp(50),
    alignItems: 'center',
  },
  profilBaslik: {
    color: '#e8e8ed',
    fontSize: fp(20),
    fontWeight: '600',
    marginBottom: hp(20),
    alignSelf: 'stretch',
    textAlign: 'center',
  },
  profilAvatar: {
    width: wp(96),
    height: wp(96),
    borderRadius: wp(48),
    backgroundColor: '#0f0f1a',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp(16),
  },
  profilIsim: {
    color: '#e8e8ed',
    fontSize: fp(20),
    fontWeight: '600',
    marginBottom: hp(4),
  },
  profilEmail: {
    color: '#e8e8ed',
    fontSize: fp(18),
    fontWeight: '600',
    marginBottom: hp(24),
  },
  cikisButon: {
    backgroundColor: '#e84a5f',
    borderRadius: wp(16),
    paddingVertical: hp(14),
    paddingHorizontal: wp(48),
    marginTop: hp(24),
  },
  cikisMetin: {
    color: '#fff',
    fontSize: fp(16),
    fontWeight: '600',
  },
  kapatButon: {
    paddingVertical: hp(10),
  },
  kapatMetin: {
    color: '#6b6b7a',
    fontSize: fp(15),
  },
});
