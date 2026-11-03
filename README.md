# IELTS AI MASTER

AI yordamida IELTS'ga tayyorlanish uchun web-platforma. Mock testlar, AI Writing va Speaking baholash, shaxsiy o'quv reja, ovozli AI tutor (Preppy), lug'at (SRS), o'yinlar, statistika va admin panel bor.
Funksional g'oyalar GoPrep kabi platformalardan ilhomlangan. Kod, dizayn, brend va kontent (testlar, matnlar) ushbu loyiha uchun yangidan yozilgan.

> Sayt nomi vaqtinchalik. Uni **Admin panel → AI & sozlamalar → Sayt nomi** bo'limidan yoki `APP_NAME` / `VITE_APP_NAME` orqali o'zgartirish mumkin.

| Qism | Texnologiya |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, Framer Motion, Recharts |
| Backend | Python 3.11+, FastAPI, SQLAlchemy 2, Alembic, PostgreSQL |
| AI | Groq, OpenAI yoki Gemini (OpenAI-mos API, admin paneldan almashtiriladi), Whisper STT (Groq/OpenAI) |
| Auth | JWT (access 30 daq + refresh 14 kun), bcrypt, email tasdiqlash, parolni tiklash |

---

## 1. Ishga tushirish

### Talablar
- Python 3.11+ (3.13 da sinovdan o'tgan)
- Node.js 20+ (22 da sinovdan o'tgan)
- PostgreSQL 14+. O'rnatilmagan bo'lsa Docker orqali ko'taring: `docker compose up -d db`

### Backend
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate            # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                 # DATABASE_URL, JWT_SECRET va AI kalitlarini yozing
alembic upgrade head                 # jadvallarni yaratish
uvicorn app.main:app --reload --port 8000
```
Birinchi ishga tushishda server bazani avtomatik to'ldiradi: testlar, 72 ta so'z, admin va demo foydalanuvchilar. Seed'ni qo'lda ishga tushirish uchun: `python -m app.seed`.

### Frontend
```bash
cd frontend
npm install
cp .env.example .env                 # ixtiyoriy
npm run dev                          # http://localhost:5173
```
Vite `/api` so'rovlarini `http://localhost:8000` ga proksi qiladi. Production build uchun: `npm run build`, natija `dist/` papkasiga tushadi.

### Manzillar
- Sayt: **http://localhost:5173**
- Swagger (API hujjatlari): **http://localhost:8000/docs**
- ReDoc: http://localhost:8000/redoc
- Health: http://localhost:8000/api/health

### Demo hisoblar (`SEED_DEMO_DATA=true`)
| Rol | Email | Parol |
|---|---|---|
| Free | demo@ielts-ai-master.example.com | Demo12345! |
| Premium | premium@ielts-ai-master.example.com | Demo12345! |
| Admin | admin@ielts-ai-master.example.com | Admin12345! (`.env` da o'zgartiring) |

### Testlar
```bash
cd backend && pytest -q              # 13 ta test (alohida `ielts_test` bazasi kerak)
cd frontend && npm run typecheck
```
Test bazasini yaratish: `createdb -O ielts ielts_test` (yoki `TEST_DATABASE_URL` ni bering).

---

## 2. AI sozlash
Kalitlar **faqat** `backend/.env` faylida turadi, frontend koddiga hech qachon tushmaydi:
```
AI_PROVIDER=groq          # groq | openai | gemini | none
GROQ_API_KEY=...
OPENAI_API_KEY=...
GEMINI_API_KEY=...
```
Provayder va modelni **Admin panel → AI & sozlamalar** dan almashtirish mumkin. U yerdagi «API holatini tekshirish» tugmasi provayderga test so'rov yuboradi.
**Kalit bo'lmasa sayt to'xtamaydi.** Bunday holatda AI funksiyalar demo rejimga o'tadi: matn tahliliga asoslangan heuristik baholash ishlaydi va natija interfeysda `DEMO` belgisi bilan ko'rsatiladi.

---

## 3. Funksiyalar: qaysi biri haqiqiy, qaysi biri demo

| Funksiya | Holat |
|---|---|
| Ro'yxatdan o'tish, login, logout (barcha qurilmalarda), JWT refresh, himoyalangan sahifalar, parolni o'zgartirish | ✅ Haqiqiy |
| Email tasdiqlash va parolni tiklash | ✅ Haqiqiy (SMTP sozlansa xat yuboriladi). ⚠️ SMTP bo'lmasa havola server logiga yoziladi; `EMAIL_DEV_RETURN_LINKS=true` bo'lsa API javobida ham qaytadi (faqat development) |
| Onboarding → individual reja (qoidalar asosida, natijalarga qarab qayta tuziladi) | ✅ Haqiqiy |
| AI o'quv reja xulosasi va bosqichlari (Premium) | ✅ AI kalit bo'lsa haqiqiy, bo'lmasa qoidalar asosida |
| Dashboard, statistika, grafiklar, testlar tarixi, zaif savol turlari | ✅ Haqiqiy, PostgreSQL ma'lumotlaridan |
| Listening/Reading mock testlar: taymer, avtosaqlash, savollar navigatsiyasi, band hisoblash | ✅ Haqiqiy |
| Listening audio | ⚠️ Demo: audio brauzer TTS ovozi bilan o'qiladi. Admin testga `audio_url` qo'shsa haqiqiy audio ishlaydi |
| Writing AI feedback (4 mezon, xatolar, yaxshilangan essay) | ✅ AI kalit bilan haqiqiy. ⚠️ Kalitsiz demo (heuristik) |
| Speaking AI examiner, Preppy tutor | ✅ AI kalit bilan haqiqiy. ⚠️ Kalitsiz qoidalar asosida demo javob |
| Pronunciation bahosi | ⚠️ Faqat transkript asosida taxmin qilinadi (audio akustik tahlili yo'q) |
| Speech-to-Text | ✅ Brauzer Web Speech API (Chrome/Edge). Groq/OpenAI kaliti bo'lsa server Whisper STT ham ishlaydi |
| Text-to-Speech | ✅ Brauzer speechSynthesis |
| Vocabulary, SRS (SM-2), quiz, 6 ta o'yin | ✅ Haqiqiy, natijalar bazada saqlanadi |
| Exam mode (L → R → W, to'liq ekran, avtomatik topshirish) | ✅ Haqiqiy |
| Admin panel: foydalanuvchilar, testlar va savollar CRUD, vocabulary CRUD, AI provayder, xatolar logi, statistika | ✅ Haqiqiy |
| Premium to'lov | ⚠️ **TEST rejimi**: haqiqiy pul yechilmaydi. Test karta `4242 4242 4242 4242` (muvaffaqiyatli) va `4000 0000 0000 0002` (rad etiladi). `ENVIRONMENT=production` da test to'lov o'chadi |
| Test kontenti | ⚠️ Demo: 2 Listening, 3 Reading, 3 Writing, 2 Speaking to'plami. Original matnlar, rasmiy IELTS materiallari emas |

AI ballari **taxminiy**, rasmiy IELTS natijasi emas. Bu haqda ogohlantirish interfeysda ham ko'rsatiladi.

---

## 4. Free va Premium
- **Free:** bepul testlar (kuniga `FREE_TESTS_DAILY_LIMIT` ta), kuniga `FREE_AI_DAILY_LIMIT` ta AI so'rov, kuniga 1 ta AI Speaking baholash, vocabulary va o'yinlar, asosiy statistika.
- **Premium:** Premium mock testlar, kengaytirilgan Writing feedback (yaxshilangan essay, barcha xatolar), cheksiz AI Speaking, AI o'quv reja, batafsil statistika (haftalik/oylik, zaif tomonlar, AI tavsiyalar).

---

## 5. API (asosiy endpointlar)
`/api/auth` · `/api/profile` · `/api/dashboard` · `/api/study-plan` · `/api/tests` · `/api/listening` · `/api/reading` · `/api/writing` · `/api/speaking` · `/api/ai/chat` · `/api/ai/feedback` · `/api/vocabulary` · `/api/games` · `/api/statistics` · `/api/subscriptions` · `/api/admin`.
To'liq ro'yxat va sinab ko'rish: **http://localhost:8000/docs**. Swagger'da `POST /api/auth/login` orqali token oling, so'ng **Authorize** tugmasi bilan kiriting.

## 6. Ma'lumotlar bazasi
Jadvallar: `users, profiles, user_settings, study_plans, study_plan_tasks, tests, test_questions, test_attempts, test_answers, writing_submissions, speaking_sessions, ai_feedback, vocabulary, vocabulary_progress, user_statistics, subscriptions` va qo'shimcha `game_results, app_settings, error_logs`.
Migratsiyalar `backend/alembic/versions/` da. Model o'zgargach yangi migratsiya yaratish: `alembic revision --autogenerate -m "..."`.

## 7. Xavfsizlik
- API kalitlari va JWT siri faqat backend `.env` faylida turadi.
- Parollar bcrypt (12 round) bilan hashlanadi, parolga talab: kamida 8 belgi, harf va raqam.
- Access token qisqa muddatli. Logout va parol almashtirish `token_version` orqali barcha tokenlarni bekor qiladi. Parol tiklash havolasi bir martalik.
- Pydantic bilan input validation. SQL so'rovlar faqat SQLAlchemy ORM va parametrlar orqali (SQL injection himoyasi).
- IP bo'yicha rate limiting: auth uchun 10/daq, AI uchun 20/daq, umumiy 300/daq.
- CORS faqat `CORS_ORIGINS` da ko'rsatilgan manzillar uchun ochiq. Xavfsizlik headerlari qo'shilgan.
- Har bir foydalanuvchi faqat o'z ma'lumotlarini ko'radi (owner tekshiruvi). Admin endpointlar alohida himoyalangan.
- Production'da: `ENVIRONMENT=production`, uzun `JWT_SECRET`, `EMAIL_DEV_RETURN_LINKS=false`, HTTPS va reverse proxy.

## 8. Keyingi rivojlantirish uchun tavsiyalar
1. **Haqiqiy to'lov:** Payme / Click / Uzum (O'zbekiston) yoki Stripe. Webhook orqali `subscriptions` ni yangilash.
2. **Haqiqiy Listening audio:** professional diktor yozuvlari, S3 yoki R2 saqlash, admin panelda audio yuklash.
3. **Kontent:** Cambridge uslubidagi ko'proq testlar, har bir savolga izoh (explanation), Reading uchun matnni belgilash (highlight) va qayd yozish.
4. **Pronunciation:** audio asosida talaffuz bahosi (masalan Azure Pronunciation Assessment yoki fonema darajasidagi model).
5. **Ko'p serverli muhit:** rate limit va keshni Redis'ga o'tkazish, uzoq AI vazifalari uchun navbat (Celery yoki RQ).
6. **Refresh tokenni httpOnly cookie'da saqlash** va CSRF himoyasi.
7. **Monitoring:** Sentry, strukturalangan loglar, AI xarajatlarini kuzatish.
8. **Bildirishnomalar:** Telegram bot yoki email eslatmalar (kunlik reja, streak).
9. **i18n:** interfeysni rus va ingliz tillariga ham tarjima qilish.
10. **E2E testlar:** Playwright testlarini CI'ga qo'shish.

---

`legacy-ustoz/` papkasida avvalgi oddiy "Ingliz Ustoz" (Node.js) ilovasi saqlangan. U yangi platformadan mustaqil ishlaydi.
