// Ingliz Ustoz — AI ingliz tili ustozi (server)
// Ishga tushirish: ANTHROPIC_API_KEY=... npm start
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, "public");
const PORT = Number(process.env.PORT) || 3000;
const MODEL = process.env.CLAUDE_MODEL || "claude-opus-5-5";

// .env faylini (agar bo'lsa) o'qish — qo'shimcha paket kerak emas
try {
  const env = fs.readFileSync(path.join(__dirname, ".env"), "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {}

const client = new Anthropic();

const LEVELS = {
  A1: "A1 (boshlang'ich): juda oddiy so'zlar, qisqa gaplar, Present Simple. Inglizcha jumlalarni juda qisqa qiling va har doim o'zbekcha tarjimasini bering.",
  A2: "A2 (elementar): kundalik mavzular, Past Simple, Future. Inglizcha jumlalar qisqa, kerak bo'lsa tarjima bering.",
  B1: "B1 (o'rta): turli zamonlar, oddiy fikr bildirish. Tushuntirishlar o'zbekcha, misollar inglizcha.",
  B2: "B2 (o'rtadan yuqori): murakkab gaplar, idiomalar, Conditionals, Passive. Ko'proq inglizcha gapiring, qiyin joylarini o'zbekcha tushuntiring.",
  C1: "C1 (yuqori): erkin, akademik va professional ingliz tili. Asosan inglizcha gapiring, o'zbekcha faqat nozik farqlarni tushuntirish uchun.",
};

const MODES = {
  chat: "ERKIN SUHBAT: o'quvchi bilan qiziqarli mavzularda suhbatlashing. Har javob oxirida suhbatni davom ettiruvchi bitta inglizcha savol bering.",
  grammar: "GRAMMATIKA DARSI: mavzuni o'zbek tilida bosqichma-bosqich tushuntiring (qoida → 2-3 misol → o'quvchiga 1 ta mashq). O'quvchi javob bergach, tekshiring va keyingi mashqni bering.",
  vocab: "SO'Z BOYLIGI: mavzu bo'yicha 5 tadan yangi so'z o'rgating (talaffuz, ma'no, misol gap). Keyin o'quvchidan shu so'zlar bilan gap tuzishni so'rang va tekshiring.",
  roleplay: "ROLLI O'YIN: berilgan vaziyatda rol o'ynang (masalan, ofitsiant, bojxona xodimi, ish beruvchi). Rolda faqat inglizcha gapiring, lekin har javobdan keyin qisqa '💡 Maslahat:' qismida o'zbekcha izoh va xatolar tuzatishini bering.",
  speaking: "IELTS SPEAKING: IELTS Speaking imtihoni (Part 1, 2, 3) savollarini bering. O'quvchi javob bergach, o'zbekcha baho bering: Fluency, Vocabulary, Grammar, taxminiy band (masalan 6.0) va yaxshiroq javob namunasini inglizcha ko'rsating.",
  translate: "TARJIMA MASHQI: o'quvchiga o'zbekcha gap bering, u inglizchaga tarjima qilsin. Tekshiring, xatolarni tushuntiring, to'g'ri variantni bering va keyingi gapni bering.",
};

function systemPrompt({ level, mode, topic, name, voice }) {
  return `Siz "Ustoz" — o'zbek tilida so'zlashuvchilar uchun mehribon, sabrli va kuchli ingliz tili o'qituvchisisiz.

ASOSIY QOIDALAR:
- O'quvchi bilan O'ZBEK TILIDA (lotin yozuvida) muloqot qiling. Inglizcha misollar, mashqlar va rolli o'yin qismlari inglizcha bo'ladi.
- O'quvchi darajasi: ${LEVELS[level] || LEVELS.B1}
- Joriy rejim: ${MODES[mode] || MODES.chat}
${topic ? `- Mavzu / vaziyat: ${topic}` : ""}
${name ? `- O'quvchining ismi: ${name}. Unga ismi bilan murojaat qiling.` : ""}
${voice ? `- OVOZLI REJIM: bu jonli ovozli suhbat, javobingiz ovoz bilan o'qib beriladi. Faqat 1-3 ta qisqa gap bilan javob bering. Markdown, ro'yxat, emoji, ❌/✅ va {{ }} belgilarini ISHLATMANG. Xatoni og'zaki tuzating, masalan: "Siz 'I go yesterday' dedingiz, to'g'risi: I went yesterday." O'zbekcha va inglizcha gaplarni bitta gap ichida aralashtirmang — har birini alohida gap qilib ayting. O'quvchining nutqi mikrofondan matnga aylantirilgan, shuning uchun imlo va tinish belgilari xatolariga e'tibor bermang.` : ""}
- O'quvchi inglizcha yozib xato qilsa, avval qisqa "✏️ Tuzatish:" qismida xatoni ko'rsating: ❌ noto'g'ri → ✅ to'g'ri va bir gap bilan o'zbekcha sababini ayting. Keyin suhbatni davom ettiring.
- Yangi yoki muhim inglizcha so'z/ibora ishlatsangiz, uni {{english = o'zbekcha}} ko'rinishida belgilang (masalan: {{appointment = uchrashuv, qabul}}). Bir javobda 1-4 tadan ortiq belgilamang.
- Javoblar qisqa va tushunarli bo'lsin (odatda 3-8 qator), suhbat ko'rinishida. Uzun ma'ruza o'qimang.
- Markdown: **qalin**, ro'yxatlar va qisqa sarlavhalardan foydalanishingiz mumkin. Jadval ishlatmang.
- Rag'batlantiring 🙂, lekin xatolarni yashirmang.
- Ingliz tili o'rganishga aloqasi yo'q so'rovlarga qisqa javob berib, suhbatni yana ingliz tiliga qaytaring.`;
}

function cleanMessages(raw) {
  if (!Array.isArray(raw)) return null;
  const msgs = raw
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }))
    .slice(-40);
  while (msgs.length && msgs[0].role !== "user") msgs.shift();
  // Ketma-ket bir xil rolli xabarlarni birlashtirish
  const merged = [];
  for (const m of msgs) {
    const last = merged[merged.length - 1];
    if (last && last.role === m.role) last.content += "\n\n" + m.content;
    else merged.push({ ...m });
  }
  if (!merged.length || merged[merged.length - 1].role !== "user") return null;
  return merged;
}

async function handleChat(req, res) {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 300_000) return send(res, 413, { error: "So'rov juda katta" });
  }
  let data;
  try { data = JSON.parse(body); } catch { return send(res, 400, { error: "Noto'g'ri JSON" }); }

  const messages = cleanMessages(data.messages);
  if (!messages) return send(res, 400, { error: "Xabar topilmadi" });

  res.writeHead(200, {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-cache",
    "X-Accel-Buffering": "no",
  });

  const params = {
    model: MODEL,
    max_tokens: data.voice === true ? 800 : 4000,
    system: systemPrompt({
      level: data.level,
      mode: data.mode,
      topic: typeof data.topic === "string" ? data.topic.slice(0, 300) : "",
      name: typeof data.name === "string" ? data.name.slice(0, 40) : "",
      voice: data.voice === true,
    }),
    output_config: { effort: "low" }, // suhbat uchun tez javob
    messages,
  };

  let wrote = false;
  const run = async (withFallback) => {
    const stream = withFallback
      ? client.beta.messages.stream({ ...params, betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" })
      : client.messages.stream(params);
    const onClose = () => stream.abort();
    req.on("close", onClose);
    stream.on("text", (t) => { wrote = true; res.write(t); });
    try { return await stream.finalMessage(); } finally { req.off("close", onClose); }
  };

  try {
    let final;
    try {
      final = await run(true);
    } catch (err) {
      // Agar hisob fallback beta'ni qo'llamasa — oddiy so'rov bilan qayta urinish
      if (err instanceof Anthropic.BadRequestError && !wrote) final = await run(false);
      else throw err;
    }
    if (final.stop_reason === "refusal") {
      res.write("\n\nKechirasiz, bu so'rovga javob bera olmayman. Keling, boshqa mavzuda mashq qilamiz 🙂");
    }
    res.end();
  } catch (err) {
    console.error("Claude API xatosi:", err?.status, err?.message);
    let msg = "Server xatosi. Birozdan so'ng qayta urinib ko'ring.";
    if (err instanceof Anthropic.AuthenticationError || /authentication/i.test(err?.message || "")) msg = "API kalit noto'g'ri yoki o'rnatilmagan (ANTHROPIC_API_KEY).";
    else if (err instanceof Anthropic.RateLimitError) msg = "Juda ko'p so'rov. Bir daqiqadan so'ng urinib ko'ring.";
    else if (err instanceof Anthropic.APIConnectionError) msg = "AI serveriga ulanib bo'lmadi. Internetni tekshiring.";
    if (!res.writableEnded) res.end(`\n\n⚠️ ${msg}`);
  }
}

function send(res, status, obj) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(obj));
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".json": "application/json",
};

function serveStatic(req, res) {
  const url = new URL(req.url, "http://x");
  let p = decodeURIComponent(url.pathname);
  if (p === "/") p = "/index.html";
  const file = path.normalize(path.join(PUBLIC_DIR, p));
  if (!file.startsWith(PUBLIC_DIR)) return send(res, 403, { error: "forbidden" });
  fs.readFile(file, (err, buf) => {
    if (err) {
      // SPA: noma'lum yo'llar index.html ga
      return fs.readFile(path.join(PUBLIC_DIR, "index.html"), (e2, html) => {
        if (e2) return send(res, 404, { error: "not found" });
        res.writeHead(200, { "Content-Type": MIME[".html"] });
        res.end(html);
      });
    }
    res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
    res.end(buf);
  });
}

http
  .createServer((req, res) => {
    if (req.method === "POST" && req.url === "/api/chat") return handleChat(req, res);
    if (req.method === "GET" && req.url === "/api/health") return send(res, 200, { ok: true, model: MODEL, key: !!process.env.ANTHROPIC_API_KEY });
    if (req.method === "GET") return serveStatic(req, res);
    send(res, 405, { error: "method not allowed" });
  })
  .listen(PORT, () => {
    console.log(`Ingliz Ustoz ishga tushdi: http://localhost:${PORT}`);
    if (!process.env.ANTHROPIC_API_KEY) console.warn("⚠️  ANTHROPIC_API_KEY o'rnatilmagan! .env faylini yarating.");
  });
