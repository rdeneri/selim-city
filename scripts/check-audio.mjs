/**
 * Oyun ses dosyalarını kontrol eder: npm run check-audio (ve her derlemeden önce otomatik).
 * Eksik dosya derlemeyi DURDURMAZ; uygulama eksik sesler yerine önceki seslendirmeyi kullanır.
 */
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = join(process.cwd(), 'public', 'audio');
const expected = {
  basari: [
    'aferin_selim_erdem_harika_okudun.mp3',
    'bravo_heceleri_cok_guzel_birlestirdin.mp3',
    'bugun_harika_calistin_selim_erdem_seninle_gurur_duyuyorum.mp3',
    'cok_guzel_denedin_boyle_devam_et.mp3',
    'gorev_tamamlandi_harika_bir_is_cikardin.mp3',
    'harikasin_sehrine_yeni_bir_araba_kazandin.mp3',
    'hazirmisin_simdi_yeni_bir_gorev_basliyor.mp3',
    'okuma_macerana_hos_geldin.mp3',
    'supersin_selim.mp3',
    'supriz_gizemli_hediyenin_yeni_bir_parcasi_acildi.mp3',
    'tebrikler_selim_sehrine_yeni_bir_araba_kazandin.mp3',
    'vay_canina_selim_city_buyumeye_devam_ediyor.mp3',
    'yasasin_yeni_bir_yildiz_kazandin.mp3',
  ],
  oyun_ici_cumleler: [
    'aferin_selim_erdem_cok_guzel_okudun.mp3',
    'bu_kelimeyi_bir_kez_daha_deneyelim.mp3',
    'harikasin_bir_kelime_daha_ogrendin.mp3',
    'haydi_birlikte_okumaya_baslayalim.mp3',
    'haydi_kelime_carkini_cevirelim.mp3',
    'hic_acele_etme_istedigin_kadar_tekrar_edebilirsin.mp3',
    'merhaba_selim_erdem_yeni_bir_maceraya_hazirmisin.mp3',
    'once_ben_okuyacagim_sonra_sen_dene.mp3',
    'once_heceleri_dinle_sonra_sen_oku.mp3',
    'simdi_kelimenin_resmine_bakalim.mp3',
    'simdi_sira_sende.mp3',
    'yeni_bir_gorev_seni_bekliyor.mp3',
  ],
};

let found = 0, total = 0, bytes = 0;
const missing = [], caseMismatch = [], extra = [];
for (const [dir, files] of Object.entries(expected)) {
  const d = join(root, dir);
  const present = existsSync(d) ? readdirSync(d) : [];
  for (const f of files) {
    total++;
    if (present.includes(f)) {
      found++;
      bytes += statSync(join(d, f)).size;
    } else {
      const alt = present.find((p) => p.toLowerCase() === f.toLowerCase());
      if (alt) caseMismatch.push(`${dir}/${alt}  →  beklenen: ${f}`);
      else missing.push(`${dir}/${f}`);
    }
  }
  for (const p of present) if (!files.includes(p) && !files.some((f) => f.toLowerCase() === p.toLowerCase())) extra.push(`${dir}/${p}`);
}

console.log(`[ses] ${found}/${total} dosya bulundu (${(bytes / 1024).toFixed(0)} KB).`);
if (caseMismatch.length) console.warn('[ses] Büyük/küçük harf farkı (Vercel/Linux bunları bulamaz):\n  ' + caseMismatch.join('\n  '));
if (missing.length) console.warn('[ses] Eksik (yerine önceki seslendirme kullanılır):\n  ' + missing.join('\n  '));
if (extra.length) console.log('[ses] Kullanılmayan dosyalar:\n  ' + extra.join('\n  '));
