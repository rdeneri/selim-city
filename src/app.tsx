/**
 * Selim City – Okuma Macerası
 * Tüm oyun mantığı, ekranlar ve 3D şehir bu dosyadadır.
 * Bölümler: Türler · Yardımcılar · Saklama · Ses · Oyunlar · 3D Dünya · Karaoke · Ebeveyn Paneli · Uygulama
 */
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import * as THREE from 'three';


/* ============================================================
   TÜRLER
   ============================================================ */
type ContentType = 'harf' | 'hece' | 'kelime' | 'cumle';
type Source = 'okul' | 'oneri';
type CheckMode = 'hybrid' | 'parent' | 'auto';
type Verifier = 'mic' | 'parent' | 'tap';
type Status = 'yeni' | 'gelisiyor' | 'pekistiriliyor' | 'tekrar';
type LetterCase = 'upper' | 'lower' | 'both' | 'mixed';
type Screen = 'start' | 'home' | 'game-hece' | 'game-kelime' | 'parent' | 'rest' | 'badges' | 'city' | 'avatar' | 'gift' | 'garage' | 'game-duy' | 'game-birlestir' | 'game-karaoke';

interface Item {
  id: string;
  type: ContentType;
  text: string;
  syllables?: string[];
  source: Source;
  learnedAt: string;
  approved: boolean;
  active: boolean;
  attempts: number;
  successes: number;
  micSuccesses: number;
  parentSuccesses: number;
  needsReview: boolean;
  lastStudied: string | null;
}

interface Settings {
  childName: string;
  checkMode: CheckMode;
  speechRate: number;
  sessionMinutes: number;
  animations: boolean;
  sounds: boolean;
  voiceURI: string;
  letterCase: LetterCase;
  starsPerMission: number;
  voicePreset: VoicePreset;
  readingStyle: ReadingStyle;
  contentRate: number;
  unitGap: number;
  profilePhotoV: number;
}

interface DayStat {
  seconds: number;
  sessions: number;
  attempts: number;
  successes: number;
  micVerified: number;
  parentVerified: number;
  tapVerified?: number;
}

interface AppState {
  version: number;
  updatedAt: number;
  pinHash: string | null;
  pinSalt: string;
  settings: Settings;
  items: Item[];
  totalStars: number;
  chests: number;
  badges: Record<string, number>;
  days: Record<string, DayStat>;
  city: CityState;
  gift: GiftCampaign | null;
  giftHistory: GiftRecord[];
  recordings: Recordings;
  wordImages: Record<string, number>;
  cityObjects: Record<string, { earnedAt: string; seen: boolean; word: string }>;
  karaokeLog: Record<string, string>;
}

interface Recordings {
  items: string[];
  praise: string[];
}

/* ============================================================
   SABİTLER
   ============================================================ */
const TYPE_LABEL: Record<ContentType, { one: string; many: string }> = {
  harf: { one: 'Harf', many: 'Harfler' },
  hece: { one: 'Hece', many: 'Heceler' },
  kelime: { one: 'Kelime', many: 'Kelimeler' },
  cumle: { one: 'Cümle', many: 'Cümleler' },
};

const STATUS_LABEL: Record<Status, string> = {
  yeni: 'Yeni öğreniliyor',
  gelisiyor: 'Gelişiyor',
  pekistiriliyor: 'Pekiştiriliyor',
  tekrar: 'Tekrar gerekli',
};

const BADGES = [
  { id: 'altin-yildiz', name: 'Altın yıldız', icon: '⭐' },
  { id: 'super-okuyucu', name: 'Süper okuyucu rozeti', icon: '📖' },
  { id: 'uzay-kasifi', name: 'Uzay kaşifi rozeti', icon: '🚀' },
  { id: 'aslan-cesareti', name: 'Aslan cesareti rozeti', icon: '🦁' },
  { id: 'okuma-kahramani', name: 'Okuma kahramanı madalyası', icon: '🏅' },
];

const STARS_PER_CHEST = 5;
const LS_KEY = 'okuma-macerasi:v1';

const MSG = {
  success: [
    'Aferin {ad}! Harika okudun!',
    'Süpersin {ad}!',
    'Vay canına! Sen bir okuma yıldızısın!',
    'Muhteşem! Bir yıldız daha kazandın!',
    'Çok güzel {ad}, devam edelim!',
    'Bugün gerçekten çok güzel çalışıyorsun!',
    'Harikasın! Seninle gurur duyuyorum!',
    'Yaşasın! Bir kelime daha öğrendin!',
  ],
  successHece: [
    'Aferin {ad}! Harika okudun!',
    'Süpersin {ad}!',
    'Vay canına! Sen bir okuma yıldızısın!',
    'Muhteşem! Bir yıldız daha kazandın!',
    'Çok güzel {ad}, devam edelim!',
    'Bugün gerçekten çok güzel çalışıyorsun!',
    'Harikasın! Seninle gurur duyuyorum!',
  ],
  retry: [
    'Çok güzel denedin, bir kez daha deneyelim.',
    'Acele etmene gerek yok.',
    'İstersen birlikte okuyalım.',
    'Bir daha deneyebilirsin {ad}.',
  ],
  unclear: [
    'Seni tam duyamadım. Bir kez daha okur musun?',
    'Sesin biraz karıştı, bir daha deneyelim mi?',
  ],
  karaoke: [
    'Aferin {ad}!',
    'Harikasın, bir kelime daha öğrendin!',
    'Muhteşem okudun!',
    'Süpersin {ad}!',
    'Çok güzel okudun {ad}!',
  ],
  ask: [
    'Haydi {ad}, bunu okuyabilir misin?',
  ],
  effort: [
    'Vazgeçmedin, tekrar denedin! Bir çaba yıldızı da senin!',
  ],
};

const SAMPLE: Record<ContentType, string[]> = {
  harf: ['A', 'E', 'L', 'N', 'İ', 'T'],
  hece: ['AL', 'EL', 'LA', 'LE', 'AN', 'EN'],
  kelime: ['ANNE', 'LALE', 'EL ELE'],
  cumle: [],
};

/* ============================================================
   YARDIMCILAR
   ============================================================ */
const trUpper = (s: string) => s.toLocaleUpperCase('tr-TR');
const trLower = (s: string) => s.toLocaleLowerCase('tr-TR');
const LETTER_CLASS = 'A-Za-zÇçĞğIıİiÖöŞşÜüÂâÎîÛû';
const VOWELS = 'AEIİOÖUÜÂÎÛ';

function normalize(s: string): string {
  return trUpper(s)
    .replace(/[^A-ZÇĞIİÖŞÜÂÎÛ0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function uid(): string {
  try {
    if (crypto && (crypto as any).randomUUID) return (crypto as any).randomUUID();
  } catch (e) { /* yoksay */ }
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

function todayKey(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

function caseForms(t: string): { upper: string; lower: string } {
  return { upper: trUpper(t), lower: trLower(t) };
}

const CASE_LABEL: Record<LetterCase, string> = {
  both: 'İkisi birlikte',
  upper: 'Büyük harf',
  lower: 'Küçük harf',
  mixed: 'Karışık (her turda biri)',
};

function CaseText({ text, mode, className }: { text: string; mode: 'upper' | 'lower' | 'both'; className?: string }) {
  const f = caseForms(text);
  if (mode === 'upper') return <span className={className}>{f.upper}</span>;
  if (mode === 'lower') return <span className={className}>{f.lower}</span>;
  return (
    <span className={'case-both ' + (className || '')}>
      <span>{f.upper}</span>
      <span className="case-lower">{f.lower}</span>
    </span>
  );
}

function fill(t: string, name: string): string {
  return t.replace(/\{ad\}/g, name);
}

function lev(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

function itemStatus(it: Item): Status {
  if (it.attempts < 3) return 'yeni';
  const r = it.successes / it.attempts;
  if (r < 0.5) return 'tekrar';
  if (r < 0.8) return 'gelisiyor';
  return 'pekistiriliyor';
}

function validateContent(type: ContentType, raw: string): { ok: true; text: string } | { ok: false; error: string } {
  const text = raw.trim().replace(/\s+/g, ' ');
  if (!text) return { ok: false, error: 'Boş' };
  const onlyLetters = new RegExp('^[' + LETTER_CLASS + ']+$');
  if (type === 'harf') {
    if (text.length !== 1 || !onlyLetters.test(text)) return { ok: false, error: 'Harf tek bir harf olmalı' };
    return { ok: true, text: trUpper(text) };
  }
  if (type === 'hece') {
    if (!onlyLetters.test(text) || text.length > 5) return { ok: false, error: 'Hece yalnızca harflerden oluşmalı (en fazla 5 harf)' };
    const v = trUpper(text).split('').filter((c) => VOWELS.includes(c)).length;
    if (v !== 1) return { ok: false, error: 'Türkçede her hecede tek bir ünlü bulunur' };
    return { ok: true, text: trUpper(text) };
  }
  if (type === 'kelime') {
    const re = new RegExp('^[' + LETTER_CLASS + ']+( [' + LETTER_CLASS + ']+)*$');
    if (!re.test(text) || text.length > 24) return { ok: false, error: 'Kelime yalnızca harf ve boşluk içermeli (en fazla 24 karakter)' };
    return { ok: true, text: trUpper(text) };
  }
  const re = new RegExp('^[' + LETTER_CLASS + " .,!?'\\-]+$");
  if (!re.test(text) || !new RegExp('[' + LETTER_CLASS + ']').test(text) || text.length > 80) {
    return { ok: false, error: 'Cümle harf ve basit noktalama içermeli (en fazla 80 karakter)' };
  }
  return { ok: true, text };
}

function weightOf(it: Item, now: number): number {
  let w = 1;
  if (it.attempts === 0) w += 1.5;
  else w += 2.5 * (1 - it.successes / it.attempts);
  if (itemStatus(it) === 'tekrar') w += 1;
  if (it.lastStudied) {
    const days = (now - Date.parse(it.lastStudied)) / 864e5;
    w += Math.min(Math.max(days, 0), 7) * 0.15;
  }
  return Math.min(w, 5);
}

function pickNext(pool: Item[], recent: string[]): Item | null {
  if (!pool.length) return null;
  const block = pool.length > 4 ? 3 : pool.length > 2 ? 1 : pool.length === 2 ? 1 : 0;
  const blocked = recent.slice(-block);
  let cand = pool.filter((p) => !blocked.includes(p.id));
  if (!cand.length) cand = pool;
  const now = Date.now();
  const ws = cand.map((c) => weightOf(c, now));
  const total = ws.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < cand.length; i++) {
    r -= ws[i];
    if (r <= 0) return cand[i];
  }
  return cand[cand.length - 1];
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type Verdict = 'basari' | 'belirsiz' | 'tekrar';

function evaluate(target: string, alts: string[]): Verdict {
  const t = normalize(target);
  const tc = t.replace(/ /g, '');
  let best: Verdict = 'tekrar';
  for (const alt of alts) {
    const n = normalize(alt);
    if (!n) continue;
    const nc = n.replace(/ /g, '');
    const tokens = n.split(' ');
    if (n === t || nc === tc) return 'basari';
    if (t.indexOf(' ') < 0 && tokens.includes(t)) return 'basari';
    if (t.indexOf(' ') >= 0 && (' ' + n + ' ').includes(' ' + t + ' ')) return 'basari';
    if (tc.length >= 4 && lev(nc, tc) <= 1) best = 'belirsiz';
    if (tc.length <= 3 && tokens.some((x) => x.startsWith(tc) || lev(x, tc) <= 1)) best = 'belirsiz';
    if (nc.includes(tc)) best = 'belirsiz';
  }
  return best;
}

/* ============================================================
   VARSAYILAN DURUM VE SAKLAMA
   ============================================================ */
function defaultSettings(): Settings {
  return {
    childName: 'Selim Erdem',
    checkMode: 'hybrid',
    speechRate: 0.9,
    sessionMinutes: 5,
    animations: true,
    sounds: true,
    voiceURI: '',
    letterCase: 'both',
    starsPerMission: 5,
    voicePreset: 'neseli',
    readingStyle: 'vurgulu',
    contentRate: 0.6,
    unitGap: 450,
    profilePhotoV: 0,
  };
}

function defaultState(): AppState {
  return {
    version: 3,
    updatedAt: 0,
    pinHash: null,
    pinSalt: uid(),
    settings: defaultSettings(),
    items: [],
    totalStars: 0,
    chests: 0,
    badges: {},
    days: {},
    city: defaultCity(),
    gift: null,
    giftHistory: [],
    recordings: { items: [], praise: [] },
    wordImages: {},
    cityObjects: {},
    karaokeLog: {},
  };
}

function migrate(raw: any): AppState | null {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.items)) return null;
  const base = defaultState();
  const items: Item[] = raw.items
    .filter((x: any) => x && typeof x.text === 'string' && ['harf', 'hece', 'kelime', 'cumle'].includes(x.type))
    .map((x: any) => ({
      id: String(x.id || uid()),
      type: x.type,
      text: String(x.text),
      source: x.source === 'oneri' ? 'oneri' : 'okul',
      learnedAt: String(x.learnedAt || todayKey()),
      approved: x.approved !== false,
      active: x.active !== false,
      attempts: Number(x.attempts) || 0,
      successes: Number(x.successes) || 0,
      micSuccesses: Number(x.micSuccesses) || 0,
      parentSuccesses: Number(x.parentSuccesses) || 0,
      needsReview: !!x.needsReview,
      lastStudied: x.lastStudied ? String(x.lastStudied) : null,
      syllables: Array.isArray(x.syllables) && x.syllables.length && x.syllables.every((y: any) => typeof y === 'string' && y) ? x.syllables.map(String) : undefined,
    }));
  return {
    ...base,
    version: 3,
    updatedAt: Number(raw.updatedAt) || 0,
    pinHash: typeof raw.pinHash === 'string' ? raw.pinHash : null,
    pinSalt: typeof raw.pinSalt === 'string' ? raw.pinSalt : base.pinSalt,
    settings: (() => {
      const st: any = { ...base.settings, ...(raw.settings || {}) };
      if (!['upper', 'lower', 'both', 'mixed'].includes(st.letterCase)) st.letterCase = 'both';
      delete st.upperCase;
      if (![3, 5, 7, 10].includes(st.starsPerMission)) st.starsPerMission = 5;
      if (!['neseli', 'cizgi', 'sicak', 'dogal'].includes(st.voicePreset)) st.voicePreset = 'neseli';
      if (!['vurgulu', 'normal'].includes(st.readingStyle)) st.readingStyle = 'vurgulu';
      if (!(st.contentRate >= 0.4 && st.contentRate <= 0.95)) st.contentRate = 0.6;
      if (!(st.unitGap >= 150 && st.unitGap <= 1000)) st.unitGap = 450;
      st.profilePhotoV = Number(st.profilePhotoV) || 0;
      return st as Settings;
    })(),
    items,
    totalStars: Number(raw.totalStars) || 0,
    chests: Number(raw.chests) || 0,
    badges: raw.badges && typeof raw.badges === 'object' ? raw.badges : {},
    days: raw.days && typeof raw.days === 'object' ? raw.days : {},
    city: (() => {
      const c = raw.city && typeof raw.city === 'object' ? raw.city : {};
      const d = defaultCity();
      return {
        missionsCompleted: Number(c.missionsCompleted) || 0,
        missionStars: Number(c.missionStars) || 0,
        avatar: (() => {
          const av: any = { ...d.avatar, ...(c.avatar || {}) };
          if (av.hair === 'kep') {
            av.hair = 'kisa';
            if (!c.avatar || !c.avatar.hat) av.hat = 'kep';
          }
          return av as Avatar;
        })(),
      };
    })(),
    gift:
      raw.gift && typeof raw.gift === 'object' && typeof raw.gift.id === 'string'
        ? {
            id: raw.gift.id,
            name: String(raw.gift.name || ''),
            description: String(raw.gift.description || ''),
            showHint: !!raw.gift.showHint,
            pieces: [4, 6, 9, 12, 16].includes(raw.gift.pieces) ? raw.gift.pieces : 9,
            tasksPerPiece: [1, 2, 3].includes(raw.gift.tasksPerPiece) ? raw.gift.tasksPerPiece : 1,
            createdAt: String(raw.gift.createdAt || new Date().toISOString()),
            opened: Array.isArray(raw.gift.opened) ? raw.gift.opened.filter((n: any) => Number.isInteger(n)) : [],
            seen: Number(raw.gift.seen) || 0,
            tasksDone: Number(raw.gift.tasksDone) || 0,
            wonAt: raw.gift.wonAt ? String(raw.gift.wonAt) : null,
            celebrated: !!raw.gift.celebrated,
            hasImage: raw.gift.hasImage !== false,
          }
        : null,
    giftHistory: Array.isArray(raw.giftHistory) ? raw.giftHistory : [],
    recordings: {
      items: raw.recordings && Array.isArray(raw.recordings.items) ? raw.recordings.items.map(String) : [],
      praise: raw.recordings && Array.isArray(raw.recordings.praise) ? raw.recordings.praise.map(String) : [],
    },
    wordImages: raw.wordImages && typeof raw.wordImages === 'object' ? raw.wordImages : {},
    cityObjects: raw.cityObjects && typeof raw.cityObjects === 'object' ? raw.cityObjects : {},
    karaokeLog: raw.karaokeLog && typeof raw.karaokeLog === 'object' ? raw.karaokeLog : {},
  };
}

function loadLocal(): AppState | null {
  try {
    const s = localStorage.getItem(LS_KEY);
    return s ? migrate(JSON.parse(s)) : null;
  } catch (e) {
    return null;
  }
}

function saveLocal(s: AppState): boolean {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(s));
    return true;
  } catch (e) {
    return false;
  }
}

/** Ana veri deposu: IndexedDB. localStorage yalnızca hızlı açılış ve yedek kopya içindir. */
const StateDB = {
  ready: false,
  timer: 0 as any,
  async load(): Promise<any | null> {
    try {
      return (await IDB.get('state')) || null;
    } catch (e) {
      return null;
    }
  },
  save(s: AppState) {
    if (!StateDB.ready) return;
    clearTimeout(StateDB.timer);
    StateDB.timer = setTimeout(() => {
      IDB.set('state', JSON.parse(JSON.stringify(s))).catch(() => {});
    }, 300);
  },
};

function trimDays(days: Record<string, DayStat>): Record<string, DayStat> {
  const keys = Object.keys(days).sort();
  if (keys.length <= 120) return days;
  const out: Record<string, DayStat> = {};
  keys.slice(-120).forEach((k) => (out[k] = days[k]));
  return out;
}

function emptyDay(): DayStat {
  return { seconds: 0, sessions: 0, attempts: 0, successes: 0, micVerified: 0, parentVerified: 0 };
}

function fallbackHash(t: string): string {
  // HTTPS olmayan yerel ağ testleri için (crypto.subtle yok). Temel koruma amaçlıdır.
  let h1 = 0x811c9dc5, h2 = 0x01000193;
  for (let i = 0; i < t.length; i++) {
    h1 = Math.imul(h1 ^ t.charCodeAt(i), 16777619) >>> 0;
    h2 = Math.imul(h2 + t.charCodeAt(i), 2246822519) >>> 0;
  }
  return 'f' + h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0');
}

async function hashPin(pin: string, salt: string): Promise<string> {
  if (!(window.crypto && window.crypto.subtle)) return fallbackHash(salt + ':' + pin);
  const data = new TextEncoder().encode(salt + ':' + pin);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/* ============================================================
   SES: SENTEZ, TANIMA, EFEKT
   ============================================================ */
const synthSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
const SRClass: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;

const Speech = {
  voice: null as SpeechSynthesisVoice | null,
  rate: 0.9,
  pitch: 1.3,
  contentRate: 0.6,
  gap: 450,
  seq: 0,
  audio: null as HTMLAudioElement | null,
  speak(text: string, opts: { rate?: number; pitch?: number; keep?: boolean; onStart?: () => void } = {}): Promise<void> {
    if (!opts.keep) Speech.halt();
    return new Promise((resolve) => {
      if (!synthSupported || !text) return resolve();
      let done = false;
      const fin = () => {
        if (!done) {
          done = true;
          resolve();
        }
      };
      try {
        if ((window.speechSynthesis as any).paused) window.speechSynthesis.resume();
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        const rate = opts.rate != null ? opts.rate : Speech.rate;
        u.lang = 'tr-TR';
        if (Speech.voice) u.voice = Speech.voice;
        u.rate = rate;
        u.pitch = opts.pitch != null ? opts.pitch : Speech.pitch;
        let started = false;
        const start = () => {
          if (!started) {
            started = true;
            if (opts.onStart) opts.onStart();
          }
        };
        u.onstart = start;
        u.onend = () => {
          start();
          fin();
        };
        u.onerror = fin;
        setTimeout(() => window.speechSynthesis.speak(u), 60);
        // Güvenlik ağı: bazı cihazlar onstart göndermezse vurguyu yine başlat
        if (opts.onStart) setTimeout(start, 900);
        setTimeout(fin, 2500 + (text.length * 160) / Math.max(rate, 0.3));
      } catch (e) {
        fin();
      }
    });
  },
  halt() {
    Speech.seq++;
    if (Speech.audio) {
      try { Speech.audio.pause(); } catch (e) { /* yoksay */ }
      Speech.audio = null;
    }
    if (synthSupported) {
      try { window.speechSynthesis.cancel(); } catch (e) { /* yoksay */ }
    }
  },
  stop() {
    Speech.halt();
  },
  playClip(url: string, keep = false): Promise<boolean> {
    if (!keep) Speech.halt();
    else if (synthSupported) {
      try { window.speechSynthesis.cancel(); } catch (e) { /* yoksay */ }
    }
    return new Promise((resolve) => {
      try {
        const a = new Audio(url);
        Speech.audio = a;
        let done = false;
        const fin = (ok: boolean) => {
          if (!done) {
            done = true;
            resolve(ok);
          }
        };
        a.onended = () => fin(true);
        a.onerror = () => fin(false);
        a.play().catch(() => fin(false));
        setTimeout(() => fin(true), 8000);
      } catch (e) {
        resolve(false);
      }
    });
  },
};

type ListenResult = { ok: true; alts: string[] } | { ok: false; error: string };

function listenOnce(): { promise: Promise<ListenResult>; stop: () => void } {
  if (!SRClass) {
    return { promise: Promise.resolve({ ok: false, error: 'unsupported' } as ListenResult), stop: () => {} };
  }
  let rec: any;
  try {
    rec = new SRClass();
  } catch (e) {
    return { promise: Promise.resolve({ ok: false, error: 'unsupported' } as ListenResult), stop: () => {} };
  }
  rec.lang = 'tr-TR';
  rec.interimResults = false;
  rec.continuous = false;
  rec.maxAlternatives = 5;
  const alts: string[] = [];
  let error = '';
  const promise = new Promise<ListenResult>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (alts.length) resolve({ ok: true, alts });
      else resolve({ ok: false, error: error || 'no-speech' });
    };
    const timer = setTimeout(() => {
      try { rec.stop(); } catch (e) { /* yoksay */ }
      setTimeout(finish, 800);
    }, 8000);
    rec.onresult = (ev: any) => {
      for (let i = 0; i < ev.results.length; i++) {
        const r = ev.results[i];
        for (let j = 0; j < r.length; j++) {
          if (r[j] && r[j].transcript) alts.push(String(r[j].transcript));
        }
      }
    };
    rec.onerror = (ev: any) => {
      error = (ev && ev.error) || 'error';
    };
    rec.onend = finish;
    try {
      rec.start();
    } catch (e) {
      error = 'start-failed';
      finish();
    }
  });
  return {
    promise,
    stop: () => {
      try { rec.stop(); } catch (e) { /* yoksay */ }
    },
  };
}

function micErrorText(code: string): string {
  switch (code) {
    case 'not-allowed':
      return 'Mikrofon izni verilmedi. Oyun ebeveyn kontrolüyle devam ediyor.';
    case 'service-not-allowed':
      return 'Türkçe konuşma tanıma bu cihazda şu an kullanılamıyor (iPad\'de Siri ve Dikte açık olmalı). Oyun ebeveyn kontrolüyle devam ediyor.';
    case 'audio-capture':
      return 'Mikrofon bulunamadı. Oyun ebeveyn kontrolüyle devam ediyor.';
    case 'network':
      return 'Ses tanıma servisine ulaşılamadı. Ebeveyn düğmeleriyle devam edebilirsiniz.';
    case 'unsupported':
      return 'Bu tarayıcı Türkçe ses tanımayı desteklemiyor. Ebeveyn düğmeleriyle devam edebilirsiniz.';
    case 'no-speech':
      return 'Ses duyulmadı.';
    default:
      return 'Ses tanıma şu an çalışmadı. Ebeveyn düğmeleriyle devam edebilirsiniz.';
  }
}

const Sfx = {
  enabled: true,
  ctx: null as AudioContext | null,
  play(notes: Array<[number, number]>, type: OscillatorType = 'sine') {
    if (!Sfx.enabled) return;
    try {
      const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AC) return;
      if (!Sfx.ctx) Sfx.ctx = new AC();
      const ctx = Sfx.ctx as AudioContext;
      if (ctx.state === 'suspended') ctx.resume();
      let t = ctx.currentTime;
      notes.forEach(([freq, dur]) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = type;
        o.frequency.value = freq;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g);
        g.connect(ctx.destination);
        o.start(t);
        o.stop(t + dur + 0.02);
        t += dur * 0.85;
      });
    } catch (e) { /* yoksay */ }
  },
  success() { Sfx.play([[660, 0.12], [880, 0.12], [1175, 0.22]], 'triangle'); },
  soft() { Sfx.play([[520, 0.15], [620, 0.2]], 'sine'); },
  chest() { Sfx.play([[523, 0.12], [659, 0.12], [784, 0.12], [1047, 0.35]], 'triangle'); },
  tick() { Sfx.play([[900, 0.03]], 'square'); },
};

function useMessagePicker() {
  const last = useRef<Record<string, string>>({});
  return useCallback((key: keyof typeof MSG, name: string) => {
    const list = MSG[key];
    let options = list.filter((m) => m !== last.current[key]);
    if (!options.length) options = list;
    const m = options[Math.floor(Math.random() * options.length)];
    last.current[key] = m;
    return fill(m, name);
  }, []);
}

/* ============================================================
   GÖRSEL PARÇALAR
   ============================================================ */
function Owl({ mood = 'idle', size = 120 }: { mood?: 'idle' | 'happy' | 'think'; size?: number }) {
  const eyeY = mood === 'happy' ? 52 : 50;
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden="true" className={'owl owl-' + mood}>
      <ellipse cx="60" cy="72" rx="40" ry="42" fill="#8A6CFF" />
      <ellipse cx="60" cy="84" rx="26" ry="26" fill="#E7DEFF" />
      <path d="M26 40 L34 14 L48 34 Z" fill="#8A6CFF" />
      <path d="M94 40 L86 14 L72 34 Z" fill="#8A6CFF" />
      <circle cx="44" cy={eyeY} r="16" fill="#fff" />
      <circle cx="76" cy={eyeY} r="16" fill="#fff" />
      {mood === 'happy' ? (
        <g stroke="#1D2B4F" strokeWidth="4" fill="none" strokeLinecap="round">
          <path d="M36 52 Q44 44 52 52" />
          <path d="M68 52 Q76 44 84 52" />
        </g>
      ) : (
        <g fill="#1D2B4F">
          <circle cx={mood === 'think' ? 48 : 46} cy={eyeY + 1} r="7" />
          <circle cx={mood === 'think' ? 80 : 78} cy={eyeY + 1} r="7" />
          <circle cx={mood === 'think' ? 50 : 48} cy={eyeY - 1} r="2" fill="#fff" />
          <circle cx={mood === 'think' ? 82 : 80} cy={eyeY - 1} r="2" fill="#fff" />
        </g>
      )}
      <path d="M60 60 L54 68 L66 68 Z" fill="#FFC23D" />
      <path d="M44 106 l-4 8 M52 108 l0 8 M68 108 l0 8 M76 106 l4 8" stroke="#FFC23D" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function Confetti({ burst, enabled }: { burst: number; enabled: boolean }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (!burst || !enabled) return;
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = window.innerWidth * dpr;
    c.height = window.innerHeight * dpr;
    ctx.scale(dpr, dpr);
    const colors = ['#FFC23D', '#FF6F61', '#2DBE9B', '#4AA8FF', '#8A6CFF', '#FF9F45'];
    const W = window.innerWidth;
    const H = window.innerHeight;
    const parts = Array.from({ length: 90 }, () => ({
      x: W / 2 + (Math.random() - 0.5) * 80,
      y: H * 0.45,
      vx: (Math.random() - 0.5) * 12,
      vy: -Math.random() * 13 - 4,
      r: Math.random() * 6 + 4,
      c: colors[Math.floor(Math.random() * colors.length)],
      rot: Math.random() * 6,
      vr: (Math.random() - 0.5) * 0.4,
      star: Math.random() < 0.3,
    }));
    let frame = 0;
    let raf = 0;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      parts.forEach((p) => {
        p.vy += 0.35;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.c;
        if (p.star) {
          ctx.font = p.r * 3 + 'px sans-serif';
          ctx.fillText('★', -p.r, p.r);
        } else {
          ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 0.6);
        }
        ctx.restore();
      });
      frame++;
      if (frame < 110) raf = requestAnimationFrame(draw);
      else ctx.clearRect(0, 0, W, H);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [burst, enabled]);
  return <canvas ref={ref} className="confetti" aria-hidden="true" />;
}

const WHEEL_COLORS = ['#FFC23D', '#FF8A7A', '#4FD1B0', '#6FB8FF', '#A992FF', '#FFAE5C'];

interface WheelLabel { main: string; sub?: string }
function Wheel({ labels, rotation, duration }: { labels: WheelLabel[]; rotation: number; duration: number }) {
  const n = Math.max(labels.length, 1);
  const R = 150;
  const C = 160;
  const seg = 360 / n;
  const pt = (deg: number, r: number) => {
    const a = (deg * Math.PI) / 180;
    return [C + r * Math.sin(a), C - r * Math.cos(a)];
  };
  const maxLen = Math.max(...labels.map((l) => l.main.length), 1);
  const twoLine = labels.some((l) => !!l.sub);
  const fs = Math.max(14, Math.min(34, (n <= 4 ? 40 : n <= 6 ? 34 : n <= 8 ? 28 : 22) - Math.max(0, maxLen - 3) * 2.2));
  return (
    <div className="wheel-wrap">
      <svg className="wheel-pointer" viewBox="0 0 40 40" aria-hidden="true">
        <path d="M20 38 L6 6 Q20 0 34 6 Z" fill="#E8473B" stroke="#1B1F3B" strokeWidth="3" strokeLinejoin="round" />
      </svg>
      <svg
        className="wheel"
        viewBox="0 0 320 320"
        role="img"
        aria-label="Çark"
        style={{ transform: 'rotate(' + rotation + 'deg)', transition: 'transform ' + duration + 'ms cubic-bezier(.12,.72,.18,1)' }}
      >
        <circle cx={C} cy={C} r={R + 10} fill="#1B1F3B" />
        <circle cx={C} cy={C} r={R + 5} fill="#FFC23D" />
        {Array.from({ length: 16 }, (_, i) => {
          const [sx, sy] = pt(i * 22.5, R + 5);
          return <circle key={'r' + i} cx={sx} cy={sy} r="3.2" fill="#fff" stroke="#1B1F3B" strokeWidth="1.2" />;
        })}
        {labels.length === 1 ? (
          <circle cx={C} cy={C} r={R} fill={WHEEL_COLORS[0]} />
        ) : (
          labels.map((_, i) => {
            const [x1, y1] = pt(i * seg, R);
            const [x2, y2] = pt((i + 1) * seg, R);
            const large = seg > 180 ? 1 : 0;
            return (
              <path
                key={'s' + i}
                d={'M' + C + ' ' + C + ' L' + x1 + ' ' + y1 + ' A' + R + ' ' + R + ' 0 ' + large + ' 1 ' + x2 + ' ' + y2 + ' Z'}
                fill={WHEEL_COLORS[i % WHEEL_COLORS.length]}
                stroke="#1B1F3B"
                strokeWidth="2.5"
              />
            );
          })
        )}
        {labels.map((l, i) => {
          const mid = i * seg + seg / 2;
          const [x, y] = pt(mid, R * 0.62);
          const size = twoLine ? fs * 0.82 : fs;
          return (
            <text
              key={'t' + i}
              x={x}
              y={y}
              fontSize={size}
              fontWeight={800}
              fill="#1D2B4F"
              textAnchor="middle"
              dominantBaseline="central"
              transform={'rotate(' + mid + ' ' + x + ' ' + y + ')'}
              style={{ fontFamily: 'inherit' }}
            >
              {l.sub ? (
                <>
                  <tspan x={x} dy={-size * 0.5}>{l.main}</tspan>
                  <tspan x={x} dy={size * 1.0} fontWeight={600}>{l.sub}</tspan>
                </>
              ) : (
                l.main
              )}
            </text>
          );
        })}
        <circle cx={C} cy={C} r="24" fill="#FFC23D" stroke="#1B1F3B" strokeWidth="4" />
        <circle cx={C} cy={C} r="10" fill="#fff" stroke="#1B1F3B" strokeWidth="2.5" />
      </svg>
    </div>
  );
}

function StarCounter({ stars, onClick }: { stars: number; onClick?: () => void }) {
  return <HudStars stars={stars} onClick={onClick} />;
}

/* ============================================================
   PIN
   ============================================================ */
function PinPad({
  title,
  hint,
  onSubmit,
  onCancel,
  error,
  footer,
}: {
  title: string;
  hint?: string;
  onSubmit: (pin: string) => void;
  onCancel: () => void;
  error?: string;
  footer?: any;
}) {
  const [pin, setPin] = useState('');
  useEffect(() => {
    if (pin.length === 4) {
      const p = pin;
      setTimeout(() => {
        onSubmit(p);
        setPin('');
      }, 120);
    }
  }, [pin]);
  const press = (d: string) => setPin((p) => (p.length < 4 ? p + d : p));
  return (
    <div className="modal-back" role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal pin-modal">
        <h2>{title}</h2>
        {hint && <p className="muted">{hint}</p>}
        <div className="pin-dots" aria-live="polite">
          {[0, 1, 2, 3].map((i) => (
            <i key={i} className={i < pin.length ? 'on' : ''} />
          ))}
        </div>
        {error && <p className="error-text">{error}</p>}
        <div className="pin-grid">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button key={d} onClick={() => press(d)}>{d}</button>
          ))}
          <button onClick={onCancel} className="pin-aux">Vazgeç</button>
          <button onClick={() => press('0')}>0</button>
          <button onClick={() => setPin((p) => p.slice(0, -1))} className="pin-aux" aria-label="Sil">⌫</button>
        </div>
        {footer}
      </div>
    </div>
  );
}

function PinGate({
  state,
  update,
  purpose,
  onPass,
  onCancel,
}: {
  state: AppState;
  update: (fn: (s: AppState) => AppState) => void;
  purpose: string;
  onPass: () => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState<'enter' | 'new' | 'confirm' | 'forgot'>(state.pinHash ? 'enter' : 'new');
  const [first, setFirst] = useState('');
  const [error, setError] = useState('');
  const [resetText, setResetText] = useState('');

  if (step === 'forgot') {
    return (
      <div className="modal-back" role="dialog" aria-modal="true">
        <div className="modal">
          <h2>PIN'i sıfırla</h2>
          <p>PIN sıfırlanınca yeni bir PIN belirlemeniz istenir. İçerikler ve ilerleme silinmez.</p>
          <label className="field">
            Onaylamak için <b>SIFIRLA</b> yazın
            <input value={resetText} onChange={(e) => setResetText(e.target.value)} autoCapitalize="characters" />
          </label>
          <div className="row gap">
            <button className="btn ghost" onClick={() => setStep('enter')}>Vazgeç</button>
            <button
              className="btn primary"
              disabled={trUpper(resetText.trim()) !== 'SIFIRLA'}
              onClick={() => {
                update((s) => ({ ...s, pinHash: null }));
                setError('');
                setStep('new');
              }}
            >
              PIN'i sıfırla
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'new' || step === 'confirm') {
    return (
      <PinPad
        title={step === 'new' ? 'Ebeveyn PIN\'i belirleyin' : 'PIN\'i tekrar girin'}
        hint={step === 'new' ? '4 haneli bir PIN seçin. ' + purpose : 'Doğrulamak için aynı PIN\'i girin.'}
        error={error}
        onCancel={onCancel}
        onSubmit={async (p) => {
          if (step === 'new') {
            setFirst(p);
            setError('');
            setStep('confirm');
          } else if (p === first) {
            const h = await hashPin(p, state.pinSalt);
            update((s) => ({ ...s, pinHash: h }));
            onPass();
          } else {
            setError('PIN\'ler eşleşmedi, baştan deneyelim.');
            setStep('new');
          }
        }}
      />
    );
  }

  return (
    <PinPad
      title="Ebeveyn PIN'i"
      hint={purpose}
      error={error}
      onCancel={onCancel}
      onSubmit={async (p) => {
        const h = await hashPin(p, state.pinSalt);
        if (h === state.pinHash) onPass();
        else setError('PIN yanlış. Tekrar deneyin.');
      }}
      footer={
        <button className="linkish" onClick={() => setStep('forgot')}>PIN'imi unuttum</button>
      }
    />
  );
}

/* ============================================================
   EKRANLAR: BAŞLANGIÇ, ANA MENÜ, DİNLENME, ROZETLER
   ============================================================ */
function StartScreen({ name, onStart }: { name: string; onStart: () => void }) {
  return (
    <main className="screen start-screen">
      <Owl size={150} mood="happy" />
      <h1 className="app-title">{name}'in<br />Okuma Macerası</h1>
      <button className="btn giant primary" onClick={onStart}>Başla</button>
    </main>
  );
}

function HomeScreen({
  state,
  go,
  openParent,
}: {
  state: AppState;
  go: (s: Screen) => void;
  openParent: () => void;
}) {
  const heceCount = state.items.filter((i) => i.type === 'hece' && i.approved && i.active).length;
  const kelimeCount = state.items.filter((i) => i.type === 'kelime' && i.approved && i.active).length;
  const tiles = [
    { key: 'game-hece' as Screen, title: 'Hece Çarkı', icon: '🎡', color: 'sun', ready: true, count: heceCount },
    { key: 'game-kelime' as Screen, title: 'Kelime Çarkı', icon: '🌈', color: 'sky', ready: true, count: kelimeCount },
    { key: null, title: 'Heceleri Birleştir', icon: '🧩', color: 'mint', ready: false, count: 0 },
    { key: null, title: 'Duy ve Bul', icon: '👂', color: 'grape', ready: false, count: 0 },
    { key: null, title: 'Hazine Avı', icon: '🗝️', color: 'coral', ready: false, count: 0 },
  ];
  return (
    <main className="screen home-screen">
      <header className="topbar">
        <StarCounter stars={state.totalStars} onClick={() => go('badges')} />
        <button className="lock-btn" onClick={openParent} aria-label="Ebeveyn paneli">🔒 Ebeveyn</button>
      </header>
      <div className="home-hello">
        <Owl size={84} />
        <p className="bubble">Merhaba {state.settings.childName}! Hangi oyunu oynayalım?</p>
      </div>
      <button className="city-banner" onClick={() => go('city')}>
        <Minifig a={state.city.avatar} size={84} />
        <span className="city-banner-text">
          <b>{(state.settings.childName.split(' ')[0] || 'Selim') + ' City'}</b>
          <span>Görev {state.city.missionsCompleted + 1} · {state.city.missionStars}/{state.settings.starsPerMission} ★</span>
        </span>
        <BlockCar id={state.city.avatar.car} size={96} />
      </button>
      {state.gift && <GiftMini state={state} onOpen={() => go('gift')} />}
      <div className="tiles">
        {tiles.map((t) => (
          <button
            key={t.title}
            className={'tile tile-' + t.color + (t.ready ? '' : ' tile-soon')}
            disabled={!t.ready}
            onClick={() => t.key && go(t.key)}
          >
            <span className="tile-icon" aria-hidden="true">{t.icon}</span>
            <span className="tile-title">{t.title}</span>
            {!t.ready && <span className="tile-note">Yakında</span>}
          </button>
        ))}
      </div>
    </main>
  );
}

function GiftMini({ state, onOpen }: { state: AppState; onOpen: () => void }) {
  const g = state.gift!;
  const image = useGiftImage(g.id, g.hasImage);
  return (
    <button className="gift-mini" onClick={onOpen}>
      <GiftCanvas campaign={g} image={image} animations={false} />
      <span>
        <b>Gizemli hediye</b>
        <br />
        {g.wonAt ? 'Kazandın! 🎉' : g.opened.length + ' / ' + g.pieces + ' parça açık'}
      </span>
    </button>
  );
}

function RestScreen({ name, onContinue, onHome }: { name: string; onContinue: () => void; onHome: () => void }) {
  return (
    <main className="screen rest-screen">
      <Owl size={150} mood="happy" />
      <h1 className="rest-title">{name}, bugün çok güzel çalıştın!</h1>
      <p className="rest-sub">Şimdi biraz dinlenebilirsin.</p>
      <div className="col gap">
        <button className="btn big primary" onClick={onHome}>Ana sayfa</button>
        <button className="btn ghost" onClick={onContinue}>Devam et (ebeveyn onayı)</button>
      </div>
    </main>
  );
}

function BadgesScreen({ state, onBack }: { state: AppState; onBack: () => void }) {
  return (
    <main className="screen badges-screen">
      <header className="topbar">
        <button className="back-btn" onClick={onBack} aria-label="Geri">←</button>
        <StarCounter stars={state.totalStars} />
      </header>
      <h1 className="section-title">Madalyalarım</h1>
      <p className="muted center">Açılan sandık: {state.chests}</p>
      <div className="badge-grid">
        {BADGES.map((b) => {
          const n = state.badges[b.id] || 0;
          return (
            <div key={b.id} className={'badge-card' + (n ? '' : ' locked')}>
              <span className="badge-icon"><MedalIcon id={b.id} locked={!n} size={60} /></span>
              <span className="badge-name">{b.name}</span>
              {n > 1 && <span className="badge-count">×{n}</span>}
            </div>
          );
        })}
      </div>
    </main>
  );
}

function ChestModal({ badgeId, onClose, animations }: { badgeId: string; onClose: () => void; animations: boolean }) {
  const b = BADGES.find((x) => x.id === badgeId) || BADGES[0];
  const [open, setOpen] = useState(!animations);
  useEffect(() => {
    if (!animations) return;
    const t = setTimeout(() => setOpen(true), 700);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="modal-back" role="dialog" aria-modal="true" aria-label="Hazine sandığı">
      <div className="modal chest-modal">
        <h2>Hazine sandığı!</h2>
        <div className={'chest' + (open ? ' open' : '') + (animations ? ' anim' : '')} aria-hidden="true">
          <svg viewBox="0 0 160 130" width="180">
            <rect x="20" y="58" width="120" height="62" rx="10" fill="#B86B2A" />
            <rect x="20" y="58" width="120" height="14" fill="#9A5620" />
            <rect x="72" y="62" width="16" height="22" rx="4" fill="#FFC23D" />
            <g className="lid">
              <path d="M20 60 Q20 22 80 22 Q140 22 140 60 Z" fill="#D07F38" />
              <rect x="20" y="52" width="120" height="10" fill="#9A5620" />
            </g>
          </svg>
          {open && <div className="chest-prize"><MedalIcon id={b.id} size={64} /></div>}
        </div>
        {open && <p className="chest-name">{b.name}</p>}
        <button className="btn big primary" onClick={onClose}>Harika!</button>
      </div>
    </div>
  );
}

/* ============================================================
   OYUN: HECE / KELİME ÇARKI
   ============================================================ */
type Phase = 'idle' | 'spinning' | 'reading' | 'listening' | 'result';
interface Pending {
  itemId: string;
  verifier: Verifier;
}

function WheelGame({
  kind,
  state,
  update,
  onHome,
  onCelebrate,
  onCommitSuccess,
  onAttempt,
  micBlocked,
  setMicBlocked,
}: {
  kind: 'hece' | 'kelime';
  state: AppState;
  update: (fn: (s: AppState) => AppState) => void;
  onHome: () => void;
  onCelebrate: () => void;
  onCommitSuccess: (itemId: string, verifier: Verifier, retries: number) => boolean;
  onAttempt: (itemId: string) => void;
  micBlocked: string;
  setMicBlocked: (m: string) => void;
}) {
  const s = state.settings;
  const name = s.childName;
  const pick = useMessagePicker();
  const pool = useMemo(
    () => state.items.filter((i) => i.type === kind && i.approved && i.active),
    [state.items, kind]
  );
  const [phase, setPhase] = useState<Phase>('idle');
  const [labels, setLabels] = useState<WheelLabel[]>([]);
  const [rotation, setRotation] = useState(0);
  const [current, setCurrent] = useState<Item | null>(null);
  const [message, setMessage] = useState('');
  const [heard, setHeard] = useState('');
  const [pending, setPending] = useState<Pending | null>(null);
  const [retries, setRetries] = useState(0);
  const [showParentTools, setShowParentTools] = useState(s.checkMode !== 'auto' || !SRClass);
  const [hl, setHl] = useState<number | null>(null);
  const recent = useRef<string[]>([]);
  const listener = useRef<{ stop: () => void } | null>(null);
  const pendingRef = useRef<Pending | null>(null);
  const retriesRef = useRef(0);
  pendingRef.current = pending;
  retriesRef.current = retries;

  const pickRoundCase = (): 'upper' | 'lower' | 'both' =>
    s.letterCase === 'mixed' ? (Math.random() < 0.5 ? 'upper' : 'lower') : s.letterCase;
  const [roundCase, setRoundCase] = useState<'upper' | 'lower' | 'both'>(() => pickRoundCase());
  const toLabel = (t: string, c: 'upper' | 'lower' | 'both'): WheelLabel => {
    const f = caseForms(t);
    if (c === 'upper') return { main: f.upper };
    if (c === 'lower') return { main: f.lower };
    return { main: f.upper, sub: f.lower };
  };
  const spinMs = s.animations ? 3600 : 250;
  const micAvailable = s.checkMode !== 'parent' && !!SRClass && !micBlocked;

  // İlk çark görünümü
  useEffect(() => {
    if (pool.length && !labels.length) setLabels(shuffle(pool).slice(0, 10).map((i) => toLabel(i.text, roundCase)));
  }, [pool.length]);

  // Ekrandan çıkarken bekleyen sonucu kaydet
  useEffect(() => {
    return () => {
      listener.current?.stop();
      Speech.stop();
      const p = pendingRef.current;
      if (p) onCommitSuccess(p.itemId, p.verifier, retriesRef.current);
    };
  }, []);

  const commitPending = (): boolean => {
    if (pending) {
      const celebrating = onCommitSuccess(pending.itemId, pending.verifier, retries);
      setPending(null);
      return celebrating;
    }
    return false;
  };

  const spin = () => {
    if (phase === 'spinning' || phase === 'listening') return;
    if (commitPending()) {
      // Kutlama penceresi açılıyor; çark onu kapatınca çevrilir.
      setCurrent(null);
      setMessage('');
      setHeard('');
      setPhase('idle');
      return;
    }
    const target = pickNext(pool, recent.current);
    if (!target) return;
    recent.current = [...recent.current, target.id].slice(-5);
    const others = shuffle(pool.filter((p) => p.id !== target.id)).slice(0, 9);
    const wheelItems = shuffle([target, ...others]);
    const idx = wheelItems.findIndex((w) => w.id === target.id);
    const n = wheelItems.length;
    const seg = 360 / n;
    const center = idx * seg + seg / 2;
    const jitter = (Math.random() - 0.5) * seg * 0.5;
    const base = rotation - (rotation % 360);
    const spins = s.animations ? 5 : 1;
    const next = base + spins * 360 + ((360 - center - jitter) % 360 + 360) % 360;
    const rc = pickRoundCase();
    setRoundCase(rc);
    setLabels(wheelItems.map((w) => toLabel(w.text, rc)));
    setHl(null);
    setCurrent(target);
    setRetries(0);
    setHeard('');
    setMessage('');
    setPhase('spinning');
    Speech.stop();
    requestAnimationFrame(() => setRotation(next));
    if (s.sounds && s.animations) {
      let k = 0;
      const iv = setInterval(() => {
        k++;
        if (k > 14) return clearInterval(iv);
        Sfx.tick();
      }, 200 + 0);
    }
    setTimeout(() => {
      setPhase('reading');
      const ask = pick('ask', name);
      setMessage(ask);
      Speech.speak(ask);
    }, spinMs + 150);
  };

  const celebrate = (verifier: Verifier) => {
    setPending({ itemId: current!.id, verifier });
    const msg = retries > 0 ? pick('effort', name) : pick(kind === 'hece' ? 'successHece' : 'success', name);
    setMessage(msg);
    setPhase('result');
    Sfx.success();
    onCelebrate();
    setHl(null);
    speakPraise(msg);
  };

  const gentleRetry = (key: 'retry' | 'unclear') => {
    const msg = pick(key, name);
    setMessage(msg);
    setPhase('reading');
    Sfx.soft();
    Speech.speak(msg);
  };

  const startMic = async () => {
    if (!current || phase === 'listening') return;
    Speech.stop();
    setHl(null);
    setHeard('');
    setPhase('listening');
    setMessage('Dinliyorum…');
    await new Promise((r) => setTimeout(r, 150));
    const l = listenOnce();
    listener.current = l;
    const res = await l.promise;
    listener.current = null;
    if (!res.ok) {
      if (['not-allowed', 'service-not-allowed', 'audio-capture', 'unsupported'].includes(res.error)) {
        setMicBlocked(micErrorText(res.error));
        setShowParentTools(true);
      }
      const hard = ['not-allowed', 'service-not-allowed', 'audio-capture', 'unsupported'].includes(res.error);
      setHeard(res.error !== 'no-speech' && !hard ? micErrorText(res.error) : '');
      gentleRetry(res.error === 'no-speech' ? 'unclear' : 'retry');
      return;
    }
    setHeard('Duyulan: ' + res.alts.slice(0, 3).join(' / '));
    const v = evaluate(current.text, res.alts);
    if (v === 'basari') {
      celebrate('mic');
    } else {
      onAttempt(current.id);
      setRetries((r) => r + 1);
      setShowParentTools(true);
      gentleRetry(v === 'belirsiz' ? 'unclear' : 'retry');
    }
  };

  const parentCorrect = () => {
    if (!current) return;
    if (phase === 'result' && pending) {
      setPending({ itemId: pending.itemId, verifier: 'parent' });
      return;
    }
    listener.current?.stop();
    celebrate('parent');
  };

  const parentRetry = () => {
    if (!current) return;
    listener.current?.stop();
    if (phase === 'result' && pending) {
      setPending(null);
    }
    onAttempt(current.id);
    setRetries((r) => r + 1);
    gentleRetry('retry');
  };

  const parentSkip = () => {
    listener.current?.stop();
    Speech.stop();
    setPending(null);
    setCurrent(null);
    setMessage('');
    setHeard('');
    setPhase('idle');
  };

  const readTogether = () => {
    if (!current) return;
    readItem(current.text, current.id, setHl, 'Birlikte okuyalım.');
  };

  const shownStars = state.totalStars + (pending ? 1 + (retries > 0 ? 1 : 0) : 0);
  const title = kind === 'hece' ? 'Okuma Okulu' : 'Kelime Garajı';

  if (!pool.length) {
    return (
      <main className="screen game-screen">
        <header className="topbar">
          <button className="back-btn" onClick={onHome} aria-label="Ana sayfa">←</button>
          <StarCounter stars={state.totalStars} />
        </header>
        <div className="empty">
          <PlayerPortrait a={state.city.avatar} size={96} />
          <h2>{title} için henüz {kind === 'hece' ? 'hece' : 'kelime'} yok</h2>
          <p>Ebeveyn panelinden {kind === 'hece' ? 'hece' : 'kelime'} ekleyip onaylayınca çark dolacak.</p>
          <button className="game-btn" onClick={onHome}>Haritaya dön</button>
        </div>
      </main>
    );
  }

  const showCard = phase === 'reading' || phase === 'listening' || phase === 'result';

  return (
    <main className="screen game-screen">
      <header className="topbar">
        <button className="back-btn" onClick={onHome} aria-label="Ana sayfa">←</button>
        <span className="game-title">{title}</span>
        <StarCounter stars={shownStars} />
      </header>

      {!showCard && (
        <section className="stage">
          <Wheel labels={labels} rotation={rotation} duration={spinMs} />
          <button className="game-btn giant" onClick={spin} disabled={phase === 'spinning'}>
            {phase === 'spinning' ? 'DÖNÜYOR…' : 'ÇARKI ÇEVİR'}
          </button>
        </section>
      )}

      {showCard && current && (
        <section className="stage">
          <div className={'read-card' + (phase === 'result' ? ' won' : '') + (s.animations ? ' pop' : '')} key={current.id + '-' + phase}>
            <SyllableText
              text={current.text}
              mode={roundCase}
              hl={hl}
              className={'read-text' + (current.text.length > 7 || (roundCase === 'both' && current.text.length > 4) ? ' long' : '')}
            />
          </div>
          <div className="prompt-row">
            <PlayerPortrait a={state.city.avatar} size={64} />
            <p className="bubble" aria-live="polite">{message}</p>
          </div>
          {heard && <p className="heard">{heard}</p>}

          {phase === 'result' ? (
            <button className="game-btn giant" onClick={spin}>ÇARKI ÇEVİR</button>
          ) : (
            <div className="kid-actions">
              {micAvailable && (
                <button
                  className={'btn big mic' + (phase === 'listening' ? ' listening' : '')}
                  onClick={phase === 'listening' ? () => listener.current?.stop() : startMic}
                >
                  {phase === 'listening' ? '⏹ Bitti' : '🎤 Oku'}
                </button>
              )}
              <button className="btn big soft" onClick={readTogether} disabled={phase === 'listening'}>
                🔊 Birlikte okuyalım
              </button>
            </div>
          )}
        </section>
      )}

      {micBlocked && s.checkMode !== 'parent' && <p className="notice">{micBlocked}</p>}

      {current && showCard && (
        <footer className="parent-strip">
          {showParentTools ? (
            <>
              <span className="parent-label">Ebeveyn</span>
              <button className="pbtn ok" onClick={parentCorrect} disabled={phase === 'listening'}>
                {phase === 'result' && pending?.verifier === 'parent' ? '✓ Onaylandı' : 'Doğru Okudu'}
              </button>
              <button className="pbtn again" onClick={parentRetry} disabled={phase === 'listening'}>Tekrar Denesin</button>
              <button className="pbtn skip" onClick={parentSkip}>Atla</button>
            </>
          ) : (
            <button className="pbtn skip" onClick={() => setShowParentTools(true)}>Ebeveyn kontrolü</button>
          )}
        </footer>
      )}
    </main>
  );
}

/* ============================================================
   SELİM CITY: BÖLGELER, ARABALAR, KIYAFETLER
   ============================================================ */
interface District { id: string; name: string; need: number; icon: string; ground: string; mission: string }
interface Unlockable { id: string; name: string; need: number }

const DISTRICTS: District[] = [
  { id: 'hece', name: 'Hece Mahallesi', need: 0, icon: '🏠', ground: '#BDE9A8', mission: 'Fırıncıya hece kutuları götür' },
  { id: 'liman', name: 'Kelime Limanı', need: 2, icon: '⚓', ground: '#A8DBF0', mission: 'Gemiye kelime kutuları yükle' },
  { id: 'lunapark', name: 'Lunapark', need: 4, icon: '🎡', ground: '#F7C6DA', mission: 'Dönme dolap biletlerini topla' },
  { id: 'hayvanat', name: 'Hayvanat Bahçesi', need: 7, icon: '🦁', ground: '#F3DFA2', mission: 'Hayvanlara isim kartı hazırla' },
  { id: 'uzay', name: 'Uzay Üssü', need: 10, icon: '🚀', ground: '#CBC3F5', mission: 'Roketin yakıtını doldur' },
  { id: 'dag', name: 'Dağ Köyü', need: 14, icon: '⛰️', ground: '#C9E4C5', mission: 'Köprü taşlarını yerleştir' },
];

const CARS: Unlockable[] = [
  { id: 'mini', name: 'Kırmızı mini araba', need: 0 },
  { id: 'taksi', name: 'Sarı taksi', need: 1 },
  { id: 'jip', name: 'Yeşil jip', need: 3 },
  { id: 'dondurma', name: 'Dondurma kamyonu', need: 5 },
  { id: 'itfaiye', name: 'İtfaiye aracı', need: 8 },
  { id: 'uzayaraci', name: 'Uzay gezgini', need: 12 },
];

const OUTFITS: Unlockable[] = [
  { id: 'gunluk', name: 'Günlük tişört', need: 0 },
  { id: 'futbol', name: 'Futbolcu forması', need: 2 },
  { id: 'asci', name: 'Aşçı önlüğü', need: 4 },
  { id: 'pilot', name: 'Pilot ceketi', need: 6 },
  { id: 'kasif', name: 'Kaşif yeleği', need: 9 },
  { id: 'astronot', name: 'Astronot giysisi', need: 13 },
];

const SKINS = ['#FFD43B', '#F6D2B4', '#E0AC83', '#A8704A'];
const HAIRS: Array<{ id: string; name: string }> = [
  { id: 'kisa', name: 'Kısa saç' },
  { id: 'kivircik', name: 'Kıvırcık' },
  { id: 'kep', name: 'Kep' },
  { id: 'yok', name: 'Saçsız' },
];
const HAIR_COLORS = ['#5B3A1E', '#1D2B4F', '#E3A33B', '#C2462E'];
const BLOCK_COLORS = ['#4AA8FF', '#FF6F61', '#2DBE9B', '#FFC23D', '#8A6CFF', '#1D2B4F', '#FF9F45', '#F2F2F2'];

interface Avatar { skin: string; hair: string; hairColor: string; shirt: string; pants: string; outfit: string; car: string; hat?: string; accessory?: string }

interface CityState { missionsCompleted: number; missionStars: number; avatar: Avatar }

interface GiftCampaign {
  id: string;
  name: string;
  description: string;
  showHint: boolean;
  pieces: number;
  tasksPerPiece: number;
  createdAt: string;
  opened: number[];
  seen: number;
  tasksDone: number;
  wonAt: string | null;
  celebrated: boolean;
  hasImage: boolean;
}

interface GiftRecord { id: string; name: string; wonAt: string }

function defaultCity(): CityState {
  return {
    missionsCompleted: 0,
    missionStars: 0,
    avatar: { skin: SKINS[0], hair: 'kisa', hairColor: HAIR_COLORS[0], shirt: '#4AA8FF', pants: '#1D2B4F', outfit: 'gunluk', car: 'mini', hat: 'yok', accessory: 'yok' },
  };
}

function unlockedDistricts(done: number) {
  return DISTRICTS.filter((d) => d.need <= done);
}

function missionInfo(done: number) {
  const un = unlockedDistricts(done);
  const d = un[un.length - 1 - (done % un.length)];
  return { number: done + 1, district: d };
}

function nextLocked(done: number) {
  const all = [
    ...DISTRICTS.map((d) => ({ kind: 'Bölge', name: d.name, need: d.need })),
    ...CARS.map((c) => ({ kind: 'Araba', name: c.name, need: c.need })),
    ...OUTFITS.map((o) => ({ kind: 'Kıyafet', name: o.name, need: o.need })),
  ].filter((x) => x.need > done);
  all.sort((a, b) => a.need - b.need);
  return all[0] || null;
}

function unlocksAt(n: number): string[] {
  return [
    ...BUILDINGS.filter((b) => b.need === n && n > 0).map((b) => 'Yeni bina: ' + b.name),
    ...ZONES.filter((z) => z.need === n).map((z) => 'Yeni bölge: ' + z.name),
    ...CARS.filter((c) => c.need === n && n > 0).map((c) => 'Yeni araba: ' + c.name),
    ...OUTFITS.filter((o) => o.need === n && n > 0).map((o) => 'Yeni kıyafet: ' + o.name),
    ...HATS.filter((o) => o.need === n && n > 0).map((o) => 'Yeni şapka: ' + o.name),
    ...ACCESSORIES.filter((o) => o.need === n && n > 0).map((o) => 'Yeni aksesuar: ' + o.name),
  ];
}

function gridDims(n: number): [number, number] {
  if (n === 4) return [2, 2];
  if (n === 6) return [3, 2];
  if (n === 12) return [4, 3];
  if (n === 16) return [4, 4];
  return [3, 3];
}

/* ---------- Blok karakter ---------- */
function Minifig({ a, size = 120 }: { a: Avatar; size?: number }) {
  const o = a.outfit;
  const shirt = o === 'asci' ? '#FFFFFF' : o === 'pilot' ? '#22386B' : o === 'astronot' ? '#EEF2F7' : o === 'kasif' ? '#C9A66B' : a.shirt;
  const pants = o === 'astronot' ? '#EEF2F7' : a.pants;
  const showHair = !['asci', 'pilot', 'astronot', 'kasif'].includes(o) || a.hair === 'yok';
  return (
    <svg width={size * 0.66} height={size} viewBox="0 0 100 152" aria-hidden="true" className="minifig">
      {/* bacaklar */}
      <rect x="22" y="104" width="56" height="10" rx="2" fill={pants} />
      <rect x="23" y="113" width="25" height="32" rx="3" fill={pants} />
      <rect x="52" y="113" width="25" height="32" rx="3" fill={pants} />
      <rect x="21" y="142" width="28" height="8" rx="3" fill="#1D2B4F" opacity="0.85" />
      <rect x="51" y="142" width="28" height="8" rx="3" fill="#1D2B4F" opacity="0.85" />
      {/* kollar */}
      <rect x="9" y="62" width="15" height="36" rx="7" fill={shirt} transform="rotate(8 16 62)" />
      <rect x="76" y="62" width="15" height="36" rx="7" fill={shirt} transform="rotate(-8 84 62)" />
      <circle cx="13" cy="101" r="7" fill={a.skin} />
      <circle cx="87" cy="101" r="7" fill={a.skin} />
      {/* gövde */}
      <path d="M28 60 L72 60 L78 105 L22 105 Z" fill={shirt} />
      {o === 'gunluk' && <text x="50" y="88" textAnchor="middle" fontSize="18" fill="#fff">★</text>}
      {o === 'futbol' && (
        <g>
          <rect x="34" y="60" width="6" height="45" fill="#fff" opacity="0.8" />
          <rect x="60" y="60" width="6" height="45" fill="#fff" opacity="0.8" />
          <text x="50" y="92" textAnchor="middle" fontSize="20" fontWeight="800" fill="#fff" stroke="#1D2B4F" strokeWidth="0.8">10</text>
        </g>
      )}
      {o === 'asci' && <rect x="34" y="70" width="32" height="35" rx="4" fill="#F1F4F8" stroke="#D3DAE5" />}
      {o === 'pilot' && (
        <g>
          <path d="M50 60 L50 105" stroke="#FFC23D" strokeWidth="2" />
          <path d="M36 72 L46 72 L50 68 L54 72 L64 72" stroke="#FFC23D" strokeWidth="3" fill="none" />
        </g>
      )}
      {o === 'kasif' && (
        <g>
          <rect x="31" y="76" width="12" height="10" rx="2" fill="#A9864C" />
          <rect x="57" y="76" width="12" height="10" rx="2" fill="#A9864C" />
        </g>
      )}
      {o === 'astronot' && (
        <g>
          <rect x="40" y="72" width="20" height="14" rx="3" fill="#4AA8FF" />
          <circle cx="45" cy="79" r="2" fill="#FF6F61" />
          <circle cx="55" cy="79" r="2" fill="#FFC23D" />
        </g>
      )}
      {/* boyun ve kafa */}
      <rect x="40" y="55" width="20" height="6" fill={a.skin} />
      <rect x="42" y="10" width="16" height="10" rx="3" fill={a.skin} />
      <rect x="29" y="18" width="42" height="38" rx="9" fill={a.skin} />
      <circle cx="42" cy="36" r="3.2" fill="#1D2B4F" />
      <circle cx="58" cy="36" r="3.2" fill="#1D2B4F" />
      <path d="M41 45 Q50 52 59 45" stroke="#1D2B4F" strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* saç / şapka */}
      {showHair && a.hair === 'kisa' && <path d="M27 30 Q27 12 50 12 Q73 12 73 30 L73 24 Q60 20 50 24 Q38 20 27 26 Z" fill={a.hairColor} />}
      {showHair && a.hair === 'kivircik' && (
        <g fill={a.hairColor}>
          {[30, 40, 50, 60, 70].map((x) => <circle key={x} cx={x} cy="18" r="8" />)}
          <circle cx="28" cy="27" r="6" />
          <circle cx="72" cy="27" r="6" />
        </g>
      )}
      {showHair && a.hair === 'kep' && (
        <g>
          <path d="M27 26 Q27 8 50 8 Q73 8 73 26 Z" fill={a.shirt} />
          <rect x="56" y="22" width="30" height="7" rx="3" fill={a.shirt} />
          <circle cx="50" cy="9" r="3" fill="#fff" />
        </g>
      )}
      {!showHair && o === 'asci' && (
        <g fill="#fff" stroke="#D3DAE5">
          <rect x="31" y="14" width="38" height="10" rx="3" />
          <circle cx="38" cy="8" r="9" />
          <circle cx="50" cy="4" r="10" />
          <circle cx="62" cy="8" r="9" />
        </g>
      )}
      {!showHair && o === 'pilot' && (
        <g>
          <path d="M26 24 Q26 8 50 8 Q74 8 74 24 Z" fill="#22386B" />
          <rect x="24" y="21" width="52" height="6" rx="3" fill="#162750" />
          <circle cx="50" cy="15" r="3.5" fill="#FFC23D" />
        </g>
      )}
      {!showHair && o === 'kasif' && (
        <g>
          <ellipse cx="50" cy="20" rx="34" ry="6" fill="#A9864C" />
          <path d="M32 20 Q32 4 50 4 Q68 4 68 20 Z" fill="#C9A66B" />
        </g>
      )}
      {!showHair && o === 'astronot' && (
        <g>
          <circle cx="50" cy="35" r="30" fill="rgba(170,215,255,0.35)" stroke="#EEF2F7" strokeWidth="6" />
          <path d="M34 22 Q42 14 52 15" stroke="#fff" strokeWidth="3" fill="none" opacity="0.8" />
        </g>
      )}
    </svg>
  );
}

/* ---------- Blok araba ---------- */
function BlockCar({ id, size = 140 }: { id: string; size?: number }) {
  const color =
    id === 'taksi' ? '#FFC23D' : id === 'jip' ? '#2DBE9B' : id === 'dondurma' ? '#F7C6DA' : id === 'itfaiye' ? '#E8473B' : id === 'uzayaraci' ? '#B8C4D9' : '#FF6F61';
  const wheel = id === 'jip' ? 16 : 13;
  return (
    <svg width={size} height={size * 0.6} viewBox="0 0 160 96" aria-hidden="true" className="blockcar">
      {id === 'dondurma' ? (
        <g>
          <rect x="14" y="20" width="96" height="50" rx="6" fill={color} />
          {[24, 44, 64, 84].map((x) => <rect key={x} x={x} y="14" width="12" height="7" rx="2" fill={color} />)}
          <path d="M60 28 L68 50 L76 28 Z" fill="#E3A33B" />
          <circle cx="68" cy="27" r="7" fill="#FFF3D6" />
          <rect x="110" y="34" width="38" height="36" rx="6" fill="#4AA8FF" />
          <rect x="116" y="40" width="22" height="14" rx="3" fill="#D8F0FF" />
        </g>
      ) : (
        <g>
          <rect x="12" y="44" width="136" height="28" rx="7" fill={color} />
          <path d={id === 'jip' ? 'M36 44 L42 18 L112 18 L118 44 Z' : 'M40 44 L52 22 L104 22 L116 44 Z'} fill={color} />
          {[30, 50, 70, 90, 110, 130].map((x) => <rect key={x} x={x - 5} y="39" width="10" height="6" rx="2" fill={color} opacity="0.85" />)}
          <path d={id === 'jip' ? 'M46 42 L50 24 L76 24 L76 42 Z' : 'M50 42 L58 27 L76 27 L76 42 Z'} fill="#D8F0FF" />
          <path d={id === 'jip' ? 'M82 42 L82 24 L106 24 L110 42 Z' : 'M82 42 L82 27 L98 27 L106 42 Z'} fill="#D8F0FF" />
          <rect x="140" y="50" width="8" height="8" rx="2" fill="#FFF3B0" />
          {id === 'taksi' && (
            <g>
              <rect x="66" y="10" width="28" height="12" rx="3" fill="#1D2B4F" />
              <text x="80" y="20" textAnchor="middle" fontSize="9" fontWeight="800" fill="#FFC23D">TAKSİ</text>
              {[20, 36, 52, 68, 84, 100, 116].map((x, i) => (i % 2 ? null : <rect key={x} x={x} y="58" width="16" height="6" fill="#1D2B4F" />))}
            </g>
          )}
          {id === 'itfaiye' && (
            <g>
              <rect x="22" y="8" width="100" height="8" rx="2" fill="#C7D0DE" />
              {[30, 46, 62, 78, 94, 110].map((x) => <rect key={x} x={x} y="8" width="3" height="8" fill="#8794AA" />)}
              <rect x="56" y="14" width="10" height="8" rx="2" fill="#4AA8FF" />
            </g>
          )}
          {id === 'uzayaraci' && (
            <g>
              <path d="M12 46 L2 30 L22 44 Z" fill="#8A6CFF" />
              <line x1="80" y1="22" x2="80" y2="6" stroke="#8A6CFF" strokeWidth="3" />
              <circle cx="80" cy="6" r="4" fill="#FFC23D" />
            </g>
          )}
        </g>
      )}
      <circle cx="40" cy="74" r={wheel} fill="#1D2B4F" />
      <circle cx="120" cy="74" r={wheel} fill="#1D2B4F" />
      <circle cx="40" cy="74" r={wheel * 0.42} fill="#C7D0DE" />
      <circle cx="120" cy="74" r={wheel * 0.42} fill="#C7D0DE" />
    </svg>
  );
}

/* ---------- Şehir haritası ---------- */
function CityMap({ city, animations }: { city: CityState; animations: boolean }) {
  const done = city.missionsCompleted;
  const cur = missionInfo(done).district;
  const pos = (i: number) => ({ x: 12 + (i % 2) * 180, y: 12 + Math.floor(i / 2) * 156 });
  return (
    <svg viewBox="0 0 364 480" className="city-map" role="img" aria-label="Selim City haritası">
      <rect x="0" y="0" width="364" height="480" rx="22" fill="#7FC97A" />
      <rect x="172" y="0" width="20" height="480" fill="#8C93A8" />
      <rect x="0" y="152" width="364" height="18" fill="#8C93A8" />
      <rect x="0" y="308" width="364" height="18" fill="#8C93A8" />
      {[10, 40, 70, 100, 130, 190, 220, 250, 280, 340, 370, 400, 430, 460].map((y) => (
        <rect key={y} x="180" y={y} width="4" height="14" fill="#fff" opacity="0.8" />
      ))}
      {DISTRICTS.map((d, i) => {
        const p = pos(i);
        const locked = d.need > done;
        const isCur = d.id === cur.id;
        return (
          <g key={d.id} transform={'translate(' + p.x + ' ' + p.y + ')'}>
            <rect width="160" height="136" rx="16" fill={d.ground} />
            {[
              [16, 36, 34, 46, '#FF8A7A'],
              [56, 22, 30, 60, '#6FB8FF'],
              [112, 44, 34, 38, '#FFC23D'],
            ].map(([x, y, w, h, c], k) => (
              <g key={k}>
                <rect x={x as number} y={y as number} width={w as number} height={h as number} rx="3" fill={c as string} />
                <rect x={(x as number) + 5} y={(y as number) - 5} width="8" height="6" rx="2" fill={c as string} />
                <rect x={(x as number) + (w as number) - 13} y={(y as number) - 5} width="8" height="6" rx="2" fill={c as string} />
                <rect x={(x as number) + 7} y={(y as number) + 10} width="8" height="8" fill="#fff" opacity="0.7" />
                <rect x={(x as number) + (w as number) - 15} y={(y as number) + 10} width="8" height="8" fill="#fff" opacity="0.7" />
              </g>
            ))}
            {!locked && <text x="80" y="102" textAnchor="middle" fontSize="26">{d.icon}</text>}
            {!locked && <text x="80" y="126" textAnchor="middle" fontSize="14" fontWeight="800" fill="#1D2B4F">{d.name}</text>}
            {locked && (
              <g>
                <rect width="160" height="136" rx="16" fill="rgba(29,43,79,0.62)" />
                <text x="80" y="62" textAnchor="middle" fontSize="30">🔒</text>
                <text x="80" y="92" textAnchor="middle" fontSize="14" fontWeight="800" fill="#fff">{d.name}</text>
                <text x="80" y="112" textAnchor="middle" fontSize="13" fill="#fff">{d.need - done} görev sonra</text>
              </g>
            )}
            {isCur && (
              <g className={animations ? 'marker-bob' : ''}>
                <circle cx="132" cy="22" r="17" fill="#FFC23D" stroke="#fff" strokeWidth="4" />
                <text x="132" y="29" textAnchor="middle" fontSize="20" fontWeight="800" fill="#1D2B4F">!</text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/* ============================================================
   GİZEMLİ HEDİYE: GÖRSEL SAKLAMA
   ============================================================ */
const Cloud = {
  db: null as any,
  uid: '',
  ready: null as Promise<void> | null,
  resolve: null as null | (() => void),
};
Cloud.ready = new Promise<void>((r) => (Cloud.resolve = r));

const IDB = {
  dbp: null as Promise<IDBDatabase> | null,
  open(): Promise<IDBDatabase> {
    if (!IDB.dbp) {
      IDB.dbp = new Promise((resolve, reject) => {
        try {
          const req = indexedDB.open('okuma-macerasi', 1);
          req.onupgradeneeded = () => req.result.createObjectStore('kv');
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        } catch (e) {
          reject(e);
        }
      });
    }
    return IDB.dbp;
  },
  async get(key: string): Promise<any> {
    const db = await IDB.open();
    return new Promise((resolve, reject) => {
      const r = db.transaction('kv', 'readonly').objectStore('kv').get(key);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  },
  async set(key: string, val: any): Promise<void> {
    const db = await IDB.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('kv', 'readwrite');
      tx.objectStore('kv').put(val, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },
  async del(key: string): Promise<void> {
    const db = await IDB.open();
    return new Promise((resolve) => {
      const tx = db.transaction('kv', 'readwrite');
      tx.objectStore('kv').delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  },
};

const memImages: Record<string, string> = {};

async function getGiftImage(id: string): Promise<string | null> {
  if (memImages[id]) return memImages[id];
  try {
    const v = await IDB.get('gift:' + id);
    if (v) return (memImages[id] = v);
  } catch (e) { /* IndexedDB yok */ }
  try {
    await Promise.race([Cloud.ready, new Promise((r) => setTimeout(r, 6000))]);
    if (Cloud.db && Cloud.uid) {
      const snap = await Cloud.db.doc('data/users/' + Cloud.uid + '/gift-image').get();
      const d = snap.exists ? (snap.data() as any) : null;
      if (d && d.campaignId === id && typeof d.dataUrl === 'string') {
        memImages[id] = d.dataUrl;
        try { await IDB.set('gift:' + id, d.dataUrl); } catch (e) { /* yoksay */ }
        return d.dataUrl;
      }
    }
  } catch (e) { /* yoksay */ }
  return null;
}

async function saveGiftImage(id: string, dataUrl: string): Promise<{ local: boolean; cloud: boolean }> {
  memImages[id] = dataUrl;
  let local = false;
  let cloud = false;
  try {
    await IDB.set('gift:' + id, dataUrl);
    local = true;
  } catch (e) { /* yoksay */ }
  try {
    if (Cloud.db && Cloud.uid && dataUrl.length < 240000) {
      await Cloud.db.doc('data/users/' + Cloud.uid + '/gift-image').set({ campaignId: id, dataUrl });
      cloud = true;
    }
  } catch (e) { /* yoksay */ }
  return { local, cloud };
}

function loadImageEl(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error('Görsel okunamadı'));
    i.src = src;
  });
}

async function processPhoto(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImageEl(url);
    let max = 1000;
    let q = 0.82;
    let out = '';
    for (let i = 0; i < 8; i++) {
      const sc = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * sc);
      c.height = Math.round(img.naturalHeight * sc);
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      out = c.toDataURL('image/jpeg', q);
      if (out.length < 230000) break;
      q -= 0.1;
      if (q < 0.5) {
        q = 0.75;
        max = Math.round(max * 0.8);
      }
    }
    return out;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function useGiftImage(id: string | null, hasImage: boolean): string | null | undefined {
  const [img, setImg] = useState<string | null | undefined>(id && memImages[id] ? memImages[id] : undefined);
  useEffect(() => {
    let off = false;
    if (!id || !hasImage) {
      setImg(null);
      return;
    }
    getGiftImage(id).then((v) => !off && setImg(v));
    return () => { off = true; };
  }, [id, hasImage]);
  return img;
}

/* ---------- Hediye kartı (tuval) ----------
   Fotoğrafın yalnızca açılmış parçaları tuvale çizilir;
   kapalı parçaların görüntüsü sayfada hiç bulunmaz. */
const WRAP_COLORS = ['#FF6F61', '#4AA8FF', '#2DBE9B', '#8A6CFF', '#FFAE5C', '#F06BA8'];

function GiftCanvas({
  campaign,
  image,
  highlight,
  animations,
  className,
}: {
  campaign: GiftCampaign;
  image: string | null | undefined;
  highlight?: number | null;
  animations: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null);
  const [cols, rows] = gridDims(campaign.pieces);
  const openedKey = campaign.opened.join(',');

  useEffect(() => {
    let off = false;
    if (!image) {
      setImgEl(null);
      return;
    }
    loadImageEl(image).then((i) => !off && setImgEl(i)).catch(() => setImgEl(null));
    return () => { off = true; };
  }, [image]);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const T = 200;
    const W = cols * T;
    const H = rows * T;
    c.width = W;
    c.height = H;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    let crop = { sx: 0, sy: 0, sw: 0, sh: 0 };
    if (imgEl) {
      const ia = imgEl.naturalWidth / imgEl.naturalHeight;
      const ta = W / H;
      if (ia > ta) {
        const sw = imgEl.naturalHeight * ta;
        crop = { sx: (imgEl.naturalWidth - sw) / 2, sy: 0, sw, sh: imgEl.naturalHeight };
      } else {
        const sh = imgEl.naturalWidth / ta;
        crop = { sx: 0, sy: (imgEl.naturalHeight - sh) / 2, sw: imgEl.naturalWidth, sh };
      }
    }
    const g = 4;
    const rr = (x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    };
    const drawClosed = (i: number, x: number, y: number) => {
      const col = WRAP_COLORS[i % WRAP_COLORS.length];
      ctx.fillStyle = '#1B1F3B';
      rr(x + g, y + g, T - 2 * g, T - 2 * g, 16);
      ctx.fill();
      ctx.fillStyle = col;
      rr(x + g + 4, y + g + 4, T - 2 * g - 8, T - 2 * g - 16, 12);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(x + g + 10, y + g + 8, T - 2 * g - 20, 10);
      [[0.3, 0.3], [0.7, 0.3], [0.3, 0.7], [0.7, 0.7]].forEach(([sx, sy]) => {
        const cx = x + T * sx;
        const cy = y + T * sy;
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.beginPath();
        ctx.ellipse(cx, cy + 5, 22, 18, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.ellipse(cx, cy, 22, 18, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.beginPath();
        ctx.ellipse(cx - 5, cy - 5, 9, 6, -0.5, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.font = '84px "Lilita One", "Baloo 2", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 10;
      ctx.strokeStyle = '#1B1F3B';
      ctx.strokeText('?', x + T / 2, y + T / 2 + 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText('?', x + T / 2, y + T / 2 + 2);
    };
    const drawOpen = (i: number, x: number, y: number, alpha: number) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      if (imgEl) {
        const c0 = i % cols;
        const r0 = Math.floor(i / cols);
        ctx.drawImage(
          imgEl,
          crop.sx + (c0 * crop.sw) / cols,
          crop.sy + (r0 * crop.sh) / rows,
          crop.sw / cols,
          crop.sh / rows,
          x + g / 2,
          y + g / 2,
          T - g,
          T - g
        );
      } else {
        ctx.fillStyle = '#DDE6F2';
        ctx.fillRect(x + g, y + g, T - 2 * g, T - 2 * g);
        ctx.fillStyle = '#52628A';
        ctx.font = '600 22px "Baloo 2", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(image === undefined ? '…' : 'Fotoğraf yok', x + T / 2, y + T / 2);
      }
      ctx.restore();
    };
    const opened = new Set(campaign.opened);
    const frame = (t: number) => {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < cols * rows; i++) {
        const x = (i % cols) * T;
        const y = Math.floor(i / cols) * T;
        if (opened.has(i)) {
          if (i === highlight && t < 1) {
            const k = t < 0.5 ? 1 - t * 2 : (t - 0.5) * 2;
            ctx.save();
            ctx.translate(x + T / 2, y + T / 2);
            ctx.scale(Math.max(k, 0.02), 1 + (1 - k) * 0.08);
            ctx.translate(-(x + T / 2), -(y + T / 2));
            if (t < 0.5) drawClosed(i, x, y);
            else drawOpen(i, x, y, 1);
            ctx.restore();
            if (t > 0.5) {
              ctx.strokeStyle = 'rgba(255,214,74,' + (1 - t) * 1.6 + ')';
              ctx.lineWidth = 10;
              ctx.strokeRect(x + 6, y + 6, T - 12, T - 12);
            }
          } else drawOpen(i, x, y, 1);
        } else drawClosed(i, x, y);
      }
      if (campaign.wonAt && imgEl && highlight == null) {
        ctx.drawImage(imgEl, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, W, H);
      }
    };
    if (highlight != null && animations && opened.has(highlight)) {
      let raf = 0;
      const start = performance.now() + 500;
      const step = (now: number) => {
        const t = Math.max(0, Math.min(1, (now - start) / 1100));
        frame(t);
        if (t < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
      return () => cancelAnimationFrame(raf);
    }
    frame(1);
  }, [imgEl, openedKey, highlight, cols, rows, image, campaign.wonAt]);

  return (
    <canvas
      ref={ref}
      className={'gift-canvas ' + (className || '')}
      style={{ aspectRatio: cols + ' / ' + rows }}
      role="img"
      aria-label={'Gizemli hediye: ' + campaign.opened.length + ' / ' + campaign.pieces + ' parça açık'}
    />
  );
}

/* ============================================================
   ÇOCUK EKRANLARI: ŞEHİR, KARAKTER, HEDİYE
   ============================================================ */
function MissionCard({ state, go }: { state: AppState; go: (s: Screen) => void }) {
  const spm = state.settings.starsPerMission;
  const m = missionInfo(state.city.missionsCompleted);
  return (
    <div className="mission-card">
      <div className="mission-head">
        <span className="mission-badge">{m.district.icon}</span>
        <div>
          <b>Görev {m.number}: {m.district.mission}</b>
          <div className="muted small">{m.district.name} · Hece veya Kelime Çarkı'nda {spm} yıldız topla</div>
        </div>
      </div>
      <div className="mission-stars" aria-label={state.city.missionStars + ' / ' + spm + ' yıldız'}>
        {Array.from({ length: spm }, (_, i) => (
          <span key={i} className={i < state.city.missionStars ? 'on' : ''}>★</span>
        ))}
      </div>
      <div className="row gap wrap">
        <button className="btn primary" onClick={() => go('game-hece')}>🎡 Hece Çarkı</button>
        <button className="btn soft" onClick={() => go('game-kelime')}>🌈 Kelime Çarkı</button>
      </div>
    </div>
  );
}

function CityScreen({ state, go, animations }: { state: AppState; go: (s: Screen) => void; animations: boolean }) {
  const next = nextLocked(state.city.missionsCompleted);
  return (
    <main className="screen city-screen">
      <header className="topbar">
        <button className="back-btn" onClick={() => go('home')} aria-label="Ana sayfa">←</button>
        <span className="game-title">Selim City</span>
        <StarCounter stars={state.totalStars} onClick={() => go('badges')} />
      </header>
      <div className="city-hero">
        <Minifig a={state.city.avatar} size={110} />
        <BlockCar id={state.city.avatar.car} size={130} />
      </div>
      <MissionCard state={state} go={go} />
      <CityMap city={state.city} animations={animations} />
      <p className="muted center small">
        Tamamlanan görev: {state.city.missionsCompleted}
        {next ? ' · Sıradaki ödül: ' + next.name + ' (' + (next.need - state.city.missionsCompleted) + ' görev sonra)' : ' · Bütün şehir açıldı!'}
      </p>
      <div className="row gap wrap center-row">
        <button className="btn soft" onClick={() => go('avatar')}>🧍 Karakterim</button>
        <button className="btn soft" onClick={() => go('gift')}>🎁 Gizemli hediye</button>
      </div>
    </main>
  );
}

function AvatarScreen({
  state,
  update,
  onBack,
}: {
  state: AppState;
  update: (fn: (s: AppState) => AppState) => void;
  onBack: () => void;
}) {
  const a = state.city.avatar;
  const done = state.city.missionsCompleted;
  const set = (p: Partial<Avatar>) => update((s) => ({ ...s, city: { ...s.city, avatar: { ...s.city.avatar, ...p } } }));
  const swatches = (list: string[], key: 'skin' | 'shirt' | 'pants' | 'hairColor') => (
    <div className="swatches">
      {list.map((c) => (
        <button
          key={c}
          className={'swatch' + (a[key] === c ? ' on' : '')}
          style={{ background: c }}
          onClick={() => set({ [key]: c } as any)}
          aria-label={'Renk ' + c}
        />
      ))}
    </div>
  );
  return (
    <main className="screen avatar-screen">
      <header className="topbar">
        <button className="back-btn" onClick={onBack} aria-label="Geri">←</button>
        <span className="game-title">Karakterim</span>
        <span />
      </header>
      <div className="city-hero big">
        <Minifig a={a} size={170} />
        <BlockCar id={a.car} size={170} />
      </div>
      <section className="pick-section">
        <h3>Kıyafet</h3>
        <div className="pick-grid">
          {OUTFITS.map((o) => {
            const locked = o.need > done;
            return (
              <button key={o.id} className={'pick' + (a.outfit === o.id ? ' on' : '')} disabled={locked} onClick={() => set({ outfit: o.id })}>
                <Minifig a={{ ...a, outfit: o.id }} size={70} />
                <span>{o.name}</span>
                {locked && <small>🔒 {o.need - done} görev</small>}
              </button>
            );
          })}
        </div>
      </section>
      <section className="pick-section">
        <h3>Araba</h3>
        <div className="pick-grid">
          {CARS.map((c) => {
            const locked = c.need > done;
            return (
              <button key={c.id} className={'pick' + (a.car === c.id ? ' on' : '')} disabled={locked} onClick={() => set({ car: c.id })}>
                <BlockCar id={c.id} size={90} />
                <span>{c.name}</span>
                {locked && <small>🔒 {c.need - done} görev</small>}
              </button>
            );
          })}
        </div>
      </section>
      <section className="pick-section">
        <h3>Saç ve şapka</h3>
        <div className="chip-row">
          {HAIRS.map((h) => (
            <button key={h.id} className={'chip' + (a.hair === h.id ? ' on' : '')} onClick={() => set({ hair: h.id })}>{h.name}</button>
          ))}
        </div>
        {swatches(HAIR_COLORS, 'hairColor')}
      </section>
      <section className="pick-section">
        <h3>Ten rengi</h3>
        {swatches(SKINS, 'skin')}
        <h3>Tişört rengi</h3>
        {swatches(BLOCK_COLORS, 'shirt')}
        <h3>Pantolon rengi</h3>
        {swatches(BLOCK_COLORS, 'pants')}
      </section>
    </main>
  );
}

function GiftScreen({ state, onBack, animations }: { state: AppState; onBack: () => void; animations: boolean }) {
  const g = state.gift;
  const image = useGiftImage(g ? g.id : null, !!g && g.hasImage);
  const spm = state.settings.starsPerMission;
  return (
    <main className="screen gift-screen">
      <header className="topbar">
        <button className="back-btn" onClick={onBack} aria-label="Geri">←</button>
        <span className="game-title">Gizemli hediye</span>
        <span />
      </header>
      {!g ? (
        <div className="empty">
          <GiftBoxIcon size={110} />
          <h2>Şu an bekleyen bir hediye yok</h2>
          <p className="muted">Yeni bir sürpriz hazırlanınca burada görünecek.</p>
        </div>
      ) : (
        <>
          <GiftCanvas campaign={g} image={image} animations={animations} className={g.wonAt ? 'won' : ''} />
          {g.wonAt ? (
            <div className="gift-won">
              <h2>{g.name || 'Büyük sürpriz'}</h2>
              {g.description && <p>{g.description}</p>}
            </div>
          ) : (
            <>
              <div className="piece-progress" aria-label={g.opened.length + ' / ' + g.pieces + ' parça açık'}>
                {Array.from({ length: g.pieces }, (_, i) => (
                  <i key={i} className={i < g.opened.length ? 'on' : ''} />
                ))}
              </div>
              <p className="center gift-rule">
                {g.opened.length} / {g.pieces} parça açıldı.
                <br />
                {g.tasksPerPiece === 1 ? 'Her görev' : g.tasksPerPiece + ' görev'} bir parça açar. Bir görev = {spm} yıldız.
              </p>
              {g.showHint && g.description && <p className="center muted">İpucu: {g.description}</p>}
            </>
          )}
        </>
      )}
    </main>
  );
}

/* ---------- Kutlama penceresi ---------- */
type Celebration =
  | { kind: 'chest'; badge: string }
  | { kind: 'mission'; number: number; unlocks: string[]; piece: number | null; won: boolean }
  | { kind: 'piece'; piece: number | null; won: boolean }
  | { kind: 'object'; objId: string };

function CelebrationModal({
  c,
  state,
  animations,
  onClose,
}: {
  c: Celebration;
  state: AppState;
  animations: boolean;
  onClose: () => void;
}) {
  const g = state.gift;
  const image = useGiftImage(g ? g.id : null, !!g && g.hasImage);
  const won = c.kind !== 'chest' && c.won;
  const piece = c.kind !== 'chest' ? c.piece : null;
  return (
    <div className="modal-back" role="dialog" aria-modal="true" aria-label="Kutlama">
      <div className={'modal celebrate-modal' + (won ? ' won' : '')}>
        {c.kind === 'mission' && (
          <>
            <h2>Görev {c.number} tamamlandı!</h2>
            {c.unlocks.length > 0 && (
              <ul className="unlock-list">
                {c.unlocks.map((u) => <li key={u}><StarIcon size={18} /> {u}</li>)}
              </ul>
            )}
          </>
        )}
        {won ? <h2 className="won-title">Aferin {state.settings.childName}! Gizemli hediyeni kazandın!</h2> : piece != null ? <h3>Gizemli hediyeden bir parça açıldı!</h3> : null}
        {g && (piece != null || won) && (
          <GiftCanvas campaign={g} image={image} highlight={won ? null : piece} animations={animations} className={won ? 'won' : ''} />
        )}
        {won && g && (
          <div className="gift-won">
            <b>{g.name || 'Büyük sürpriz'}</b>
            {g.description && <p>{g.description}</p>}
          </div>
        )}
        {!won && g && piece != null && (
          <p className="muted">{g.opened.length} / {g.pieces} parça</p>
        )}
        {c.kind === 'mission' && !won && <p className="muted small">Harika çalıştın. İstersen şimdi kısa bir mola verebilirsin.</p>}
        <button className="btn big primary" onClick={onClose}>{won ? 'Yaşasın!' : 'Harika!'}</button>
      </div>
    </div>
  );
}

/* ============================================================
   EBEVEYN: HEDİYE YÖNETİMİ
   ============================================================ */
function openRandomPiece(g: GiftCampaign): { gift: GiftCampaign; piece: number | null; won: boolean } {
  const closed: number[] = [];
  for (let i = 0; i < g.pieces; i++) if (!g.opened.includes(i)) closed.push(i);
  if (!closed.length) return { gift: g, piece: null, won: !!g.wonAt };
  const piece = closed[Math.floor(Math.random() * closed.length)];
  const opened = [...g.opened, piece];
  const won = opened.length >= g.pieces;
  return { gift: { ...g, opened, wonAt: won ? new Date().toISOString() : null }, piece, won };
}

function GiftManager({ state, update }: { state: AppState; update: (fn: (s: AppState) => AppState) => void }) {
  const g = state.gift;
  const image = useGiftImage(g ? g.id : null, !!g && g.hasImage);
  const [showPreview, setShowPreview] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', showHint: false, pieces: 9, tasksPerPiece: 1 });
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [edit, setEdit] = useState<{ pieces: number; tasksPerPiece: number } | null>(null);
  const spm = state.settings.starsPerMission;

  const onPhoto = async (e: any) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;
    if (!/^image\//.test(f.type)) return setMsg('Lütfen bir fotoğraf dosyası seçin.');
    setBusy(true);
    setMsg('');
    try {
      setPhoto(await processPhoto(f));
    } catch (err) {
      setMsg('Fotoğraf okunamadı. Farklı bir fotoğraf deneyin (JPEG veya PNG).');
    }
    setBusy(false);
  };

  const start = async () => {
    if (!photo) return setMsg('Önce hediyenin fotoğrafını seçin.');
    if (g && !g.wonAt && !(await askConfirm('Devam eden hediye kampanyası kapatılıp yenisi başlatılsın mı? Açılan parçalar sıfırlanır; yıldızlar ve şehir ilerlemesi korunur.'))) return;
    setBusy(true);
    const id = uid();
    const saved = await saveGiftImage(id, photo);
    if (!saved.local && !saved.cloud) {
      setBusy(false);
      return setMsg('Fotoğraf bu tarayıcıda saklanamadı. Gizli sekmede değilseniz depolama alanını kontrol edin.');
    }
    if (g && g.hasImage) IDB.del('gift:' + g.id).catch(() => {});
    const camp: GiftCampaign = {
      id,
      name: form.name.trim(),
      description: form.description.trim(),
      showHint: form.showHint,
      pieces: form.pieces,
      tasksPerPiece: form.tasksPerPiece,
      createdAt: new Date().toISOString(),
      opened: [],
      seen: 0,
      tasksDone: 0,
      wonAt: null,
      celebrated: false,
      hasImage: true,
    };
    update((s) => ({ ...s, gift: camp }));
    setPhoto(null);
    setForm({ name: '', description: '', showHint: false, pieces: 9, tasksPerPiece: 1 });
    setBusy(false);
    setMsg(
      'Kampanya başladı. ' +
        (saved.cloud ? 'Fotoğraf bu cihazda ve hesabınızda saklandı.' : 'Fotoğraf yalnızca bu cihazda saklandı; başka cihazda parçalar fotoğrafsız görünür.')
    );
  };

  const manualOpen = async () => {
    if (!g || g.wonAt) return;
    if (!(await askConfirm('Bir parça elle açılsın mı? Çocuk ekranına dönünce kutlamayla gösterilecek.'))) return;
    update((s) => {
      if (!s.gift) return s;
      const r = openRandomPiece(s.gift);
      const hist = r.won ? [...s.giftHistory, { id: r.gift.id, name: r.gift.name, wonAt: r.gift.wonAt! }] : s.giftHistory;
      return { ...s, gift: r.gift, giftHistory: hist };
    });
  };

  const applyEdit = () => {
    if (!g || !edit) return;
    update((s) => {
      if (!s.gift) return s;
      const k = s.gift.opened.length;
      const idx = shuffle(Array.from({ length: edit.pieces }, (_, i) => i)).slice(0, k);
      const won = k >= edit.pieces;
      const gift = { ...s.gift, pieces: edit.pieces, tasksPerPiece: edit.tasksPerPiece, opened: idx, seen: Math.min(s.gift.seen, k), wonAt: won ? s.gift.wonAt || new Date().toISOString() : null };
      return { ...s, gift };
    });
    setEdit(null);
  };

  const endCampaign = async () => {
    if (!g) return;
    if (!(await askConfirm(g.wonAt ? 'Kazanılan hediye kartı kaldırılsın mı? Geçmişte kayıtlı kalır.' : 'Kampanya iptal edilsin mi? Açılan parçalar silinir; yıldızlar ve şehir ilerlemesi korunur.'))) return;
    if (g.hasImage) IDB.del('gift:' + g.id).catch(() => {});
    update((s) => ({ ...s, gift: null }));
  };

  const PIECE_OPTS = [4, 6, 9, 12, 16];
  const totalMissions = (p: number, t: number) => p * t;

  return (
    <section className="panel">
      <div className="card">
        <h3>Kazanma koşulu</h3>
        <p>
          Her görev = <b>{spm} yıldız</b>. Çocuk her doğru okumada 1 yıldız, tekrar deneyip başardığında 1 çaba yıldızı daha kazanır.
          Yanlış okumak veya zorlanmak hiçbir zaman yıldız, görev ya da parça geri almaz.
        </p>
        <label className="field">
          Görev başına yıldız
          <div className="seg">
            {[3, 5, 7, 10].map((n) => (
              <button key={n} className={spm === n ? 'on' : ''} onClick={() => update((s) => ({ ...s, settings: { ...s.settings, starsPerMission: n }, city: { ...s.city, missionStars: Math.min(s.city.missionStars, n - 1) } }))}>{n}</button>
            ))}
          </div>
        </label>
      </div>

      {g && (
        <div className="card">
          <h3>{g.wonAt ? 'Kazanılan hediye' : 'Devam eden hediye'}: {g.name || '(adsız)'}</h3>
          <p>
            {g.opened.length} / {g.pieces} parça açık · {g.tasksDone} görev tamamlandı · parça başına {g.tasksPerPiece} görev
            {!g.wonAt && ' · kalan yaklaşık ' + Math.max(0, (g.pieces - g.opened.length) * g.tasksPerPiece) + ' görev'}
          </p>
          {g.wonAt && <p className="ok-text">Kazanıldı: {new Date(g.wonAt).toLocaleString('tr-TR')}</p>}
          <button className="btn ghost" onClick={() => setShowPreview((v) => !v)}>
            {showPreview ? 'Fotoğrafı gizle' : 'Fotoğrafı göster (çocuk görmesin)'}
          </button>
          {showPreview && (image ? <img className="parent-preview" src={image} alt="Hediye fotoğrafı" /> : <p className="muted">Fotoğraf bu cihazda bulunamadı.</p>)}
          {!g.wonAt && (
            <div className="row gap wrap">
              <button className="btn primary" onClick={manualOpen}>Bir parçayı elle aç</button>
              <button className="btn ghost" onClick={() => setEdit({ pieces: g.pieces, tasksPerPiece: g.tasksPerPiece })}>Parça/görev sayısını değiştir</button>
            </div>
          )}
          {edit && (
            <div className="card inner">
              <label className="field">
                Parça sayısı (açılmış {g.opened.length} parça korunur)
                <div className="seg">
                  {PIECE_OPTS.map((n) => (
                    <button key={n} disabled={n < g.opened.length} className={edit.pieces === n ? 'on' : ''} onClick={() => setEdit({ ...edit, pieces: n })}>{n}</button>
                  ))}
                </div>
              </label>
              <label className="field">
                Bir parça için gereken görev
                <div className="seg">
                  {[1, 2, 3].map((n) => (
                    <button key={n} className={edit.tasksPerPiece === n ? 'on' : ''} onClick={() => setEdit({ ...edit, tasksPerPiece: n })}>{n}</button>
                  ))}
                </div>
              </label>
              <div className="row gap">
                <button className="btn primary" onClick={applyEdit}>Kaydet</button>
                <button className="btn ghost" onClick={() => setEdit(null)}>Vazgeç</button>
              </div>
            </div>
          )}
          <button className="btn danger" onClick={endCampaign}>{g.wonAt ? 'Kartı kaldır' : 'Kampanyayı iptal et'}</button>
        </div>
      )}

      <div className="card">
        <h3>Gizemli Hediye Oluştur</h3>
        <label className="field">
          Hediyenin fotoğrafı
          <input type="file" accept="image/*" onChange={onPhoto} disabled={busy} />
        </label>
        {busy && <p className="muted">Hazırlanıyor…</p>}
        {photo && <img className="parent-preview" src={photo} alt="Seçilen fotoğraf" />}
        <label className="field">
          Hediye adı (sona kadar çocuğa gösterilmez)
          <input value={form.name} maxLength={60} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ör. Yeni bisiklet" />
        </label>
        <label className="field">
          Açıklama
          <textarea rows={2} value={form.description} maxLength={200} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Ör. Hafta sonu parkta birlikte süreceğiz!" />
        </label>
        <label className="check">
          <input type="checkbox" checked={form.showHint} onChange={(e) => setForm({ ...form, showHint: e.target.checked })} />
          Açıklamayı oyun boyunca ipucu olarak göster
        </label>
        <label className="field">
          Parça sayısı
          <div className="seg">
            {PIECE_OPTS.map((n) => (
              <button key={n} className={form.pieces === n ? 'on' : ''} onClick={() => setForm({ ...form, pieces: n })}>{n}</button>
            ))}
          </div>
        </label>
        <label className="field">
          Bir parça için gereken görev
          <div className="seg">
            {[1, 2, 3].map((n) => (
              <button key={n} className={form.tasksPerPiece === n ? 'on' : ''} onClick={() => setForm({ ...form, tasksPerPiece: n })}>{n}</button>
            ))}
          </div>
        </label>
        <p className="muted small">
          Hediye için toplam {totalMissions(form.pieces, form.tasksPerPiece)} görev = {totalMissions(form.pieces, form.tasksPerPiece) * spm} yıldız gerekir.
          Günde 5 dakikalık oturumlarla bu süreyi planlayabilirsiniz.
        </p>
        <button className="btn primary" disabled={busy || !photo} onClick={start}>Kampanyayı başlat</button>
        {msg && <p className="ok-text" aria-live="polite">{msg}</p>}
      </div>

      {state.giftHistory.length > 0 && (
        <div className="card">
          <h3>Kazanılan hediyeler</h3>
          {state.giftHistory.slice().reverse().map((h) => (
            <p key={h.id + h.wonAt}>🎁 {h.name || '(adsız)'} · {new Date(h.wonAt).toLocaleDateString('tr-TR')}</p>
          ))}
        </div>
      )}
    </section>
  );
}

/* ============================================================
   3D DÜNYA (Three.js r128): BLOK MODELLER, ŞEHİR, KÜÇÜK RESİMLER
   ============================================================ */

const HAS_WEBGL = (() => {
  try {
    const c = document.createElement('canvas');
    return typeof THREE !== 'undefined' && !!THREE && !!(c.getContext('webgl') || c.getContext('experimental-webgl'));
  } catch (e) {
    return false;
  }
})();

const MAT_CACHE: Record<string, any> = {};
function mat(color: string, opts: any = {}): any {
  const key = color + JSON.stringify(opts);
  if (!MAT_CACHE[key]) {
    MAT_CACHE[key] = new THREE.MeshStandardMaterial({ color, roughness: 0.42, metalness: 0.04, ...opts });
  }
  return MAT_CACHE[key];
}

const GEO: Record<string, any> = {};
function geoBox(): any {
  return GEO.box || (GEO.box = new THREE.BoxGeometry(1, 1, 1));
}
function geoStud(): any {
  return GEO.stud || (GEO.stud = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 16));
}
function geoCyl(): any {
  return GEO.cyl || (GEO.cyl = new THREE.CylinderGeometry(0.5, 0.5, 1, 20));
}

function mesh(geo: any, m: any, shadow = true): any {
  const o = new THREE.Mesh(geo, m);
  o.castShadow = shadow;
  o.receiveShadow = true;
  return o;
}

/** Kutu: (x,y,z) alt-merkez değil, alt köşe noktasıdır; w,h,d boyutlar. */
function box(parent: any, x: number, y: number, z: number, w: number, h: number, d: number, color: string, opts: any = {}): any {
  const o = mesh(geoBox(), mat(color, opts.mat || {}), opts.shadow !== false);
  o.scale.set(w, h, d);
  o.position.set(x + w / 2, y + h / 2, z + d / 2);
  parent.add(o);
  return o;
}

function cyl(parent: any, x: number, y: number, z: number, r: number, h: number, color: string, opts: any = {}): any {
  const o = mesh(geoCyl(), mat(color, opts.mat || {}), opts.shadow !== false);
  o.scale.set(r * 2, h, r * 2);
  o.position.set(x, y + h / 2, z);
  parent.add(o);
  return o;
}

/** Üstünde LEGO çıkıntıları olan blok. Çıkıntılar toplu çizim için kaydedilir. */
class StudBatch {
  map: Record<string, number[][]> = {};
  add(color: string, x: number, y: number, z: number) {
    (this.map[color] = this.map[color] || []).push([x, y, z]);
  }
  build(parent: any) {
    const m4 = new THREE.Matrix4();
    Object.keys(this.map).forEach((c) => {
      const list = this.map[c];
      const im = new THREE.InstancedMesh(geoStud(), mat(c), list.length);
      list.forEach((p, i) => {
        m4.makeTranslation(p[0], p[1] + 0.1, p[2]);
        im.setMatrixAt(i, m4);
      });
      im.castShadow = true;
      im.receiveShadow = true;
      parent.add(im);
    });
  }
}

function brick(parent: any, studs: StudBatch | null, x: number, y: number, z: number, w: number, h: number, d: number, color: string, opts: any = {}) {
  const o = box(parent, x, y, z, w, h, d, color, opts);
  if (studs && opts.studs !== false) {
    const step = opts.step || 1;
    for (let i = step / 2; i < w; i += step) for (let k = step / 2; k < d; k += step) studs.add(color, x + i, y + h, z + k);
  }
  return o;
}

function prism(parent: any, x: number, y: number, z: number, w: number, h: number, d: number, color: string) {
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2, 0);
  shape.lineTo(w / 2, 0);
  shape.lineTo(0, h);
  shape.lineTo(-w / 2, 0);
  const g = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false });
  const o = mesh(g, mat(color));
  o.position.set(x + w / 2, y, z);
  parent.add(o);
  return o;
}

function canvasTex(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): any {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  draw(ctx);
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 4;
  return t;
}

/* ---------- Kişiselleştirme listeleri ---------- */
const HATS: Unlockable[] = [
  { id: 'yok', name: 'Şapkasız', need: 0 },
  { id: 'kep', name: 'Kep', need: 0 },
  { id: 'baret', name: 'Yapı bareti', need: 1 },
  { id: 'kasif', name: 'Kaşif şapkası', need: 4 },
  { id: 'asci', name: 'Aşçı şapkası', need: 6 },
  { id: 'tac', name: 'Altın taç', need: 10 },
  { id: 'astronot', name: 'Astronot kaskı', need: 13 },
];
const ACCESSORIES: Unlockable[] = [
  { id: 'yok', name: 'Aksesuarsız', need: 0 },
  { id: 'gozluk', name: 'Güneş gözlüğü', need: 2 },
  { id: 'canta', name: 'Sırt çantası', need: 3 },
  { id: 'kulaklik', name: 'Kulaklık', need: 5 },
  { id: 'pelerin', name: 'Kahraman pelerini', need: 7 },
  { id: 'jetpack', name: 'Jet sırt çantası', need: 11 },
];
const HAIR_STYLES: Array<{ id: string; name: string }> = [
  { id: 'kisa', name: 'Kısa' },
  { id: 'kivircik', name: 'Kıvırcık' },
  { id: 'uzun', name: 'Uzun' },
  { id: 'yok', name: 'Saçsız' },
];

/* ---------- Blok karakter (3D) ---------- */
function faceTexture(): any {
  return (
    GEO.face ||
    (GEO.face = canvasTex(256, 256, (ctx) => {
      ctx.clearRect(0, 0, 256, 256);
      ctx.fillStyle = '#1B1F3B';
      ctx.beginPath();
      ctx.ellipse(88, 104, 15, 20, 0, 0, Math.PI * 2);
      ctx.ellipse(168, 104, 15, 20, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(93, 97, 5, 0, Math.PI * 2);
      ctx.arc(173, 97, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#1B1F3B';
      ctx.lineWidth = 11;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(128, 140, 46, 0.2 * Math.PI, 0.8 * Math.PI);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,120,120,0.35)';
      ctx.beginPath();
      ctx.arc(62, 150, 14, 0, Math.PI * 2);
      ctx.arc(194, 150, 14, 0, Math.PI * 2);
      ctx.fill();
    }))
  );
}

function torsoDecal(outfit: string): any {
  const key = 'torso-' + outfit;
  if (GEO[key]) return GEO[key];
  GEO[key] = canvasTex(256, 256, (ctx) => {
    ctx.clearRect(0, 0, 256, 256);
    if (outfit === 'gunluk') {
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? 26 : 62;
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        ctx.lineTo(128 + r * Math.cos(a), 128 + r * Math.sin(a));
      }
      ctx.fill();
    } else if (outfit === 'futbol') {
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fillRect(40, 0, 26, 256);
      ctx.fillRect(190, 0, 26, 256);
      ctx.font = '900 110px "Lilita One", sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 10;
      ctx.strokeStyle = '#1B1F3B';
      ctx.strokeText('10', 128, 170);
      ctx.fillText('10', 128, 170);
    } else if (outfit === 'asci') {
      ctx.fillStyle = '#E9EEF5';
      ctx.fillRect(50, 60, 156, 196);
      ctx.fillStyle = '#FF6F61';
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(128, 100 + i * 46, 9, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (outfit === 'pilot') {
      ctx.strokeStyle = '#FFC23D';
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.moveTo(50, 90);
      ctx.lineTo(110, 90);
      ctx.lineTo(128, 70);
      ctx.lineTo(146, 90);
      ctx.lineTo(206, 90);
      ctx.stroke();
      ctx.fillStyle = '#FFC23D';
      ctx.fillRect(122, 110, 12, 146);
    } else if (outfit === 'kasif') {
      ctx.fillStyle = '#8F6A35';
      ctx.fillRect(40, 120, 60, 50);
      ctx.fillRect(156, 120, 60, 50);
      ctx.fillStyle = '#5B4220';
      ctx.fillRect(120, 0, 16, 256);
    } else if (outfit === 'astronot') {
      ctx.fillStyle = '#4AA8FF';
      ctx.fillRect(74, 90, 108, 70);
      ctx.fillStyle = '#FF6F61';
      ctx.beginPath();
      ctx.arc(102, 125, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFC23D';
      ctx.beginPath();
      ctx.arc(154, 125, 13, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  return GEO[key];
}

function outfitColors(a: Avatar): { shirt: string; pants: string } {
  switch (a.outfit) {
    case 'asci':
      return { shirt: '#FFFFFF', pants: a.pants };
    case 'pilot':
      return { shirt: '#22386B', pants: '#22386B' };
    case 'astronot':
      return { shirt: '#F1F4F8', pants: '#F1F4F8' };
    case 'kasif':
      return { shirt: '#C9A66B', pants: '#7A5B2E' };
    default:
      return { shirt: a.shirt, pants: a.pants };
  }
}

function makeMinifig(a: Avatar): any {
  const g = new THREE.Group();
  const { shirt, pants } = outfitColors(a);
  const skin = a.skin;
  const legs = new THREE.Group();
  const legL = box(legs, -0.5, 0, -0.27, 0.48, 1.05, 0.54, pants);
  const legR = box(legs, 0.02, 0, -0.27, 0.48, 1.05, 0.54, pants);
  box(legs, -0.5, 0, -0.32, 0.48, 0.18, 0.66, pants);
  box(legs, 0.02, 0, -0.32, 0.48, 0.18, 0.66, pants);
  g.add(legs);
  box(g, -0.52, 1.05, -0.29, 1.04, 0.24, 0.58, pants);
  // gövde (yukarı doğru daralan)
  const tg = new THREE.BoxGeometry(1.04, 1.15, 0.56);
  const pos = tg.attributes.position;
  for (let i = 0; i < pos.count; i++) if (pos.getY(i) > 0) pos.setX(i, pos.getX(i) * 0.74);
  tg.computeVertexNormals();
  const torso = mesh(tg, mat(shirt));
  torso.position.set(0, 1.29 + 0.575, 0);
  g.add(torso);
  const decal = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.95), new THREE.MeshStandardMaterial({ map: torsoDecal(a.outfit), transparent: true, roughness: 0.5 }));
  decal.position.set(0, 1.86, 0.285);
  g.add(decal);
  // kollar
  const armGeo = new THREE.CylinderGeometry(0.15, 0.17, 0.95, 12);
  [-1, 1].forEach((s) => {
    const arm = mesh(armGeo, mat(shirt));
    arm.position.set(s * 0.56, 1.95, 0.05);
    arm.rotation.z = s * 0.22;
    arm.rotation.x = -0.25;
    g.add(arm);
    const hand = mesh(geoCyl(), mat(skin));
    hand.scale.set(0.26, 0.22, 0.26);
    hand.position.set(s * 0.68, 1.42, 0.22);
    g.add(hand);
  });
  cyl(g, 0, 2.44, 0, 0.2, 0.12, skin);
  // kafa
  const head = mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.78, 28), mat(skin));
  head.position.set(0, 2.56 + 0.39, 0);
  g.add(head);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.7), new THREE.MeshBasicMaterial({ map: faceTexture(), transparent: true }));
  face.position.set(0, 2.94, 0.425);
  g.add(face);
  const hat = a.hat || 'yok';
  if (hat === 'yok' || hat === 'kep') cyl(g, 0, 3.34, 0, 0.2, 0.16, skin);
  // saç
  const hairOn = hat !== 'astronot' && hat !== 'asci';
  if (hairOn && a.hair === 'kisa') {
    const h = mesh(new THREE.SphereGeometry(0.47, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat(a.hairColor));
    h.position.set(0, 3.2, -0.02);
    h.scale.set(1, 0.6, 1.02);
    g.add(h);
    box(g, -0.46, 2.72, -0.47, 0.92, 0.5, 0.3, a.hairColor);
  } else if (hairOn && a.hair === 'kivircik') {
    for (let i = 0; i < 9; i++) {
      const ang = (i / 9) * Math.PI * 2;
      const s = mesh(new THREE.SphereGeometry(0.2, 10, 8), mat(a.hairColor));
      s.position.set(Math.cos(ang) * 0.36, 3.28 + (i % 2) * 0.05, Math.sin(ang) * 0.36 - 0.04);
      g.add(s);
    }
    const s = mesh(new THREE.SphereGeometry(0.32, 14, 10), mat(a.hairColor));
    s.position.set(0, 3.4, 0);
    g.add(s);
  } else if (hairOn && a.hair === 'uzun') {
    const h = mesh(new THREE.SphereGeometry(0.48, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat(a.hairColor));
    h.position.set(0, 3.2, -0.02);
    h.scale.set(1, 0.6, 1.02);
    g.add(h);
    box(g, -0.5, 2.3, -0.5, 1.0, 1.0, 0.36, a.hairColor);
  }
  // şapka
  if (hat === 'kep') {
    const c = mesh(new THREE.SphereGeometry(0.46, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat(a.shirt));
    c.position.set(0, 3.24, 0);
    c.scale.set(1, 0.62, 1);
    g.add(c);
    box(g, -0.32, 3.24, 0.2, 0.64, 0.07, 0.5, a.shirt);
  } else if (hat === 'baret') {
    const c = mesh(new THREE.SphereGeometry(0.5, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat('#FFC23D'));
    c.position.set(0, 3.22, 0);
    c.scale.set(1, 0.75, 1);
    g.add(c);
    cyl(g, 0, 3.2, 0.04, 0.6, 0.06, '#FFC23D');
  } else if (hat === 'kasif') {
    cyl(g, 0, 3.26, 0, 0.78, 0.06, '#A9864C');
    cyl(g, 0, 3.3, 0, 0.42, 0.34, '#C9A66B');
  } else if (hat === 'asci') {
    cyl(g, 0, 3.3, 0, 0.44, 0.3, '#FFFFFF');
    [-0.22, 0, 0.22].forEach((x, i) => {
      const s = mesh(new THREE.SphereGeometry(0.3, 14, 10), mat('#FFFFFF'));
      s.position.set(x, 3.75 + (i === 1 ? 0.1 : 0), 0);
      g.add(s);
    });
  } else if (hat === 'tac') {
    cyl(g, 0, 3.3, 0, 0.42, 0.22, '#FFC23D', { mat: { metalness: 0.5, roughness: 0.25 } });
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2;
      const c = mesh(new THREE.ConeGeometry(0.1, 0.28, 8), mat('#FFC23D', { metalness: 0.5, roughness: 0.25 }));
      c.position.set(Math.cos(ang) * 0.36, 3.66, Math.sin(ang) * 0.36);
      g.add(c);
    }
    const gem = mesh(new THREE.SphereGeometry(0.08, 10, 8), mat('#FF6F61'));
    gem.position.set(0, 3.42, 0.42);
    g.add(gem);
  } else if (hat === 'astronot') {
    const h = new THREE.Mesh(
      new THREE.SphereGeometry(0.72, 28, 20),
      new THREE.MeshStandardMaterial({ color: '#BFE4FF', transparent: true, opacity: 0.32, roughness: 0.05, metalness: 0.1 })
    );
    h.position.set(0, 2.95, 0);
    g.add(h);
    cyl(g, 0, 2.38, 0, 0.6, 0.2, '#F1F4F8');
  }
  // aksesuar
  const acc = a.accessory || 'yok';
  if (acc === 'gozluk') {
    box(g, -0.34, 2.92, 0.4, 0.28, 0.16, 0.06, '#1B1F3B');
    box(g, 0.06, 2.92, 0.4, 0.28, 0.16, 0.06, '#1B1F3B');
    box(g, -0.06, 2.97, 0.4, 0.12, 0.05, 0.06, '#1B1F3B');
  } else if (acc === 'canta') {
    box(g, -0.4, 1.4, -0.62, 0.8, 0.9, 0.36, '#FF9F45');
    box(g, -0.3, 1.5, -0.7, 0.6, 0.35, 0.1, '#E07C22');
  } else if (acc === 'kulaklik') {
    const t = mesh(new THREE.TorusGeometry(0.5, 0.05, 8, 24, Math.PI), mat('#1B1F3B'));
    t.position.set(0, 3.0, 0);
    g.add(t);
    [-1, 1].forEach((s) => {
      const e = mesh(geoCyl(), mat('#FF6F61'));
      e.scale.set(0.3, 0.12, 0.3);
      e.rotation.z = Math.PI / 2;
      e.position.set(s * 0.47, 2.95, 0);
      g.add(e);
    });
  } else if (acc === 'pelerin') {
    const cape = mesh(new THREE.BoxGeometry(1.0, 1.7, 0.05), mat('#E8473B'));
    cape.position.set(0, 1.55, -0.36);
    cape.rotation.x = 0.08;
    g.add(cape);
  } else if (acc === 'jetpack') {
    [-0.22, 0.22].forEach((x) => {
      cyl(g, x, 1.3, -0.5, 0.18, 0.95, '#B8C4D9', { mat: { metalness: 0.4 } });
      const f = mesh(new THREE.ConeGeometry(0.14, 0.4, 10), mat('#FF9F45', { emissive: '#FF6F00', emissiveIntensity: 0.6 }));
      f.rotation.x = Math.PI;
      f.position.set(x, 1.1, -0.5);
      g.add(f);
    });
  }
  g.userData.legs = [legL, legR];
  return g;
}

/* ---------- Blok araç (3D) ---------- */
const CAR_COLOR: Record<string, string> = {
  mini: '#E8473B',
  taksi: '#FFC23D',
  jip: '#2DBE9B',
  dondurma: '#F7A8C8',
  itfaiye: '#D63B30',
  uzayaraci: '#C3CEDF',
};

function makeCar(id: string): any {
  const g = new THREE.Group();
  const c = CAR_COLOR[id] || '#4AA8FF';
  const studs = new StudBatch();
  const win = '#BFE7FF';
  const glass = { mat: { roughness: 0.1, metalness: 0.2 } };
  const wheelR = id === 'jip' ? 0.5 : 0.42;
  const lift = id === 'jip' ? 0.15 : 0;
  if (id === 'dondurma' || id === 'itfaiye') {
    brick(g, studs, -1.9, 0.35 + lift, -0.85, 3.8, 0.4, 1.7, '#4A5068', { studs: false });
    if (id === 'dondurma') {
      brick(g, studs, -1.9, 0.75, -0.85, 2.5, 1.7, 1.7, c);
      box(g, -1.6, 1.0, 0.86, 1.9, 0.9, 0.04, '#FFF3D6');
      const cone = mesh(new THREE.ConeGeometry(0.35, 0.8, 14), mat('#E3A33B'));
      cone.rotation.x = Math.PI;
      cone.position.set(-0.6, 2.95, 0);
      g.add(cone);
      const sc = mesh(new THREE.SphereGeometry(0.4, 16, 12), mat('#FFF3D6'));
      sc.position.set(-0.6, 3.38, 0);
      g.add(sc);
      const sc2 = mesh(new THREE.SphereGeometry(0.28, 14, 10), mat('#F06BA8'));
      sc2.position.set(-0.6, 3.72, 0);
      g.add(sc2);
    } else {
      brick(g, studs, -1.9, 0.75, -0.85, 2.6, 0.8, 1.7, c);
      box(g, -1.8, 1.55, -0.5, 2.4, 0.12, 1.0, '#C7D0DE');
      for (let i = 0; i < 7; i++) box(g, -1.7 + i * 0.34, 1.67, -0.5, 0.08, 0.1, 1.0, '#8794AA');
      box(g, -1.85, 1.55, -0.75, 2.5, 0.2, 0.1, '#C7D0DE');
    }
    brick(g, studs, 0.6, 0.75, -0.85, 1.3, 1.5, 1.7, id === 'dondurma' ? '#4AA8FF' : c);
    box(g, 1.62, 1.35, -0.7, 0.3, 0.6, 1.4, win, glass);
    if (id === 'itfaiye') box(g, 0.8, 2.25, -0.3, 0.6, 0.2, 0.6, '#4AA8FF', { mat: { emissive: '#2A6CFF', emissiveIntensity: 0.5 } });
  } else {
    brick(g, studs, -1.6, 0.35 + lift, -0.8, 3.2, 0.62, 1.6, c);
    const cabinW = id === 'jip' ? 1.9 : 1.5;
    const cx = id === 'jip' ? -1.1 : -0.85;
    box(g, cx, 0.97 + lift, -0.72, cabinW, 0.72, 1.44, win, glass);
    brick(g, studs, cx - 0.05, 1.69 + lift, -0.78, cabinW + 0.1, 0.18, 1.56, c);
    box(g, 1.45, 0.6 + lift, -0.65, 0.18, 0.22, 0.3, '#FFF3B0', { mat: { emissive: '#FFE680', emissiveIntensity: 0.4 } });
    box(g, 1.45, 0.6 + lift, 0.35, 0.18, 0.22, 0.3, '#FFF3B0', { mat: { emissive: '#FFE680', emissiveIntensity: 0.4 } });
    if (id === 'taksi') {
      box(g, -0.45, 1.87, -0.3, 0.7, 0.32, 0.6, '#1B1F3B');
      for (let i = 0; i < 4; i++) box(g, -1.5 + i * 0.8, 0.55, 0.81, 0.4, 0.2, 0.02, '#1B1F3B');
    }
    if (id === 'jip') {
      cyl(g, -1.75, 0.6, 0, 0.42, 0.22, '#1B1F3B').rotation.z = Math.PI / 2;
      box(g, -0.6, 1.95 + lift, -0.78, 0.08, 0.2, 1.56, '#1B1F3B');
    }
    if (id === 'uzayaraci') {
      [-0.95, 0.95].forEach((z) => {
        const fin = mesh(new THREE.BoxGeometry(1.0, 0.08, 0.7), mat('#8A6CFF'));
        fin.position.set(-1.3, 0.85, z * 0.9);
        fin.rotation.y = z > 0 ? -0.3 : 0.3;
        g.add(fin);
      });
      cyl(g, -0.2, 1.87, 0, 0.04, 0.8, '#8A6CFF');
      const b = mesh(new THREE.SphereGeometry(0.13, 12, 10), mat('#FFC23D', { emissive: '#FFB000', emissiveIntensity: 0.6 }));
      b.position.set(-0.2, 2.75, 0);
      g.add(b);
    }
  }
  const wheelGeo = new THREE.CylinderGeometry(wheelR, wheelR, 0.36, 22);
  const hubGeo = new THREE.CylinderGeometry(wheelR * 0.5, wheelR * 0.5, 0.38, 16);
  const wx = id === 'dondurma' || id === 'itfaiye' ? [-1.2, 1.2] : [-0.95, 0.95];
  wx.forEach((x) =>
    [-0.82, 0.82].forEach((z) => {
      const w = mesh(wheelGeo, mat('#22263A'));
      w.rotation.x = Math.PI / 2;
      w.position.set(x, wheelR, z);
      g.add(w);
      const h = mesh(hubGeo, mat('#D9DEE8'));
      h.rotation.x = Math.PI / 2;
      h.position.set(x, wheelR, z);
      g.add(h);
    })
  );
  studs.build(g);
  return g;
}

/* ---------- Küçük resim üretici (oyun içi kartlar için) ---------- */
const Thumbs = {
  renderer: null as any,
  cache: {} as Record<string, string>,
  render(key: string, build: () => any, view: 'fig' | 'car' | 'portrait' | 'obj', size = 256): string {
    if (Thumbs.cache[key]) return Thumbs.cache[key];
    if (!HAS_WEBGL) return '';
    try {
      if (!Thumbs.renderer) {
        const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
        r.setSize(256, 256);
        r.setPixelRatio(1);
        Thumbs.renderer = r;
      }
      const cur = Thumbs.renderer.getSize(new THREE.Vector2());
      if (cur.x !== size) Thumbs.renderer.setSize(size, size);
      const scene = new THREE.Scene();
      scene.add(new THREE.HemisphereLight('#ffffff', '#9aa8c4', 1.0));
      const dl = new THREE.DirectionalLight('#ffffff', 0.8);
      dl.position.set(3, 6, 5);
      scene.add(dl);
      const obj = build();
      scene.add(obj);
      const cam = new THREE.PerspectiveCamera(view === 'portrait' ? 22 : 30, 1, 0.1, 200);
      if (view === 'obj') {
        const bb = new THREE.Box3().setFromObject(obj);
        const c = bb.getCenter(new THREE.Vector3());
        const r = bb.getBoundingSphere(new THREE.Sphere()).radius;
        const dist = (r / Math.sin((15 * Math.PI) / 180)) * 1.02;
        cam.position.copy(c).add(new THREE.Vector3(0.75, 0.62, 1.25).normalize().multiplyScalar(dist));
        cam.lookAt(c);
      } else if (view === 'fig') {
        cam.position.set(3.2, 3.4, 7.2);
        cam.lookAt(0, 1.9, 0);
      } else if (view === 'portrait') {
        cam.position.set(1.7, 3.6, 6.6);
        cam.lookAt(0, 2.9, 0);
      } else {
        cam.position.set(4.4, 3.6, 5.6);
        cam.lookAt(0, 0.9, 0);
      }
      Thumbs.renderer.render(scene, cam);
      const url = Thumbs.renderer.domElement.toDataURL('image/png');
      Thumbs.cache[key] = url;
      return url;
    } catch (e) {
      return '';
    }
  },
  fig(a: Avatar) {
    return Thumbs.render('fig:' + JSON.stringify(a), () => {
      const f = makeMinifig(a);
      f.rotation.y = -0.35;
      return f;
    }, 'fig');
  },
  portrait(a: Avatar) {
    return Thumbs.render('por:' + JSON.stringify(a), () => {
      const f = makeMinifig(a);
      f.rotation.y = -0.2;
      return f;
    }, 'portrait');
  },
  car(id: string) {
    return Thumbs.render('car:' + id, () => {
      const c = makeCar(id);
      c.rotation.y = -0.5;
      return c;
    }, 'car');
  },
};

const ProfileCfg = { version: 0 };

function useProfilePhoto(version: number): string | null {
  const [url, setUrl] = useState<string | null>(version ? recMem['profile'] || null : null);
  useEffect(() => {
    let off = false;
    if (!version) {
      setUrl(null);
      return;
    }
    RecStore.get('profile').then((u) => !off && setUrl(u));
    return () => { off = true; };
  }, [version]);
  return url;
}

/* Kart görselleri ekranı dondurmadan, sırayla ve arka planda üretilir. */
const thumbQueue: Array<() => void> = [];
let thumbBusy = false;
function pumpThumbs() {
  const f = thumbQueue.shift();
  if (!f) {
    thumbBusy = false;
    return;
  }
  thumbBusy = true;
  setTimeout(() => {
    try { f(); } catch (e) { /* yoksay */ }
    pumpThumbs();
  }, 16);
}
function LazyThumb({ k, make }: { k: string; make: () => string }) {
  const [src, setSrc] = useState<string>(Thumbs.cache[k] || '');
  useEffect(() => {
    if (Thumbs.cache[k]) {
      setSrc(Thumbs.cache[k]);
      return;
    }
    let off = false;
    thumbQueue.push(() => {
      if (!off) setSrc(make());
    });
    if (!thumbBusy) pumpThumbs();
    return () => { off = true; };
  }, [k]);
  return src ? <img src={src} alt="" /> : <span className="thumb-wait" aria-hidden="true" />;
}

function PlayerPortrait({ a, size = 64, photo = false }: { a: Avatar; size?: number; photo?: boolean }) {
  const pv = useProfilePhoto(photo ? ProfileCfg.version : 0);
  if (photo && pv) {
    return (
      <span className="portrait photo" style={{ width: size, height: size }}>
        <img src={pv} alt="" />
      </span>
    );
  }
  const src = Thumbs.portrait(a);
  return (
    <span className="portrait" style={{ width: size, height: size }}>
      {src ? <img src={src} alt="" /> : <Minifig a={a} size={size} />}
    </span>
  );
}

/* ============================================================
   ŞEHİR SAHNESİ
   ============================================================ */
type BuildingId = 'okul' | 'garaj' | 'atolye' | 'ses' | 'hazine' | 'ev' | 'sahne';

interface BuildingDef {
  id: BuildingId;
  name: string;
  sub: string;
  need: number;
  x: number;
  z: number;
  screen: Screen;
}

const BUILDINGS: BuildingDef[] = [
  { id: 'okul', name: 'Okuma Okulu', sub: 'Hece Çarkı', need: 0, x: -6.5, z: -6.5, screen: 'game-hece' },
  { id: 'garaj', name: 'Kelime Garajı', sub: 'Kelime Çarkı', need: 0, x: 6.5, z: -6.5, screen: 'game-kelime' },
  { id: 'ses', name: 'Ses İstasyonu', sub: 'Duy ve Bul', need: 1, x: 6.5, z: 6.5, screen: 'game-duy' },
  { id: 'atolye', name: 'Yapı Atölyesi', sub: 'Heceleri Birleştir', need: 2, x: -6.5, z: 6.5, screen: 'game-birlestir' },
  { id: 'sahne', name: 'Karaoke Sahnesi', sub: 'Hece hece oku', need: 0, x: 16.5, z: 0, screen: 'game-karaoke' },
  { id: 'hazine', name: 'Hazine Merkezi', sub: 'Gizemli Hediye', need: 0, x: 0, z: -16.5, screen: 'gift' },
  { id: 'ev', name: 'Evim ve Garajım', sub: 'Karakter ve arabalar', need: 0, x: -16.5, z: 0, screen: 'garage' },
];

const ZONES: Array<{ id: string; name: string; need: number; x: number; z: number }> = [
  { id: 'lunapark', name: 'Lunapark', need: 3, x: -16.5, z: -16.5 },
  { id: 'liman', name: 'Liman', need: 5, x: 16.5, z: -16.5 },
  { id: 'hayvanat', name: 'Hayvanat Bahçesi', need: 8, x: -16.5, z: 16.5 },
  { id: 'uzay', name: 'Uzay Üssü', need: 12, x: 16.5, z: 16.5 },
];

function gameBuildings(done: number) {
  return BUILDINGS.filter((b) => b.screen.startsWith('game') && b.need <= done);
}

function suggestedBuilding(done: number): BuildingDef {
  const list = gameBuildings(done);
  return list[done % list.length];
}

const GRAY = (c: string) => {
  const n = parseInt(c.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const v = Math.round(r * 0.3 + g * 0.59 + b * 0.11);
  const m = Math.round(v * 0.75 + 40);
  return '#' + [m, m, m + 8].map((x) => Math.min(255, x).toString(16).padStart(2, '0')).join('');
};

function addTree(p: any, studs: StudBatch, x: number, z: number, s = 1) {
  box(p, x - 0.3 * s, 0.3, z - 0.3 * s, 0.6 * s, 1.3 * s, 0.6 * s, '#8B5A2B');
  brick(p, studs, x - 1.0 * s, 0.3 + 1.2 * s, z - 1.0 * s, 2.0 * s, 1.0 * s, 2.0 * s, '#3FA34D', { studs: false });
  brick(p, studs, x - 0.7 * s, 0.3 + 2.2 * s, z - 0.7 * s, 1.4 * s, 0.8 * s, 1.4 * s, '#58C16A', { studs: false });
  studs.add('#58C16A', x - 0.35 * s, 0.3 + 3.0 * s, z - 0.35 * s);
  studs.add('#58C16A', x + 0.35 * s, 0.3 + 3.0 * s, z + 0.35 * s);
}

function addBarrier(p: any, x: number, z: number, w: number, d: number) {
  const y = 0.3;
  for (let i = 0; i <= w; i += 1.5) {
    box(p, x + i - 0.08, y, z - 0.08, 0.16, 1.0, 0.16, '#E6E9F0');
    box(p, x + i - 0.08, y, z + d - 0.08, 0.16, 1.0, 0.16, '#E6E9F0');
  }
  for (let i = 0; i <= d; i += 1.5) {
    box(p, x - 0.08, y, z + i - 0.08, 0.16, 1.0, 0.16, '#E6E9F0');
    box(p, x + w - 0.08, y, z + i - 0.08, 0.16, 1.0, 0.16, '#E6E9F0');
  }
  for (let i = 0; i < w; i += 1) {
    box(p, x + i, y + 0.65, z - 0.06, 1, 0.22, 0.12, i % 2 ? '#FF6F61' : '#FFFFFF', { shadow: false });
    box(p, x + i, y + 0.65, z + d - 0.06, 1, 0.22, 0.12, i % 2 ? '#FF6F61' : '#FFFFFF', { shadow: false });
  }
  for (let i = 0; i < d; i += 1) {
    box(p, x - 0.06, y + 0.65, z + i, 0.12, 0.22, 1, i % 2 ? '#FF6F61' : '#FFFFFF', { shadow: false });
    box(p, x + w - 0.06, y + 0.65, z + i, 0.12, 0.22, 1, i % 2 ? '#FF6F61' : '#FFFFFF', { shadow: false });
  }
}

function addCone(p: any, x: number, z: number) {
  const c = mesh(new THREE.ConeGeometry(0.32, 0.8, 14), mat('#FF8A3D'));
  c.position.set(x, 0.7, z);
  p.add(c);
  box(p, x - 0.4, 0.3, z - 0.4, 0.8, 0.1, 0.8, '#FF8A3D');
}

function makePadlock(): any {
  const g = new THREE.Group();
  const body = mesh(new THREE.BoxGeometry(1.2, 1.0, 0.5), mat('#FFC23D', { metalness: 0.45, roughness: 0.3 }));
  g.add(body);
  const sh = mesh(new THREE.TorusGeometry(0.4, 0.12, 10, 24, Math.PI), mat('#B8C4D9', { metalness: 0.6, roughness: 0.25 }));
  sh.position.y = 0.5;
  g.add(sh);
  const hole = mesh(geoCyl(), mat('#1B1F3B'));
  hole.scale.set(0.24, 0.1, 0.24);
  hole.rotation.x = Math.PI / 2;
  hole.position.set(0, -0.05, 0.26);
  g.add(hole);
  return g;
}

function buildBuilding(id: BuildingId, root: any, studs: StudBatch, locked: boolean, anim: any) {
  const def = BUILDINGS.find((b) => b.id === id)!;
  const p = new THREE.Group();
  p.position.set(def.x, 0, def.z);
  root.add(p);
  const C = (c: string) => (locked ? GRAY(c) : c);
  // studs added in world coords, so translate
  const S = {
    add: (c: string, x: number, y: number, z: number) => studs.add(c, x + def.x, y, z + def.z),
  } as any;
  const b = (x: number, y: number, z: number, w: number, h: number, d: number, c: string, o: any = {}) =>
    brick(p, S, x, y, z, w, h, d, C(c), o);
  const win = (x: number, y: number, z: number, w: number, h: number, d: number) =>
    box(p, x, y, z, w, h, d, C('#9ED8FF'), { mat: { roughness: 0.15, metalness: 0.2 } });
  b(-4, 0, -3.2, 8, 0.3, 6.4, '#C9CFDB', { step: 2 });

  if (id === 'okul') {
    b(-3.4, 0.3, -2.4, 6.8, 2.8, 4.4, '#E4572E', { studs: false });
    for (let i = 0; i < 4; i++) win(-2.9 + i * 1.6, 1.4, 2.0, 0.9, 1.0, 0.06);
    for (let i = 0; i < 2; i++) win(3.4, 1.4, -1.6 + i * 2.2, 0.06, 1.0, 0.9);
    box(p, -0.6, 0.3, 1.98, 1.2, 1.6, 0.08, C('#7A3B1E'));
    b(-3.6, 3.1, -2.6, 7.2, 0.3, 4.8, '#F2F2F2', { studs: false });
    prism(p, -3.6, 3.4, -2.6, 7.2, 1.6, 4.8, C('#2F6FD6'));
    b(-0.9, 3.4, 0.6, 1.8, 2.6, 1.8, '#F2F2F2', { studs: false });
    prism(p, -1.0, 6.0, 0.5, 2.0, 1.1, 2.0, C('#2F6FD6'));
    const clock = mesh(geoCyl(), mat(C('#FFFFFF')));
    clock.scale.set(1.1, 0.1, 1.1);
    clock.rotation.x = Math.PI / 2;
    clock.position.set(0, 5.0, 2.45);
    p.add(clock);
    const hand1 = box(p, -0.04, 5.0, 2.52, 0.08, 0.45, 0.04, '#1B1F3B');
    hand1.position.set(0, 5.18, 2.52);
    const hand2 = box(p, -0.04, 5.0, 2.52, 0.34, 0.08, 0.04, '#1B1F3B');
    hand2.position.set(0.14, 5.0, 2.52);
    cyl(p, 3.0, 0.3, 2.6, 0.06, 4.2, C('#D9DEE8'));
    const flagTex = canvasTex(192, 128, (ctx) => {
      ctx.fillStyle = '#E30A17';
      ctx.fillRect(0, 0, 192, 128);
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(74, 64, 32, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#E30A17';
      ctx.beginPath();
      ctx.arc(82, 64, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? 6 : 15;
        const a = (i * Math.PI) / 5;
        ctx.lineTo(116 + r * Math.cos(a), 64 + r * Math.sin(a));
      }
      ctx.fill();
    });
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.0), new THREE.MeshStandardMaterial({ map: flagTex, side: THREE.DoubleSide }));
    flag.position.set(3.0, 4.05, 3.36);
    flag.rotation.y = Math.PI / 2;
    if (!locked) {
      flag.material = new THREE.MeshStandardMaterial({ map: flagTex, side: THREE.DoubleSide });
      flag.position.set(3.0, 4.05, 2.6 + 0.76);
      flag.rotation.y = -Math.PI / 2;
      anim.flags.push(flag);
      p.add(flag);
    }
  } else if (id === 'garaj') {
    b(-3.4, 0.3, -2.4, 6.8, 3.0, 4.4, '#2F80ED', { studs: false });
    box(p, -2.8, 0.3, 1.98, 3.2, 2.3, 0.1, C('#D9DEE8'));
    for (let i = 0; i < 7; i++) box(p, -2.8, 0.45 + i * 0.32, 2.06, 3.2, 0.06, 0.05, C('#9AA6BD'));
    win(1.0, 1.4, 2.0, 1.8, 1.0, 0.06);
    win(3.4, 1.4, -1.6, 0.06, 1.0, 2.6);
    b(-3.6, 3.3, -2.6, 7.2, 0.4, 4.8, '#FFC23D');
    b(-2.0, 3.7, 1.6, 4.0, 1.2, 0.4, '#1B1F3B', { studs: false });
    const signTex = canvasTex(512, 160, (ctx) => {
      ctx.fillStyle = locked ? '#666' : '#1B1F3B';
      ctx.fillRect(0, 0, 512, 160);
      ctx.fillStyle = locked ? '#ddd' : '#FFC23D';
      ctx.font = '90px "Lilita One", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('KELİME', 256, 86);
    });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 1.1), new THREE.MeshBasicMaterial({ map: signTex }));
    sign.position.set(0, 4.3, 2.02);
    p.add(sign);
    const car = makeCar('taksi');
    car.position.set(1.7, 0.3, 3.1);
    car.rotation.y = 0;
    car.scale.setScalar(0.62);
    if (!locked) p.add(car);
  } else if (id === 'atolye') {
    b(-3.4, 0.3, -2.4, 4.6, 2.6, 4.4, '#FF8A3D', { studs: false });
    win(-2.9, 1.3, 2.0, 1.2, 1.0, 0.06);
    box(p, -1.2, 0.3, 1.98, 1.6, 2.0, 0.08, C('#8A4B16'));
    b(-3.6, 2.9, -2.6, 5.0, 0.3, 4.8, '#FFD166');
    // vinç
    for (let i = 0; i < 9; i++) box(p, 2.0, 0.3 + i * 0.8, -1.8, 0.6, 0.8, 0.6, C(i % 2 ? '#FFC23D' : '#1B1F3B'));
    box(p, -1.0, 7.5, -1.75, 5.4, 0.5, 0.5, C('#FFC23D'));
    box(p, 3.8, 7.0, -1.9, 0.9, 0.5, 0.8, C('#4A5068'));
    const cable = box(p, -0.62, 4.6, -1.55, 0.06, 2.9, 0.06, '#1B1F3B');
    const hook = new THREE.Group();
    hook.position.set(-0.6, 4.2, -1.5);
    brick(hook, null, -0.6, 0, -0.4, 1.2, 0.5, 0.8, C('#2DBE9B'));
    p.add(hook);
    if (!locked) anim.crane.push({ cable, hook });
    const pile = ['#E8473B', '#2F80ED', '#FFC23D', '#2DBE9B', '#8A6CFF'];
    pile.forEach((c, i) => b(1.6 + (i % 2) * 0.4, 0.3 + i * 0.5, 0.6, 2, 0.5, 1.2, c));
  } else if (id === 'ses') {
    b(-3.4, 0.3, -2.4, 4.8, 2.6, 4.4, '#8A6CFF', { studs: false });
    for (let i = 0; i < 2; i++) win(-2.9 + i * 1.9, 1.3, 2.0, 1.2, 1.0, 0.06);
    box(p, -0.3, 0.3, 1.98, 1.0, 1.8, 0.08, C('#4B2FA8'));
    b(-3.6, 2.9, -2.6, 5.2, 0.3, 4.8, '#C4B3FF');
    for (let i = 0; i < 8; i++) {
      const w = 1.2 - i * 0.1;
      box(p, 2.4 - w / 2 + 0.5, 0.3 + i * 0.9, -0.5 - w / 2, w, 0.9, w, C(i % 2 ? '#FFFFFF' : '#E8473B'));
    }
    const top = mesh(new THREE.SphereGeometry(0.32, 16, 12), mat(C('#FFC23D'), locked ? {} : { emissive: '#FFB000', emissiveIntensity: 0.8 }));
    top.position.set(2.9, 7.75, -0.5);
    p.add(top);
    if (!locked) {
      for (let i = 0; i < 3; i++) {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(1, 0.06, 8, 40),
          new THREE.MeshBasicMaterial({ color: '#FFC23D', transparent: true, opacity: 0.8 })
        );
        ring.position.set(2.9, 7.75, -0.5);
        ring.rotation.x = Math.PI / 2;
        p.add(ring);
        anim.rings.push({ ring, phase: i / 3 });
      }
    }
    const dish = mesh(new THREE.SphereGeometry(0.9, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2.6), mat(C('#E6E9F0'), { side: THREE.DoubleSide }));
    dish.position.set(-1.6, 3.4, -0.4);
    dish.rotation.x = -0.9;
    p.add(dish);
  } else if (id === 'hazine') {
    b(-3.4, 0.3, -2.4, 6.8, 0.5, 4.6, '#E6E9F0');
    b(-3.0, 0.8, -2.2, 6.0, 2.7, 3.8, '#F2C14E', { studs: false });
    for (let i = 0; i < 4; i++) cyl(p, -2.4 + i * 1.6, 0.8, 1.9, 0.26, 2.7, C('#FFF3D6'));
    b(-3.3, 3.5, -2.4, 6.6, 0.35, 4.6, '#FFF3D6', { studs: false });
    prism(p, -3.3, 3.85, -2.4, 6.6, 1.3, 4.6, C('#F2C14E'));
    box(p, -0.7, 0.8, 1.62, 1.4, 1.9, 0.1, C('#7A4E12'));
    const chest = new THREE.Group();
    chest.position.set(0, 5.3, 0);
    brick(chest, null, -1, 0, -0.7, 2, 1.0, 1.4, C('#A0522D'));
    const lid = new THREE.Group();
    lid.position.set(0, 1.0, -0.7);
    box(lid, -1, 0, 0, 2, 0.5, 1.4, C('#B8682F'));
    box(lid, -1.02, 0.1, -0.02, 2.04, 0.12, 1.44, C('#FFC23D'));
    chest.add(lid);
    box(chest, -0.18, 0.5, 0.68, 0.36, 0.44, 0.1, C('#FFC23D'));
    p.add(chest);
    if (!locked) anim.chest.push({ chest, lid });
  } else if (id === 'sahne') {
    b(-3.4, 0.3, -2.4, 6.8, 0.6, 4.4, '#8A6CFF');
    box(p, -3.4, 0.9, -2.4, 6.8, 3.8, 0.4, C('#4B2FA8'));
    box(p, -3.4, 0.9, -2.0, 1.3, 3.5, 0.4, C('#E8473B'));
    box(p, 2.1, 0.9, -2.0, 1.3, 3.5, 0.4, C('#E8473B'));
    for (let i = 0; i < 5; i++) box(p, -3.3 + i * 0.25, 0.9, -1.6, 0.12, 3.4, 0.06, C('#C7352B'));
    for (let i = 0; i < 5; i++) box(p, 2.2 + i * 0.25, 0.9, -1.6, 0.12, 3.4, 0.06, C('#C7352B'));
    box(p, -3.5, 4.3, -2.2, 7.0, 0.8, 0.6, C('#C7352B'));
    for (let i = 0; i < 4; i++) box(p, -1.4 + i * 0.85, 2.4 + (i % 2) * 0.6, -1.98, 0.36, 0.36, 0.06, C('#FFC23D'));
    cyl(p, 0, 0.9, 0.7, 0.32, 0.08, C('#1B1F3B'));
    cyl(p, 0, 0.98, 0.7, 0.05, 1.6, C('#1B1F3B'));
    const mic = mesh(new THREE.SphereGeometry(0.2, 14, 10), mat(C('#C7CDD9'), { metalness: 0.4 }));
    mic.position.set(0, 2.68, 0.7);
    p.add(mic);
    box(p, -3.2, 0.9, 0.7, 0.9, 1.5, 0.8, C('#1B1F3B'));
    box(p, 2.3, 0.9, 0.7, 0.9, 1.5, 0.8, C('#1B1F3B'));
    [-2.75, 2.75].forEach((x) => {
      const sp = mesh(geoCyl(), mat(C('#5B6383')));
      sp.scale.set(0.5, 0.06, 0.5);
      sp.rotation.x = Math.PI / 2;
      sp.position.set(x, 1.9, 1.52);
      p.add(sp);
    });
    box(p, -1.0, 0.3, 2.0, 2.0, 0.3, 0.45, C('#C4B3FF'));
    if (!locked) {
      [-3.7, 3.7].forEach((x) => {
        cyl(p, x, 0.3, 2.9, 0.07, 4.6, '#D9DEE8');
        const beam = new THREE.Mesh(
          new THREE.ConeGeometry(1.1, 4.2, 20, 1, true),
          new THREE.MeshBasicMaterial({ color: '#FFF3B0', transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false })
        );
        beam.position.set(x * 0.55, 2.8, 1.8);
        beam.rotation.z = x > 0 ? -0.55 : 0.55;
        p.add(beam);
      });
    }
  } else if (id === 'ev') {
    b(-3.6, 0.3, -2.4, 4.0, 2.4, 4.0, '#FFF3D6', { studs: false });
    win(-3.1, 1.3, 1.6, 1.0, 0.9, 0.06);
    box(p, -1.6, 0.3, 1.58, 0.9, 1.6, 0.08, C('#2DBE9B'));
    prism(p, -3.8, 2.7, -2.6, 4.4, 1.6, 4.4, C('#E8473B'));
    b(0.6, 0.3, -2.4, 3.0, 2.0, 4.0, '#D9DEE8', { studs: false });
    box(p, 0.8, 0.3, 1.58, 2.6, 1.6, 0.08, C('#9AA6BD'));
    b(0.4, 2.3, -2.6, 3.4, 0.3, 4.4, '#E8473B');
  }
  if (locked) {
    addBarrier(p, -4.2, -3.4, 8.4, 6.8);
    addCone(p, 2.6, 3.9);
    addCone(p, -2.6, 3.9);
    const lock = makePadlock();
    lock.position.set(0, 8.2, 0);
    lock.scale.setScalar(1.3);
    p.add(lock);
    anim.locks.push(lock);
  }
  // tıklama kutusu
  const hit = new THREE.Mesh(new THREE.BoxGeometry(8, 8, 6.6), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.set(0, 4, 0);
  hit.userData.building = id;
  p.add(hit);
  anim.hits.push(hit);
  return p;
}

function buildZone(z: { id: string; name: string; need: number; x: number; z: number }, root: any, studs: StudBatch, locked: boolean, anim: any) {
  const p = new THREE.Group();
  p.position.set(z.x, 0, z.z);
  root.add(p);
  const S = { add: (c: string, x: number, y: number, zz: number) => studs.add(c, x + z.x, y, zz + z.z) } as any;
  if (locked) {
    brick(p, S, -3.2, 0, -3.2, 6.4, 0.3, 6.4, '#B7BDC9', { step: 2 });
    addBarrier(p, -3.0, -3.0, 6.0, 6.0);
    addCone(p, -1.5, 1.0);
    addCone(p, 1.2, -1.2);
    box(p, -0.9, 0.3, -0.6, 1.8, 0.9, 1.2, '#FFC23D');
    const lock = makePadlock();
    lock.position.set(0, 4.2, 0);
    p.add(lock);
    anim.locks.push(lock);
    return;
  }
  if (z.id === 'lunapark') {
    brick(p, S, -3.2, 0, -3.2, 6.4, 0.3, 6.4, '#F7C6DA', { step: 2 });
    box(p, -0.25, 0.3, -1.6, 0.5, 4.2, 0.4, '#8A6CFF');
    box(p, -0.25, 0.3, 1.2, 0.5, 4.2, 0.4, '#8A6CFF');
    const wheel = new THREE.Group();
    wheel.position.set(0, 4.4, 0);
    const rim = mesh(new THREE.TorusGeometry(2.6, 0.12, 8, 40), mat('#FF6F61'));
    rim.rotation.y = Math.PI / 2;
    wheel.add(rim);
    const cabins: any[] = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const spoke = mesh(new THREE.BoxGeometry(0.08, 2.6, 0.08), mat('#FFFFFF'));
      spoke.position.set(0, Math.sin(a) * 1.3, Math.cos(a) * 1.3);
      spoke.rotation.x = -a + Math.PI / 2;
      wheel.add(spoke);
      const cab = mesh(new THREE.BoxGeometry(0.7, 0.6, 0.7), mat(['#FFC23D', '#4AA8FF', '#2DBE9B', '#FF6F61'][i % 4]));
      cab.position.set(0, Math.sin(a) * 2.6, Math.cos(a) * 2.6);
      wheel.add(cab);
      cabins.push({ cab, a });
    }
    p.add(wheel);
    anim.ferris.push({ wheel, cabins });
  } else if (z.id === 'liman') {
    const water = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.25, 6.4), new THREE.MeshStandardMaterial({ color: '#3FA9F5', roughness: 0.15, metalness: 0.1 }));
    water.position.set(0, 0.12, 0);
    water.receiveShadow = true;
    p.add(water);
    brick(p, S, -3.2, 0.25, -3.2, 1.6, 0.3, 6.4, '#B8682F');
    const boat = new THREE.Group();
    brick(boat, null, -1.5, 0, -0.7, 3, 0.7, 1.4, '#FFFFFF');
    box(boat, -1.5, 0, -0.72, 3, 0.25, 1.44, '#E8473B');
    brick(boat, null, -0.6, 0.7, -0.5, 1.4, 0.8, 1.0, '#2F80ED');
    cyl(boat, 0.1, 1.5, 0, 0.12, 0.8, '#FFC23D');
    boat.position.set(0.8, 0.2, 0);
    p.add(boat);
    anim.boats.push(boat);
  } else if (z.id === 'hayvanat') {
    brick(p, S, -3.2, 0, -3.2, 6.4, 0.3, 6.4, '#C9E4A0', { step: 2 });
    for (let i = -3; i <= 3; i += 1.2) {
      box(p, i - 0.05, 0.3, -3.1, 0.1, 0.9, 0.1, '#8B5A2B');
      box(p, i - 0.05, 0.3, 3.0, 0.1, 0.9, 0.1, '#8B5A2B');
    }
    // zürafa
    const gi = new THREE.Group();
    box(gi, -0.9, 1.2, -0.4, 1.8, 0.8, 0.8, '#FFC23D');
    [-0.8, 0.5].forEach((x) => [-0.35, 0.15].forEach((zz) => box(gi, x, 0, zz, 0.25, 1.2, 0.25, '#FFC23D')));
    box(gi, 0.6, 2.0, -0.25, 0.4, 1.8, 0.5, '#FFC23D');
    box(gi, 0.5, 3.7, -0.3, 0.9, 0.5, 0.6, '#FFC23D');
    [[-0.5, 1.6], [0.1, 1.4], [0.7, 2.6]].forEach(([x, y]) => box(gi, x, y, 0.41, 0.3, 0.3, 0.02, '#8B5A2B'));
    gi.position.set(-1.2, 0.3, -0.5);
    p.add(gi);
    // fil
    const el = new THREE.Group();
    box(el, -0.9, 0.7, -0.6, 1.8, 1.2, 1.2, '#9AA6BD');
    [-0.8, 0.5].forEach((x) => [-0.55, 0.25].forEach((zz) => box(el, x, 0, zz, 0.35, 0.7, 0.35, '#9AA6BD')));
    box(el, 0.8, 1.0, -0.5, 0.8, 0.9, 1.0, '#9AA6BD');
    box(el, 1.45, 0.3, -0.12, 0.2, 0.9, 0.24, '#9AA6BD');
    el.position.set(1.2, 0.3, 1.2);
    el.rotation.y = -0.6;
    p.add(el);
    addTree(p, S, 2.2, -1.8, 0.7);
  } else if (z.id === 'uzay') {
    brick(p, S, -3.2, 0, -3.2, 6.4, 0.3, 6.4, '#CBC3F5', { step: 2 });
    brick(p, S, -1.6, 0.3, -1.6, 3.2, 0.5, 3.2, '#4A5068');
    const r = new THREE.Group();
    cyl(r, 0, 0, 0, 0.7, 4.2, '#F1F4F8');
    for (let i = 0; i < 3; i++) cyl(r, 0, 1.0 + i * 1.1, 0, 0.72, 0.2, '#E8473B');
    const nose = mesh(new THREE.ConeGeometry(0.7, 1.4, 20), mat('#E8473B'));
    nose.position.y = 4.9;
    r.add(nose);
    for (let i = 0; i < 3; i++) {
      const fin = mesh(new THREE.BoxGeometry(0.1, 1.2, 0.9), mat('#2F80ED'));
      const a = (i / 3) * Math.PI * 2;
      fin.position.set(Math.cos(a) * 0.75, 0.6, Math.sin(a) * 0.75);
      fin.rotation.y = -a;
      r.add(fin);
    }
    const win = mesh(geoCyl(), mat('#9ED8FF'));
    win.scale.set(0.5, 0.1, 0.5);
    win.rotation.x = Math.PI / 2;
    win.position.set(0, 3.1, 0.68);
    r.add(win);
    r.position.set(0, 0.8, 0);
    p.add(r);
    anim.rockets.push(r);
  }
}

interface WorldHandle {
  dispose: () => void;
  focus: (id: BuildingId) => void;
  walkTo: (id: BuildingId, done: () => void) => void;
}

function createWorld(opts: {
  container: HTMLDivElement;
  labelLayer: HTMLDivElement;
  avatar: Avatar;
  done: number;
  marker: BuildingId | null;
  interactive: boolean;
  animations: boolean;
  onPick: (id: BuildingId) => void;
  onLost?: () => void;
  objects: Record<string, { fresh: boolean }>;
  onObjectsSeen?: () => void;
}): WorldHandle {
  const { container, labelLayer } = opts;
  const W = () => container.clientWidth || 360;
  const H = () => container.clientHeight || 640;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  const bigScreen = W() * H() > 900000;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, bigScreen ? 1.5 : 2));
  renderer.setSize(W(), H());
  renderer.shadowMap.enabled = true;
  renderer.domElement.addEventListener('webglcontextlost', (e: any) => {
    e.preventDefault();
    if (opts.onLost) opts.onLost();
  });
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);
  renderer.domElement.style.touchAction = 'none';

  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#FFFFFF', '#7FA36A', 0.95));
  const sun = new THREE.DirectionalLight('#FFF3DC', 0.95);
  sun.position.set(18, 30, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  sc.left = -28; sc.right = 28; sc.top = 28; sc.bottom = -28; sc.near = 1; sc.far = 90;
  sun.shadow.bias = -0.0008;
  scene.add(sun);

  const world = new THREE.Group();
  scene.add(world);
  const studs = new StudBatch();
  const anim: any = { flags: [], rings: [], crane: [], chest: [], locks: [], hits: [], ferris: [], boats: [], rockets: [], cars: [] };

  // zemin: büyük yeşil taban plakası
  box(world, -22, -1, -22, 44, 1, 44, '#5DBB63');
  const gm = new THREE.Matrix4();
  const gstuds: number[][] = [];
  const onRoad = (x: number, z: number) =>
    Math.abs(x) < 2.3 || Math.abs(z) < 2.3 || Math.abs(Math.abs(x) - 11.75) < 1.4 || Math.abs(Math.abs(z) - 11.75) < 1.4;
  const nearBuilding = (x: number, z: number) =>
    BUILDINGS.some((b) => Math.abs(x - b.x) < 4.5 && Math.abs(z - b.z) < 3.8) ||
    ZONES.some((zz) => Math.abs(x - zz.x) < 3.6 && Math.abs(z - zz.z) < 3.6);
  for (let x = -21; x <= 21; x += 2) for (let z = -21; z <= 21; z += 2) if (!onRoad(x, z) && !nearBuilding(x, z)) gstuds.push([x, z]);
  const gi = new THREE.InstancedMesh(geoStud(), mat('#6CCB72'), gstuds.length);
  gstuds.forEach((p, i) => {
    gm.makeTranslation(p[0], 0.1, p[1]);
    gi.setMatrixAt(i, gm);
  });
  gi.receiveShadow = true;
  world.add(gi);

  // yollar
  const road = '#4B5266';
  box(world, -22, 0, -2, 44, 0.12, 4, road, { shadow: false });
  box(world, -2, 0, -22, 4, 0.12, 44, road, { shadow: false });
  [-11.75, 11.75].forEach((v) => {
    box(world, -13, 0.005, v - 1.25, 26, 0.12, 2.5, road, { shadow: false });
    box(world, v - 1.25, 0.005, -13, 2.5, 0.12, 26, road, { shadow: false });
  });
  const dashes: number[][] = [];
  for (let i = -21; i <= 21; i += 2) {
    if (Math.abs(i) > 2.2) {
      dashes.push([i, 0, 0]);
      dashes.push([0, i, 1]);
    }
  }
  const di = new THREE.InstancedMesh(geoBox(), mat('#FFFFFF'), dashes.length);
  dashes.forEach((d, i) => {
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(d[0], 0.14, d[1]),
      new THREE.Quaternion(),
      new THREE.Vector3(d[2] ? 0.18 : 1.0, 0.02, d[2] ? 1.0 : 0.18)
    );
    di.setMatrixAt(i, m);
  });
  world.add(di);
  // yaya geçitleri
  for (let i = -1.6; i <= 1.6; i += 0.8) {
    box(world, i - 0.25, 0.13, 2.2, 0.5, 0.02, 1.2, '#FFFFFF', { shadow: false });
    box(world, 2.2, 0.13, i - 0.25, 1.2, 0.02, 0.5, '#FFFFFF', { shadow: false });
  }
  // meydan çeşmesi
  const fountain = new THREE.Group();
  cyl(fountain, 0, 0.12, 0, 1.5, 0.4, '#D9DEE8');
  const water = cyl(fountain, 0, 0.3, 0, 1.25, 0.25, '#5FC3FF', { mat: { roughness: 0.1 } });
  cyl(fountain, 0, 0.5, 0, 0.3, 1.2, '#D9DEE8');
  const jet = new THREE.Mesh(new THREE.SphereGeometry(0.45, 14, 10), new THREE.MeshStandardMaterial({ color: '#BFEAFF', transparent: true, opacity: 0.75 }));
  jet.position.y = 1.9;
  fountain.add(jet);
  world.add(fountain);
  anim.jet = jet;
  anim.water = water;

  // binalar ve bölgeler
  BUILDINGS.forEach((b) => buildBuilding(b.id, world, studs, b.need > opts.done, anim));
  ZONES.forEach((z) => buildZone(z, world, studs, z.need > opts.done, anim));

  // parklar ve ağaçlar
  const trees = [
    [16, -3.5], [18.5, -5],
    [-10.5, -16], [10, -16.5], [-9.5, 16.5], [9.5, 15.5], [-16, 9.5], [-17, -9.5], [16, 9.5], [16.5, -9.5],
    [-4, -10], [4, 10], [10, 3.5], [-10, -3.5],
  ];
  trees.forEach(([x, z]) => addTree(world, studs, x, z, 0.85));
  // park bankları
  // Kelime Parkı: Karaoke Sahnesi'nde okunan kelimelerle nesneler kazanılır
  const pops: Array<{ o: any; s: number; start: number }> = [];
  const freshPos: any[] = [];
  CITY_OBJECTS.forEach((d, i) => {
    const got = opts.objects[d.id];
    if (!got) {
      const slot = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.06, 2.0), new THREE.MeshBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: 0.4 }));
      slot.position.set(d.x, 0.04, d.z);
      world.add(slot);
      return;
    }
    const o = d.build();
    o.position.set(d.x, 0, d.z);
    o.rotation.y = d.rot;
    o.scale.setScalar(d.scale);
    o.traverse((m: any) => {
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
    world.add(o);
    if (got.fresh && opts.interactive && opts.animations) {
      o.scale.setScalar(0.001);
      pops.push({ o, s: d.scale, start: performance.now() + 900 + pops.length * 500 });
      freshPos.push(new THREE.Vector3(d.x, 0, d.z));
    }
  });
  anim.pops = pops;
  studs.build(world);

  // NPC arabalar: çevre yolunda turlar
  const npc = ['mini', 'jip', 'dondurma', 'itfaiye'];
  npc.forEach((id, i) => {
    const c = makeCar(id);
    c.scale.setScalar(0.62);
    world.add(c);
    anim.cars.push({ car: c, t: i / npc.length, speed: 0.018 + i * 0.002 });
  });

  // oyuncu karakteri ve arabası
  const player = makeMinifig(opts.avatar);
  player.scale.setScalar(0.8);
  const home = BUILDINGS.find((b) => b.id === 'ev')!;
  player.position.set(home.x + 3.6, 0.3, home.z + 3.6);
  player.rotation.y = Math.PI / 4;
  world.add(player);
  const myCar = makeCar(opts.avatar.car);
  myCar.scale.setScalar(0.7);
  myCar.position.set(home.x + 2.1, 0.3, home.z + 4.2);
  myCar.rotation.y = Math.PI / 2;
  world.add(myCar);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.2, 32), new THREE.MeshBasicMaterial({ color: '#FFC23D', transparent: true, opacity: 0.85 }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.33;
  player.add(ring);

  // görev işareti (sarı ışık sütunu + ok)
  const marker = new THREE.Group();
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, 1.2, 14, 24, 1, true),
    new THREE.MeshBasicMaterial({ color: '#FFD54A', transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false })
  );
  beam.position.y = 7;
  marker.add(beam);
  const arrow = new THREE.Group();
  const cone = mesh(new THREE.ConeGeometry(0.9, 1.4, 4), mat('#FFC23D', { emissive: '#FFB000', emissiveIntensity: 0.45 }));
  cone.rotation.x = Math.PI;
  arrow.add(cone);
  const stem = mesh(new THREE.BoxGeometry(0.6, 1.0, 0.6), mat('#FFC23D', { emissive: '#FFB000', emissiveIntensity: 0.45 }));
  stem.position.y = 1.1;
  arrow.add(stem);
  marker.add(arrow);
  const mdef = opts.marker ? BUILDINGS.find((b) => b.id === opts.marker) : null;
  if (mdef) {
    marker.position.set(mdef.x, 0, mdef.z);
    world.add(marker);
  }

  // kamera
  const camera = new THREE.OrthographicCamera(-10, 10, 10, -10, -200, 400);
  const target = new THREE.Vector3(0, 0, 0);
  const iso = new THREE.Vector3(1, 1.05, 1).normalize().multiplyScalar(80);
  let zoom = 1;
  const fit = () => {
    const w = W();
    const h = H();
    const viewW = w / h < 0.8 ? 28 : w / h < 1.3 ? 36 : 44;
    const halfW = viewW / 2 / zoom;
    const halfH = halfW * (h / w);
    camera.left = -halfW;
    camera.right = halfW;
    camera.top = halfH;
    camera.bottom = -halfH;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  };
  const placeCam = () => {
    camera.position.copy(target).add(iso);
    camera.lookAt(target);
  };
  fit();
  placeCam();

  // etiketler
  type Lbl = { el: HTMLElement; pos: any };
  const labels: Lbl[] = [];
  labelLayer.innerHTML = '';
  const mkLabel = (html: string, cls: string, pos: any, onClick?: () => void) => {
    const el = document.createElement(onClick ? 'button' : 'div');
    el.className = 'map-label ' + cls;
    el.innerHTML = html;
    if (onClick) el.addEventListener('click', (e) => { e.stopPropagation(); onClick(); });
    labelLayer.appendChild(el);
    labels.push({ el, pos });
  };
  const lockSvg = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2" fill="currentColor"/><path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" stroke-width="2.6" fill="none"/></svg>';
  if (opts.interactive) BUILDINGS.forEach((b) => {
    const locked = b.need > opts.done;
    const h = b.id === 'atolye' ? 9.0 : b.id === 'ses' ? 9.0 : b.id === 'okul' ? 7.6 : b.id === 'hazine' ? 7.4 : b.id === 'sahne' ? 5.6 : 5.6;
    mkLabel(
      (locked ? lockSvg : '') +
        '<span class="ml-name">' + b.name + '</span>' +
        '<span class="ml-sub">' + (locked ? (b.need - opts.done) + ' görev sonra açılır' : b.sub) + '</span>',
      (locked ? 'locked' : '') + (opts.marker === b.id ? ' mission' : ''),
      new THREE.Vector3(b.x, h + (locked ? 2.2 : 0.6), b.z),
      opts.interactive ? () => opts.onPick(b.id) : undefined
    );
  });
  if (opts.interactive && CITY_OBJECTS.some((d) => opts.objects[d.id])) {
    mkLabel('<span class="ml-name">Kelime Parkı</span><span class="ml-sub">Karaoke ile kazanıldı</span>', 'zone', new THREE.Vector3(0, 3.2, 17.5));
  }
  if (opts.interactive) ZONES.forEach((z) => {
    const locked = z.need > opts.done;
    mkLabel(
      (locked ? lockSvg : '') + '<span class="ml-name">' + z.name + '</span>' + (locked ? '<span class="ml-sub">' + (z.need - opts.done) + ' görev sonra</span>' : ''),
      'zone' + (locked ? ' locked' : ''),
      new THREE.Vector3(z.x, locked ? 6 : 8, z.z)
    );
  });

  // etkileşim: sürükle, yakınlaştır, dokun
  const ray = new THREE.Raycaster();
  const ptr = new THREE.Vector2();
  const pointers = new Map<number, { x: number; y: number }>();
  let downAt = { x: 0, y: 0, t: 0 };
  let moved = false;
  let pinchStart = 0;
  let zoomStart = 1;
  const clamp = () => {
    target.x = Math.max(-15, Math.min(15, target.x));
    target.z = Math.max(-15, Math.min(15, target.z));
  };
  const panBy = (dx: number, dy: number) => {
    const worldPerPx = (camera.right - camera.left) / W();
    const right = new THREE.Vector3(1, 0, -1).normalize();
    const fwd = new THREE.Vector3(-1, 0, -1).normalize();
    target.addScaledVector(right, -dx * worldPerPx);
    target.addScaledVector(fwd, dy * worldPerPx * 1.35);
    clamp();
    placeCam();
  };
  const el = renderer.domElement;
  const onDown = (e: PointerEvent) => {
    if (!opts.interactive) return;
    el.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) {
      downAt = { x: e.clientX, y: e.clientY, t: performance.now() };
      moved = false;
    } else if (pointers.size === 2) {
      const [a, b] = Array.from(pointers.values());
      pinchStart = Math.hypot(a.x - b.x, a.y - b.y);
      zoomStart = zoom;
      moved = true;
    }
  };
  const onMove = (e: PointerEvent) => {
    if (!pointers.has(e.pointerId)) return;
    const prev = pointers.get(e.pointerId)!;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) {
      if (Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 8) moved = true;
      if (moved) panBy(e.clientX - prev.x, e.clientY - prev.y);
    } else if (pointers.size === 2) {
      const [a, b] = Array.from(pointers.values());
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      zoom = Math.max(0.7, Math.min(2.4, zoomStart * (d / (pinchStart || d))));
      fit();
    }
  };
  const onUp = (e: PointerEvent) => {
    pointers.delete(e.pointerId);
    if (!moved && pointers.size === 0 && opts.interactive) {
      const r = el.getBoundingClientRect();
      ptr.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      ptr.y = -((e.clientY - r.top) / r.height) * 2 + 1;
      ray.setFromCamera(ptr, camera);
      const hit = ray.intersectObjects(anim.hits, false)[0];
      if (hit) opts.onPick(hit.object.userData.building);
    }
  };
  const onWheel = (e: WheelEvent) => {
    if (!opts.interactive) return;
    e.preventDefault();
    zoom = Math.max(0.7, Math.min(2.4, zoom * (e.deltaY > 0 ? 0.9 : 1.1)));
    fit();
  };
  el.addEventListener('pointerdown', onDown);
  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerup', onUp);
  el.addEventListener('pointercancel', onUp);
  el.addEventListener('wheel', onWheel, { passive: false });
  const onResize = () => fit();
  window.addEventListener('resize', onResize);
  const ro = (window as any).ResizeObserver ? new (window as any).ResizeObserver(onResize) : null;
  if (ro) ro.observe(container);

  // yürüme / zıplama animasyonu
  let walk: null | { from: any; to: any; start: number; dur: number; done: () => void } = null;
  let camTween: null | { from: any; to: any; start: number; dur: number } = null;
  const focus = (id: BuildingId) => {
    const b = BUILDINGS.find((x) => x.id === id);
    if (!b) return;
    camTween = { from: target.clone(), to: new THREE.Vector3(Math.max(-15, Math.min(15, b.x)), 0, Math.max(-15, Math.min(15, b.z))), start: performance.now(), dur: 600 };
  };
  const walkTo = (id: BuildingId, done: () => void) => {
    const b = BUILDINGS.find((x) => x.id === id);
    if (!b) return done();
    focus(id);
    const to = new THREE.Vector3(b.x + 2.2, 0.3, b.z + 4.4);
    if (!opts.animations) {
      player.position.copy(to);
      setTimeout(done, 150);
      return;
    }
    const from = player.position.clone();
    player.rotation.y = Math.atan2(to.x - from.x, to.z - from.z);
    walk = { from, to, start: performance.now(), dur: 900, done };
  };

  if (freshPos.length) {
    const fp = freshPos[0];
    camTween = { from: target.clone(), to: new THREE.Vector3(Math.max(-15, Math.min(15, fp.x)), 0, Math.max(-15, Math.min(15, fp.z))), start: performance.now() + 300, dur: 900 };
  } else if (opts.objects && opts.onObjectsSeen && Object.values(opts.objects).some((x) => x.fresh)) {
    setTimeout(() => opts.onObjectsSeen && opts.onObjectsSeen(), 0);
  }
  let popsDone = !pops.length;

  // döngü
  let raf = 0;
  const v = new THREE.Vector3();
  const loop = (now: number) => {
    raf = requestAnimationFrame(loop);
    if (document.visibilityState !== 'visible') return;
    const t = now / 1000;
    const a = opts.animations;
    if (!popsDone) {
      let all = true;
      pops.forEach((pp) => {
        const k = (now - pp.start) / 900;
        if (k < 1) all = false;
        const t = Math.max(0, Math.min(1, k));
        const c1 = 1.70158, c3 = c1 + 1;
        const e = t <= 0 ? 0.001 : 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
        pp.o.scale.setScalar(Math.max(0.001, pp.s * e));
      });
      if (all) {
        popsDone = true;
        if (opts.onObjectsSeen) opts.onObjectsSeen();
      }
    }
    if (camTween) {
      const k = Math.max(0, Math.min(1, (now - camTween.start) / camTween.dur));
      const e = 1 - Math.pow(1 - k, 3);
      target.lerpVectors(camTween.from, camTween.to, e);
      placeCam();
      if (k >= 1) camTween = null;
    }
    if (walk) {
      const k = Math.min(1, (now - walk.start) / walk.dur);
      player.position.lerpVectors(walk.from, walk.to, k);
      player.position.y = 0.3 + Math.sin(k * Math.PI) * 2.2;
      if (k >= 1) {
        const d = walk.done;
        walk = null;
        player.position.y = 0.3;
        d();
      }
    } else if (a) {
      player.position.y = 0.3 + Math.abs(Math.sin(t * 2.2)) * 0.12;
    }
    if (a) {
      marker.rotation.y = t * 1.2;
      arrow.position.y = 10.5 + Math.sin(t * 3) * 0.45;
      anim.locks.forEach((l: any) => (l.rotation.y = Math.sin(t * 1.5) * 0.5));
      anim.rings.forEach((r: any) => {
        const k = (t * 0.6 + r.phase) % 1;
        r.ring.scale.setScalar(0.4 + k * 2.6);
        r.ring.material.opacity = 0.85 * (1 - k);
      });
      anim.crane.forEach((c: any) => {
        const y = 4.6 + Math.sin(t * 0.8) * 1.1;
        c.hook.position.y = y - 0.4;
        c.cable.scale.y = 7.5 - y;
        c.cable.position.y = y + (7.5 - y) / 2;
      });
      anim.chest.forEach((c: any) => {
        c.lid.rotation.x = -Math.max(0, Math.sin(t * 1.4)) * 0.6;
        c.chest.rotation.y = Math.sin(t * 0.7) * 0.25;
      });
      anim.flags.forEach((f: any) => (f.rotation.x = Math.sin(t * 3) * 0.08));
      anim.ferris.forEach((f: any) => {
        f.wheel.rotation.x = t * 0.4;
        f.cabins.forEach((c: any) => (c.cab.rotation.x = -t * 0.4));
      });
      anim.boats.forEach((b: any) => {
        b.position.y = 0.2 + Math.sin(t * 1.6) * 0.08;
        b.rotation.z = Math.sin(t * 1.3) * 0.04;
      });
      anim.rockets.forEach((r: any) => (r.position.y = 0.8 + Math.max(0, Math.sin(t * 0.5)) * 0.25));
      if (anim.jet) anim.jet.scale.setScalar(1 + Math.sin(t * 4) * 0.12);
      // çevre yolu arabaları
      const L = 11.75;
      anim.cars.forEach((c: any) => {
        c.t = (c.t + c.speed * 0.016) % 1;
        const seg = Math.floor(c.t * 4);
        const f = c.t * 4 - seg;
        const lane = 0.6;
        const pts = [
          [-L, -L, L, -L],
          [L, -L, L, L],
          [L, L, -L, L],
          [-L, L, -L, -L],
        ][seg];
        const x = pts[0] + (pts[2] - pts[0]) * f;
        const z = pts[1] + (pts[3] - pts[1]) * f;
        const dx = Math.sign(pts[2] - pts[0]);
        const dz = Math.sign(pts[3] - pts[1]);
        c.car.position.set(x - dz * lane, 0.12, z + dx * lane);
        c.car.rotation.y = Math.atan2(-dz, dx);
      });
    }
    renderer.render(scene, camera);
    // etiket konumları
    const w = W();
    const h = H();
    labels.forEach((l) => {
      v.copy(l.pos).project(camera);
      const x = (v.x * 0.5 + 0.5) * w;
      const y = (-v.y * 0.5 + 0.5) * h;
      l.el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) translate(-50%,-100%)';
      l.el.style.visibility = x < -80 || x > w + 80 || y < -40 || y > h + 80 ? 'hidden' : 'visible';
    });
  };
  raf = requestAnimationFrame(loop);

  return {
    focus,
    walkTo,
    dispose: () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      if (ro) ro.disconnect();
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
      el.removeEventListener('wheel', onWheel);
      scene.traverse((o: any) => {
        if (o.geometry && !Object.values(GEO).includes(o.geometry)) o.geometry.dispose();
      });
      renderer.dispose();
      if (renderer.forceContextLoss) renderer.forceContextLoss();
      if (el.parentNode) el.parentNode.removeChild(el);
      labelLayer.innerHTML = '';
    },
  };
}

function CityWorld({
  state,
  interactive,
  animations,
  onPick,
  worldRef,
  onObjectsSeen,
}: {
  state: AppState;
  interactive: boolean;
  animations: boolean;
  onPick: (id: BuildingId) => void;
  worldRef?: { current: WorldHandle | null };
  onObjectsSeen?: () => void;
}) {
  const box3 = useRef<HTMLDivElement | null>(null);
  const lbl = useRef<HTMLDivElement | null>(null);
  const pickRef = useRef(onPick);
  pickRef.current = onPick;
  const done = state.city.missionsCompleted;
  const av = JSON.stringify(state.city.avatar);
  const [lost, setLost] = useState(0);
  const objKey = Object.keys(state.cityObjects || {}).sort().join(',');
  const objRef = useRef(state.cityObjects);
  objRef.current = state.cityObjects;
  const seenRef = useRef(onObjectsSeen);
  seenRef.current = onObjectsSeen;
  useEffect(() => {
    if (!HAS_WEBGL || !box3.current || !lbl.current) return;
    let h: WorldHandle | null = null;
    try {
      h = createWorld({
        container: box3.current,
        labelLayer: lbl.current,
        avatar: state.city.avatar,
        done,
        marker: interactive ? suggestedBuilding(done).id : null,
        interactive,
        animations,
        onPick: (id) => pickRef.current(id),
        objects: Object.fromEntries(Object.entries(objRef.current || {}).map(([k, v]) => [k, { fresh: !v.seen }])),
        onObjectsSeen: () => seenRef.current && seenRef.current(),
        onLost: () => {
          // iPad uygulamayı arka plana alınca 3D bağlamı kaybolabilir: geri gelince sahneyi yeniden kur
          const again = () => {
            if (document.visibilityState === 'visible') {
              document.removeEventListener('visibilitychange', again);
              setLost((n) => n + 1);
            }
          };
          document.addEventListener('visibilitychange', again);
          again();
        },
      });
      if (worldRef) worldRef.current = h;
    } catch (e) {
      console.error(e);
    }
    return () => {
      if (h) h.dispose();
      if (worldRef) worldRef.current = null;
    };
  }, [done, av, interactive, animations, lost, objKey]);
  return (
    <div className="world">
      <div className="world-canvas" ref={box3} />
      <div className="world-labels" ref={lbl} />
    </div>
  );
}

/* ============================================================
   OYUN EKRANLARI: HARİTA, BAŞLANGIÇ, GARAJ, YENİ OYUNLAR
   ============================================================ */
const MISSION_TEXT: Record<string, string> = {
  okul: "Okuma Okulu'nda heceleri oku",
  garaj: "Kelime Garajı'nda kelimeleri oku",
  ses: "Ses İstasyonu'nda duyduğunu bul",
  sahne: "Karaoke Sahnesi'nde hece hece oku",
  atolye: "Yapı Atölyesi'nde kelime inşa et",
};

function LockIcon({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <rect x="5" y="10" width="14" height="11" rx="2" fill="currentColor" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="2.6" fill="none" />
    </svg>
  );
}

function StarIcon({ size = 22 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path d="M12 2.5l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.9 3.3 1.3-6.5L2.5 9.3l6.6-.8z" fill="#FFC23D" stroke="#1B1F3B" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function MedalIcon({ id, size = 64, locked = false }: { id: string; size?: number; locked?: boolean }) {
  const colors: Record<string, string> = {
    'altin-yildiz': '#FFC23D',
    'super-okuyucu': '#4AA8FF',
    'uzay-kasifi': '#8A6CFF',
    'aslan-cesareti': '#FF9F45',
    'okuma-kahramani': '#E8473B',
  };
  const c = locked ? '#AEB6C8' : colors[id] || '#FFC23D';
  return (
    <svg viewBox="0 0 64 72" width={size} height={size * 1.12} aria-hidden="true">
      <path d="M20 2 L30 26 L22 30 L10 4 Z" fill={locked ? '#C7CDD9' : '#E8473B'} stroke="#1B1F3B" strokeWidth="2" />
      <path d="M44 2 L34 26 L42 30 L54 4 Z" fill={locked ? '#C7CDD9' : '#2F80ED'} stroke="#1B1F3B" strokeWidth="2" />
      <circle cx="32" cy="46" r="22" fill={c} stroke="#1B1F3B" strokeWidth="3" />
      <circle cx="32" cy="46" r="15" fill="rgba(255,255,255,0.35)" />
      {locked ? (
        <text x="32" y="54" textAnchor="middle" fontSize="22" fontWeight="900" fill="#1B1F3B">?</text>
      ) : id === 'super-okuyucu' ? (
        <g fill="#fff" stroke="#1B1F3B" strokeWidth="1.5">
          <path d="M20 38 Q26 35 32 39 L32 56 Q26 52 20 55 Z" />
          <path d="M44 38 Q38 35 32 39 L32 56 Q38 52 44 55 Z" />
        </g>
      ) : id === 'uzay-kasifi' ? (
        <g stroke="#1B1F3B" strokeWidth="1.5">
          <path d="M32 31 Q40 39 38 52 L26 52 Q24 39 32 31 Z" fill="#fff" />
          <circle cx="32" cy="43" r="3" fill="#4AA8FF" />
          <path d="M26 48 L21 55 L27 53 Z M38 48 L43 55 L37 53 Z" fill="#E8473B" />
        </g>
      ) : id === 'aslan-cesareti' ? (
        <g stroke="#1B1F3B" strokeWidth="1.5">
          <circle cx="32" cy="46" r="12" fill="#C96A1B" />
          <circle cx="32" cy="47" r="8" fill="#FFD27A" />
          <circle cx="29" cy="45" r="1.4" fill="#1B1F3B" />
          <circle cx="35" cy="45" r="1.4" fill="#1B1F3B" />
        </g>
      ) : id === 'okuma-kahramani' ? (
        <text x="32" y="55" textAnchor="middle" fontSize="24" fontFamily="Lilita One, sans-serif" fill="#fff" stroke="#1B1F3B" strokeWidth="1.5">1</text>
      ) : (
        <path d="M32 33l3.6 7.4 8.1 1-6 5.6 1.6 8L32 51l-7.3 4 1.6-8-6-5.6 8.1-1z" fill="#fff" stroke="#1B1F3B" strokeWidth="1.5" strokeLinejoin="round" />
      )}
    </svg>
  );
}

function GiftBoxIcon({ size = 96 }: { size?: number }) {
  return (
    <svg viewBox="0 0 96 96" width={size} height={size} aria-hidden="true">
      <rect x="14" y="40" width="68" height="48" rx="6" fill="#8A6CFF" stroke="#1B1F3B" strokeWidth="3" />
      <rect x="10" y="28" width="76" height="16" rx="5" fill="#A992FF" stroke="#1B1F3B" strokeWidth="3" />
      <rect x="42" y="28" width="12" height="60" fill="#FFC23D" stroke="#1B1F3B" strokeWidth="3" />
      <path d="M48 28 C36 8 18 16 30 28 Z M48 28 C60 8 78 16 66 28 Z" fill="#FFC23D" stroke="#1B1F3B" strokeWidth="3" />
    </svg>
  );
}

function HudStars({ stars, onClick }: { stars: number; onClick?: () => void }) {
  const toward = stars % STARS_PER_CHEST;
  return (
    <button className="hud-stars" onClick={onClick} aria-label={stars + ' yıldız'}>
      <StarIcon size={28} />
      <span className="hud-num">{stars}</span>
      <span className="chest-dots" aria-hidden="true">
        {Array.from({ length: STARS_PER_CHEST }, (_, i) => (
          <i key={i} className={i < toward ? 'on' : ''} />
        ))}
      </span>
    </button>
  );
}

function FallbackMap({ state, onPick }: { state: AppState; onPick: (id: BuildingId) => void }) {
  const done = state.city.missionsCompleted;
  return (
    <div className="fallback-map">
      <p className="notice">Bu cihaz 3D haritayı gösteremiyor (WebGL kapalı). Binalara buradan gidebilirsin.</p>
      {BUILDINGS.map((b) => (
        <button key={b.id} className={'fb-building' + (b.need > done ? ' locked' : '')} onClick={() => onPick(b.id)}>
          <b>{b.name}</b>
          <span>{b.need > done ? b.need - done + ' görev sonra' : b.sub}</span>
        </button>
      ))}
    </div>
  );
}

function MapScreen({
  state,
  go,
  openParent,
  animations,
  onObjectsSeen,
}: {
  state: AppState;
  go: (s: Screen) => void;
  openParent: () => void;
  animations: boolean;
  onObjectsSeen?: () => void;
}) {
  const worldRef = useRef<WorldHandle | null>(null);
  const busy = useRef(false);
  const [toast, setToast] = useState('');
  const done = state.city.missionsCompleted;
  const spm = state.settings.starsPerMission;
  const sug = suggestedBuilding(done);
  const g = state.gift;
  const firstName = state.settings.childName.split(' ')[0] || 'Selim';

  const pick = (id: BuildingId) => {
    if (busy.current) return;
    const b = BUILDINGS.find((x) => x.id === id)!;
    if (b.need > done) {
      const m = b.name + ', ' + (b.need - done) + ' görev sonra açılacak.';
      setToast(m);
      Speech.speak(m);
      Sfx.soft();
      setTimeout(() => setToast(''), 2600);
      return;
    }
    busy.current = true;
    Sfx.success();
    const open = () => {
      busy.current = false;
      go(b.screen);
    };
    if (worldRef.current) worldRef.current.walkTo(id, open);
    else open();
  };

  return (
    <main className="map-screen">
      {HAS_WEBGL ? (
        <CityWorld state={state} interactive={true} animations={animations} onPick={pick} worldRef={worldRef} onObjectsSeen={onObjectsSeen} />
      ) : (
        <FallbackMap state={state} onPick={pick} />
      )}
      <header className="map-hud-top">
        <button className="player-card" onClick={() => pick('ev')} aria-label="Karakterim ve garajım">
          <PlayerPortrait a={state.city.avatar} size={54} photo={true} />
          <span className="pc-text">
            <b>{firstName}</b>
            <span>Seviye {done + 1}</span>
          </span>
        </button>
        <div className="hud-right">
          <HudStars stars={state.totalStars} onClick={() => go('badges')} />
          <button className="hud-round" onClick={openParent} aria-label="Ebeveyn paneli">
            <LockIcon size={20} />
          </button>
        </div>
      </header>
      {toast && <div className="map-toast" role="status">{toast}</div>}
      <section className="map-hud-bottom">
        <div className="mission-panel">
          <div className="mp-head">
            <span className="mp-tag">GÖREV {done + 1}</span>
            <span className="mp-title">{MISSION_TEXT[sug.id] || 'Yıldız topla'}</span>
          </div>
          <div className="mp-row">
            <div className="mp-bricks" aria-label={state.city.missionStars + ' / ' + spm + ' yıldız'}>
              {Array.from({ length: spm }, (_, i) => (
                <i key={i} className={i < state.city.missionStars ? 'on' : ''} />
              ))}
            </div>
            <button className="game-btn go" onClick={() => pick(sug.id)}>Göreve git</button>
          </div>
          <p className="mp-note">Herhangi bir binada {spm} yıldız topla. Sarı ışık önerilen binayı gösterir.</p>
        </div>
        {g && (
          <button className="gift-chip" onClick={() => pick('hazine')}>
            <GiftBoxIcon size={34} />
            <span>{g.wonAt ? 'Hediye kazanıldı!' : g.opened.length + '/' + g.pieces + ' parça'}</span>
          </button>
        )}
      </section>
    </main>
  );
}

function GameStart({ state, onStart, animations }: { state: AppState; onStart: () => void; animations: boolean }) {
  const firstName = trUpper(state.settings.childName.split(' ')[0] || 'Selim');
  return (
    <main className="start-game">
      {HAS_WEBGL && <CityWorld state={state} interactive={false} animations={animations} onPick={() => {}} />}
      <div className="start-overlay">
        <h1 className="logo">
          <span className="logo-top">{firstName}</span>
          <span className="logo-city">CITY</span>
        </h1>
        <p className="logo-ribbon">Okuma Macerası</p>
        <button className="game-btn giant" onClick={onStart}>BAŞLA</button>
      </div>
    </main>
  );
}

/* ---------- Garaj ve karakter ---------- */
function Showroom({ a }: { a: Avatar }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const key = JSON.stringify(a);
  useEffect(() => {
    const el = ref.current;
    if (!el || !HAS_WEBGL) return;
    let raf = 0;
    let renderer: any;
    try {
      const w = el.clientWidth || 320;
      const h = el.clientHeight || 220;
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(w, h);
      renderer.shadowMap.enabled = true;
      el.appendChild(renderer.domElement);
      const scene = new THREE.Scene();
      scene.add(new THREE.HemisphereLight('#ffffff', '#8aa0c8', 0.8));
      const dl = new THREE.DirectionalLight('#fff4e0', 0.9);
      dl.position.set(4, 9, 6);
      dl.castShadow = true;
      dl.shadow.mapSize.set(1024, 1024);
      scene.add(dl);
      const turn = new THREE.Group();
      const studs = new StudBatch();
      const plate = cyl(turn, 0, -0.3, 0, 4.2, 0.3, '#4B5266');
      plate.receiveShadow = true;
      for (let i = -3; i <= 3; i += 1.5) for (let k = -3; k <= 3; k += 1.5) if (i * i + k * k < 14) studs.add('#5A6278', i, 0, k);
      studs.build(turn);
      const fig = makeMinifig(a);
      fig.position.set(-1.7, 0.2, 0.6);
      fig.rotation.y = 0.4;
      turn.add(fig);
      const car = makeCar(a.car);
      car.position.set(1.4, 0.2, -0.4);
      car.rotation.y = -0.5;
      turn.add(car);
      scene.add(turn);
      const cam = new THREE.PerspectiveCamera(30, w / h, 0.1, 100);
      cam.position.set(0, 5.5, 12.5);
      cam.lookAt(0, 1.3, 0);
      const loop = (t: number) => {
        raf = requestAnimationFrame(loop);
        turn.rotation.y = Math.sin(t / 2400) * 0.6;
        renderer.render(scene, cam);
      };
      raf = requestAnimationFrame(loop);
    } catch (e) { /* yoksay */ }
    return () => {
      cancelAnimationFrame(raf);
      if (renderer) {
        renderer.dispose();
        if (renderer.forceContextLoss) renderer.forceContextLoss();
        if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, [key]);
  return (
    <div className="showroom" ref={ref}>
      {!HAS_WEBGL && (
        <div className="showroom-fallback">
          <Minifig a={a} size={150} />
          <BlockCar id={a.car} size={150} />
        </div>
      )}
    </div>
  );
}

function GarageScreen({
  state,
  update,
  onBack,
}: {
  state: AppState;
  update: (fn: (s: AppState) => AppState) => void;
  onBack: () => void;
}) {
  const a = state.city.avatar;
  const done = state.city.missionsCompleted;
  const [tab, setTab] = useState<'araba' | 'kiyafet' | 'sapka' | 'aksesuar' | 'sac' | 'renk'>('araba');
  const set = (p: Partial<Avatar>) => {
    Sfx.tick();
    update((s) => ({ ...s, city: { ...s.city, avatar: { ...s.city.avatar, ...p } } }));
  };
  const card = (key: string, name: string, need: number, img: any, selected: boolean, onPick: () => void) => {
    const locked = need > done;
    return (
      <button key={key} className={'g-card' + (selected ? ' on' : '') + (locked ? ' locked' : '')} onClick={locked ? undefined : onPick} aria-disabled={locked}>
        <span className="g-img">{img}</span>
        <span className="g-name">{name}</span>
        {locked && (
          <span className="g-lock">
            <LockIcon size={14} /> {need - done} görev
          </span>
        )}
      </button>
    );
  };
  const swatch = (list: string[], key: 'skin' | 'shirt' | 'pants' | 'hairColor', label: string) => (
    <div className="g-swatch-group">
      <h3>{label}</h3>
      <div className="swatches">
        {list.map((c) => (
          <button key={c} className={'swatch' + (a[key] === c ? ' on' : '')} style={{ background: c }} onClick={() => set({ [key]: c } as any)} aria-label={label + ' ' + c} />
        ))}
      </div>
    </div>
  );
  const TABS: Array<[typeof tab, string]> = [
    ['araba', 'Arabalar'],
    ['kiyafet', 'Kıyafet'],
    ['sapka', 'Şapka'],
    ['aksesuar', 'Aksesuar'],
    ['sac', 'Saç'],
    ['renk', 'Renkler'],
  ];
  return (
    <main className="screen game-screen garage-screen">
      <header className="topbar">
        <button className="back-btn" onClick={onBack} aria-label="Haritaya dön">←</button>
        <span className="game-title">Garajım</span>
        <HudStars stars={state.totalStars} />
      </header>
      <Showroom a={a} />
      <nav className="g-tabs" role="tablist">
        {TABS.map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>
        ))}
      </nav>
      <div className="g-grid">
        {tab === 'araba' && CARS.map((c) => card(c.id, c.name, c.need, <LazyThumb k={'car:' + c.id} make={() => Thumbs.car(c.id)} />, a.car === c.id, () => set({ car: c.id })))}
        {tab === 'kiyafet' && OUTFITS.map((o) => card(o.id, o.name, o.need, <LazyThumb k={'fig:' + JSON.stringify({ ...a, outfit: o.id })} make={() => Thumbs.fig({ ...a, outfit: o.id })} />, a.outfit === o.id, () => set({ outfit: o.id })))}
        {tab === 'sapka' && HATS.map((o) => card(o.id, o.name, o.need, <LazyThumb k={'por:' + JSON.stringify({ ...a, hat: o.id })} make={() => Thumbs.portrait({ ...a, hat: o.id })} />, (a.hat || 'yok') === o.id, () => set({ hat: o.id })))}
        {tab === 'aksesuar' && ACCESSORIES.map((o) => card(o.id, o.name, o.need, <LazyThumb k={'fig:' + JSON.stringify({ ...a, accessory: o.id })} make={() => Thumbs.fig({ ...a, accessory: o.id })} />, (a.accessory || 'yok') === o.id, () => set({ accessory: o.id })))}
        {tab === 'sac' && HAIR_STYLES.map((o) => card(o.id, o.name, 0, <LazyThumb k={'por:' + JSON.stringify({ ...a, hair: o.id, hat: 'yok' })} make={() => Thumbs.portrait({ ...a, hair: o.id, hat: 'yok' })} />, a.hair === o.id, () => set({ hair: o.id })))}
      </div>
      {tab === 'sac' && swatch(HAIR_COLORS, 'hairColor', 'Saç rengi')}
      {tab === 'renk' && (
        <div className="g-colors">
          {swatch(SKINS, 'skin', 'Ten rengi')}
          {swatch(BLOCK_COLORS, 'shirt', 'Tişört ve kep rengi')}
          {swatch(BLOCK_COLORS, 'pants', 'Pantolon rengi')}
        </div>
      )}
    </main>
  );
}

/* ---------- Türkçe heceleme ---------- */
function syllabify(word: string): string[] {
  const s = trUpper(word.trim());
  const isV = (c: string) => VOWELS.includes(c);
  const vi: number[] = [];
  for (let i = 0; i < s.length; i++) if (isV(s[i])) vi.push(i);
  if (vi.length <= 1) return [s];
  const out: string[] = [];
  let start = 0;
  for (let k = 0; k < vi.length - 1; k++) {
    const v1 = vi[k];
    const v2 = vi[k + 1];
    const cons = v2 - v1 - 1;
    const cut = cons === 0 ? v2 : v2 - 1;
    out.push(s.slice(start, cut));
    start = cut;
  }
  out.push(s.slice(start));
  return out;
}

const BRICK_COLORS = ['#E8473B', '#2F80ED', '#FFC23D', '#2DBE9B', '#8A6CFF', '#FF9F45'];

function GameEmpty({ title, text, onHome, a }: { title: string; text: string; onHome: () => void; a: Avatar }) {
  return (
    <div className="empty game-panel">
      <PlayerPortrait a={a} size={96} />
      <h2>{title}</h2>
      <p>{text}</p>
      <button className="game-btn" onClick={onHome}>Haritaya dön</button>
    </div>
  );
}

function BuildGame({
  state,
  onHome,
  onCommitSuccess,
  onAttempt,
  onCelebrate,
}: {
  state: AppState;
  onHome: () => void;
  onCommitSuccess: (itemId: string, verifier: Verifier, retries: number) => boolean;
  onAttempt: (itemId: string) => void;
  onCelebrate: () => void;
}) {
  const s = state.settings;
  const name = s.childName;
  const pick = useMessagePicker();
  const words = useMemo(
    () =>
      state.items.filter((i) => {
        if (i.type !== 'kelime' || !i.approved || !i.active || i.text.includes(' ')) return false;
        const n = itemSylls(i).length;
        return n >= 2 && n <= 4;
      }),
    [state.items]
  );
  const syllPool = useMemo(() => state.items.filter((i) => i.type === 'hece' && i.approved && i.active).map((i) => trUpper(i.text)), [state.items]);
  const recent = useRef<string[]>([]);
  const [round, setRound] = useState<null | { item: Item; sylls: string[]; bricks: Array<{ id: number; text: string; color: string }>; mode: 'upper' | 'lower' | 'both' }>(null);
  const [placed, setPlaced] = useState<number[]>([]);
  const [phase, setPhase] = useState<'play' | 'wrong' | 'success'>('play');
  const [retries, setRetries] = useState(0);
  const [msg, setMsg] = useState('');
  const [stars, setStars] = useState(0);

  const newRound = () => {
    const item = pickNext(words, recent.current);
    if (!item) return;
    recent.current = [...recent.current, item.id].slice(-4);
    const sylls = itemSylls(item);
    const extra = sylls.length <= 3 ? shuffle(syllPool.filter((x) => !sylls.includes(x))).slice(0, 1) : [];
    let texts = shuffle([...sylls, ...extra]);
    for (let i = 0; i < 5 && texts.slice(0, sylls.length).join('') === sylls.join(''); i++) texts = shuffle(texts);
    const mode: 'upper' | 'lower' | 'both' = s.letterCase === 'mixed' ? (Math.random() < 0.5 ? 'upper' : 'lower') : s.letterCase === 'both' ? 'upper' : s.letterCase;
    setRound({ item, sylls, bricks: texts.map((t, i) => ({ id: i, text: t, color: BRICK_COLORS[i % BRICK_COLORS.length] })), mode });
    setPlaced([]);
    setRetries(0);
    setPhase('play');
    const m = 'Heceleri sırayla diz, bir kelime yap!';
    setMsg(m);
    Speech.speak(m);
  };

  useEffect(() => {
    if (words.length) newRound();
  }, []);

  if (!words.length) {
    return (
      <main className="screen game-screen">
        <header className="topbar">
          <button className="back-btn" onClick={onHome} aria-label="Haritaya dön">←</button>
          <span className="game-title">Yapı Atölyesi</span>
          <HudStars stars={state.totalStars} />
        </header>
        <GameEmpty a={state.city.avatar} title="Atölyede henüz malzeme yok" text="Ebeveyn panelinden en az iki heceli kelimeler eklenip onaylanınca burada kelime inşa edebilirsin." onHome={onHome} />
      </main>
    );
  }
  if (!round) return null;

  const show = (t: string) => (round.mode === 'lower' ? trLower(t) : trUpper(t));

  const check = (next: number[]) => {
    const built = next.map((id) => round.bricks[id].text).join('');
    if (built === round.sylls.join('')) {
      setPhase('success');
      const m = retries > 0 ? pick('effort', name) : pick('success', name);
      setMsg(m);
      Sfx.success();
      onCelebrate();
      setStars((x) => x + 1 + (retries > 0 ? 1 : 0));
      Speech.speak(trLower(round.item.text) + '!', { rate: Speech.contentRate + 0.1 }).then(() => speakPraise(m));
      onCommitSuccess(round.item.id, 'tap', retries);
    } else {
      setPhase('wrong');
      onAttempt(round.item.id);
      setRetries((r) => r + 1);
      const m = pick('retry', name);
      setMsg(m);
      Sfx.soft();
      Speech.speak(m);
      setTimeout(() => {
        setPlaced([]);
        setPhase('play');
      }, 900);
    }
  };

  const tapBrick = (id: number) => {
    if (phase !== 'play' || placed.includes(id) || placed.length >= round.sylls.length) return;
    Sfx.tick();
    const next = [...placed, id];
    setPlaced(next);
    Speech.speak(trLower(round.bricks[id].text), { rate: Speech.contentRate });
    if (next.length === round.sylls.length) setTimeout(() => check(next), 450);
  };
  const tapSlot = (idx: number) => {
    if (phase !== 'play' || idx >= placed.length) return;
    setPlaced(placed.filter((_, i) => i !== idx));
  };

  return (
    <main className="screen game-screen">
      <header className="topbar">
        <button className="back-btn" onClick={onHome} aria-label="Haritaya dön">←</button>
        <span className="game-title">Yapı Atölyesi</span>
        <HudStars stars={state.totalStars} />
      </header>
      <div className="prompt-row">
        <PlayerPortrait a={state.city.avatar} size={64} />
        <p className="bubble" aria-live="polite">{msg}</p>
      </div>
      <div className={'build-plate' + (phase === 'wrong' ? ' shake' : '') + (phase === 'success' ? ' done' : '')}>
        {round.sylls.map((_, i) => {
          const id = placed[i];
          const b = id != null ? round.bricks[id] : null;
          return (
            <button key={i} className={'slot' + (b ? ' filled' : '')} onClick={() => tapSlot(i)} aria-label={b ? b.text + ' (geri al)' : 'Boş yer'}>
              {b && <span className="lego-brick" style={{ background: b.color }}>{show(b.text)}</span>}
            </button>
          );
        })}
      </div>
      {phase === 'success' ? (
        <div className="stage">
          <div className="read-card won pop">
            <CaseText text={round.item.text} mode={s.letterCase === 'mixed' ? round.mode : (s.letterCase as any)} className="read-text long" />
          </div>
          <button className="game-btn giant" onClick={newRound}>DEVAM</button>
        </div>
      ) : (
        <>
          <div className="brick-tray">
            {round.bricks.map((b) => (
              <button key={b.id} className={'lego-brick big' + (placed.includes(b.id) ? ' used' : '')} style={{ background: b.color }} onClick={() => tapBrick(b.id)} disabled={placed.includes(b.id)}>
                {show(b.text)}
              </button>
            ))}
          </div>
          <div className="kid-actions">
            <button className="game-btn soft" onClick={() => readItem(round.item.text, round.item.id, undefined, 'Bu kelimeyi yap.')}>Kelimeyi dinle</button>
            <button className="game-btn soft" onClick={() => setPlaced([])} disabled={!placed.length}>Temizle</button>
          </div>
        </>
      )}
      {stars > 0 && <p className="session-note">Bu oturumda {stars} yıldız kazandın.</p>}
    </main>
  );
}

function ListenGame({
  state,
  onHome,
  onCommitSuccess,
  onAttempt,
  onCelebrate,
}: {
  state: AppState;
  onHome: () => void;
  onCommitSuccess: (itemId: string, verifier: Verifier, retries: number) => boolean;
  onAttempt: (itemId: string) => void;
  onCelebrate: () => void;
}) {
  const s = state.settings;
  const name = s.childName;
  const pick = useMessagePicker();
  const pool = useMemo(() => state.items.filter((i) => (i.type === 'hece' || i.type === 'kelime') && i.approved && i.active), [state.items]);
  const recent = useRef<string[]>([]);
  const [round, setRound] = useState<null | { item: Item; options: Item[]; mode: 'upper' | 'lower' | 'both' }>(null);
  const [wrong, setWrong] = useState<string[]>([]);
  const [phase, setPhase] = useState<'play' | 'success'>('play');
  const [msg, setMsg] = useState('');

  const say = (it: Item) => readItem(it.text, it.id);

  const newRound = () => {
    const item = pickNext(pool, recent.current);
    if (!item) return;
    recent.current = [...recent.current, item.id].slice(-4);
    let others = pool.filter((p) => p.id !== item.id && p.type === item.type);
    if (others.length < 2) others = pool.filter((p) => p.id !== item.id);
    const t = normalize(item.text);
    const ranked = others
      .map((o) => ({ o, d: lev(normalize(o.text), t) + Math.random() * 1.5 }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 3)
      .map((x) => x.o);
    const n = Math.min(ranked.length, pool.length >= 4 ? 3 : 2);
    const options = shuffle([item, ...ranked.slice(0, n)]);
    const mode: 'upper' | 'lower' | 'both' = s.letterCase === 'mixed' ? (Math.random() < 0.5 ? 'upper' : 'lower') : s.letterCase;
    setRound({ item, options, mode });
    setWrong([]);
    setPhase('play');
    setMsg('Dinle ve doğru yazıya dokun!');
    readItem(item.text, item.id, undefined, 'Dinle ve bul.');
  };

  useEffect(() => {
    if (pool.length >= 2) newRound();
  }, []);

  const header = (
    <header className="topbar">
      <button className="back-btn" onClick={onHome} aria-label="Haritaya dön">←</button>
      <span className="game-title">Ses İstasyonu</span>
      <HudStars stars={state.totalStars} />
    </header>
  );

  if (pool.length < 2) {
    return (
      <main className="screen game-screen">
        {header}
        <GameEmpty a={state.city.avatar} title="İstasyon sessiz" text="Bu oyun için en az iki onaylı hece veya kelime gerekiyor." onHome={onHome} />
      </main>
    );
  }
  if (!round) return null;

  const choose = (o: Item) => {
    if (phase !== 'play' || wrong.includes(o.id)) return;
    if (o.id === round.item.id) {
      setPhase('success');
      const retries = wrong.length;
      const m = retries > 0 ? pick('effort', name) : pick(round.item.type === 'hece' ? 'successHece' : 'success', name);
      setMsg(m);
      Sfx.success();
      onCelebrate();
      speakPraise(m);
      onCommitSuccess(round.item.id, 'tap', retries);
    } else {
      setWrong((w) => [...w, o.id]);
      onAttempt(round.item.id);
      Sfx.soft();
      const m = pick('retry', name);
      setMsg(m);
      Speech.speak(m).then(() => say(round.item));
    }
  };

  return (
    <main className="screen game-screen">
      {header}
      {!synthSupported && <p className="notice">Bu cihazda seslendirme yok. Bu oyun ses gerektirir; diğer binalarda oynayabilirsin.</p>}
      <div className="prompt-row">
        <PlayerPortrait a={state.city.avatar} size={64} />
        <p className="bubble" aria-live="polite">{msg}</p>
      </div>
      <button className="speaker-btn" onClick={() => say(round.item)} aria-label="Tekrar dinle">
        <svg viewBox="0 0 64 64" width="70" height="70" aria-hidden="true">
          <path d="M10 24h10l14-11v38L20 40H10z" fill="#fff" stroke="#1B1F3B" strokeWidth="4" strokeLinejoin="round" />
          <path d="M42 22c5 6 5 14 0 20M48 15c9 10 9 24 0 34" stroke="#fff" strokeWidth="5" fill="none" strokeLinecap="round" />
        </svg>
        <span>Tekrar dinle</span>
      </button>
      <div className={'choice-grid n' + round.options.length}>
        {round.options.map((o, i) => (
          <button
            key={o.id}
            className={'choice' + (wrong.includes(o.id) ? ' wrong' : '') + (phase === 'success' && o.id === round.item.id ? ' right' : '')}
            style={{ ['--c' as any]: BRICK_COLORS[i % BRICK_COLORS.length] }}
            onClick={() => choose(o)}
            disabled={wrong.includes(o.id)}
          >
            <CaseText text={o.text} mode={round.mode} className={'choice-text' + (o.text.length > 5 ? ' long' : '')} />
          </button>
        ))}
      </div>
      {phase === 'success' && <button className="game-btn giant" onClick={newRound}>DEVAM</button>}
    </main>
  );
}

/* ============================================================
   SES: KARAKTERLER, HECELEYEREK OKUMA, EBEVEYN KAYITLARI
   ============================================================ */
type VoicePreset = 'neseli' | 'cizgi' | 'sicak' | 'dogal';
type ReadingStyle = 'vurgulu' | 'normal';

const VOICE_PRESETS: Record<VoicePreset, { name: string; desc: string; pitch: number; rate: number }> = {
  neseli: { name: 'Neşeli kahraman', desc: 'Enerjik ve biraz ince ses', pitch: 1.3, rate: 0.95 },
  cizgi: { name: 'Çizgi film', desc: 'Çok ince, oyuncak gibi ses', pitch: 1.6, rate: 1.0 },
  sicak: { name: 'Sıcak anlatıcı', desc: 'Sakin, masal okur gibi', pitch: 1.05, rate: 0.85 },
  dogal: { name: 'Doğal', desc: 'Sesin kendi tonu', pitch: 1.0, rate: 0.9 },
};

const VoiceCfg = {
  style: 'vurgulu' as ReadingStyle,
  recItems: new Set<string>(),
  praise: [] as string[],
  lastPraise: '',
};

function voiceScore(v: SpeechSynthesisVoice): number {
  const n = (v.name + ' ' + v.voiceURI).toLocaleLowerCase('tr-TR');
  let s = 0;
  if (/premium/.test(n)) s += 6;
  if (/enhanced|gelişmiş|geliştirilmiş|iyileştirilmiş|yüksek kalite/.test(n)) s += 5;
  if (/natural|neural|online/.test(n)) s += 5;
  if (/google/.test(n)) s += 2;
  if ((v as any).localService === false) s += 1;
  if (/compact|kompakt/.test(n)) s -= 2;
  return s;
}

function turkishVoices(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  return voices
    .filter((v) => (v.lang || '').toLowerCase().replace('_', '-').startsWith('tr'))
    .sort((a, b) => voiceScore(b) - voiceScore(a));
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ---------- Heceleme birimleri ---------- */
function unitsOf(text: string): { kind: 'hece' | 'harf'; groups: string[][] } {
  const ov = SylCfg.byText[normalize(text)];
  const og = ov ? groupSylls(text, ov) : null;
  if (og && ov.length > 1) return { kind: 'hece', groups: og };
  const words = trUpper(text).replace(/[^A-ZÇĞIİÖŞÜÂÎÛ ]/g, '').trim().split(/\s+/).filter(Boolean);
  const groups = words.map((w) => syllabify(w));
  const total = groups.reduce((a, g) => a + g.length, 0);
  if (total > 1) return { kind: 'hece', groups };
  const w = words[0] || '';
  return { kind: 'harf', groups: [Array.from(w)] };
}

/** Bir hece/kelimeyi vurgulayarak okur: önce birimler (hece veya harf), sonra bütünü. */
async function readItem(text: string, itemId: string | null, onPart?: (i: number | null) => void, intro?: string): Promise<void> {
  Speech.stop();
  const my = Speech.seq;
  const alive = () => Speech.seq === my;
  if (intro) {
    await Speech.speak(intro, { keep: true });
    if (!alive()) return;
  }
  if (itemId && VoiceCfg.recItems.has(itemId)) {
    const url = await RecStore.get('item-' + itemId);
    if (!alive()) return;
    if (url) {
      onPart && onPart(-1);
      const ok = await Speech.playClip(url, true);
      onPart && onPart(null);
      if (ok) return;
    }
  }
  if (VoiceCfg.style === 'vurgulu') {
    const { groups } = unitsOf(text);
    const flat = groups.reduce((a: string[], g) => a.concat(g), []);
    if (flat.length > 1) {
      for (let i = 0; i < flat.length; i++) {
        if (!alive()) return;
        onPart && onPart(i);
        await Speech.speak(trLower(flat[i]), { keep: true, rate: Speech.contentRate });
        await wait(Speech.gap);
      }
      if (!alive()) return;
    }
  }
  onPart && onPart(-1);
  await Speech.speak(trLower(text), { keep: true, rate: Math.min(Speech.contentRate + 0.1, 1) });
  if (alive()) onPart && onPart(null);
}

/** Övgü: ebeveynin kaydettiği övgüler varsa çoğu zaman onları çalar. */
async function speakPraise(text: string): Promise<void> {
  const list = VoiceCfg.praise;
  if (list.length && Math.random() < 0.65) {
    const opts = list.length > 1 ? list.filter((x) => x !== VoiceCfg.lastPraise) : list;
    const id = opts[Math.floor(Math.random() * opts.length)];
    VoiceCfg.lastPraise = id;
    const url = await RecStore.get('praise-' + id);
    if (url && (await Speech.playClip(url))) return;
  }
  await Speech.speak(text);
}

function SyllableText({ text, mode, hl, className }: { text: string; mode: 'upper' | 'lower' | 'both'; hl: number | null; className?: string }) {
  if (hl === null) return <CaseText text={text} mode={mode} className={className} />;
  const { groups } = unitsOf(text);
  const line = (conv: (s: string) => string, key: string) => {
    let idx = -1;
    return (
      <span className="syl-line" key={key}>
        {groups.map((g, wi) => (
          <span className="syl-word" key={wi}>
            {g.map((u) => {
              idx++;
              const on = hl === -1 || hl === idx;
              return (
                <span key={idx} className={'syl' + (on ? ' on' : '') + (hl === -1 ? ' all' : '')}>
                  {conv(u)}
                </span>
              );
            })}
          </span>
        ))}
      </span>
    );
  };
  return (
    <span className={'syl-text ' + (className || '')}>
      {(mode === 'upper' || mode === 'both') && line(trUpper, 'u')}
      {(mode === 'lower' || mode === 'both') && line(trLower, 'l')}
    </span>
  );
}

/* ---------- Kayıt saklama (IndexedDB + hesap) ---------- */
const recMem: Record<string, string> = {};
const RecStore = {
  async get(key: string): Promise<string | null> {
    if (recMem[key]) return recMem[key];
    try {
      const v = await IDB.get('rec:' + key);
      if (v) return (recMem[key] = v);
    } catch (e) { /* yoksay */ }
    try {
      await Promise.race([Cloud.ready, wait(4000)]);
      if (Cloud.db && Cloud.uid) {
        const snap = await Cloud.db.doc('data/users/' + Cloud.uid + '/rec-' + key).get();
        const d = snap.exists ? (snap.data() as any) : null;
        if (d && typeof d.dataUrl === 'string') {
          recMem[key] = d.dataUrl;
          IDB.set('rec:' + key, d.dataUrl).catch(() => {});
          return d.dataUrl;
        }
      }
    } catch (e) { /* yoksay */ }
    return null;
  },
  async set(key: string, dataUrl: string): Promise<{ local: boolean; cloud: boolean }> {
    recMem[key] = dataUrl;
    let local = false;
    let cloud = false;
    try {
      await IDB.set('rec:' + key, dataUrl);
      local = true;
    } catch (e) { /* yoksay */ }
    try {
      if (Cloud.db && Cloud.uid && dataUrl.length < 240000) {
        await Cloud.db.doc('data/users/' + Cloud.uid + '/rec-' + key).set({ dataUrl });
        cloud = true;
      }
    } catch (e) { /* yoksay */ }
    return { local, cloud };
  },
  async del(key: string) {
    delete recMem[key];
    IDB.del('rec:' + key).catch(() => {});
    try {
      if (Cloud.db && Cloud.uid) await Cloud.db.doc('data/users/' + Cloud.uid + '/rec-' + key).delete();
    } catch (e) { /* yoksay */ }
  },
};

function blobToDataUrl(b: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(b);
  });
}

async function startRecording(maxMs = 6000): Promise<{ stop: () => Promise<string>; done: Promise<string> }> {
  const md = navigator.mediaDevices;
  const MR = (window as any).MediaRecorder;
  if (!md || !md.getUserMedia || !MR) throw new Error('unsupported');
  const stream = await md.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } as any });
  const types = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg'];
  const mime = types.find((t) => MR.isTypeSupported && MR.isTypeSupported(t)) || '';
  const rec = new MR(stream, mime ? { mimeType: mime, audioBitsPerSecond: 48000 } : undefined);
  const chunks: Blob[] = [];
  rec.ondataavailable = (e: any) => e.data && e.data.size && chunks.push(e.data);
  const done = new Promise<string>((resolve) => {
    rec.onstop = async () => {
      stream.getTracks().forEach((t: any) => t.stop());
      const blob = new Blob(chunks, { type: rec.mimeType || mime || 'audio/webm' });
      resolve(await blobToDataUrl(blob));
    };
  });
  rec.start();
  const timer = setTimeout(() => rec.state !== 'inactive' && rec.stop(), maxMs);
  return {
    done,
    stop: () => {
      clearTimeout(timer);
      if (rec.state !== 'inactive') rec.stop();
      return done;
    },
  };
}

function recErrorText(e: any): string {
  const n = (e && (e.name || e.message)) || '';
  if (/NotAllowed|Permission|denied/i.test(n)) return 'Mikrofon izni verilmedi. Tarayıcı ayarlarından bu sayfaya mikrofon izni verip tekrar deneyin.';
  if (/NotFound/i.test(n)) return 'Mikrofon bulunamadı.';
  if (/unsupported/i.test(n)) return 'Bu tarayıcı ses kaydını desteklemiyor.';
  return 'Kayıt başlatılamadı. Mikrofon bu sayfada kullanılamıyor olabilir.';
}

/* ---------- Kayıt satırı ---------- */
function RecordRow({
  label,
  recKey,
  has,
  onSaved,
  onDeleted,
  setMsg,
}: {
  label: any;
  recKey: string;
  has: boolean;
  onSaved: () => void;
  onDeleted: () => void;
  setMsg: (m: string) => void;
}) {
  const [rec, setRec] = useState<null | { stop: () => Promise<string> }>(null);
  const [busy, setBusy] = useState(false);
  const start = async () => {
    setMsg('');
    Speech.stop();
    try {
      const r = await startRecording(6000);
      setRec(r);
      r.done.then(async (url) => {
        setRec(null);
        setBusy(true);
        const res = await RecStore.set(recKey, url);
        setBusy(false);
        if (!res.local && !res.cloud) setMsg('Kayıt saklanamadı.');
        else onSaved();
      });
    } catch (e) {
      setMsg(recErrorText(e));
    }
  };
  return (
    <div className="rec-row">
      <span className="rec-label">{label}</span>
      {rec ? (
        <button className="btn small danger rec-live" onClick={() => rec.stop()}>● Durdur</button>
      ) : (
        <button className="btn small primary" onClick={start} disabled={busy}>{has ? 'Yeniden kaydet' : 'Kaydet'}</button>
      )}
      {has && !rec && (
        <>
          <button className="btn small ghost" onClick={async () => { const u = await RecStore.get(recKey); if (u) Speech.playClip(u); }}>Dinle</button>
          <button className="btn small ghost" onClick={() => { RecStore.del(recKey); onDeleted(); }}>Sil</button>
        </>
      )}
    </div>
  );
}

/* ---------- Ebeveyn: Ses ve okuma sekmesi ---------- */
function VoicePanel({
  state,
  update,
  voices,
}: {
  state: AppState;
  update: (fn: (s: AppState) => AppState) => void;
  voices: SpeechSynthesisVoice[];
}) {
  const s = state.settings;
  const set = (p: Partial<Settings>) => update((st) => ({ ...st, settings: { ...st.settings, ...p } }));
  const trV = turkishVoices(voices);
  const best = trV[0];
  const [msg, setMsg] = useState('');
  const [hl, setHl] = useState<number | null>(null);
  const sampleWord =
    (state.items.find((i) => i.type === 'kelime' && i.approved && i.active && !i.text.includes(' ')) || { text: 'LALE' }).text;
  const sampleHece = (state.items.find((i) => i.type === 'hece' && i.approved && i.active) || { text: 'LA' }).text;
  const recItems = state.items.filter((i) => (i.type === 'hece' || i.type === 'kelime') && i.approved && i.active);
  const rec = state.recordings;
  const setRec = (fn: (r: Recordings) => Recordings) => update((st) => ({ ...st, recordings: fn(st.recordings) }));

  return (
    <section className="panel">
      <div className="card">
        <h3>Ses karakteri</h3>
        <p className="muted small">
          Tarayıcının kendi Türkçe sesi kullanılıyor. Karakter, sesin tonunu ve hızını değiştirir; en büyük fark daha kaliteli bir ses seçmekten veya kendi sesinizi kaydetmekten gelir.
        </p>
        <div className="preset-grid">
          {(Object.keys(VOICE_PRESETS) as VoicePreset[]).map((k) => (
            <button
              key={k}
              className={'preset' + (s.voicePreset === k ? ' on' : '')}
              onClick={() => {
                set({ voicePreset: k, speechRate: VOICE_PRESETS[k].rate });
                Speech.pitch = VOICE_PRESETS[k].pitch;
                Speech.rate = VOICE_PRESETS[k].rate;
                Speech.speak(fill('Merhaba {ad}! Haydi birlikte okuyalım!', s.childName));
              }}
            >
              <b>{VOICE_PRESETS[k].name}</b>
              <small>{VOICE_PRESETS[k].desc}</small>
            </button>
          ))}
        </div>
        {!synthSupported ? (
          <p className="error-text">Bu tarayıcı seslendirmeyi desteklemiyor.</p>
        ) : trV.length === 0 ? (
          <p className="error-text">Bu cihazda Türkçe ses bulunamadı.</p>
        ) : (
          <label className="field">
            Türkçe ses ({trV.length} bulundu)
            <select value={s.voiceURI} onChange={(e) => set({ voiceURI: e.target.value })}>
              <option value="">Otomatik: en kaliteli ses ({best ? best.name : '-'})</option>
              {trV.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name}{voiceScore(v) >= 4 ? ' ★ yüksek kalite' : ''}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="field">
          Konuşma hızı (mesajlar): {s.speechRate.toFixed(2)}
          <input type="range" min="0.6" max="1.2" step="0.05" value={s.speechRate} onChange={(e) => set({ speechRate: Number(e.target.value) })} />
        </label>
        <div className="tip">
          <b>Daha doğal ses için</b>
          <p>
            iPhone ve iPad: Ayarlar › Erişilebilirlik › Seslendirilen İçerik › Sesler › Türkçe bölümünde sesin "Gelişmiş" veya "Premium" sürümünü indirin, sonra bu sayfayı yeniden açın.
            Mac: Sistem Ayarları › Erişilebilirlik › Seslendirilen İçerik › Sistem sesi › Sesleri Yönet.
            Windows'ta Microsoft Edge tarayıcısındaki "Online (Natural)" Türkçe sesler en doğal seçenektir.
          </p>
        </div>
      </div>

      <div className="card">
        <h3>Okuma tarzı</h3>
        {([
          ['vurgulu', 'Heceleyerek ve vurgulayarak', 'Kelimeler hece hece okunur (la… le… lale). Tek hece harf harf okunur (l… a… la). Okunan parça ekranda parlar.'],
          ['normal', 'Bütün olarak, yavaş', 'Kelime ve hece tek seferde, yavaşça okunur.'],
        ] as Array<[ReadingStyle, string, string]>).map(([k, l, d]) => (
          <label key={k} className="radio">
            <input type="radio" name="rstyle" checked={s.readingStyle === k} onChange={() => set({ readingStyle: k })} />
            <span><b>{l}</b><br /><small className="muted">{d}</small></span>
          </label>
        ))}
        <label className="field">
          Okuma hızı (hece ve kelimeler): {s.contentRate.toFixed(2)}
          <input type="range" min="0.4" max="0.95" step="0.05" value={s.contentRate} onChange={(e) => set({ contentRate: Number(e.target.value) })} />
        </label>
        <label className="field">
          Parçalar arası bekleme: {(s.unitGap / 1000).toFixed(2)} sn
          <input type="range" min="150" max="1000" step="50" value={s.unitGap} onChange={(e) => set({ unitGap: Number(e.target.value) })} />
        </label>
        <div className="demo-card">
          <SyllableText text={hl === null ? sampleWord : sampleWord} mode="upper" hl={hl} className="demo-text" />
        </div>
        <div className="row gap wrap">
          <button className="btn primary" onClick={() => readItem(sampleWord, null, setHl)}>"{trUpper(sampleWord)}" kelimesini dinle</button>
          <button className="btn ghost" onClick={() => readItem(sampleHece, null)}>"{trUpper(sampleHece)}" hecesini dinle</button>
        </div>
        <p className="muted small">
          Harf harf okumada ünsüzler cihaz sesine göre harf adıyla ("le", "ne") okunabilir. Harf seslerini ("lll") tam istediğiniz gibi duyurmak için aşağıdan kendi sesinizi kaydedebilirsiniz.
        </p>
      </div>

      <div className="card">
        <h3>Kendi sesinizle</h3>
        <p className="muted small">
          Kaydettiğiniz ses, o içerik için robot sesin yerine çalınır. Kayıtlar en fazla 6 saniyedir; bu cihazda ve Claude hesabınızda saklanır.
          Kayıt için mikrofon izni gerekir.
        </p>
        {msg && <p className="error-text">{msg}</p>}
        <h4>Övgü mesajları ({rec.praise.length}/6)</h4>
        <p className="muted small">Örnek: "Aferin oğlum, harika okudun!" Doğru cevaplarda çoğu zaman bunlardan biri çalınır.</p>
        {rec.praise.map((id, i) => (
          <RecordRow
            key={id}
            label={'Övgü ' + (i + 1)}
            recKey={'praise-' + id}
            has={true}
            setMsg={setMsg}
            onSaved={() => setRec((r) => ({ ...r }))}
            onDeleted={() => setRec((r) => ({ ...r, praise: r.praise.filter((x) => x !== id) }))}
          />
        ))}
        {rec.praise.length < 6 && (
          <RecordRow
            key={'new-' + rec.praise.length}
            label="Yeni övgü"
            recKey={'praise-new-' + rec.praise.length}
            has={false}
            setMsg={setMsg}
            onSaved={async () => {
              const id = uid().slice(0, 12);
              const url = await RecStore.get('praise-new-' + rec.praise.length);
              if (url) {
                await RecStore.set('praise-' + id, url);
                RecStore.del('praise-new-' + rec.praise.length);
                setRec((r) => ({ ...r, praise: [...r.praise, id] }));
              }
            }}
            onDeleted={() => {}}
          />
        )}
        <h4>Hece ve kelimeler</h4>
        {recItems.length === 0 ? (
          <p className="muted">Önce İçerikler sekmesinden hece veya kelime ekleyin.</p>
        ) : (
          recItems.map((it) => (
            <RecordRow
              key={it.id}
              label={<b className="rec-item">{it.text}</b>}
              recKey={'item-' + it.id}
              has={rec.items.includes(it.id)}
              setMsg={setMsg}
              onSaved={() => setRec((r) => ({ ...r, items: r.items.includes(it.id) ? r.items : [...r.items, it.id] }))}
              onDeleted={() => setRec((r) => ({ ...r, items: r.items.filter((x) => x !== it.id) }))}
            />
          ))
        )}
        <p className="muted small">İpucu: Kelimeyi kaydederken siz de heceleyerek okuyabilirsiniz: "La… le… Lale!"</p>
      </div>
    </section>
  );
}

/* ---------- Mikrofon izni ve ana ekrana ekleme ---------- */
function MicPermissionButton() {
  const [msg, setMsg] = useState('');
  const ask = async () => {
    setMsg('');
    try {
      const md = navigator.mediaDevices;
      if (!md || !md.getUserMedia) throw new Error('unsupported');
      const st = await md.getUserMedia({ audio: true });
      st.getTracks().forEach((t) => t.stop());
      setMsg('Mikrofon izni verildi.' + (SRClass ? '' : ' Ancak bu tarayıcı Türkçe konuşma tanımayı desteklemiyor; ses kayıtları yine çalışır.'));
    } catch (e) {
      setMsg(recErrorText(e));
    }
  };
  return (
    <div className="row gap wrap">
      <button className="btn ghost" onClick={ask}>Mikrofon iznini şimdi iste</button>
      {msg && <span className="small">{msg}</span>}
    </div>
  );
}

function isStandalone(): boolean {
  try {
    return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || (navigator as any).standalone === true;
  } catch (e) {
    return false;
  }
}

function InstallTip() {
  if ((window as any).claude || isStandalone()) return null;
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return (
    <div className="card">
      <h3>Ana ekrana ekleyin</h3>
      <p className="small">
        {ios
          ? 'Safari\'de alttaki veya üstteki Paylaş düğmesine dokunun, "Ana Ekrana Ekle"yi seçin. Uygulama tam ekran açılır, internet olmadan da çalışır ve verileri daha güvenle saklanır.'
          : 'Tarayıcı menüsünden "Uygulamayı yükle" veya "Ana ekrana ekle" seçeneğini kullanın.'}
      </p>
    </div>
  );
}

/* ---------- Profil fotoğrafı ---------- */
function ProfilePhotoEditor({ state, update }: { state: AppState; update: (fn: (s: AppState) => AppState) => void }) {
  const current = useProfilePhoto(state.settings.profilePhotoV);
  const [src, setSrc] = useState<string | null>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [z, setZ] = useState(1);
  const [ox, setOx] = useState(0);
  const [oy, setOy] = useState(0);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLCanvasElement | null>(null);
  const drag = useRef<null | { x: number; y: number }>(null);

  useEffect(() => {
    if (!src) return setImg(null);
    loadImageEl(src).then(setImg).catch(() => setMsg('Fotoğraf okunamadı.'));
  }, [src]);

  const drawTo = (c: HTMLCanvasElement, size: number) => {
    if (!img) return;
    c.width = size;
    c.height = size;
    const ctx = c.getContext('2d')!;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const side = Math.min(w, h) / z;
    const cx = w / 2 + (ox * (w - side)) / 2;
    const cy = h / 2 + (oy * (h - side)) / 2;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(img, cx - side / 2, cy - side / 2, side, side, 0, 0, size, size);
  };

  useEffect(() => {
    if (ref.current && img) drawTo(ref.current, 240);
  }, [img, z, ox, oy]);

  const onFile = async (e: any) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;
    if (!/^image\//.test(f.type)) return setMsg('Lütfen bir fotoğraf seçin.');
    setMsg('');
    setBusy(true);
    try {
      setSrc(await processPhoto(f));
      setZ(1);
      setOx(0);
      setOy(0);
    } catch (err) {
      setMsg('Fotoğraf okunamadı. JPEG veya PNG deneyin.');
    }
    setBusy(false);
  };

  const save = async () => {
    if (!img) return;
    setBusy(true);
    const c = document.createElement('canvas');
    drawTo(c, 320);
    const url = c.toDataURL('image/jpeg', 0.86);
    const r = await RecStore.set('profile', url);
    setBusy(false);
    if (!r.local && !r.cloud) return setMsg('Fotoğraf saklanamadı.');
    update((st) => ({ ...st, settings: { ...st.settings, profilePhotoV: Date.now() } }));
    setSrc(null);
    setMsg(r.cloud ? 'Fotoğraf kaydedildi (bu cihazda ve hesabınızda).' : 'Fotoğraf bu cihazda kaydedildi.');
  };

  const remove = async () => {
    if (!(await askConfirm('Profil fotoğrafı kaldırılsın mı? Haritada yeniden blok karakter görünür.'))) return;
    RecStore.del('profile');
    update((st) => ({ ...st, settings: { ...st.settings, profilePhotoV: 0 } }));
    setMsg('Fotoğraf kaldırıldı.');
  };

  const clamp = (v: number) => Math.max(-1, Math.min(1, v));

  return (
    <div className="card">
      <h3>Profil fotoğrafı</h3>
      <p className="muted small">Haritadaki oyuncu kartında (isim ve seviyenin yanında) blok karakter yerine görünür.</p>
      {!src && (
        <div className="row gap wrap">
          <span className="profile-current">
            {current ? <img src={current} alt="Profil fotoğrafı" /> : <PlayerPortrait a={state.city.avatar} size={84} />}
          </span>
          <label className="btn primary file-btn">
            {current ? 'Fotoğrafı değiştir' : 'Fotoğraf yükle'}
            <input type="file" accept="image/*" onChange={onFile} disabled={busy} />
          </label>
          {current && <button className="btn ghost" onClick={remove}>Kaldır</button>}
        </div>
      )}
      {src && (
        <div className="crop-box">
          <canvas
            ref={ref}
            className="crop-preview"
            onPointerDown={(e) => {
              (e.target as any).setPointerCapture(e.pointerId);
              drag.current = { x: e.clientX, y: e.clientY };
            }}
            onPointerMove={(e) => {
              if (!drag.current) return;
              const k = 1.6 / (z * 120);
              setOx((v) => clamp(v - (e.clientX - drag.current!.x) * k));
              setOy((v) => clamp(v - (e.clientY - drag.current!.y) * k));
              drag.current = { x: e.clientX, y: e.clientY };
            }}
            onPointerUp={() => (drag.current = null)}
            onPointerCancel={() => (drag.current = null)}
          />
          <p className="muted small center">Fotoğrafı parmağınızla kaydırıp yüzü ortalayın.</p>
          <label className="field">
            Yakınlaştır
            <input type="range" min="1" max="3" step="0.05" value={z} onChange={(e) => setZ(Number(e.target.value))} />
          </label>
          <div className="row gap wrap">
            <button className="btn primary" onClick={save} disabled={busy}>Kaydet</button>
            <button className="btn ghost" onClick={() => setSrc(null)}>Vazgeç</button>
          </div>
        </div>
      )}
      {busy && <p className="muted">Hazırlanıyor…</p>}
      {msg && <p className="ok-text" aria-live="polite">{msg}</p>}
    </div>
  );
}

/* ============================================================
   KARAOKE OKUMA, ANLAM GÖRSELLERİ VE KELİME PARKI
   ============================================================ */

/* ---------- Heceleme: ebeveyn düzeltmeleri ---------- */
const SylCfg = { byText: {} as Record<string, string[]> };

function wordLetters(text: string): string[] {
  return trUpper(text).replace(/[^A-ZÇĞIİÖŞÜÂÎÛ ]/g, '').trim().split(/\s+/).filter(Boolean);
}

/** Düz hece listesini kelimelere göre gruplar; harfler tutmazsa null döner. */
function groupSylls(text: string, flat: string[]): string[][] | null {
  const words = wordLetters(text);
  const out: string[][] = [];
  let i = 0;
  for (const w of words) {
    const g: string[] = [];
    let acc = '';
    while (acc.length < w.length && i < flat.length) {
      acc += flat[i];
      g.push(flat[i]);
      i++;
    }
    if (acc !== w) return null;
    out.push(g);
  }
  return i === flat.length ? out : null;
}

function autoSylls(text: string): string[] {
  return wordLetters(text).reduce((a: string[], w) => a.concat(syllabify(w)), []);
}

function itemSylls(it: { text: string; syllables?: string[] }): string[] {
  if (it.syllables && it.syllables.length && groupSylls(it.text, it.syllables)) return it.syllables;
  return autoSylls(it.text);
}

function parseSyllableInput(input: string, word: string): { ok: true; sylls: string[] } | { ok: false; error: string } {
  const flat = trUpper(input)
    .split(/\s+/)
    .filter(Boolean)
    .reduce((a: string[], w) => a.concat(w.split(/[-+·.,/]/).map((x) => x.trim()).filter(Boolean)), []);
  if (!flat.length) return { ok: false, error: 'Heceleri tire ile ayırarak yazın (ör. AN-NE)' };
  if (!groupSylls(word, flat)) return { ok: false, error: 'Hecelerin harfleri kelimeyle aynı olmalı (' + trUpper(word) + ')' };
  const noVowel = flat.find((x) => !x.split('').some((c) => VOWELS.includes(c)));
  if (noVowel) return { ok: false, error: '"' + noVowel + '" hecesinde ünlü yok' };
  return { ok: true, sylls: flat };
}

/* ---------- Anlam görselleri: 3D blok modeller ---------- */
function starShape(r1: number, r2: number, n = 5) {
  const s = new THREE.Shape();
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 ? r2 : r1;
    const a = Math.PI / 2 + (i * Math.PI) / n;
    if (i) s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    else s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  return s;
}

function extruded(shape: any, depth: number, color: string, opts: any = {}) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.06, bevelSegments: 3 });
  return mesh(g, mat(color, opts));
}

function sphere(parent: any, x: number, y: number, z: number, r: number, color: string, scale?: number[], opts: any = {}) {
  const m = mesh(new THREE.SphereGeometry(r, 24, 16), mat(color, opts));
  m.position.set(x, y, z);
  if (scale) m.scale.set(scale[0], scale[1], scale[2]);
  parent.add(m);
  return m;
}

function makeHouseModel() {
  const g = new THREE.Group();
  const st = new StudBatch();
  brick(g, st, -1.6, 0, -1.6, 3.2, 0.25, 3.2, '#5DBB63');
  box(g, -1.2, 0.25, -1.1, 2.4, 1.8, 2.2, '#FFF3D6');
  prism(g, -1.4, 2.05, -1.25, 2.8, 1.25, 2.5, '#E8473B');
  box(g, -0.3, 0.25, 1.1, 0.6, 1.05, 0.06, '#2DBE9B');
  box(g, -1.0, 1.05, 1.1, 0.5, 0.45, 0.06, '#9ED8FF');
  box(g, 0.5, 1.05, 1.1, 0.5, 0.45, 0.06, '#9ED8FF');
  box(g, 1.2, 1.05, -0.3, 0.06, 0.45, 0.6, '#9ED8FF');
  box(g, 0.5, 2.4, -0.6, 0.35, 0.8, 0.35, '#8B5A2B');
  st.build(g);
  return g;
}

function makeTreeModel() {
  const g = new THREE.Group();
  const st = new StudBatch();
  box(g, -0.28, 0, -0.28, 0.56, 1.5, 0.56, '#8B5A2B');
  brick(g, st, -1.05, 1.4, -1.05, 2.1, 1.0, 2.1, '#3FA34D', { studs: false });
  brick(g, st, -0.75, 2.4, -0.75, 1.5, 0.85, 1.5, '#58C16A');
  sphere(g, 0.9, 1.9, 0.6, 0.16, '#E8473B');
  sphere(g, -0.5, 2.2, 1.0, 0.16, '#E8473B');
  st.build(g);
  return g;
}

function makeBallModel() {
  const g = new THREE.Group();
  const cols = ['#E8473B', '#FFFFFF', '#2F80ED', '#FFFFFF', '#FFC23D', '#FFFFFF'];
  cols.forEach((c, i) => {
    const m = mesh(new THREE.SphereGeometry(1, 28, 18, (i * Math.PI) / 3, Math.PI / 3), mat(c));
    m.position.y = 1;
    g.add(m);
  });
  sphere(g, 0, 2, 0, 0.18, '#FFC23D');
  return g;
}

function makeAppleModel() {
  const g = new THREE.Group();
  sphere(g, 0, 0.95, 0, 1, '#E23B3B', [1, 0.92, 1]);
  cyl(g, 0, 1.7, 0, 0.07, 0.5, '#6B4423');
  const leaf = sphere(g, 0.32, 2.05, 0, 0.32, '#3FA34D', [1, 0.22, 0.55]);
  leaf.rotation.z = -0.5;
  sphere(g, -0.35, 1.35, 0.78, 0.18, '#FF9A9A', [1, 1, 0.4]);
  return g;
}

function makeCastleModel() {
  const g = new THREE.Group();
  const st = new StudBatch();
  brick(g, st, -2.1, 0, -1.7, 4.2, 0.25, 3.4, '#5DBB63', { step: 2 });
  box(g, -1.5, 0.25, -1.2, 3, 1.5, 2.4, '#C7CDD9');
  for (let i = 0; i < 5; i++) {
    box(g, -1.4 + i * 0.66, 1.75, 1.0, 0.36, 0.32, 0.2, '#C7CDD9');
    box(g, -1.4 + i * 0.66, 1.75, -1.2, 0.36, 0.32, 0.2, '#C7CDD9');
  }
  [[-1.5, -1.2], [1.5, -1.2], [-1.5, 1.2], [1.5, 1.2]].forEach(([x, z]) => {
    cyl(g, x, 0.25, z, 0.5, 2.3, '#AEB6C8');
    const roof = mesh(new THREE.ConeGeometry(0.62, 0.9, 16), mat('#E8473B'));
    roof.position.set(x, 3.0, z);
    g.add(roof);
  });
  box(g, -0.4, 0.25, 1.18, 0.8, 1.0, 0.08, '#5B4220');
  cyl(g, 1.5, 3.4, 1.2, 0.04, 0.9, '#1B1F3B');
  box(g, 1.52, 3.9, 1.18, 0.6, 0.38, 0.04, '#FFC23D');
  st.build(g);
  return g;
}

function makeFlowerModel(potted = true, petal = '#F06BA8') {
  const g = new THREE.Group();
  const base = potted ? 0.75 : 0;
  if (potted) {
    cyl(g, 0, 0, 0, 0.6, 0.75, '#C96A1B');
    cyl(g, 0, 0.75, 0, 0.55, 0.05, '#5B4220');
  }
  cyl(g, 0, base, 0, 0.06, 1.45, '#3FA34D');
  const l1 = sphere(g, 0.25, base + 0.6, 0, 0.3, '#58C16A', [1, 0.25, 0.5]);
  l1.rotation.z = 0.6;
  const l2 = sphere(g, -0.25, base + 0.85, 0, 0.3, '#58C16A', [1, 0.25, 0.5]);
  l2.rotation.z = -0.6;
  const hy = base + 1.55;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    sphere(g, Math.cos(a) * 0.36, hy + Math.sin(a) * 0.36, 0.05, 0.24, petal, [1, 1, 0.5]);
  }
  sphere(g, 0, hy, 0.12, 0.22, '#FFC23D', [1, 1, 0.7]);
  return g;
}

function makeTulipModel() {
  const g = new THREE.Group();
  cyl(g, 0, 0, 0, 0.6, 0.75, '#2F80ED');
  cyl(g, 0, 0.75, 0, 0.55, 0.05, '#5B4220');
  cyl(g, 0, 0.75, 0, 0.06, 1.5, '#3FA34D');
  const l1 = sphere(g, 0.22, 1.25, 0, 0.18, '#58C16A', [0.7, 2.6, 0.4]);
  l1.rotation.z = -0.35;
  sphere(g, 0, 2.45, 0, 0.42, '#E8473B', [1, 1.25, 1]);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const c = mesh(new THREE.ConeGeometry(0.17, 0.45, 8), mat('#E8473B'));
    c.position.set(Math.cos(a) * 0.24, 2.95, Math.sin(a) * 0.24);
    g.add(c);
  }
  return g;
}

function makePencilModel() {
  const g = new THREE.Group();
  const p = new THREE.Group();
  const body = mesh(new THREE.CylinderGeometry(0.28, 0.28, 3, 6), mat('#FFC23D'));
  body.position.y = 1.5;
  p.add(body);
  const wood = mesh(new THREE.ConeGeometry(0.28, 0.65, 6), mat('#F2D2A0'));
  wood.position.y = 3.32;
  p.add(wood);
  const lead = mesh(new THREE.ConeGeometry(0.1, 0.24, 12), mat('#1B1F3B'));
  lead.position.y = 3.56;
  p.add(lead);
  const band = mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.25, 16), mat('#C7CDD9', { metalness: 0.5 }));
  band.position.y = -0.12;
  p.add(band);
  const er = mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.4, 16), mat('#F06BA8'));
  er.position.y = -0.44;
  p.add(er);
  p.rotation.z = -1.05;
  p.position.set(-1.1, 0.8, 0);
  g.add(p);
  return g;
}

function makeBookModel() {
  const g = new THREE.Group();
  box(g, -1.2, 0, -0.9, 2.4, 0.12, 1.8, '#2F80ED');
  box(g, -1.1, 0.12, -0.85, 2.2, 0.42, 1.7, '#FFFFFF');
  box(g, -1.2, 0.54, -0.9, 2.4, 0.12, 1.8, '#2F80ED');
  box(g, -1.26, 0, -0.9, 0.12, 0.66, 1.8, '#1F5FB8');
  box(g, -0.6, 0.665, -0.35, 1.4, 0.02, 0.7, '#FFC23D');
  const b2 = new THREE.Group();
  box(b2, -1.0, 0, -0.75, 2.0, 0.1, 1.5, '#E8473B');
  box(b2, -0.92, 0.1, -0.7, 1.84, 0.34, 1.4, '#FFFFFF');
  box(b2, -1.0, 0.44, -0.75, 2.0, 0.1, 1.5, '#E8473B');
  b2.position.set(0.1, 0.68, 0);
  b2.rotation.y = 0.35;
  g.add(b2);
  return g;
}

function makeSchoolModel() {
  const g = new THREE.Group();
  const st = new StudBatch();
  brick(g, st, -2, 0, -1.4, 4, 0.25, 2.8, '#C9CFDB', { step: 2 });
  box(g, -1.7, 0.25, -1.1, 3.4, 1.7, 2.2, '#E4572E');
  prism(g, -1.85, 1.95, -1.25, 3.7, 1.2, 2.5, '#2F6FD6');
  for (let i = 0; i < 3; i++) box(g, -1.4 + i * 1.05, 1.0, 1.1, 0.6, 0.55, 0.06, '#9ED8FF');
  box(g, -0.3, 0.25, 1.1, 0.6, 0.75, 0.07, '#7A3B1E');
  const clock = mesh(geoCyl(), mat('#FFFFFF'));
  clock.scale.set(0.7, 0.08, 0.7);
  clock.rotation.x = Math.PI / 2;
  clock.position.set(0, 2.5, 1.26);
  g.add(clock);
  box(g, -0.03, 2.5, 1.32, 0.06, 0.28, 0.03, '#1B1F3B');
  cyl(g, 1.7, 0.25, 1.2, 0.04, 2.6, '#D9DEE8');
  box(g, 1.72, 2.25, 1.18, 0.8, 0.5, 0.04, '#E30A17');
  st.build(g);
  return g;
}

function makeCatModel() {
  const g = new THREE.Group();
  const c = '#FF9F45';
  box(g, -0.9, 0.55, -0.45, 1.6, 0.85, 0.9, c);
  [[-0.8, -0.4], [-0.8, 0.15], [0.35, -0.4], [0.35, 0.15]].forEach(([x, z]) => box(g, x, 0, z, 0.28, 0.6, 0.28, c));
  box(g, 0.45, 0.95, -0.52, 1.0, 0.9, 1.04, c);
  [-0.3, 0.3].forEach((z) => {
    const e = mesh(new THREE.ConeGeometry(0.2, 0.42, 4), mat(c));
    e.position.set(0.95, 2.05, z);
    g.add(e);
  });
  box(g, 1.44, 1.45, -0.3, 0.04, 0.16, 0.12, '#1B1F3B');
  box(g, 1.44, 1.45, 0.18, 0.04, 0.16, 0.12, '#1B1F3B');
  box(g, 1.44, 1.22, -0.07, 0.05, 0.1, 0.14, '#F06BA8');
  box(g, 0.75, 0.6, 0.46, 0.12, 0.12, 0.02, '#FFFFFF');
  const tail = mesh(new THREE.CylinderGeometry(0.1, 0.12, 1.1, 10), mat(c));
  tail.position.set(-1.05, 1.5, 0);
  tail.rotation.z = 0.5;
  g.add(tail);
  for (let i = 0; i < 3; i++) box(g, -0.6 + i * 0.4, 1.38, -0.46, 0.15, 0.03, 0.92, '#E07C22');
  return g;
}

function makeFishModel() {
  const g = new THREE.Group();
  sphere(g, 0, 1.2, 0, 1, '#FF9F45', [1.3, 0.8, 0.5]);
  const tail = mesh(new THREE.ConeGeometry(0.7, 0.9, 3), mat('#FF6F61'));
  tail.rotation.z = Math.PI / 2;
  tail.position.set(-1.55, 1.2, 0);
  g.add(tail);
  [-0.35, 0.25].forEach((x) => {
    const band = mesh(new THREE.TorusGeometry(0.62, 0.06, 8, 24), mat('#FFFFFF'));
    band.rotation.y = Math.PI / 2;
    band.position.set(x, 1.2, 0);
    band.scale.set(1, 1.15, 0.7);
    g.add(band);
  });
  sphere(g, 0.85, 1.4, 0.36, 0.17, '#FFFFFF');
  sphere(g, 0.9, 1.4, 0.48, 0.08, '#1B1F3B');
  const fin = mesh(new THREE.ConeGeometry(0.35, 0.6, 3), mat('#FF6F61'));
  fin.position.set(0, 2.0, 0);
  g.add(fin);
  for (let i = 0; i < 3; i++) sphere(g, 1.6 + i * 0.25, 1.9 + i * 0.4, 0, 0.1 + i * 0.03, '#BFE7FF');
  return g;
}

function makeSunModel() {
  const g = new THREE.Group();
  sphere(g, 0, 1.6, 0, 1, '#FFC23D', undefined, { emissive: '#FFB000', emissiveIntensity: 0.25 });
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const r = mesh(new THREE.ConeGeometry(0.2, 0.55, 8), mat('#FF9F1C'));
    r.position.set(Math.cos(a) * 1.4, 1.6 + Math.sin(a) * 1.4, 0);
    r.rotation.z = a - Math.PI / 2;
    g.add(r);
  }
  sphere(g, -0.35, 1.85, 0.9, 0.1, '#1B1F3B');
  sphere(g, 0.35, 1.85, 0.9, 0.1, '#1B1F3B');
  const smile = mesh(new THREE.TorusGeometry(0.35, 0.05, 8, 20, Math.PI), mat('#1B1F3B'));
  smile.rotation.z = Math.PI;
  smile.position.set(0, 1.5, 0.93);
  g.add(smile);
  return g;
}

function makeMoonModel() {
  const g = new THREE.Group();
  const s = new THREE.Shape();
  const a1 = Math.atan2(-0.846, -0.533);
  s.absarc(0, 0, 1, a1, -a1, false);
  const b = Math.atan2(0.846, -0.533 + 0.45);
  s.absarc(-0.45, 0, 0.85, b, -b, true);
  const m = extruded(s, 0.45, '#FFE07A', { emissive: '#FFC23D', emissiveIntensity: 0.15 });
  m.position.set(0.1, 1.4, -0.2);
  m.scale.setScalar(1.3);
  g.add(m);
  [[-1.2, 2.4], [-0.9, 0.6], [1.4, 2.6]].forEach(([x, y]) => {
    const st = extruded(starShape(0.22, 0.1), 0.08, '#FFC23D');
    st.position.set(x, y, 0);
    g.add(st);
  });
  return g;
}

function makeStarModel() {
  const g = new THREE.Group();
  const m = extruded(starShape(1.3, 0.6), 0.45, '#FFC23D', { emissive: '#FFB000', emissiveIntensity: 0.2 });
  m.position.set(0, 1.4, -0.2);
  g.add(m);
  sphere(g, -0.3, 1.55, 0.42, 0.09, '#1B1F3B');
  sphere(g, 0.3, 1.55, 0.42, 0.09, '#1B1F3B');
  const smile = mesh(new THREE.TorusGeometry(0.2, 0.04, 8, 16, Math.PI), mat('#1B1F3B'));
  smile.rotation.z = Math.PI;
  smile.position.set(0, 1.32, 0.42);
  g.add(smile);
  return g;
}

function makeTableModel() {
  const g = new THREE.Group();
  const st = new StudBatch();
  brick(g, st, -1.5, 1.3, -1.0, 3, 0.25, 2, '#B8682F');
  [[-1.35, -0.85], [1.05, -0.85], [-1.35, 0.55], [1.05, 0.55]].forEach(([x, z]) => box(g, x, 0, z, 0.3, 1.3, 0.3, '#8B5A2B'));
  st.build(g);
  return g;
}

function makeShipModel() {
  const g = new THREE.Group();
  const water = mesh(new THREE.BoxGeometry(5, 0.2, 3), mat('#3FA9F5', { roughness: 0.15 }));
  water.position.y = 0.1;
  g.add(water);
  const b = new THREE.Group();
  brick(b, null, -1.8, 0, -0.75, 3.6, 0.8, 1.5, '#FFFFFF');
  box(b, -1.8, 0, -0.77, 3.6, 0.3, 1.54, '#E8473B');
  brick(b, null, -0.8, 0.8, -0.55, 1.8, 0.9, 1.1, '#2F80ED');
  for (let i = 0; i < 3; i++) box(b, -0.6 + i * 0.55, 1.15, 0.56, 0.3, 0.3, 0.02, '#9ED8FF');
  cyl(b, 0.6, 1.7, 0, 0.22, 0.8, '#FFC23D');
  box(b, 0.38, 2.4, -0.22, 0.44, 0.15, 0.44, '#1B1F3B');
  b.position.y = 0.2;
  g.add(b);
  return g;
}

function makePlaneModel() {
  const g = new THREE.Group();
  const p = new THREE.Group();
  const body = mesh(new THREE.CylinderGeometry(0.45, 0.32, 3.2, 20), mat('#FFFFFF'));
  body.rotation.z = Math.PI / 2;
  p.add(body);
  const nose = mesh(new THREE.SphereGeometry(0.45, 18, 12), mat('#E8473B'));
  nose.position.x = -1.6;
  p.add(nose);
  box(p, -0.45, -0.08, -2.0, 0.9, 0.12, 4.0, '#E8473B');
  box(p, 1.3, 0.0, -0.9, 0.5, 0.1, 1.8, '#E8473B');
  box(p, 1.35, 0.1, -0.05, 0.45, 0.9, 0.1, '#2F80ED');
  for (let i = 0; i < 4; i++) box(p, -0.9 + i * 0.5, 0.1, 0.42, 0.22, 0.2, 0.06, '#9ED8FF');
  box(p, -2.08, -0.6, -0.06, 0.06, 1.2, 0.12, '#1B1F3B');
  p.position.y = 1.5;
  p.rotation.y = -0.3;
  g.add(p);
  return g;
}

function makeFamilyModel(parent: 'anne' | 'baba') {
  const g = new THREE.Group();
  const adult: Avatar =
    parent === 'anne'
      ? { skin: '#F6D2B4', hair: 'uzun', hairColor: '#5B3A1E', shirt: '#F06BA8', pants: '#2F80ED', outfit: 'gunluk', car: 'mini', hat: 'yok', accessory: 'yok' }
      : { skin: '#F6D2B4', hair: 'kisa', hairColor: '#1D2B4F', shirt: '#2F80ED', pants: '#1D2B4F', outfit: 'gunluk', car: 'mini', hat: 'yok', accessory: 'yok' };
  const kid: Avatar = { skin: '#F6D2B4', hair: 'kisa', hairColor: '#5B3A1E', shirt: '#FFC23D', pants: '#2DBE9B', outfit: 'gunluk', car: 'mini', hat: 'yok', accessory: 'yok' };
  const a = makeMinifig(adult);
  a.position.x = -0.65;
  a.scale.setScalar(1.08);
  g.add(a);
  const k = makeMinifig(kid);
  k.position.set(0.85, 0, 0.3);
  k.scale.setScalar(0.72);
  g.add(k);
  sphere(g, 0.15, 1.75, 0.3, 0.16, '#E8473B');
  return g;
}

const MEANINGS: Record<string, () => any> = {
  ANNE: () => makeFamilyModel('anne'),
  BABA: () => makeFamilyModel('baba'),
  ARABA: () => makeCar('mini'),
  EV: makeHouseModel,
  AĞAÇ: makeTreeModel,
  TOP: makeBallModel,
  ELMA: makeAppleModel,
  KALE: makeCastleModel,
  ÇİÇEK: () => makeFlowerModel(true),
  LALE: makeTulipModel,
  KALEM: makePencilModel,
  KİTAP: makeBookModel,
  OKUL: makeSchoolModel,
  KEDİ: makeCatModel,
  BALIK: makeFishModel,
  GÜNEŞ: makeSunModel,
  AY: makeMoonModel,
  YILDIZ: makeStarModel,
  MASA: makeTableModel,
  GEMİ: makeShipModel,
  UÇAK: makePlaneModel,
};

/* ---------- Kelime Parkı: şehirde kazanılan nesneler ---------- */
function makeFlowerBed() {
  const g = new THREE.Group();
  const st = new StudBatch();
  brick(g, st, -1.2, 0, -1.2, 2.4, 0.25, 2.4, '#3FA34D');
  const f1 = makeFlowerModel(false, '#F06BA8');
  f1.position.set(-0.55, 0.25, -0.4);
  g.add(f1);
  const f2 = makeFlowerModel(false, '#FFC23D');
  f2.position.set(0.6, 0.25, 0.1);
  g.add(f2);
  const f3 = makeFlowerModel(false, '#8A6CFF');
  f3.position.set(-0.3, 0.25, 0.7);
  f3.scale.setScalar(0.85);
  g.add(f3);
  st.build(g);
  return g;
}

interface CityObjectDef {
  id: string;
  name: string;
  words: string[];
  phrase: string;
  build: () => any;
  x: number;
  z: number;
  rot: number;
  scale: number;
}

const CITY_OBJECTS: CityObjectDef[] = [
  { id: 'araba', name: 'Araba', words: ['ARABA'], phrase: 'yeni bir araba', build: () => makeCar('jip'), x: 9.4, z: -3.0, rot: Math.PI, scale: 0.7 },
  { id: 'ev', name: 'Ev', words: ['EV'], phrase: 'yeni bir ev', build: makeHouseModel, x: -6.6, z: 17.2, rot: 0, scale: 1.15 },
  { id: 'agac', name: 'Ağaç', words: ['AĞAÇ'], phrase: 'yeni bir ağaç', build: makeTreeModel, x: -3.6, z: 20.4, rot: 0, scale: 1.0 },
  { id: 'kale', name: 'Kale', words: ['KALE'], phrase: 'kocaman bir kale', build: makeCastleModel, x: 6.9, z: 17.4, rot: 0, scale: 0.95 },
  { id: 'cicek', name: 'Çiçekler', words: ['ÇİÇEK', 'LALE'], phrase: 'rengârenk çiçekler', build: makeFlowerBed, x: 3.5, z: 14.4, rot: 0, scale: 1.0 },
  { id: 'top', name: 'Top', words: ['TOP'], phrase: 'yeni bir top', build: makeBallModel, x: 3.5, z: 20.4, rot: 0, scale: 0.6 },
];

function objectForWord(text: string): CityObjectDef | null {
  const k = normalize(text);
  return CITY_OBJECTS.find((o) => o.words.includes(k)) || null;
}

/* ---------- Görsel bileşenleri ---------- */
function useCustomWordImage(itemId: string, version: number): string | null | undefined {
  const [url, setUrl] = useState<string | null | undefined>(version ? recMem['wimg-' + itemId] : null);
  useEffect(() => {
    let off = false;
    if (!version) {
      setUrl(null);
      return;
    }
    if (!recMem['wimg-' + itemId]) setUrl(undefined);
    RecStore.get('wimg-' + itemId).then((u) => !off && setUrl(u));
    return () => { off = true; };
  }, [itemId, version]);
  return url;
}

function MeaningImage({ item, state, className }: { item: Item; state: AppState; className?: string }) {
  const v = state.wordImages[item.id] || 0;
  const custom = useCustomWordImage(item.id, v);
  const key = normalize(item.text);
  const build = MEANINGS[key];
  if (v && custom === undefined) return <div className={'meaning-img ' + (className || '')}><span className="thumb-wait" /></div>;
  if (custom) {
    return (
      <div className={'meaning-img photo ' + (className || '')}>
        <img src={custom} alt={item.text} />
      </div>
    );
  }
  if (build && HAS_WEBGL) {
    return (
      <div className={'meaning-img ' + (className || '')}>
        <LazyThumb k={'mean:' + key} make={() => Thumbs.render('mean:' + key, build, 'obj', 384)} />
      </div>
    );
  }
  return (
    <div className={'meaning-img wordcard ' + (className || '')} aria-label={item.text}>
      <span className="wc-word">{trUpper(item.text)}</span>
      <span className="wc-syl">{itemSylls(item).join(' · ')}</span>
    </div>
  );
}

function meaningSource(item: Item, state: AppState): 'ozel' | 'hazir' | 'kart' {
  if (state.wordImages[item.id]) return 'ozel';
  return MEANINGS[normalize(item.text)] ? 'hazir' : 'kart';
}

/* ---------- Karaoke kelime gösterimi ---------- */
type KStatus = 'idle' | 'active' | 'done';
type KMode = 'dinle' | 'oku' | 'dokun';

function KaraokeWord({
  text,
  sylls,
  status,
  whole,
  caseMode,
  onTap,
}: {
  text: string;
  sylls: string[];
  status: KStatus[];
  whole: boolean;
  caseMode: 'upper' | 'lower' | 'both';
  onTap?: (i: number) => void;
}) {
  const groups = groupSylls(text, sylls) || [sylls];
  const letters = sylls.join('').length;
  const lines: Array<(s: string) => string> = caseMode === 'both' ? [trUpper, trLower] : [caseMode === 'lower' ? trLower : trUpper];
  return (
    <div className={'kw' + (letters > 7 ? ' long' : '') + (caseMode === 'both' ? ' two' : '') + (whole ? ' whole' : '') + (onTap ? ' tappable' : '')}>
      {lines.map((conv, li) => {
        let idx = -1;
        return (
          <div className="kw-line" key={li}>
            {groups.map((g, wi) => (
              <span className="kw-word" key={wi}>
                {g.map((s) => {
                  idx++;
                  const i = idx;
                  const st = status[i] || 'idle';
                  const props: any = onTap
                    ? { role: 'button', tabIndex: 0, onClick: () => onTap(i), onKeyDown: (e: any) => (e.key === 'Enter' || e.key === ' ') && onTap(i), 'aria-label': s + ' hecesini dinle' }
                    : {};
                  return (
                    <span key={i} className={'kw-syl ' + st} {...props}>
                      {conv(s)}
                    </span>
                  );
                })}
              </span>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function ModeIcon({ m }: { m: KMode }) {
  if (m === 'dinle')
    return (
      <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
        <path d="M4 14v-2a8 8 0 0 1 16 0v2" fill="none" stroke="currentColor" strokeWidth="2.4" />
        <rect x="3" y="13" width="5" height="8" rx="2" fill="currentColor" />
        <rect x="16" y="13" width="5" height="8" rx="2" fill="currentColor" />
      </svg>
    );
  if (m === 'oku')
    return (
      <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
        <rect x="8" y="2" width="8" height="13" rx="4" fill="currentColor" />
        <path d="M5 11a7 7 0 0 0 14 0M12 18v4M8 22h8" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    );
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
      <path d="M9 11V4.5a1.8 1.8 0 0 1 3.6 0V10l5.2 1.1a2 2 0 0 1 1.6 2.3l-1 5.6A2.4 2.4 0 0 1 16 21h-5.3a2.4 2.4 0 0 1-2-1.1L5 14.2a1.7 1.7 0 0 1 2.6-2.2z" fill="currentColor" />
    </svg>
  );
}

/* ---------- Konuşma tanıma: ara sonuçlarla ---------- */
function listenProgress(onUpdate: (alts: string[]) => void): { promise: Promise<ListenResult>; stop: () => void } {
  if (!SRClass) return { promise: Promise.resolve({ ok: false, error: 'unsupported' } as ListenResult), stop: () => {} };
  let rec: any;
  try {
    rec = new SRClass();
  } catch (e) {
    return { promise: Promise.resolve({ ok: false, error: 'unsupported' } as ListenResult), stop: () => {} };
  }
  rec.lang = 'tr-TR';
  rec.interimResults = true;
  rec.continuous = false;
  rec.maxAlternatives = 5;
  let finals: string[] = [];
  let lastInterim = '';
  let error = '';
  const promise = new Promise<ListenResult>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      const alts = finals.length ? finals : lastInterim ? [lastInterim] : [];
      if (alts.length) resolve({ ok: true, alts });
      else resolve({ ok: false, error: error || 'no-speech' });
    };
    const timer = setTimeout(() => {
      try { rec.stop(); } catch (e) { /* yoksay */ }
      setTimeout(finish, 800);
    }, 9000);
    rec.onresult = (ev: any) => {
      let combined = '';
      const f: string[] = [];
      for (let i = 0; i < ev.results.length; i++) {
        const r = ev.results[i];
        combined += (r[0] && r[0].transcript) || '';
        if (r.isFinal) for (let j = 0; j < r.length; j++) if (r[j] && r[j].transcript) f.push(String(r[j].transcript));
      }
      lastInterim = combined;
      if (f.length) finals = f.concat(combined ? [combined] : []);
      onUpdate([combined].concat(f));
    };
    rec.onerror = (ev: any) => {
      error = (ev && ev.error) || 'error';
    };
    rec.onend = finish;
    try {
      rec.start();
    } catch (e) {
      error = 'start-failed';
      finish();
    }
  });
  return { promise, stop: () => { try { rec.stop(); } catch (e) { /* yoksay */ } } };
}

/** Tanınan metnin baştan kaç heceyi sırayla içerdiği (tahmini). */
function progressK(alts: string[], sylls: string[]): number {
  let best = 0;
  for (const a of alts) {
    const c = normalize(a).replace(/ /g, '');
    let acc = '';
    let k = 0;
    for (const s of sylls) {
      acc += trUpper(s);
      if (c.startsWith(acc)) k++;
      else break;
    }
    best = Math.max(best, k);
  }
  return best;
}

/* ---------- Karaoke Sahnesi oyunu ---------- */
function KaraokeGame({
  state,
  update,
  onHome,
  onCommitSuccess,
  onAttempt,
  enqueue,
  micBlocked,
  setMicBlocked,
  setBreak,
}: {
  state: AppState;
  update: (fn: (s: AppState) => AppState) => void;
  onHome: () => void;
  onCommitSuccess: (itemId: string, verifier: Verifier, retries: number, noStar?: boolean) => boolean;
  onAttempt: (itemId: string) => void;
  enqueue: (c: Celebration) => void;
  micBlocked: string;
  setMicBlocked: (m: string) => void;
  setBreak: (b: boolean) => void;
}) {
  const s = state.settings;
  const name = s.childName;
  const pick = useMessagePicker();
  const pool = useMemo(() => state.items.filter((i) => i.type === 'kelime' && i.approved && i.active), [state.items]);
  const recent = useRef<string[]>([]);
  const [item, setItem] = useState<Item | null>(null);
  const [mode, setMode] = useState<KMode>('dinle');
  const [status, setStatus] = useState<KStatus[]>([]);
  const [whole, setWhole] = useState(false);
  const [active, setActive] = useState(0);
  const [phase, setPhase] = useState<'play' | 'busy' | 'listening' | 'result'>('play');
  const [pending, setPending] = useState<null | { verifier: Verifier }>(null);
  const [retries, setRetries] = useState(0);
  const [msg, setMsg] = useState('');
  const [heard, setHeard] = useState('');
  const [caseMode, setCaseMode] = useState<'upper' | 'lower' | 'both'>('upper');
  const [onBreak, setOnBreak] = useState(false);
  const listener = useRef<{ stop: () => void } | null>(null);
  const prog = useRef(0);
  const pendRef = useRef<any>(null);
  pendRef.current = { pending, item, retries, commit: null as any };

  const sylls = item ? itemSylls(item) : [];
  const n = sylls.length;
  const today = todayKey();
  const starToday = item ? state.karaokeLog[item.id] === today : false;
  const micAvailable = s.checkMode !== 'parent' && !!SRClass && !micBlocked;
  const noVoice = !synthSupported ? 'Bu tarayıcı seslendirmeyi desteklemiyor.' : !Speech.voice ? 'Türkçe ses bulunamadı; heceler yanlış okunabilir. Ebeveyn: Ses ve okuma sekmesine bakın.' : '';

  const reset = (m: KMode, it: Item | null = item) => {
    const k = it ? itemSylls(it).length : 0;
    setStatus(Array.from({ length: k }, (_, i) => (m === 'oku' && i === 0 ? 'active' : 'idle')));
    setWhole(false);
    setActive(0);
    prog.current = 0;
    setHeard('');
  };

  const modeMsg = (m: KMode) =>
    m === 'dinle' ? 'Dinle ve heceleri takip et.' : m === 'oku' ? 'Sıra sende! Heceleri sırayla oku.' : 'Bir heceye dokun, dinle.';

  const commitPending = (): boolean => {
    const p = pendRef.current;
    if (!p.pending || !p.item) return false;
    const it: Item = p.item;
    const noStar = stateLog().karaokeLog[it.id] === todayKey();
    const cel = onCommitSuccess(it.id, p.pending.verifier, p.retries, noStar);
    const obj = objectForWord(it.text);
    const earnObj = obj && !stateLog().cityObjects[obj.id];
    update((st) => ({
      ...st,
      karaokeLog: noStar ? st.karaokeLog : { ...st.karaokeLog, [it.id]: todayKey() },
      cityObjects: earnObj ? { ...st.cityObjects, [obj!.id]: { earnedAt: new Date().toISOString(), seen: false, word: it.text } } : st.cityObjects,
    }));
    if (earnObj) setTimeout(() => enqueue({ kind: 'object', objId: obj!.id }), 300);
    setPending(null);
    return cel || !!earnObj;
  };
  const stRef = useRef(state);
  stRef.current = state;
  const stateLog = () => stRef.current;

  const newWord = (m: KMode = mode, auto = true) => {
    listener.current?.stop();
    Speech.stop();
    const it = pickNext(pool, recent.current);
    if (!it) return;
    recent.current = [...recent.current, it.id].slice(-4);
    setItem(it);
    setRetries(0);
    setPending(null);
    setPhase('play');
    setCaseMode(s.letterCase === 'mixed' ? (Math.random() < 0.5 ? 'upper' : 'lower') : s.letterCase);
    reset(m, it);
    setMsg(modeMsg(m));
    if (auto && m === 'dinle') setTimeout(() => playFollow(it), 350);
  };

  useEffect(() => {
    if (pool.length) newWord(mode, true);
    return () => {
      listener.current?.stop();
      Speech.stop();
      commitPending();
    };
  }, []);

  /* A. Dinle ve Takip Et: renk geçişleri seslendirme olaylarına bağlı */
  const playFollow = async (it: Item | null = item) => {
    if (!it) return;
    const sy = itemSylls(it);
    Speech.stop();
    const my = Speech.seq;
    const alive = () => Speech.seq === my;
    setPhase('busy');
    setStatus(sy.map(() => 'idle'));
    setWhole(false);
    for (let i = 0; i < sy.length; i++) {
      if (!alive()) return;
      await Speech.speak(trLower(sy[i]), {
        keep: true,
        rate: Speech.contentRate,
        onStart: () => alive() && setStatus((p) => p.map((x, j) => (j === i ? 'active' : x))),
      });
      if (!alive()) return;
      setStatus((p) => p.map((x, j) => (j === i ? 'done' : x)));
      await wait(Speech.gap);
    }
    if (!alive()) return;
    setWhole(true);
    const rec = VoiceCfg.recItems.has(it.id) ? await RecStore.get('item-' + it.id) : null;
    if (rec && alive()) await Speech.playClip(rec, true);
    else if (alive()) await Speech.speak(trLower(it.text), { keep: true, rate: Math.min(Speech.contentRate + 0.1, 1) });
    if (!alive()) return;
    setPhase('play');
    setMsg('Şimdi sen oku! İstersen tekrar dinle.');
  };

  /* C. Dokunarak Oku */
  const tapSyllable = async (i: number) => {
    if (phase === 'listening' || phase === 'result') return;
    Speech.stop();
    const my = Speech.seq;
    setWhole(false);
    await Speech.speak(trLower(sylls[i]), {
      keep: true,
      rate: Speech.contentRate,
      onStart: () => Speech.seq === my && setStatus((p) => p.map((x, j) => (j === i ? 'active' : x === 'active' ? 'done' : x))),
    });
    if (Speech.seq === my) setStatus((p) => p.map((x, j) => (j === i ? 'done' : x)));
  };

  const listenWhole = async () => {
    if (!item) return;
    Speech.stop();
    const my = Speech.seq;
    setWhole(true);
    const rec = VoiceCfg.recItems.has(item.id) ? await RecStore.get('item-' + item.id) : null;
    if (rec) await Speech.playClip(rec, true);
    else await Speech.speak(trLower(item.text), { keep: true, rate: Math.min(Speech.contentRate + 0.1, 1) });
    if (Speech.seq === my && phase !== 'result') setWhole(false);
  };

  /* Başarı: görsel açılır, ödül sonraki kelimeye geçerken kaydedilir */
  const success = (verifier: Verifier) => {
    if (!item) return;
    listener.current?.stop();
    setStatus(sylls.map(() => 'done'));
    setWhole(true);
    setPhase('result');
    setPending({ verifier });
    Sfx.success();
    const m = pick('karaoke', name);
    setMsg(starToday ? m + ' Bugün bu kelimeden yıldızını aldın; tekrar okumak yine harika!' : m);
    speakPraise(m);
  };

  /* B. Ben Okuyorum: mikrofon */
  const startMic = async () => {
    if (!item || phase === 'listening') return;
    Speech.stop();
    setPhase('listening');
    setMsg('Dinliyorum… Heceleri sırayla oku.');
    setHeard('');
    await wait(150);
    const l = listenProgress((alts) => {
      const k = progressK(alts, sylls);
      if (k > prog.current) {
        prog.current = k;
        setActive(Math.min(k, n - 1));
        setStatus(sylls.map((_, i) => (i < k ? 'done' : i === k ? 'active' : 'idle')));
      }
      if (alts[0]) setHeard('Mikrofonun duyduğu (tahmini): ' + alts[0]);
    });
    listener.current = l;
    const res = await l.promise;
    listener.current = null;
    if (!res.ok) {
      const hard = ['not-allowed', 'service-not-allowed', 'audio-capture', 'unsupported'].includes(res.error);
      if (hard) setMicBlocked(micErrorText(res.error));
      setPhase('play');
      const m = pick(res.error === 'no-speech' ? 'unclear' : 'retry', name);
      setMsg(hard ? 'Mikrofon kullanılamıyor. Ebeveyn, okumayı "Sonraki Hece" ile takip edebilir.' : m);
      if (!hard) Speech.speak(m);
      return;
    }
    const v = evaluate(item.text, res.alts);
    if (v === 'basari' || progressK(res.alts, sylls) >= n) {
      success('mic');
    } else {
      onAttempt(item.id);
      setRetries((r) => r + 1);
      setPhase('play');
      const m = pick(v === 'belirsiz' ? 'unclear' : 'retry', name);
      setMsg(m);
      Speech.speak(m);
    }
  };

  /* Ebeveyn düğmeleri */
  const parentCorrect = () => {
    if (!item) return;
    if (phase === 'result' && pending) return setPending({ verifier: 'parent' });
    Speech.stop();
    success('parent');
  };
  const parentRetry = () => {
    if (!item) return;
    listener.current?.stop();
    Speech.stop();
    if (phase === 'result') setPending(null);
    onAttempt(item.id);
    setRetries((r) => r + 1);
    setPhase('play');
    reset(mode);
    const m = pick('retry', name);
    setMsg(m);
    Speech.speak(m);
  };
  const parentNextSyl = () => {
    if (!item || phase === 'result') return;
    if (mode !== 'oku') {
      setMode('oku');
      reset('oku');
      setMsg(modeMsg('oku'));
      return;
    }
    const k = Math.min(active + 1, n);
    setActive(Math.min(k, n - 1));
    setStatus(sylls.map((_, i) => (i < k ? 'done' : i === k ? 'active' : 'idle')));
    if (k >= n) setMsg('Bütün heceler okundu. Ebeveyn: doğru okuduysa "Doğru Okudu"ya dokunun.');
  };
  const skip = () => {
    setPending(null);
    newWord(mode, true);
  };
  const next = () => {
    const cel = commitPending();
    newWord(mode, !cel);
  };

  const switchMode = (m: KMode) => {
    if (phase === 'listening' || phase === 'result') return;
    Speech.stop();
    setMode(m);
    reset(m);
    setPhase('play');
    setMsg(modeMsg(m));
    if (m === 'dinle') setTimeout(() => playFollow(), 120);
  };

  const shownStars = state.totalStars + (pending && !starToday ? 1 + (retries > 0 ? 1 : 0) : 0);
  const header = (
    <header className="topbar">
      <button className="back-btn" onClick={onHome} aria-label="Haritaya dön">←</button>
      <span className="game-title">Karaoke Sahnesi</span>
      <HudStars stars={shownStars} />
    </header>
  );

  if (!pool.length) {
    return (
      <main className="screen game-screen">
        {header}
        <GameEmpty a={state.city.avatar} title="Sahnede henüz kelime yok" text="Ebeveyn panelinden kelime ekleyip onaylayınca burada hece hece okuyabilirsin." onHome={onHome} />
      </main>
    );
  }
  if (!item) return null;

  return (
    <main className="screen game-screen karaoke-screen">
      {header}
      {phase !== 'result' && (
        <nav className="k-modes" aria-label="Okuma modu">
          {([['dinle', 'Dinle ve takip et'], ['oku', 'Ben okuyorum'], ['dokun', 'Dokunarak oku']] as Array<[KMode, string]>).map(([m, l]) => (
            <button key={m} className={'k-mode' + (mode === m ? ' on' : '')} onClick={() => switchMode(m)} disabled={phase === 'listening'} aria-pressed={mode === m}>
              <ModeIcon m={m} />
              <span>{l}</span>
            </button>
          ))}
          <button className="k-break" onClick={() => { Speech.stop(); setOnBreak(true); setBreak(true); }}>Mola ver</button>
        </nav>
      )}

      <section className={'k-stage' + (phase === 'result' ? ' result' : '')}>
        <div className="k-card">
          <KaraokeWord
            text={item.text}
            sylls={sylls}
            status={status}
            whole={whole}
            caseMode={caseMode}
            onTap={mode === 'dokun' && phase !== 'result' ? tapSyllable : undefined}
          />
          {phase === 'result' && <MeaningImage item={item} state={state} className="reveal" />}
        </div>
        <div className="k-side">
          <div className="prompt-row">
            <PlayerPortrait a={state.city.avatar} size={60} />
            <p className="bubble" aria-live="polite">{msg}</p>
          </div>
          {heard && <p className="heard">{heard}</p>}
          {noVoice && phase !== 'result' && <p className="notice">{noVoice}</p>}
          {phase === 'result' ? (
            <div className="kid-actions">
              <button className="game-btn soft" onClick={listenWhole}>Kelimeyi dinle</button>
              <button className="game-btn giant" onClick={next}>SONRAKİ KELİME</button>
            </div>
          ) : mode === 'dinle' ? (
            <div className="kid-actions">
              <button className="game-btn big-btn" onClick={() => playFollow()} disabled={phase === 'busy'}>{phase === 'busy' ? 'Dinleniyor…' : 'Tekrar dinle'}</button>
              <button className="game-btn soft" onClick={() => switchMode('oku')} disabled={phase === 'busy'}>Şimdi ben okuyorum</button>
            </div>
          ) : mode === 'oku' ? (
            <div className="kid-actions">
              {micAvailable ? (
                <button className={'btn big mic' + (phase === 'listening' ? ' listening' : '')} onClick={phase === 'listening' ? () => listener.current?.stop() : startMic}>
                  {phase === 'listening' ? 'Bitti' : 'Mikrofonla oku'}
                </button>
              ) : (
                <p className="k-note">{micBlocked || (s.checkMode === 'parent' ? 'Ebeveyn, okumayı aşağıdaki düğmelerle takip ediyor.' : 'Bu cihazda Türkçe konuşma tanıma yok. Ebeveyn, okumayı aşağıdaki düğmelerle takip ediyor.')}</p>
              )}
            </div>
          ) : (
            <div className="kid-actions">
              <button className="game-btn soft" onClick={listenWhole}>Bütün kelimeyi dinle</button>
            </div>
          )}
          {mode === 'oku' && micAvailable && phase !== 'result' && (
            <p className="k-note small">Kısa heceleri mikrofon karıştırabilir. Son karar ebeveynin.</p>
          )}
        </div>
      </section>

      <footer className="parent-strip">
        <span className="parent-label">Ebeveyn</span>
        <button className="pbtn ok" onClick={parentCorrect} disabled={phase === 'listening'}>
          {phase === 'result' && pending && pending.verifier === 'parent' ? '✓ Onaylandı' : 'Doğru Okudu'}
        </button>
        <button className="pbtn again" onClick={parentRetry}>Tekrar Denesin</button>
        <button className="pbtn" onClick={parentNextSyl} disabled={phase === 'result' || phase === 'listening'}>Sonraki Hece</button>
        <button className="pbtn skip" onClick={skip}>Atla</button>
      </footer>

      {onBreak && (
        <div className="modal-back" role="dialog" aria-modal="true" aria-label="Mola">
          <div className="modal celebrate-modal">
            <PlayerPortrait a={state.city.avatar} size={96} />
            <h2>Mola zamanı!</h2>
            <p>Biraz dinlen, su iç, gerin. Hazır olunca devam ederiz.</p>
            <button className="btn big primary" onClick={() => { setOnBreak(false); setBreak(false); }}>Devam et</button>
          </div>
        </div>
      )}
    </main>
  );
}

/* ---------- Şehre yeni nesne kutlaması ---------- */
function ObjectModal({ objId, onClose }: { objId: string; onClose: () => void }) {
  const def = CITY_OBJECTS.find((o) => o.id === objId);
  if (!def) return null;
  return (
    <div className="modal-back" role="dialog" aria-modal="true" aria-label="Şehre yeni nesne">
      <div className="modal celebrate-modal">
        <h2>Şehrine yeni bir parça!</h2>
        <div className="meaning-img reveal">
          {HAS_WEBGL ? <LazyThumb k={'cobj:' + def.id} make={() => Thumbs.render('cobj:' + def.id, def.build, 'obj', 320)} /> : <span className="wc-word">{def.name}</span>}
        </div>
        <p><b>{def.name}</b> artık Selim City'de, {def.id === 'araba' ? "Kelime Garajı'nın yanında" : "Kelime Parkı'nda"}.</p>
        <button className="btn big primary" onClick={onClose}>Harika!</button>
      </div>
    </div>
  );
}

/* ---------- Ebeveyn: Hece ve görsel ---------- */
function WordAssetRow({ it, state, update }: { it: Item; state: AppState; update: (fn: (s: AppState) => AppState) => void }) {
  const [edit, setEdit] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const sy = itemSylls(it);
  const manual = !!(it.syllables && it.syllables.length && groupSylls(it.text, it.syllables));
  const src = meaningSource(it, state);
  const patch = (p: Partial<Item>) => update((s) => ({ ...s, items: s.items.map((x) => (x.id === it.id ? { ...x, ...p } : x)) }));

  const saveSyl = () => {
    const r = parseSyllableInput(edit || '', it.text);
    if (!r.ok) return setErr(r.error);
    const auto = autoSylls(it.text);
    patch({ syllables: r.sylls.join('|') === auto.join('|') ? undefined : r.sylls });
    setEdit(null);
    setErr('');
  };

  const onFile = async (e: any) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(f.type)) return setErr('Yalnızca PNG, JPG veya WebP yükleyebilirsiniz.');
    if (f.size > 15 * 1024 * 1024) return setErr('Dosya çok büyük (en fazla 15 MB).');
    setErr('');
    setBusy(true);
    try {
      const url = await processPhoto(f);
      const r = await RecStore.set('wimg-' + it.id, url);
      if (!r.local && !r.cloud) throw new Error('save');
      update((s) => ({ ...s, wordImages: { ...s.wordImages, [it.id]: Date.now() } }));
    } catch (er) {
      setErr('Görsel kaydedilemedi. Başka bir dosya deneyin.');
    }
    setBusy(false);
  };

  const removeImg = () => {
    RecStore.del('wimg-' + it.id);
    update((s) => {
      const w = { ...s.wordImages };
      delete w[it.id];
      return { ...s, wordImages: w };
    });
  };

  return (
    <div className="wa-row">
      <div className="wa-thumb"><MeaningImage item={it} state={state} className="mini" /></div>
      <div className="wa-main">
        <b className="wa-word">{it.text}</b>
        {edit === null ? (
          <span className="wa-syl">
            {sy.join(' + ')} <span className={'pill' + (manual ? ' warn' : '')}>{manual ? 'Elle düzeltildi' : 'Otomatik'}</span>
          </span>
        ) : (
          <span className="row gap wrap">
            <input value={edit} onChange={(e) => setEdit(e.target.value)} aria-label="Heceleme" placeholder="ör. AN-NE" />
            <button className="btn small primary" onClick={saveSyl}>Kaydet</button>
            <button className="btn small ghost" onClick={() => { setEdit(null); setErr(''); }}>Vazgeç</button>
          </span>
        )}
        <span className="muted small">Görsel: {src === 'ozel' ? 'sizin yüklediğiniz' : src === 'hazir' ? 'hazır blok illüstrasyon' : 'yok, kelime kartı gösterilir'}</span>
        {err && <span className="error-text small">{err}</span>}
        <span className="row gap wrap">
          {edit === null && <button className="btn small ghost" onClick={() => setEdit(sy.join('-'))}>Hecelemeyi düzelt</button>}
          {manual && edit === null && <button className="btn small ghost" onClick={() => patch({ syllables: undefined })}>Otomatiğe dön</button>}
          <label className="btn small ghost file-btn">
            {src === 'ozel' ? 'Görseli değiştir' : 'Görsel yükle'}
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={onFile} disabled={busy} />
          </label>
          {src === 'ozel' && <button className="btn small ghost" onClick={removeImg}>Sil (varsayılana dön)</button>}
          {busy && <span className="muted small">Kaydediliyor…</span>}
        </span>
      </div>
    </div>
  );
}

function WordAssetsPanel({ state, update }: { state: AppState; update: (fn: (s: AppState) => AppState) => void }) {
  const words = state.items.filter((i) => i.type === 'kelime');
  return (
    <section className="panel">
      <div className="card">
        <h3>Heceleme ve kelime görselleri</h3>
        <p className="muted small">
          Kelimeler Türkçe heceleme kurallarına göre otomatik ayrılır. Hatalıysa "Hecelemeyi düzelt" ile heceleri tire ile yazın (ör. AN-NE, iki kelime için EL E-LE); düzeltmeniz kalıcı kaydedilir ve tüm oyunlarda kullanılır.
        </p>
        <p className="muted small">
          Karaoke Sahnesi'nde doğru okunan kelimenin anlam görseli açılır. Sizin yüklediğiniz görsel her zaman hazır görselden önce gelir (PNG, JPG veya WebP, en fazla 15 MB). Görseller bu cihazda saklanır ve tam yedeğe dahildir.
        </p>
        <p className="small">
          <b>Hazır görseli olan kelimeler:</b> {Object.keys(MEANINGS).join(', ')}
        </p>
        <p className="small">
          <b>Şehre nesne kazandıran kelimeler:</b> {CITY_OBJECTS.map((o) => o.words.join(' / ') + ' → ' + o.name).join(' · ')}
        </p>
      </div>
      {words.length === 0 ? (
        <p className="muted center">Önce İçerikler sekmesinden kelime ekleyin.</p>
      ) : (
        <div className="item-list">{words.map((it) => <WordAssetRow key={it.id} it={it} state={state} update={update} />)}</div>
      )}
    </section>
  );
}

/* ============================================================
   EBEVEYN PANELİ
   ============================================================ */
function ParentPanel({
  state,
  update,
  onClose,
  syncLabel,
  voices,
}: {
  state: AppState;
  update: (fn: (s: AppState) => AppState) => void;
  onClose: () => void;
  syncLabel: string;
  voices: SpeechSynthesisVoice[];
}) {
  const [tab, setTab] = useState<'icerik' | 'kelime' | 'hediye' | 'ses' | 'ayarlar' | 'ozet' | 'yedek'>('icerik');
  return (
    <main className="screen parent-screen">
      <header className="parent-head">
        <h1>Ebeveyn paneli</h1>
        <button className="btn primary" onClick={onClose}>Çocuk ekranına dön</button>
      </header>
      <nav className="tabs" role="tablist">
        {([
          ['icerik', 'İçerikler'],
          ['kelime', 'Hece ve görsel'],
          ['hediye', 'Hediye ve görevler'],
          ['ses', 'Ses ve okuma'],
          ['ayarlar', 'Ayarlar'],
          ['ozet', 'Özet'],
          ['yedek', 'Yedek'],
        ] as Array<[typeof tab, string]>).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
            {l}
          </button>
        ))}
      </nav>
      <p className="sync-note">{syncLabel}</p>
      {tab === 'icerik' && <ContentManager state={state} update={update} />}
      {tab === 'kelime' && <WordAssetsPanel state={state} update={update} />}
      {tab === 'hediye' && <GiftManager state={state} update={update} />}
      {tab === 'ses' && <VoicePanel state={state} update={update} voices={voices} />}
      {tab === 'ayarlar' && <SettingsPanel state={state} update={update} voices={voices} />}
      {tab === 'ozet' && <SummaryPanel state={state} />}
      {tab === 'yedek' && <BackupPanel state={state} update={update} />}
    </main>
  );
}

function ContentManager({ state, update }: { state: AppState; update: (fn: (s: AppState) => AppState) => void }) {
  const [type, setType] = useState<ContentType>('hece');
  const [input, setInput] = useState('');
  const [approve, setApprove] = useState(true);
  const [report, setReport] = useState<{ added: string[]; skipped: string[]; errors: string[] } | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editErr, setEditErr] = useState('');

  const list = state.items.filter((i) => i.type === type);

  const addItems = (texts: string[], approved: boolean) => {
    const added: string[] = [];
    const skipped: string[] = [];
    const errors: string[] = [];
    const existing = new Set(state.items.filter((i) => i.type === type).map((i) => normalize(i.text)));
    const newItems: Item[] = [];
    texts.forEach((raw) => {
      if (!raw.trim()) return;
      const v = validateContent(type, raw);
      if (!v.ok) {
        errors.push(raw.trim() + ': ' + v.error);
        return;
      }
      const key = normalize(v.text);
      if (existing.has(key)) {
        skipped.push(v.text);
        return;
      }
      existing.add(key);
      added.push(v.text);
      newItems.push({
        id: uid(),
        type,
        text: v.text,
        source: 'okul',
        learnedAt: todayKey(),
        approved,
        active: true,
        attempts: 0,
        successes: 0,
        micSuccesses: 0,
        parentSuccesses: 0,
        needsReview: false,
        lastStudied: null,
      });
    });
    if (newItems.length) update((s) => ({ ...s, items: [...s.items, ...newItems] }));
    setReport({ added, skipped, errors });
  };

  const onAdd = () => {
    const parts = type === 'cumle' ? input.split(/\n/) : input.split(/[,\n;]/);
    addItems(parts, approve);
    setInput('');
  };

  const patch = (id: string, p: Partial<Item>) =>
    update((s) => ({ ...s, items: s.items.map((i) => (i.id === id ? { ...i, ...p } : i)) }));

  const remove = async (it: Item) => {
    if (!(await askConfirm('"' + it.text + '" silinsin mi? Bu içeriğin çalışma geçmişi de silinir.'))) return;
    update((s) => ({ ...s, items: s.items.filter((i) => i.id !== it.id) }));
  };

  const saveEdit = (it: Item) => {
    const v = validateContent(it.type, editText);
    if (!v.ok) return setEditErr(v.error);
    const dup = state.items.some((i) => i.id !== it.id && i.type === it.type && normalize(i.text) === normalize(v.text));
    if (dup) return setEditErr('Bu içerik zaten listede');
    patch(it.id, { text: v.text });
    setEditId(null);
    setEditErr('');
  };

  const placeholder: Record<ContentType, string> = {
    harf: 'Örnek: A, E, L, N, İ, T',
    hece: 'Örnek: AL, EL, LA, LE',
    kelime: 'Örnek: ANNE, LALE, EL ELE',
    cumle: 'Her satıra bir cümle yazın',
  };

  return (
    <section className="panel">
      <div className="seg" role="radiogroup" aria-label="İçerik türü">
        {(['harf', 'hece', 'kelime', 'cumle'] as ContentType[]).map((t) => (
          <button key={t} className={type === t ? 'on' : ''} onClick={() => { setType(t); setReport(null); }}>
            {TYPE_LABEL[t].many} <small>{state.items.filter((i) => i.type === t).length}</small>
          </button>
        ))}
      </div>

      <div className="card">
        <label className="field">
          {TYPE_LABEL[type].many} ekle {type === 'cumle' ? '(satır satır)' : '(virgülle veya satır satır)'}
          <textarea rows={3} value={input} onChange={(e) => setInput(e.target.value)} placeholder={placeholder[type]} />
        </label>
        <label className="check">
          <input type="checkbox" checked={approve} onChange={(e) => setApprove(e.target.checked)} />
          Onaylı olarak ekle (onaysız içerik oyunlarda görünmez)
        </label>
        <div className="row gap wrap">
          <button className="btn primary" onClick={onAdd} disabled={!input.trim()}>Ekle</button>
          {SAMPLE[type].length > 0 && (
            <button className="btn ghost" onClick={() => addItems(SAMPLE[type], true)}>
              Deneme için örnekleri ekle ({SAMPLE[type].join(', ')})
            </button>
          )}
        </div>
        {report && (
          <div className="report" aria-live="polite">
            {report.added.length > 0 && (
              <p className="ok-text">
                Eklendi: {type === 'kelime' ? report.added.map((w) => w + ' (' + autoSylls(w).join('+') + ')').join(', ') : report.added.join(', ')}
              </p>
            )}
            {report.skipped.length > 0 && <p className="muted">Zaten vardı: {report.skipped.join(', ')}</p>}
            {report.errors.map((e) => (
              <p key={e} className="error-text">{e}</p>
            ))}
          </div>
        )}
        {type === 'harf' || type === 'cumle' ? (
          <p className="muted small">
            {TYPE_LABEL[type].many} şimdilik kayıt ve raporlar içindir; Aşama 1 oyunları heceler ve kelimelerle çalışır.
          </p>
        ) : null}
      </div>

      {list.length === 0 ? (
        <p className="muted center">Henüz {TYPE_LABEL[type].one.toLocaleLowerCase('tr-TR')} eklenmedi.</p>
      ) : (
        <div className="item-list">
          {list.map((it) => {
            const st = itemStatus(it);
            return (
              <div key={it.id} className={'item-row' + (it.active ? '' : ' inactive')}>
                <div className="item-main">
                  {editId === it.id ? (
                    <div className="row gap">
                      <input value={editText} onChange={(e) => setEditText(e.target.value)} aria-label="İçeriği düzenle" />
                      <button className="btn small primary" onClick={() => saveEdit(it)}>Kaydet</button>
                      <button className="btn small ghost" onClick={() => { setEditId(null); setEditErr(''); }}>Vazgeç</button>
                    </div>
                  ) : (
                    <span className="item-text">
                      {caseForms(it.text).upper}
                      <span className="item-lower">{caseForms(it.text).lower}</span>
                    </span>
                  )}
                  {editId === it.id && editErr && <p className="error-text small">{editErr}</p>}
                  <span className="item-meta">
                    <span className={'pill st-' + st}>{STATUS_LABEL[st]}</span>
                    <span className="pill">{it.source === 'okul' ? 'Okul' : 'Öneri'}</span>
                    {!it.approved && <span className="pill warn">Onay bekliyor</span>}
                    {!it.active && <span className="pill">Pasif</span>}
                    <span className="meta-text">
                      {it.attempts} deneme · {it.successes} başarı · eklendi {it.learnedAt}
                      {it.lastStudied ? ' · son çalışma ' + it.lastStudied.slice(0, 10) : ''}
                    </span>
                  </span>
                </div>
                <div className="item-actions">
                  <button className="btn small ghost" onClick={() => patch(it.id, { approved: !it.approved })}>
                    {it.approved ? 'Onayı kaldır' : 'Onayla'}
                  </button>
                  <button className="btn small ghost" onClick={() => patch(it.id, { active: !it.active })}>
                    {it.active ? 'Pasifleştir' : 'Etkinleştir'}
                  </button>
                  <button className="btn small ghost" onClick={() => { setEditId(it.id); setEditText(it.text); setEditErr(''); }}>
                    Düzenle
                  </button>
                  <button className="btn small danger" onClick={() => remove(it)}>Sil</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function SettingsPanel({
  state,
  update,
  voices,
}: {
  state: AppState;
  update: (fn: (s: AppState) => AppState) => void;
  voices: SpeechSynthesisVoice[];
}) {
  const s = state.settings;
  const set = (p: Partial<Settings>) => update((st) => ({ ...st, settings: { ...st.settings, ...p } }));
  const trVoices = voices.filter((v) => (v.lang || '').toLowerCase().replace('_', '-').startsWith('tr'));
  const [changingPin, setChangingPin] = useState(false);
  const [pinMsg, setPinMsg] = useState('');

  return (
    <section className="panel">
      <div className="card">
        <label className="field">
          Çocuğun adı
          <input value={s.childName} onChange={(e) => set({ childName: e.target.value })} maxLength={30} />
        </label>
      </div>

      <ProfilePhotoEditor state={state} update={update} />
      <InstallTip />

      <div className="card">
        <h3>Okuma kontrolü</h3>
        {([
          ['hybrid', 'Mikrofon + ebeveyn kontrolü', 'Önerilen. Mikrofon dinler, ebeveyn düğmeleri her zaman görünür ve son karar sizindir.'],
          ['parent', 'Yalnızca ebeveyn kontrolü', 'Mikrofon hiç kullanılmaz.'],
          ['auto', 'Otomatik mikrofon kontrolü', 'Ebeveyn düğmeleri gizli başlar; belirsiz durumda veya istenince açılır.'],
        ] as Array<[CheckMode, string, string]>).map(([k, l, d]) => (
          <label key={k} className="radio">
            <input type="radio" name="mode" checked={s.checkMode === k} onChange={() => set({ checkMode: k })} />
            <span><b>{l}</b><br /><small className="muted">{d}</small></span>
          </label>
        ))}
        <p className="muted small">
          Ses tanıma desteği: {SRClass ? 'bu tarayıcıda var' : 'bu tarayıcıda yok (ebeveyn kontrolü kullanılır)'}.
          Kısa hecelerde (LA, LE, AL, EL) tanıma sık yanılabilir; bu yüzden mikrofon sonucu kesin bir telaffuz değerlendirmesi değildir.
        </p>
        {!SRClass && s.checkMode !== 'parent' && (
          <p className="error-text small">Bu tarayıcıda Türkçe konuşma tanıma yok; oyunlarda ebeveyn düğmeleri kullanılır.</p>
        )}
        <MicPermissionButton />
      </div>

      <div className="card">
        <h3>Seslendirme</h3>
        <p className="muted small">Ses karakteri, okuma tarzı, okuma hızı ve kendi sesinizle kayıtlar "Ses ve okuma" sekmesinde.</p>
      </div>

      <div className="card">
        <h3>Oyun süresi</h3>
        <div className="seg">
          {[3, 5, 7, 10].map((m) => (
            <button key={m} className={s.sessionMinutes === m ? 'on' : ''} onClick={() => set({ sessionMinutes: m })}>{m} dk</button>
          ))}
        </div>
      </div>

      <div className="card">
        <h3>Görünüm ve ses efektleri</h3>
        <label className="check"><input type="checkbox" checked={s.animations} onChange={(e) => set({ animations: e.target.checked })} /> Animasyonlar (çark dönüşü, konfeti)</label>
        <label className="check"><input type="checkbox" checked={s.sounds} onChange={(e) => set({ sounds: e.target.checked })} /> Kısa ses efektleri</label>
      </div>

      <div className="card">
        <h3>Yazılış</h3>
        <p className="muted small">Harf, hece, kelime ve cümlelerin oyunlarda hangi harflerle gösterileceği.</p>
        <div className="seg">
          {(['both', 'upper', 'lower', 'mixed'] as LetterCase[]).map((c) => (
            <button key={c} className={s.letterCase === c ? 'on' : ''} onClick={() => set({ letterCase: c })}>{CASE_LABEL[c]}</button>
          ))}
        </div>
        <p className="muted small">
          Örnek: {s.letterCase === 'mixed' ? 'ANNE veya anne' : s.letterCase === 'upper' ? 'ANNE' : s.letterCase === 'lower' ? 'anne' : 'ANNE ve altında anne'}
        </p>
      </div>

      <div className="card">
        <h3>Ebeveyn PIN'i</h3>
        <p className="muted small">
          PIN yalnızca bu tarayıcıda/hesapta özetlenmiş olarak saklanır. Çocuk ekranını ayırmaya yarayan temel bir korumadır, güçlü bir güvenlik önlemi değildir.
        </p>
        <button className="btn ghost" onClick={() => { setChangingPin(true); setPinMsg(''); }}>PIN'i değiştir</button>
        {pinMsg && <p className="ok-text">{pinMsg}</p>}
        {changingPin && (
          <PinGate
            state={{ ...state, pinHash: null }}
            update={update}
            purpose="Yeni PIN ebeveyn paneli ve süre uzatma için kullanılır."
            onPass={() => { setChangingPin(false); setPinMsg('PIN güncellendi.'); }}
            onCancel={() => setChangingPin(false)}
          />
        )}
      </div>

      <div className="card privacy">
        <h3>Gizlilik</h3>
        <p>
          Mikrofon yalnızca çocuk "Oku" düğmesine bastığında açılır ve ses kaydı saklanmaz. Ancak tarayıcının ses tanıma
          özelliği sesi tanımak için cihaz üreticisinin sunucularına (ör. Apple veya Google) gönderebilir; bu uygulama çevrimdışı
          ya da tamamen yerel çalıştığını varsaymaz. Bunu istemiyorsanız "Yalnızca ebeveyn kontrolü" modunu seçin.
        </p>
        <p>Uygulamada reklam, satın alma ya da ücretli API yoktur. Yapay zekâ önerileri bu sürümde bulunmuyor.</p>
      </div>
    </section>
  );
}

function SummaryPanel({ state }: { state: AppState }) {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(todayKey(d));
  }
  const week = days.map((k) => ({ k, d: state.days[k] || emptyDay() }));
  const totalSec = Object.values(state.days).reduce((a, d) => a + (d.seconds || 0), 0);
  const weekSec = week.reduce((a, x) => a + x.d.seconds, 0);
  const weekSessions = week.reduce((a, x) => a + x.d.sessions, 0);
  const today = state.days[todayKey()] || emptyDay();
  const mic = Object.values(state.days).reduce((a, d) => a + (d.micVerified || 0), 0);
  const par = Object.values(state.days).reduce((a, d) => a + (d.parentVerified || 0), 0);
  const maxSucc = Math.max(1, ...week.map((x) => x.d.successes));
  const review = state.items.filter((i) => i.active && itemStatus(i) === 'tekrar');
  const min = (s: number) => Math.round(s / 60);
  const dayName = (k: string) => new Date(k + 'T12:00:00').toLocaleDateString('tr-TR', { weekday: 'short' });
  return (
    <section className="panel">
      <div className="stat-grid">
        <div className="stat"><b>{min(totalSec)} dk</b><span>Toplam çalışma</span></div>
        <div className="stat"><b>{today.sessions}</b><span>Bugünkü oturum</span></div>
        <div className="stat"><b>{weekSessions}</b><span>Bu haftaki oturum ({min(weekSec)} dk)</span></div>
        <div className="stat"><b>{state.totalStars} ★</b><span>{state.chests} sandık açıldı</span></div>
        <div className="stat"><b>{par}</b><span>Ebeveynin doğruladığı</span></div>
        <div className="stat"><b>{mic}</b><span>Mikrofonun tanıdığı</span></div>
        <div className="stat"><b>{Object.values(state.days).reduce((a, d) => a + (d.tapVerified || 0), 0)}</b><span>Dokunma oyunlarında doğru</span></div>
      </div>
      <div className="card">
        <h3>Son 7 gün: doğru okumalar</h3>
        <div className="bars">
          {week.map((x) => (
            <div key={x.k} className="bar-col" title={x.k + ': ' + x.d.successes + ' doğru, ' + x.d.attempts + ' deneme'}>
              <span className="bar-val">{x.d.successes || ''}</span>
              <div className="bar" style={{ height: (x.d.successes / maxSucc) * 100 + '%' }} />
              <span className="bar-lbl">{dayName(x.k)}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="card">
        <h3>Tekrar gerekenler</h3>
        {review.length ? (
          <p>{review.map((r) => r.text + ' (' + r.successes + '/' + r.attempts + ')').join(', ')}</p>
        ) : (
          <p className="muted">Şu an tekrar gerektiren içerik yok.</p>
        )}
      </div>
      <p className="muted small">Ayrıntılı raporlar, grafikler ve CSV dışa aktarma Aşama 3'te eklenecek.</p>
    </section>
  );
}

const ConfirmBus = { fn: null as null | ((msg: string) => Promise<boolean>) };

function askConfirm(msg: string): Promise<boolean> {
  if (ConfirmBus.fn) return ConfirmBus.fn(msg);
  try {
    return Promise.resolve(window.confirm(msg));
  } catch (e) {
    return Promise.resolve(false);
  }
}

function ConfirmHost() {
  const [req, setReq] = useState<null | { msg: string; resolve: (v: boolean) => void }>(null);
  useEffect(() => {
    ConfirmBus.fn = (msg) => new Promise<boolean>((resolve) => setReq({ msg, resolve }));
    return () => {
      ConfirmBus.fn = null;
    };
  }, []);
  if (!req) return null;
  const answer = (v: boolean) => {
    req.resolve(v);
    setReq(null);
  };
  return (
    <div className="modal-back confirm-back" role="alertdialog" aria-modal="true" aria-label="Onay">
      <div className="modal confirm-modal">
        <p className="confirm-msg">{req.msg}</p>
        <div className="row gap confirm-actions">
          <button className="btn ghost" onClick={() => answer(false)} autoFocus>Vazgeç</button>
          <button className="btn danger-solid" onClick={() => answer(true)}>Evet, devam et</button>
        </div>
      </div>
    </div>
  );
}

async function collectMedia(state: AppState): Promise<Record<string, string>> {
  const m: Record<string, string> = {};
  if (state.gift && state.gift.hasImage) {
    const g = await getGiftImage(state.gift.id);
    if (g) m['gift:' + state.gift.id] = g;
  }
  if (state.settings.profilePhotoV) {
    const p = await RecStore.get('profile');
    if (p) m['rec:profile'] = p;
  }
  for (const id of state.recordings.items) {
    const v = await RecStore.get('item-' + id);
    if (v) m['rec:item-' + id] = v;
  }
  for (const id of Object.keys(state.wordImages || {})) {
    const v = await RecStore.get('wimg-' + id);
    if (v) m['rec:wimg-' + id] = v;
  }
  for (const id of state.recordings.praise) {
    const v = await RecStore.get('praise-' + id);
    if (v) m['rec:praise-' + id] = v;
  }
  return m;
}

async function restoreMedia(media: Record<string, string>) {
  for (const k of Object.keys(media)) {
    const v = media[k];
    if (typeof v !== 'string' || !v.startsWith('data:')) continue;
    if (k.startsWith('gift:')) await saveGiftImage(k.slice(5), v);
    else if (k.startsWith('rec:')) await RecStore.set(k.slice(4), v);
  }
}

/** Dosya kaydetme: Claude önizlemesinde indirme yeteneği, iPad'de paylaş menüsü, diğerlerinde indirme bağlantısı. */
async function saveTextFile(name: string, text: string): Promise<'ok' | 'cancelled' | 'fail'> {
  const blob = new Blob([text], { type: 'application/json' });
  try {
    const c = (window as any).claude;
    const dl = c && c.use ? await c.use('downloads') : null;
    if (dl) {
      await dl.save({ filename: name, data: blob });
      return 'ok';
    }
  } catch (e: any) {
    if (e && e.code === 'cancelled') return 'cancelled';
  }
  if ((window as any).claude) return 'fail';
  try {
    const file = new File([blob], name, { type: 'application/json' });
    const nav: any = navigator;
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (ios && nav.canShare && nav.canShare({ files: [file] })) {
      await nav.share({ files: [file], title: name });
      return 'ok';
    }
  } catch (e: any) {
    if (e && e.name === 'AbortError') return 'cancelled';
  }
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return 'ok';
  } catch (e) {
    return 'fail';
  }
}

function ProgressReset({ update }: { update: (fn: (s: AppState) => AppState) => void }) {
  const [stats, setStats] = useState(true);
  const [gift, setGift] = useState(true);
  const [done, setDone] = useState('');
  const run = async () => {
    if (!(await askConfirm('Seviye, yıldızlar ve madalyalar sıfırlansın mı? Bu geri alınamaz. Heceler, kelimeler, ayarlar, PIN, fotoğraflar ve ses kayıtları korunur.'))) return;
    update((s) => {
      const av = s.city.avatar;
      const lockedHat = (HATS.find((h) => h.id === av.hat) || { need: 0 }).need > 0;
      return {
        ...s,
        totalStars: 0,
        chests: 0,
        badges: {},
        city: {
          missionsCompleted: 0,
          missionStars: 0,
          avatar: { ...av, outfit: 'gunluk', car: 'mini', accessory: 'yok', hat: lockedHat ? 'yok' : av.hat },
        },
        days: stats ? {} : s.days,
        items: stats
          ? s.items.map((i) => ({ ...i, attempts: 0, successes: 0, micSuccesses: 0, parentSuccesses: 0, needsReview: false, lastStudied: null }))
          : s.items,
        gift: gift && s.gift ? { ...s.gift, opened: [], seen: 0, tasksDone: 0, wonAt: null, celebrated: false } : s.gift,
        giftHistory: gift ? [] : s.giftHistory,
        cityObjects: {},
        karaokeLog: {},
      };
    });
    setDone('İlerleme sıfırlandı. Selim Seviye 1\'den başlayacak.');
  };
  return (
    <div className="card">
      <h3>İlerlemeyi sıfırla (testten sonra)</h3>
      <p className="muted small">
        Seviye 1'e döner: yıldızlar, madalyalar, tamamlanan görevler, Kelime Parkı nesneleri ve açılan bina, araba, kıyafet sıfırlanır.
        Heceler, kelimeler, ayarlar, PIN, profil fotoğrafı ve ses kayıtları silinmez.
      </p>
      <label className="check">
        <input type="checkbox" checked={stats} onChange={(e) => setStats(e.target.checked)} />
        Çalışma istatistiklerini de sıfırla (deneme/başarı sayıları, günlük süreler, raporlar)
      </label>
      <label className="check">
        <input type="checkbox" checked={gift} onChange={(e) => setGift(e.target.checked)} />
        Gizemli hediyenin parçalarını yeniden kapat (fotoğraf ve hediye adı korunur)
      </label>
      <button className="btn danger" onClick={run}>İlerlemeyi sıfırla</button>
      {done && <p className="ok-text" aria-live="polite">{done}</p>}
    </div>
  );
}

function BackupPanel({ state, update }: { state: AppState; update: (fn: (s: AppState) => AppState) => void }) {
  const [msg, setMsg] = useState('');
  const [showJson, setShowJson] = useState(false);
  const [paste, setPaste] = useState('');
  const json = useMemo(() => JSON.stringify({ ...state, pinHash: null }, null, 2), [state]);

  const [withMedia, setWithMedia] = useState(true);

  const exportJson = async () => {
    setMsg('Yedek hazırlanıyor…');
    const fname = 'selim-city-yedek-' + todayKey() + '.json';
    let text = json;
    try {
      const media = withMedia ? await collectMedia(state) : {};
      text = JSON.stringify({ format: 'selim-city-backup', schema: 2, exportedAt: new Date().toISOString(), state: { ...state, pinHash: null }, media });
    } catch (e) { /* medya olmadan devam */ }
    const r = await saveTextFile(fname, text);
    if (r === 'cancelled') return setMsg('');
    if (r === 'ok') return setMsg('Yedek dosyası hazır: ' + fname + ' (' + Math.round(text.length / 1024) + ' KB)');
    setShowJson(true);
    setMsg('Dosya kaydetme burada kullanılamıyor; aşağıdaki metni kopyalayıp saklayabilirsiniz.');
  };

  const importText = async (text: string) => {
    try {
      const obj = JSON.parse(text);
      const isFull = obj && obj.format === 'selim-city-backup';
      const m = migrate(isFull ? obj.state : obj);
      if (!m) throw new Error('bad');
      const mediaCount = isFull && obj.media ? Object.keys(obj.media).length : 0;
      if (!(await askConfirm('Mevcut içerik ve ilerleme bu yedekle değiştirilsin mi? (' + m.items.length + ' içerik, ' + m.totalStars + ' yıldız' + (mediaCount ? ', ' + mediaCount + ' fotoğraf/ses' : '') + ') PIN\'iniz korunur.'))) return;
      if (mediaCount) await restoreMedia(obj.media);
      update((s) => ({ ...m, pinHash: s.pinHash, pinSalt: s.pinSalt }));
      setMsg('Yedek geri yüklendi: ' + m.items.length + ' içerik' + (mediaCount ? ', ' + mediaCount + ' fotoğraf/ses kaydı' : '') + '.');
      setPaste('');
    } catch (e) {
      setMsg('Bu dosya geçerli bir yedek değil.');
    }
  };

  const onFile = (e: any) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => importText(String(r.result || ''));
    r.readAsText(f);
    e.target.value = '';
  };

  return (
    <section className="panel">
      <div className="card">
        <h3>Yedek al (JSON)</h3>
        <p className="muted small">İçerikler, ilerleme, yıldızlar, şehir, hediye kartı ve ayarlar. PIN yedeğe eklenmez. Uygulamanın yeni sürümüne veya başka bir cihaza geçerken bu dosyayı kullanın.</p>
        <label className="check">
          <input type="checkbox" checked={withMedia} onChange={(e) => setWithMedia(e.target.checked)} />
          Hediye fotoğrafı, profil fotoğrafı ve ses kayıtlarını da ekle
        </label>
        <div className="row gap wrap">
          <button className="btn primary" onClick={exportJson}>Yedeği indir</button>
          <button className="btn ghost" onClick={() => setShowJson((v) => !v)}>{showJson ? 'Metni gizle' : 'Metin olarak göster'}</button>
        </div>
        {showJson && <textarea className="mono" rows={8} readOnly value={json} onFocus={(e) => e.target.select()} />}
      </div>
      <div className="card">
        <h3>Yedeği geri yükle</h3>
        <label className="field">
          Dosya seç
          <input type="file" accept="application/json,.json" onChange={onFile} />
        </label>
        <label className="field">
          veya yedek metnini yapıştırın
          <textarea rows={4} value={paste} onChange={(e) => setPaste(e.target.value)} />
        </label>
        <button className="btn ghost" disabled={!paste.trim()} onClick={() => importText(paste)}>Metinden geri yükle</button>
      </div>
      <ProgressReset update={update} />
      <div className="card">
        <h3>Her şeyi sil</h3>
        <button
          className="btn danger"
          onClick={async () => {
            if (!(await askConfirm('Tüm içerik, ilerleme ve yıldızlar silinsin mi? Bu geri alınamaz.'))) return;
            update((s) => ({ ...defaultState(), pinHash: s.pinHash, pinSalt: s.pinSalt, settings: s.settings }));
            setMsg('Tüm veriler silindi. Ayarlar ve PIN korundu.');
          }}
        >
          İçerik ve ilerlemeyi sil
        </button>
      </div>
      {msg && <p className="ok-text" aria-live="polite">{msg}</p>}
    </section>
  );
}

/* ============================================================
   UYGULAMA
   ============================================================ */
function App() {
  const [state, setState] = useState<AppState>(() => loadLocal() || defaultState());
  const [screen, setScreen] = useState<Screen>('start');
  const [gate, setGate] = useState<null | 'parent' | 'continue'>(null);
  const [burst, setBurst] = useState(0);
  const [queue, setQueue] = useState<Celebration[]>([]);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [micBlocked, setMicBlocked] = useState('');
  const [breakOn, setBreakOn] = useState(false);
  const [sync, setSync] = useState<'local' | 'cloud' | 'none'>('local');
  const [elapsed, setElapsed] = useState(0);
  const stateRef = useRef(state);
  stateRef.current = state;
  const remote = useRef<any>(null);
  const writing = useRef(false);
  const dirty = useRef(false);

  const update = useCallback((fn: (s: AppState) => AppState) => {
    setState((prev) => ({ ...fn(prev), updatedAt: Date.now() }));
  }, []);

  // Sesler
  useEffect(() => {
    if (!synthSupported) return;
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    try { window.speechSynthesis.addEventListener('voiceschanged', load); } catch (e) { /* yoksay */ }
    const t = setTimeout(load, 1000);
    return () => {
      clearTimeout(t);
      try { window.speechSynthesis.removeEventListener('voiceschanged', load); } catch (e) { /* yoksay */ }
    };
  }, []);

  useEffect(() => {
    const st = state.settings;
    const trV = turkishVoices(voices);
    Speech.voice = trV.find((v) => v.voiceURI === st.voiceURI) || trV[0] || null;
    Speech.rate = st.speechRate;
    Speech.pitch = VOICE_PRESETS[st.voicePreset] ? VOICE_PRESETS[st.voicePreset].pitch : 1.2;
    Speech.contentRate = st.contentRate;
    Speech.gap = st.unitGap;
    VoiceCfg.style = st.readingStyle;
    Sfx.enabled = st.sounds;
  }, [voices, state.settings]);

  useEffect(() => {
    VoiceCfg.recItems = new Set(state.recordings.items);
    VoiceCfg.praise = state.recordings.praise;
  }, [state.recordings]);

  // IndexedDB: açılışta oku, kalıcı depolama iste
  useEffect(() => {
    let off = false;
    StateDB.load().then((raw) => {
      if (off) return;
      const m = raw ? migrate(raw) : null;
      if (m && m.updatedAt > stateRef.current.updatedAt) setState(m);
      StateDB.ready = true;
      StateDB.save(m && m.updatedAt > stateRef.current.updatedAt ? m : stateRef.current);
    });
    try {
      const st: any = navigator.storage;
      if (st && st.persist) st.persist().catch(() => {});
    } catch (e) { /* yoksay */ }
    return () => { off = true; };
  }, []);

  // Yerel kayıt + hesap senkronu
  const pushRemote = useCallback(async () => {
    if (!remote.current || writing.current) {
      dirty.current = true;
      return;
    }
    writing.current = true;
    dirty.current = false;
    try {
      await remote.current.set(JSON.parse(JSON.stringify({ ...stateRef.current, days: trimDays(stateRef.current.days) })));
    } catch (e) { /* yerel kayıt yine de var */ }
    writing.current = false;
    if (dirty.current) setTimeout(pushRemote, 1500);
  }, []);

  useEffect(() => {
    const ok = saveLocal(state);
    StateDB.save(state);
    if (!ok && !remote.current) setSync('none');
    if (!state.updatedAt) return;
    const t = setTimeout(pushRemote, 2000);
    return () => clearTimeout(t);
  }, [state]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const c = (window as any).claude;
        if (!c || !c.use) return;
        const [db, user] = await Promise.all([c.use('db'), c.use('user')]);
        if (!db || !user || cancelled) return;
        const id = await user.id();
        if (!id || cancelled) return;
        Cloud.db = db;
        Cloud.uid = id;
        const ref = db.doc('data/users/' + id + '/state');
        const snap = await ref.get();
        if (cancelled) return;
        remote.current = ref;
        setSync('cloud');
        const r = snap.exists ? migrate(snap.data()) : null;
        if (r && r.updatedAt > stateRef.current.updatedAt) {
          setState(r);
        } else if (stateRef.current.updatedAt) {
          pushRemote();
        }
      } catch (e) { /* yerelde devam */ }
      finally {
        Cloud.resolve && Cloud.resolve();
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Oturum süresi
  const inGame = screen === 'game-hece' || screen === 'game-kelime' || screen === 'game-duy' || screen === 'game-birlestir' || screen === 'game-karaoke';
  useEffect(() => {
    if (!inGame || gate || breakOn) return;
    const iv = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      setElapsed((e) => e + 1);
    }, 1000);
    return () => clearInterval(iv);
  }, [inGame, gate, breakOn]);

  useEffect(() => {
    if (!inGame) return;
    if (elapsed > 0 && elapsed % 15 === 0) {
      update((s) => {
        const k = todayKey();
        const d = { ...(s.days[k] || emptyDay()) };
        d.seconds += 15;
        return { ...s, days: { ...s.days, [k]: d } };
      });
    }
    if (elapsed >= state.settings.sessionMinutes * 60) {
      setScreen('rest');
      Speech.speak(state.settings.childName + ', bugün çok güzel çalıştın! Şimdi biraz dinlenebilirsin.');
    }
  }, [elapsed]);

  const goGame = (s: Screen) => {
    update((st) => {
      const k = todayKey();
      const d = { ...(st.days[k] || emptyDay()) };
      d.sessions += 1;
      return { ...st, days: { ...st.days, [k]: d } };
    });
    setScreen(s);
  };

  const recordAttempt = useCallback((itemId: string) => {
    update((s) => {
      const k = todayKey();
      const d = { ...(s.days[k] || emptyDay()) };
      d.attempts += 1;
      return {
        ...s,
        days: { ...s.days, [k]: d },
        items: s.items.map((i) => {
          if (i.id !== itemId) return i;
          const n = { ...i, attempts: i.attempts + 1, lastStudied: new Date().toISOString() };
          n.needsReview = itemStatus(n) === 'tekrar';
          return n;
        }),
      };
    });
  }, []);

  const commitSuccess = useCallback((itemId: string, verifier: Verifier, retries: number, noStar = false): boolean => {
    const cur = stateRef.current;
    const earned = noStar ? 0 : 1 + (retries > 0 ? 1 : 0);
    const before = cur.totalStars;
    const after = before + earned;
    const chestsToOpen = Math.floor(after / STARS_PER_CHEST) - Math.floor(before / STARS_PER_CHEST);
    const cels: Celebration[] = [];
    let prize: string | null = null;
    if (chestsToOpen > 0) {
      prize = BADGES[Math.floor(Math.random() * BADGES.length)].id;
      cels.push({ kind: 'chest', badge: prize });
    }
    // Şehir görevi ve gizemli hediye
    const spm = cur.settings.starsPerMission;
    let ms = cur.city.missionStars + earned;
    let done = cur.city.missionsCompleted;
    let gift = cur.gift;
    let hist = cur.giftHistory;
    while (ms >= spm) {
      ms -= spm;
      done += 1;
      let piece: number | null = null;
      let won = false;
      if (gift && !gift.wonAt) {
        gift = { ...gift, tasksDone: gift.tasksDone + 1 };
        if (gift.tasksDone % gift.tasksPerPiece === 0) {
          const r = openRandomPiece(gift);
          gift = r.gift;
          piece = r.piece;
          won = r.won;
          if (won) hist = [...hist, { id: gift.id, name: gift.name, wonAt: gift.wonAt! }];
        }
        gift = { ...gift, seen: gift.opened.length, celebrated: gift.celebrated || won };
      }
      cels.push({ kind: 'mission', number: done, unlocks: unlocksAt(done), piece, won });
    }
    update((s) => {
      const k = todayKey();
      const d = { ...(s.days[k] || emptyDay()) };
      d.attempts += 1;
      d.successes += 1;
      if (verifier === 'mic') d.micVerified += 1;
      else if (verifier === 'tap') d.tapVerified = (d.tapVerified || 0) + 1;
      else d.parentVerified += 1;
      const badges = { ...s.badges };
      if (prize) badges[prize] = (badges[prize] || 0) + 1;
      return {
        ...s,
        totalStars: s.totalStars + earned,
        chests: s.chests + (chestsToOpen > 0 ? 1 : 0),
        badges,
        days: { ...s.days, [k]: d },
        city: { ...s.city, missionsCompleted: done, missionStars: ms },
        gift,
        giftHistory: hist,
        items: s.items.map((i) => {
          if (i.id !== itemId) return i;
          const n = {
            ...i,
            attempts: i.attempts + 1,
            successes: i.successes + 1,
            micSuccesses: i.micSuccesses + (verifier === 'mic' ? 1 : 0),
            parentSuccesses: i.parentSuccesses + (verifier === 'parent' ? 1 : 0),
            lastStudied: new Date().toISOString(),
          };
          n.needsReview = itemStatus(n) === 'tekrar';
          return n;
        }),
      };
    });
    if (cels.length) setTimeout(() => setQueue((q) => [...q, ...cels]), 250);
    return cels.length > 0;
  }, []);

  // Ebeveynin elle açtığı parçaları çocuk ekranına dönünce kutla
  useEffect(() => {
    const g = state.gift;
    if (!g || screen === 'parent' || screen === 'start' || gate) return;
    if (g.opened.length > g.seen) {
      const won = !!g.wonAt && !g.celebrated;
      setQueue((q) => [...q, { kind: 'piece', piece: g.opened[g.opened.length - 1], won }]);
      update((s) => (s.gift ? { ...s, gift: { ...s.gift, seen: s.gift.opened.length, celebrated: s.gift.celebrated || won } } : s));
    }
  }, [screen, gate, state.gift ? state.gift.opened.length : -1]);

  const enqueue = useCallback((c: Celebration) => setQueue((q) => [...q, c]), []);
  const markObjectsSeen = useCallback(() => {
    update((s) => {
      const o: AppState['cityObjects'] = {};
      Object.keys(s.cityObjects).forEach((k) => (o[k] = { ...s.cityObjects[k], seen: true }));
      return { ...s, cityObjects: o };
    });
  }, []);

  // Heceleme düzeltmelerini tüm oyunlara yay
  useEffect(() => {
    const m: Record<string, string[]> = {};
    state.items.forEach((i) => {
      if (i.syllables && i.syllables.length) m[normalize(i.text)] = i.syllables;
    });
    SylCfg.byText = m;
  }, [state.items]);

  // Kutlama sesi ve konfeti
  const currentCel = queue[0] || null;
  useEffect(() => {
    if (!currentCel) return;
    const name = stateRef.current.settings.childName;
    const g = stateRef.current.gift;
    if (currentCel.kind === 'object') {
      const d = CITY_OBJECTS.find((x) => x.id === currentCel.objId);
      Sfx.chest();
      Speech.speak(name + ', şehrine ' + (d ? d.phrase : 'yeni bir parça') + ' kazandın!');
      return;
    }
    if (currentCel.kind === 'chest') {
      Sfx.chest();
      const b = BADGES.find((x) => x.id === currentCel.badge);
      Speech.speak('Hazine sandığı açıldı! ' + (b ? b.name + ' kazandın!' : ''));
      return;
    }
    setBurst((b) => b + 1);
    Sfx.chest();
    if (currentCel.won) {
      Speech.speak('Aferin ' + name + '! Gizemli hediyeni kazandın!' + (g && g.name ? ' Hediyen: ' + g.name + '!' : ''));
      setTimeout(() => setBurst((b) => b + 1), 900);
      setTimeout(() => setBurst((b) => b + 1), 1800);
      setTimeout(() => setBurst((b) => b + 1), 2700);
    } else {
      const parts: string[] = [];
      if (currentCel.kind === 'mission') parts.push('Görev tamamlandı!');
      if (currentCel.piece != null) parts.push('Gizemli hediyeden bir parça açıldı!');
      if (currentCel.kind === 'mission' && currentCel.unlocks.length) parts.push(currentCel.unlocks[0] + '!');
      Speech.speak(parts.join(' '));
    }
  }, [currentCel]);

  const animations = state.settings.animations && !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  const syncLabel =
    sync === 'cloud'
      ? 'Veriler bu cihazda ve Claude hesabınızda saklanıyor; başka cihazda açınca da görünür.'
      : sync === 'none'
      ? 'Uyarı: Veriler kalıcı olarak saklanamıyor. Yedek sekmesinden düzenli yedek alın.'
      : 'Veriler bu tarayıcıda saklanıyor. Düzenli yedek almanız önerilir.';

  ProfileCfg.version = state.settings.profilePhotoV || 0;
  const navigate = (s: Screen) => (s.startsWith('game') ? goGame(s) : setScreen(s));
  let content: any = null;
  if (screen === 'start') {
    content = (
      <GameStart
        state={state}
        animations={animations}
        onStart={() => {
          Sfx.success();
          Speech.speak(state.settings.childName + ', okuma macerana hoş geldin!');
          setScreen('home');
        }}
      />
    );
  } else if (screen === 'home' || screen === 'city') {
    content = (
      <MapScreen
        state={state}
        go={navigate}
        openParent={() => setGate('parent')}
        animations={animations}
        onObjectsSeen={markObjectsSeen}
      />
    );
  } else if (screen === 'avatar' || screen === 'garage') {
    content = <GarageScreen state={state} update={update} onBack={() => setScreen('home')} />;
  } else if (screen === 'gift') {
    content = <GiftScreen state={state} onBack={() => setScreen('home')} animations={animations} />;
  } else if (screen === 'game-birlestir') {
    content = (
      <BuildGame
        state={state}
        onHome={() => setScreen('home')}
        onCommitSuccess={commitSuccess}
        onAttempt={recordAttempt}
        onCelebrate={() => setBurst((b) => b + 1)}
      />
    );
  } else if (screen === 'game-karaoke') {
    content = (
      <KaraokeGame
        state={state}
        update={update}
        onHome={() => setScreen('home')}
        onCommitSuccess={commitSuccess}
        onAttempt={recordAttempt}
        enqueue={enqueue}
        micBlocked={micBlocked}
        setMicBlocked={setMicBlocked}
        setBreak={setBreakOn}
      />
    );
  } else if (screen === 'game-duy') {
    content = (
      <ListenGame
        state={state}
        onHome={() => setScreen('home')}
        onCommitSuccess={commitSuccess}
        onAttempt={recordAttempt}
        onCelebrate={() => setBurst((b) => b + 1)}
      />
    );
  } else if (screen === 'badges') {
    content = <BadgesScreen state={state} onBack={() => setScreen('home')} />;
  } else if (screen === 'rest') {
    content = (
      <RestScreen
        name={state.settings.childName}
        onHome={() => { setElapsed(0); setScreen('home'); }}
        onContinue={() => setGate('continue')}
      />
    );
  } else if (screen === 'parent') {
    content = <ParentPanel state={state} update={update} onClose={() => setScreen('home')} syncLabel={syncLabel} voices={voices} />;
  } else if (screen === 'game-hece' || screen === 'game-kelime') {
    content = (
      <WheelGame
        key={screen}
        kind={screen === 'game-hece' ? 'hece' : 'kelime'}
        state={state}
        update={update}
        onHome={() => setScreen('home')}
        onCelebrate={() => setBurst((b) => b + 1)}
        onCommitSuccess={commitSuccess}
        onAttempt={recordAttempt}
        micBlocked={micBlocked}
        setMicBlocked={setMicBlocked}
      />
    );
  }

  return (
    <div className={'app' + (animations ? '' : ' no-anim') + (screen === 'parent' ? '' : ' game-ui') + (screen === 'home' || screen === 'city' || screen === 'start' ? ' full' : '')}>
      {content}
      <ConfirmHost />
      <Confetti burst={burst} enabled={animations} />
      {currentCel && currentCel.kind === 'chest' && (
        <ChestModal key={'c' + queue.length} badgeId={currentCel.badge} animations={animations} onClose={() => setQueue((q) => q.slice(1))} />
      )}
      {currentCel && currentCel.kind === 'object' && (
        <ObjectModal key={'o' + queue.length} objId={currentCel.objId} onClose={() => setQueue((q) => q.slice(1))} />
      )}
      {currentCel && currentCel.kind !== 'chest' && currentCel.kind !== 'object' && (
        <CelebrationModal key={'m' + queue.length} c={currentCel} state={state} animations={animations} onClose={() => setQueue((q) => q.slice(1))} />
      )}
      {gate && (
        <PinGate
          state={state}
          update={update}
          purpose={gate === 'parent' ? 'Ebeveyn paneline girmek için.' : 'Oyuna devam etmek için ebeveyn onayı.'}
          onCancel={() => setGate(null)}
          onPass={() => {
            if (gate === 'parent') setScreen('parent');
            else { setElapsed(0); setScreen('home'); }
            setGate(null);
          }}
        />
      )}
    </div>
  );
}

class ErrorBoundary extends React.Component<any, { err: string }> {
  constructor(p: any) {
    super(p);
    this.state = { err: '' };
  }
  static getDerivedStateFromError(e: any) {
    return { err: String((e && e.message) || e) };
  }
  render() {
    if (this.state.err) {
      return (
        <main className="screen empty">
          <h2>Bir şeyler ters gitti</h2>
          <p className="muted">{this.state.err}</p>
          <button className="btn primary" onClick={() => location.reload()}>Sayfayı yenile</button>
        </main>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
