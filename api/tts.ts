/**
 * /api/tts — Azure AI Speech metinden sese (Vercel Edge Function)
 *
 * Azure anahtarı YALNIZCA burada, sunucu tarafında, ortam değişkenlerinden okunur:
 *   AZURE_SPEECH_KEY     Azure Speech kaynağının anahtarı (Key 1 veya Key 2)
 *   AZURE_SPEECH_REGION  Kaynağın bölgesi (ör. westeurope)
 * İsteğe bağlı:
 *   AZURE_SPEECH_ENDPOINT  Tam uç nokta adresi (yalnızca özel kurulum/test için)
 *
 * GET /api/tts?health=1                 → { configured: boolean }  (anahtar asla döndürülmez)
 * GET /api/tts?t=metin&v=ses&r=0&p=0&vol=100 → audio/mpeg
 *
 * Yanıtlar CDN'de uzun süre önbelleğe alınır; aynı ses için Azure'a tekrar istek gitmez.
 */
export const config = { runtime: 'edge' };

const VOICES = new Set(['tr-TR-EmelNeural', 'tr-TR-AhmetNeural']);
const MAX_CHARS = 220;
const hits = new Map<string, { n: number; t: number }>();

function env(name: string): string {
  try {
    return ((globalThis as any).process?.env?.[name] as string) || '';
  } catch {
    return '';
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' } as Record<string, string>)[c]);
}

function intParam(v: string | null, lo: number, hi: number, dv: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, Math.round(n))) : dv;
}

/** Yalnızca kendi sayfamızdan gelen istekleri kabul et (başka sitelerin kotayı kullanmasını zorlaştırır). */
function sameOrigin(req: Request): boolean {
  const host = new URL(req.url).host;
  const site = req.headers.get('sec-fetch-site');
  if (site === 'same-origin') return true;
  const ref = req.headers.get('referer') || req.headers.get('origin');
  if (!ref) return false;
  try {
    return new URL(ref).host === host;
  } catch {
    return false;
  }
}

/** Basit hız sınırı (her sunucu örneği için ayrı, en iyi çaba). */
function limited(req: Request): boolean {
  const ip = (req.headers.get('x-forwarded-for') || 'x').split(',')[0].trim();
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || now - h.t > 60000) {
    hits.set(ip, { n: 1, t: now });
    return false;
  }
  h.n++;
  return h.n > 120;
}

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const key = env('AZURE_SPEECH_KEY');
  const region = env('AZURE_SPEECH_REGION');
  const endpoint = env('AZURE_SPEECH_ENDPOINT') || (region ? `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1` : '');

  if (url.searchParams.get('health')) return json({ configured: !!(key && endpoint) });
  if (req.method !== 'GET') return json({ error: 'method' }, 405);
  if (!sameOrigin(req)) return json({ error: 'forbidden' }, 403);
  if (limited(req)) return json({ error: 'rate-limited' }, 429);
  if (!key || !endpoint) return json({ error: 'not-configured' }, 503);

  const text = (url.searchParams.get('t') || '').trim();
  const voice = url.searchParams.get('v') || 'tr-TR-EmelNeural';
  if (!text || text.length > MAX_CHARS) return json({ error: 'text' }, 400);
  if (!VOICES.has(voice)) return json({ error: 'voice' }, 400);
  const rate = intParam(url.searchParams.get('r'), -50, 50, 0);
  const pitch = intParam(url.searchParams.get('p'), -20, 25, 0);
  const vol = intParam(url.searchParams.get('vol'), 20, 100, 100);

  const ssml =
    `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="tr-TR">` +
    `<voice name="${voice}"><prosody rate="${rate >= 0 ? '+' : ''}${rate}%" pitch="${pitch >= 0 ? '+' : ''}${pitch}%" volume="${vol}">` +
    `${escapeXml(text)}</prosody></voice></speak>`;

  let az: Response;
  try {
    az = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': key,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
        'User-Agent': 'selim-city',
      },
      body: ssml,
    });
  } catch {
    return json({ error: 'upstream-unreachable' }, 502);
  }
  if (!az.ok) return json({ error: 'upstream', status: az.status }, 502);

  return new Response(az.body, {
    status: 200,
    headers: {
      'content-type': az.headers.get('content-type') || 'audio/mpeg',
      'cache-control': 'public, max-age=31536000, immutable',
      'cdn-cache-control': 'public, max-age=31536000, immutable',
      'x-content-type-options': 'nosniff',
    },
  });
}
