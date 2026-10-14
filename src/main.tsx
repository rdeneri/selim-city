// Fontlar uygulamayla birlikte paketlenir (internet gerekmez). Türkçe karakterler için latin + latin-ext yeterli.
import '@fontsource/baloo-2/latin-500.css';
import '@fontsource/baloo-2/latin-ext-500.css';
import '@fontsource/baloo-2/latin-600.css';
import '@fontsource/baloo-2/latin-ext-600.css';
import '@fontsource/baloo-2/latin-700.css';
import '@fontsource/baloo-2/latin-ext-700.css';
import '@fontsource/baloo-2/latin-800.css';
import '@fontsource/baloo-2/latin-ext-800.css';
import '@fontsource/lilita-one/latin-400.css';
import '@fontsource/lilita-one/latin-ext-400.css';
import './style.css';
import { registerSW } from 'virtual:pwa-register';
import './app';

// Service worker: uygulama dosyalarını çevrimdışı kullanım için önbelleğe alır.
// Yeni sürüm yayınlandığında bir sonraki açılışta otomatik güncellenir.
registerSW({ immediate: true });
