# Selim City – Okuma Macerası

İlkokul 1. sınıf için Türkçe hece ve kelime okuma oyunu. React + TypeScript + Three.js ile yazılmış, iPad'de ana ekrana eklenip tam ekran ve internetsiz çalışan bir PWA'dır.

## İçindekiler

1. Özellikler
2. Gereksinimler
3. Bilgisayarda çalıştırma
4. İnternette yayınlama (Vercel / Netlify)
5. iPad'e kurulum
6. Mevcut verileri taşıma
7. iPad Safari notları
8. Çevrimdışı kullanım
9. Proje yapısı
10. Bilinen sınırlar

## 1. Özellikler

- 3D Selim City haritası: binalar, görevler, kilitli bölgeler, araba ve karakter özelleştirme
- Oyunlar: Hece Çarkı, Kelime Çarkı, Heceleri Birleştir (Yapı Atölyesi), Duy ve Bul (Ses İstasyonu), Karaoke Sahnesi
- Karaoke okuma: heceler sırayla renklenir (okunan mavi, biten yeşil); Dinle ve Takip Et, Ben Okuyorum, Dokunarak Oku modları
- Kelimeyi oku, görseli aç: 21 kelime için hazır blok illüstrasyon, diğerleri için kelime kartı, ebeveyn kendi görselini yükleyebilir
- Kelime Parkı: ARABA, EV, AĞAÇ, KALE, ÇİÇEK/LALE, TOP okununca şehirde kalıcı nesneler belirir
- Heceleyerek ve vurgulayarak Türkçe seslendirme, ebeveynin kendi sesiyle kayıt
- Mikrofonla okuma kontrolü ve ebeveyn onaylı karar (Doğru Okudu / Tekrar Denesin / Atla)
- Gizemli Hediye: ebeveynin yüklediği fotoğraf, görevlerle parça parça açılır
- PIN korumalı ebeveyn paneli, raporlar, tam yedek (fotoğraf ve ses kayıtları dahil)
- Veriler cihazda IndexedDB'de saklanır; reklam, satın alma veya ücretli API yoktur

## 2. Gereksinimler

- Node.js 18 veya üstü (önerilen: 20)
- npm (Node.js ile gelir)
- Yayınlamak için ücretsiz bir Vercel veya Netlify hesabı
- Hedef cihaz: iPadOS 15 veya üstü, Safari

## 3. Bilgisayarda çalıştırma

```bash
npm install
npm run dev
```

Tarayıcıda `http://localhost:5173` açılır.

Production derlemesini denemek için:

```bash
npm run build
npm run preview
```

Derleme `dist/` klasörüne çıkar. Bu klasör, herhangi bir HTTPS sunucusunda yayınlanabilen statik dosyalardan oluşur.

**iPad'den yerel ağ üzerinden test:** `npm run dev` komutu bilgisayarın ağ adresini de yazar (ör. `http://192.168.1.20:5173`). iPad bu adresi açabilir; ancak HTTPS olmadığı için mikrofon, ana ekrana ekleme ve çevrimdışı mod çalışmaz. Bunları denemek için aşağıdaki yöntemlerle yayınlayın.

## 4. İnternette yayınlama

Proje Vercel ve Netlify için hazırdır: `vercel.json` ve `netlify.toml` derleme ayarlarını, service worker önbellek kurallarını ve güvenlik başlıklarını (CSP, mikrofon izni politikası) içerir. İkisi de ücretsiz HTTPS adresi verir.

### Seçenek A: Vercel

**GitHub ile (önerilen, güncellemeler otomatik yayınlanır):**

1. Bu klasörü GitHub'da yeni bir depoya yükleyin (`node_modules` ve `dist` hariç; `.gitignore` bunu zaten yapar).
2. https://vercel.com adresinde **Add New › Project** seçin ve depoyu içe aktarın.
3. Ayarlar otomatik algılanır (Framework: Vite, Build: `npm run build`, Output: `dist`). **Deploy**'a basın.
4. Birkaç dakika içinde `https://proje-adi.vercel.app` gibi bir adres verilir.

**Komut satırıyla:**

```bash
npm install -g vercel
vercel          # ilk kez: hesap ve proje sorularını yanıtlayın
vercel --prod   # canlı yayın
```

### Seçenek B: Netlify

**Sürükle-bırak (en kolay):**

1. `npm install` ve `npm run build` komutlarını çalıştırın.
2. https://app.netlify.com/drop adresini açın.
3. `dist` klasörünü sayfaya sürükleyin.

Bu yöntemde `netlify.toml` içindeki başlıklar uygulanmaz. Uygulama yine çalışır, ancak kalıcı kullanım için aşağıdaki GitHub yöntemi önerilir.

**GitHub ile:** Netlify'da **Add new site › Import an existing project** seçin, depoyu bağlayın. Ayarlar `netlify.toml` dosyasından okunur.

**Komut satırıyla:**

```bash
npm install -g netlify-cli
netlify deploy --build --prod
```

### Kendi alan adınız

Vercel ve Netlify panellerinden kendi alan adınızı (ör. `selimcity.example.com`) ekleyebilirsiniz; HTTPS sertifikası otomatik verilir.

## 5. iPad'e kurulum

1. iPad'de **Safari** ile yayın adresini açın. Ana ekrana ekleme yalnızca Safari'de çalışır.
2. Paylaş düğmesine (yukarı ok içeren kare) dokunun.
3. **Ana Ekrana Ekle**'yi seçin ve **Ekle**'ye dokunun.
4. Ana ekrandaki **Selim City** simgesiyle açın. Uygulama tam ekran, adres çubuğu olmadan açılır.
5. İlk açılışta **BAŞLA**'ya dokunun; seslendirme bu dokunuşla etkinleşir.
6. Ebeveyn panelinden (sağ üstteki kilit) PIN belirleyin ve içerikleri ekleyin.

Ana ekrana eklenen uygulamanın verileri, Safari sekmesindeki sürümden ayrı tutulur. Kurulumu yaptıktan sonra uygulamayı her zaman ana ekran simgesinden açın.

## 6. Mevcut verileri taşıma

### Claude önizlemesinden bu uygulamaya

Claude'daki önizleme ile bu uygulama farklı adreslerde çalıştığı için veriler kendiliğinden geçmez. Tam yedekle taşıyın:

1. Claude önizlemesinde ebeveyn paneli › **Yedek** › "Hediye fotoğrafı, profil fotoğrafı ve ses kayıtlarını da ekle" kutusu işaretliyken **Yedeği indir**.
2. Dosyayı iPad'e aktarın (ör. Dosyalar uygulaması, AirDrop veya iCloud Drive).
3. Ana ekrandaki uygulamada ebeveyn paneli › **Yedek** › **Yedeği geri yükle** › **Dosya seç** ile dosyayı seçin ve onaylayın.

Yedek; içerikleri, ilerlemeyi, yıldızları, hediye kartını, ayarları, fotoğrafları ve ses kayıtlarını taşır. PIN güvenlik nedeniyle yedeğe girmez, yeni cihazda yeniden belirlenir.

### Yeni sürümlere geçiş

- Yeni bir sürüm yayınladığınızda service worker onu arka planda indirir; uygulama bir sonraki açılışta güncellenir.
- Veriler cihazda kalır. Kayıtlı veriler, yeni sürümün beklediği yapıya her açılışta otomatik uyarlanır (`migrate` işlevi; veri şeması sürümü `version: 2`). Eksik alanlar varsayılanlarla doldurulur, mevcut veriler silinmez.
- Büyük güncellemelerden önce yine de tam yedek almanız önerilir.

### Saklama ve güvenlik

- Ana veri deposu IndexedDB'dir; hızlı açılış için localStorage'da bir kopya tutulur.
- Uygulama tarayıcıdan kalıcı depolama ister. Safari, ana ekrana eklenmemiş sitelerin verilerini uzun süre kullanılmazsa silebilir; ana ekrana eklenen uygulamalar bu kuraldan muaftır. Yine de ayda bir tam yedek almak iyi bir alışkanlıktır.

## 7. iPad Safari notları

**Seslendirme:** Türkçe ses iPad'de yerleşiktir ve internetsiz çalışır. Daha doğal bir ses için Ayarlar › Erişilebilirlik › Seslendirilen İçerik › Sesler › Türkçe bölümünden sesin "Gelişmiş" veya "Premium" sürümünü indirin. Uygulama en kaliteli Türkçe sesi otomatik seçer.

**Konuşma tanıma (mikrofonla okuma kontrolü):**

- iPad'de Siri ve Dikte'nin açık olmasını gerektirir (Ayarlar › Genel › Klavye › Dikteyi Etkinleştir) ve genellikle internet bağlantısı ister.
- Ana ekrandan açılan uygulamalarda Safari'nin konuşma tanıması bazı iPadOS sürümlerinde çalışmayabilir.
- Konuşma tanıma kullanılamazsa uygulama durmaz; ebeveyn düğmeleriyle devam eder. Ebeveyn paneli › Ayarlar › **Mikrofon iznini şimdi iste** ile izni önceden verebilirsiniz.
- Ses kaydı (ebeveynin kendi sesi) konuşma tanımadan bağımsızdır ve mikrofon izni verildiğinde çalışır.

**Ekran yönü:** Hem dikey hem yatay desteklenir. Yatayda oyunlar iki sütunlu düzene geçer.

## 8. Çevrimdışı kullanım

İlk açılıştan sonra uygulama dosyaları (yaklaşık 1,2 MB: kod, 3D kütüphane, fontlar, simgeler) önbelleğe alınır.

**İnternet olmadan çalışanlar:**

- Harita ve tüm okuma oyunları
- Seslendirme
- Ebeveyn düğmeleri
- Kayıtlı ses ve fotoğraflar
- Yedek alma

**İnternet gerektirenler:**

- Konuşma tanıma
- Uygulama güncellemeleri

## 9. Proje yapısı

```
├── index.html            iPad meta etiketleri (tam ekran, durum çubuğu, simge)
├── vite.config.ts        Derleme ve PWA ayarları (manifest.json, service worker)
├── vercel.json           Vercel: derleme, önbellek ve güvenlik başlıkları
├── netlify.toml          Netlify: aynı ayarlar
├── public/               Uygulama simgeleri (192, 512, maskable, apple-touch-icon)
├── scripts/make_icons.py Simgeleri yeniden üretme betiği (Python + Pillow)
└── src/
    ├── main.tsx          Giriş: fontlar, stiller, service worker kaydı
    ├── app.tsx           Uygulamanın tamamı (oyunlar, 3D şehir, ebeveyn paneli)
    └── style.css         Tüm stiller (dokunmatik ve yatay ekran düzenleri dahil)
```

`manifest.json` ve service worker (`sw.js`), derleme sırasında `vite-plugin-pwa` tarafından `vite.config.ts`'teki ayarlardan üretilir ve `dist/` içine yazılır.

## 10. Karaoke Sahnesi notları

- Renk geçişleri seslendirme olaylarına bağlıdır: her hece ayrı seslendirilir, hece seslendirme başladığında mavi, bittiğinde yeşil olur.
- "Ben Okuyorum" modunda mikrofonun ara sonuçlarından hangi hecelere ulaşıldığı tahmin edilir; bu kesin bir telaffuz ölçümü değildir. Konuşma tanıma yoksa ebeveyn "Sonraki Hece" ile takip eder. Son karar her zaman ebeveynindir.
- Yalnızca dinlemek veya heceye dokunmak doğru okuma sayılmaz; başarı mikrofonun kelimeyi tanıması veya ebeveynin "Doğru Okudu" demesiyle kaydedilir.
- Aynı kelime aynı gün içinde yalnızca bir kez yıldız kazandırır; tekrar okumak yine kaydedilir ve övülür. Kelime Parkı nesneleri her kelime için bir kez kazanılır.
- Ebeveyn paneli › **Hece ve görsel**: otomatik hecelemeyi görme ve düzeltme (ör. `AN-NE`), kelimeye görsel yükleme (PNG, JPG, WebP; en fazla 15 MB), varsayılana dönme. Görseller IndexedDB'de saklanır ve tam yedeğe dahildir.

## 11. Bilinen sınırlar

- Uygulama kodu tek bir büyük dosyada (`src/app.tsx`, bölümlere ayrılmış). Çalışır durumdadır; ileride modüllere bölünebilir.
- TypeScript tür denetimi gevşek modda (`strict: false`). `npm run build` tür hatası olsa da derler; `npm run typecheck` uyarı verebilir.
- Seslendirme tarayıcının yerleşik sesidir; ücretli bir yapay zekâ ses servisi kullanılmaz.
- Testler masaüstünde Chromium ve WebKit (Safari motoru) ile iPad ekran boyutlarında yapıldı; gerçek iPad'de kısa bir deneme yapmanız önerilir.
- 
