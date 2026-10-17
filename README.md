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
- Doğal Türkçe nöral ses (Microsoft Azure, tr-TR-EmelNeural): Öğretmen ve Oyun anlatıcısı rolleri; erişilemezse cihaz sesine otomatik dönüş
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

## 4a. Oyun içi sesler (hazır MP3 dosyaları)

Tebrik, ödül, motivasyon ve yönlendirme cümleleri `public/audio/` içindeki hazır MP3 dosyalarıyla çalınır. Harf, hece ve kelime telaffuzu bu dosyalarla **değişmez**; onlar her zaman öğretmen sesiyle (cihaz sesi veya Azure) okunur. API anahtarı gerekmez.

**Klasörler:** `public/audio/basari/` (13 dosya) ve `public/audio/oyun_ici_cumleler/` (12 dosya). Dosya adları koddakiyle birebir aynı olmalıdır (küçük harf, `.mp3`). Vercel Linux üzerinde çalışır ve büyük/küçük harf farkını ayırt eder.

**Kontrol:** `npm run check-audio` hangi dosyaların bulunduğunu, eksik olduğunu veya harf farkı olduğunu listeler. Bu kontrol her `npm run build` öncesinde de otomatik çalışır. Eksik dosya derlemeyi durdurmaz; uygulama o cümleyi önceki seslendirmeyle söyler. Ebeveyn paneli › Ses ve okuma › **Ses dosyalarını kontrol et** aynı kontrolü yayındaki uygulamada yapar.

**GitHub'a göndermeyi unutmayın:**

```bash
git add public/audio
git commit -m "Oyun içi ses dosyaları"
git push
```

**Hangi olayda hangi ses çalar**

| Olay | Dosya |
|---|---|
| İlk açılış (bir kez) | okuma_macerana_hos_geldin |
| Sonraki açılışlar | merhaba_selim_erdem_yeni_bir_maceraya_hazirmisin |
| Doğru okuma (sırayla, tekrar etmeden) | aferin_selim_erdem_harika_okudun, aferin_selim_erdem_cok_guzel_okudun, supersin_selim, yasasin_yeni_bir_yildiz_kazandin; kelimelerde ayrıca harikasin_bir_kelime_daha_ogrendin |
| Bugün yıldızı alınmış kelimeyi yeniden okuma (karaoke) | yukarıdakiler, yıldız sesi hariç |
| Zorlandıktan sonra doğru okuma | cok_guzel_denedin_boyle_devam_et |
| Heceleri birleştirme (Yapı Atölyesi) | bravo_heceleri_cok_guzel_birlestirdin |
| İlk yanlış (kelime) | bu_kelimeyi_bir_kez_daha_deneyelim |
| İkinci ve sonraki yanlışlar | hic_acele_etme_istedigin_kadar_tekrar_edebilirsin |
| Okuma Okulu açılışı | haydi_birlikte_okumaya_baslayalim |
| Kelime Çarkı açılışı | haydi_kelime_carkini_cevirelim |
| "Birlikte okuyalım" (hece çalışması) | once_heceleri_dinle_sonra_sen_oku |
| Karaoke "Dinle ve takip et" (girişte bir kez) | once_ben_okuyacagim_sonra_sen_dene |
| Çocuğun okuma sırası | simdi_sira_sende |
| Karaokede ilk anlam görseli | simdi_kelimenin_resmine_bakalim |
| Görev tamamlandı | gorev_tamamlandi_harika_bir_is_cikardin |
| Görev penceresi kapanınca | hazirmisin_simdi_yeni_bir_gorev_basliyor |
| Oyundan haritaya dönüş, görev başlamamışsa | yeni_bir_gorev_seni_bekliyor |
| Gizemli hediye parçası | supriz_gizemli_hediyenin_yeni_bir_parcasi_acildi |
| Araba ödülü (iki kayıttan biri) | harikasin_sehrine_yeni_bir_araba_kazandin, tebrikler_selim_sehrine_yeni_bir_araba_kazandin |
| Diğer şehir nesneleri | vay_canina_selim_city_buyumeye_devam_ediyor |
| Günlük süre doldu | bugun_harika_calistin_selim_erdem_seninle_gurur_duyuyorum |

**Öncelik:** Aynı anda birden fazla ödül olursa yalnızca en önemlisi çalar (hediye parçası > araba > şehir > görev > günlük son > karşılama > yıldız > tebrik > yönerge). Daha önemli bir ses çalarken gelen önemsiz ses atlanır; sesler üst üste binmez.

**iPad ve çevrimdışı:** Sesler yalnızca bir dokunuştan sonra başlar. İlk dokunuştan birkaç saniye sonra dosyalar bir kez indirilip uygulama önbelleğine (`selim-audio`, en fazla 40 dosya, 180 gün) yazılır; sonra internetsiz çalar. Ses dosyaları kurulum paketine eklenmez, uygulamanın ilk yüklenmesi hafif kalır. Ses düzeyi iPad'de de çalışır (Web Audio ile).

**Ebeveyn ayarları:** Ebeveyn paneli › Ses ve okuma › **Oyun içi sesler**: yönlendirme sesleri açık/kapalı, başarı sesleri açık/kapalı, ses düzeyi, örnek dinleme. Kapalıyken MP3 çalınmaz; o cümleler önceki seslendirmeyle söylenir.

## 4b. Doğal ses (Microsoft Azure AI Speech) kurulumu

Uygulama, Azure'un Türkçe nöral seslerini (varsayılan **tr-TR-EmelNeural**) kullanabilir. Azure anahtarı **yalnızca Vercel sunucu fonksiyonunda** (`api/tts.ts`) ortam değişkeninden okunur; tarayıcıya, React koduna veya GitHub'a hiçbir zaman girmez. Anahtar tanımlanmazsa uygulama cihazın kendi sesiyle çalışmaya devam eder.

**1. Azure'da Speech kaynağı oluşturun**

1. https://portal.azure.com adresinde **Create a resource › Speech** (Azure AI services altında) seçin.
2. Bölge: **West Europe** (veya size yakın bir bölge). Fiyat katmanı: **Free F0** önerilir: ayda 500.000 karakter nöral ses ücretsizdir ve kota dolduğunda hizmet durur, ek fatura çıkmaz.
3. Kaynak oluşunca **Keys and Endpoint** sayfasından **KEY 1** ve **Location/Region** değerini not edin.

**2. Anahtarı Vercel'e girin (koda değil)**

1. Vercel'de projenizi açın: **Settings › Environment Variables**.
2. Şu iki değişkeni ekleyin (Production ve Preview işaretli):
   - `AZURE_SPEECH_KEY` = KEY 1 değeri
   - `AZURE_SPEECH_REGION` = bölge (ör. `westeurope`)
3. **Deployments** sekmesinden son yayını **Redeploy** edin.
4. Tarayıcıda `https://adresiniz/api/tts?health=1` açın. `{"configured":true}` görmelisiniz. Anahtar bu yanıtta asla gösterilmez.

**3. iPad'de**

1. Ebeveyn paneli › **Ses ve okuma** › "Bağlı: doğal Azure sesleri kullanılıyor." yazısını görün.
2. Öğretmen ve Oyun anlatıcısı için ses, hız, ton ve ses düzeyini ayarlayıp **Örnek sesi dinle** ile deneyin.
3. **Sesleri önceden hazırla**'ya dokunun. Onaylı tüm harf, hece, kelime ve tebrik sesleri bir kez indirilip iPad'de saklanır; sonra anında ve internetsiz çalar. Ayarları değiştirdiğinizde veya yeni kelime eklediğinizde tekrar dokunun.

**Bilgisayarda deneme:** `.env.example` dosyasını `.env.local` adıyla kopyalayıp anahtarı oraya yazın (`.env.local` Git'e eklenmez), sonra `npm run dev`.

**Güvenlik ve maliyet**

- Anahtarı kod dosyalarına, GitHub'a veya bir sohbete yazmayın. Anahtar açığa çıkarsa Azure'da **Regenerate Key 1** ile yenileyip Vercel'deki değeri güncelleyin.
- `/api/tts` yalnızca uygulamanın kendi sayfasından gelen istekleri kabul eder, metin uzunluğunu (220 karakter) ve ses adını sınırlar, basit hız sınırı uygular.
- Üretilen sesler Vercel CDN'inde ve iPad'de önbelleğe alınır; aynı ses için Azure'a tekrar istek gitmez.
- Netlify'da bu sunucu fonksiyonu yoktur; Netlify'da yayınlarsanız uygulama cihaz sesiyle çalışır.

**Gizlilik:** Seslendirilecek metin (çocuğun adı, kelimeler, tebrikler) ses üretimi için Microsoft Azure'a gönderilir. Mikrofon bu özellikte kullanılmaz; çocuğun sesi hiçbir yere gönderilmez.

**Nasıl çalışır:** Her hece ve kelimenin tamamı ayrı ses dosyası olarak üretilir. Karaoke vurgusu, o hecenin sesi gerçekten çalmaya başladığında (`playing` olayı) başlar ve ses bittiğinde (`ended` olayı) yeşile döner; tahmini süre kullanılmaz. Bulut erişilemezse (internet yok, anahtar yok, hata) o ses için cihazın `speechSynthesis` sesi kullanılır ve 60 saniye boyunca buluta tekrar denenmez.

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

### Önemli: Her zaman ana adresi kullanın

Tarayıcılar verileri **adrese göre** ayrı saklar. Vercel her yayına `selim-city-abc123xyz-kullanici.vercel.app` gibi ayrı bir adres verir; bu adresler hiç güncellenmez. Uygulamayı yalnızca Vercel'deki **ana adresten** (Domains satırı) açın ve iPad'e oradan ekleyin. Uygulama yayına özel bir adreste açıldığını fark ederse ebeveyne uyarı gösterir. Adres değiştirmeniz gerekirse önce eski adreste **tam yedek** alıp yeni adreste geri yükleyin.

### Veri güvenliği

- Ana veri deposu IndexedDB'dir; hızlı açılış için localStorage'da ikinci bir kopya tutulur.
- Her güncellemeden ve yeni uygulama sürümünden önce, ayrıca her gün bir kez, bu cihaza **otomatik kopya** alınır (son 8 kopya). Sıfırlama, tümünü silme ve yedekten geri yükleme öncesinde de kopya alınır.
- Veri biçimi değişirse eski kayıtlar yeni biçime dönüştürülür; hiçbir kayıt silinmez. Dönüştürülemeyen kayıtlar ayrı bir "legacy" alanında saklanır.
- Açılışta içerik listesi boşsa ama cihazda dolu bir kopya varsa, başlangıç ekranında ebeveyne geri yükleme önerilir (PIN ile).
- Ebeveyn paneli › **Yedek** › **Veri durumu**: içerik sayıları, son kayıt, son manuel yedek ve son güncelleme tarihleri, kalıcı depolama durumu ve otomatik kopyalar (indir veya geri yükle).
- "Deneme için örnekleri ekle" ile eklenenler "Örnek" olarak işaretlenir; ebeveynin girdiği içerikten ayrı görünür. Uygulama hiçbir içeriği kendiliğinden değiştirmez veya silmez.
- Otomatik kopyalar aynı cihazdadır. Cihaz kaybına veya Safari verilerinin silinmesine karşı ayda bir **tam yedek** dosyası alın.

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
├── api/tts.ts            Vercel sunucu fonksiyonu: Azure seslendirme (anahtar yalnızca burada)
├── .env.example          Yerel deneme için ortam değişkeni şablonu
├── vercel.json           Vercel: derleme, önbellek ve güvenlik başlıkları
├── netlify.toml          Netlify: aynı ayarlar
├── public/               Uygulama simgeleri (192, 512, maskable, apple-touch-icon)
├── public/audio/         Hazır oyun içi MP3 sesleri (basari/, oyun_ici_cumleler/)
├── scripts/check-audio.mjs Ses dosyası kontrolü (npm run check-audio, derleme öncesi otomatik)
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
