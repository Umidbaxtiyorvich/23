# Ingliz Ustoz 🇺🇿 → 🇬🇧

O'zbek tilida gaplashadigan AI ustoz bilan ingliz tilini o'rganish sayti (kirgandan keyingi "ishlash" qismi).

## Imkoniyatlar
- **💬 AI Ustoz bilan suhbat** — o'zbekcha tushuntiradi, inglizcha xatolaringizni tuzatadi (❌ → ✅), javoblar real vaqtda chiqadi.
- **6 ta rejim:** Erkin suhbat, Grammatika, So'z boyligi, Rolli o'yin (kafe, aeroport, intervyu…), IELTS Speaking (band baho bilan), Tarjima.
- **📚 Darslar:** A1 dan C1 gacha har darajada 10 tadan dars; yakunlangan darslar belgilanadi.
- **🏠 Kunlik reja:** vazifalar, XP, ketma-ket kunlar (🔥 streak), progress.
- **🃏 Lug'at:** suhbatdagi so'z chiplarini bossangiz lug'atga qo'shiladi; kartochkalar bilan takrorlash (Leitner usuli).
- **📞 Ovozli suhbat:** suhbat oynasidagi "📞 Ovozli" tugmasi — qo'ng'iroqdagidek gaplashasiz: siz gapirasiz, Ustoz eshitib, o'zbekcha va inglizcha ovoz bilan javob beradi, keyin yana sizni tinglaydi. Ustoz gapirayotganda doirani bossangiz to'xtaydi. Gapirish tilini (English / O'zbekcha) tanlash mumkin.
- **🎤 Ovoz:** mikrofon orqali inglizcha/o'zbekcha gapirish, 🔊 javoblarning inglizcha qismini o'qib berish (Chrome tavsiya etiladi).
- Telefon va kompyuterga moslashgan, tungi rejim avtomatik.
- `?target=B2&goal=study` kabi URL parametrlari bilan kelgan foydalanuvchi uchun daraja/maqsad avtomatik tanlanadi.

## Ishga tushirish
Node.js 18+ kerak.

```bash
npm install
cp .env.example .env      # ichiga ANTHROPIC_API_KEY ni yozing
npm start                 # http://localhost:3000
```

API kalitni https://console.anthropic.com dan olasiz. Model: `claude-opus-5-5` (`.env` da `CLAUDE_MODEL` bilan o'zgartirish mumkin).

## Tuzilma
- `server.js` — statik fayllar + `/api/chat` (Claude API'ga streaming so'rov, Ustoz uchun tizim ko'rsatmasi shu yerda)
- `public/index.html`, `public/style.css` — interfeys
- `public/app.js` — suhbat, darslar, lug'at, progress mantiqi (ma'lumotlar brauzerda `localStorage`da saqlanadi)
- `public/data.js` — o'quv dasturi va rolli o'yin vaziyatlari (osongina tahrirlash mumkin)
