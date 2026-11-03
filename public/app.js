/* Ingliz Ustoz — frontend */
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const today = () => new Date().toISOString().slice(0, 10);
  const uid = () => Math.random().toString(36).slice(2, 10);

  // ---------- Saqlash ----------
  const KEY = "inglizUstoz.v1";
  const defaults = {
    profile: null, // {name, level, goal, daily}
    sessions: [],  // {id, mode, topic, title, lessonId, messages:[{role,content}], updated}
    current: null,
    words: [],     // {en, uz, box, due, added}
    stats: { xp: 0, streak: 0, lastDay: null, lessons: [], days: {} },
    autoVoice: false,
  };
  let S;
  try { S = Object.assign(structuredClone(defaults), JSON.parse(localStorage.getItem(KEY) || "{}")); }
  catch { S = structuredClone(defaults); }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} };

  const day = () => (S.stats.days[today()] ||= { msgs: 0, lessons: 0, reviews: 0 });

  function touchStreak() {
    const t = today();
    if (S.stats.lastDay === t) return;
    const y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
    S.stats.streak = S.stats.lastDay === y ? S.stats.streak + 1 : 1;
    S.stats.lastDay = t;
  }
  function addXP(n) { S.stats.xp += n; touchStreak(); save(); }

  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg; t.classList.remove("hidden");
    clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.add("hidden"), 2200);
  }

  // ---------- Navigatsiya ----------
  function show(view) {
    $$(".view").forEach((v) => v.classList.toggle("active", v.id === "view-" + view));
    $$(".nav-btn").forEach((b) => b.classList.toggle("active", b.dataset.view === view));
    if (view === "home") renderHome();
    if (view === "lessons") renderLessons();
    if (view === "vocab") renderVocab();
    if (view === "profile") renderProfile();
    if (view === "chat") { renderChat(); setTimeout(() => $("#input").focus(), 50); }
    history.replaceState(null, "", "#" + view);
  }
  $$(".nav-btn").forEach((b) => b.addEventListener("click", () => show(b.dataset.view)));
  document.addEventListener("click", (e) => {
    const g = e.target.closest("[data-goto]");
    if (g) show(g.dataset.goto);
  });

  // ---------- Markdown (xavfsiz, minimal) ----------
  const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  function inline(s) {
    return s
      .replace(/\{\{\s*([^=}]+?)\s*=\s*([^}]+?)\s*\}\}/g, (_, en, uz) =>
        `<button class="vchip" data-en="${en}" data-uz="${uz}" title="Lug'atga qo'shish / tinglash"><b>${en}</b> <span>${uz}</span> ＋</button>`)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  }
  function md(src) {
    const lines = esc(src).split("\n");
    let html = "", list = null;
    const close = () => { if (list) { html += `</${list}>`; list = null; } };
    for (const raw of lines) {
      const l = raw.trimEnd();
      let m;
      if ((m = l.match(/^\s*[-*•]\s+(.*)/))) { if (list !== "ul") { close(); html += "<ul>"; list = "ul"; } html += `<li>${inline(m[1])}</li>`; }
      else if ((m = l.match(/^\s*\d+[.)]\s+(.*)/))) { if (list !== "ol") { close(); html += "<ol>"; list = "ol"; } html += `<li>${inline(m[1])}</li>`; }
      else if ((m = l.match(/^#{1,4}\s+(.*)/))) { close(); html += `<h4>${inline(m[1])}</h4>`; }
      else if (!l.trim()) { close(); }
      else { close(); html += `<p>${inline(l)}</p>`; }
    }
    close();
    return html;
  }
  // Ovoz uchun matnni tozalash
  const plain = (s) => s.replace(/\{\{\s*([^=}]+?)\s*=[^}]*\}\}/g, "$1").replace(/[*_`#>]/g, "").replace(/[❌✅✏️💡🙂😊👍🎉🔥]/gu, "");

  // ---------- Ovoz (TTS) ----------
  const UZ_MARK = /\b(va|uchun|bilan|bu|siz|men|biz|qanday|nima|emas|yoki|lekin|kerak|gap|so'z|to'g'ri|noto'g'ri|misol|tuzatish|maslahat|keling|yaxshi|ham|juda)\b|[oOgG]['ʻ‘’]/i;
  const EN_MARK = /\b(the|is|are|am|you|i|a|an|to|do|does|what|how|my|your|it|and|of|in|have|can|was|were|will|would|please|this|that)\b/i;
  function englishParts(text) {
    return plain(text)
      .split(/(?<=[.!?])\s+|\n+/)
      .map((s) => s.trim())
      .filter((s) => s && EN_MARK.test(s) && !UZ_MARK.test(s));
  }
  let voices = [];
  const loadVoices = () => (voices = speechSynthesis.getVoices());
  if ("speechSynthesis" in window) { loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; }
  function speak(text, lang = "en-US") {
    if (!("speechSynthesis" in window) || !text) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang; u.rate = S.profile && ["A1", "A2"].includes(S.profile.level) ? 0.85 : 0.95;
    const v = voices.find((v) => v.lang === lang) || voices.find((v) => v.lang.startsWith(lang.slice(0, 2)));
    if (v) u.voice = v;
    speechSynthesis.speak(u);
  }
  function speakMessage(text) {
    const parts = englishParts(text);
    if (!parts.length) return toast("Bu javobda inglizcha gap topilmadi");
    speak(parts.join(" "));
  }

  // ---------- Ovoz (STT) ----------
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let rec = null, listening = false;
  $("#mic").addEventListener("click", () => {
    if (!SR) return toast("Brauzeringiz ovozni tanimaydi. Chrome'dan foydalaning.");
    if (listening) { rec.stop(); return; }
    rec = new SR();
    rec.lang = $("#mic-lang").value; rec.interimResults = true; rec.continuous = false;
    const base = $("#input").value ? $("#input").value + " " : "";
    rec.onresult = (e) => {
      const t = [...e.results].map((r) => r[0].transcript).join("");
      $("#input").value = base + t; autosize();
    };
    rec.onend = () => {
      listening = false; $("#mic").classList.remove("on");
      if ($("#input").value.trim() && S.autoVoice) $("#composer").requestSubmit();
    };
    rec.onerror = (e) => { if (e.error === "not-allowed") toast("Mikrofonga ruxsat bering"); };
    listening = true; $("#mic").classList.add("on"); rec.start();
  });

  // ---------- Suhbat sessiyalari ----------
  const cur = () => S.sessions.find((s) => s.id === S.current);
  function newSession(mode = "chat", topic = "", title = "", lessonId = null) {
    const s = { id: uid(), mode, topic, title: title || MODES[mode].name, lessonId, messages: [], updated: Date.now() };
    S.sessions.unshift(s);
    S.sessions = S.sessions.slice(0, 50);
    S.current = s.id; save();
    return s;
  }
  function startSession(mode, topic, title, lessonId) {
    const s = newSession(mode, topic, title, lessonId);
    show("chat");
    sendMessage(MODES[mode].start + (topic ? ` Mavzu: ${topic}` : ""), { hidden: true, session: s });
  }

  function renderSessions() {
    const ul = $("#session-list");
    ul.innerHTML = S.sessions.length ? "" : `<li class="muted empty">Hali suhbat yo'q</li>`;
    for (const s of S.sessions) {
      const li = document.createElement("li");
      li.className = s.id === S.current ? "on" : "";
      li.innerHTML = `<button class="sess"><span>${MODES[s.mode]?.icon || "💬"}</span><span class="t">${esc(s.title)}</span></button><button class="del" title="O'chirish">✕</button>`;
      li.querySelector(".sess").onclick = () => { S.current = s.id; save(); renderChat(); $("#sessions").classList.remove("open"); };
      li.querySelector(".del").onclick = () => {
        S.sessions = S.sessions.filter((x) => x.id !== s.id);
        if (S.current === s.id) S.current = S.sessions[0]?.id || null;
        save(); renderChat();
      };
      ul.appendChild(li);
    }
  }

  function msgEl(m) {
    const d = document.createElement("div");
    d.className = "msg " + m.role;
    if (m.role === "assistant") {
      d.innerHTML = `<div class="avatar">U</div><div class="bubble">${md(m.content)}<div class="tools"><button class="tbtn say" title="Inglizcha qismini tinglash">🔊</button><button class="tbtn copy" title="Nusxa olish">📋</button></div></div>`;
      d.querySelector(".say").onclick = () => speakMessage(m.content);
      d.querySelector(".copy").onclick = () => { navigator.clipboard?.writeText(plain(m.content)); toast("Nusxa olindi"); };
    } else {
      d.innerHTML = `<div class="bubble">${esc(m.content).replace(/\n/g, "<br>")}</div>`;
    }
    return d;
  }

  function renderChat() {
    let s = cur();
    renderSessions();
    const box = $("#messages");
    box.innerHTML = "";
    $("#auto-voice").checked = S.autoVoice;
    const lvl = S.profile?.level || "B1";
    if (!s) {
      $("#chat-title").textContent = "Yangi suhbat";
      $("#chat-sub").textContent = `Ustoz · ${lvl}`;
      box.innerHTML = `<div class="welcome"><div class="logo big">U</div><h2>Qanday mashq qilamiz?</h2><p class="muted">Rejimni tanlang yoki shunchaki yozishni boshlang.</p><div class="mode-grid">${Object.entries(MODES).map(([k, v]) => `<button class="mode" data-mode="${k}"><span class="mi">${v.icon}</span><b>${v.name}</b><small>${v.desc}</small></button>`).join("")}</div></div>`;
      $$(".mode", box).forEach((b) => b.onclick = () => {
        if (b.dataset.mode === "roleplay") return pickScenario();
        startSession(b.dataset.mode);
      });
      renderSuggest(null);
      return;
    }
    $("#chat-title").textContent = s.title;
    $("#chat-sub").textContent = `${MODES[s.mode]?.name || ""} · ${lvl}`;
    s.messages.forEach((m) => { if (!m.hidden) box.appendChild(msgEl(m)); });
    renderSuggest(s);
    box.scrollTop = box.scrollHeight;
  }

  function pickScenario() {
    const box = $("#messages");
    box.innerHTML = `<div class="welcome"><h2>🎭 Vaziyatni tanlang</h2><div class="mode-grid">${SCENARIOS.map((x, i) => `<button class="mode" data-i="${i}"><span class="mi">${x.icon}</span><b>${x.t}</b></button>`).join("")}</div><button class="link" id="back-modes">← Orqaga</button></div>`;
    $$(".mode", box).forEach((b) => b.onclick = () => { const x = SCENARIOS[b.dataset.i]; startSession("roleplay", x.t, x.t); });
    $("#back-modes").onclick = () => { S.current = null; renderChat(); };
  }

  const SUGGEST = {
    chat: ["Can you correct my mistakes?", "Menga yangi so'z o'rgating", "Let's talk about travel"],
    grammar: ["Yana misol bering", "Mashqni tushunmadim", "Keyingi mavzu"],
    vocab: ["Bu so'zlar bilan gap tuzaman", "Yana 5 ta so'z", "Talaffuzini tushuntiring"],
    roleplay: ["Can you repeat that, please?", "Qanday javob bersam bo'ladi?", "Rolni almashtiramiz"],
    speaking: ["Keyingi savol", "Namuna javob ko'rsating", "Mening band balim qancha?"],
    translate: ["Keyingi gap", "Qiyinroq gap bering", "Qoidasini tushuntiring"],
  };
  function renderSuggest(s) {
    const box = $("#suggest");
    const list = s ? SUGGEST[s.mode] || SUGGEST.chat : ["Hello! How are you?", "Inglizcha qanday tez o'rgansam bo'ladi?", "Present Perfect nima?"];
    box.innerHTML = list.map((t) => `<button>${esc(t)}</button>`).join("");
    $$("button", box).forEach((b) => b.onclick = () => sendMessage(b.textContent));
  }

  // Lug'at chiplari
  $("#messages").addEventListener("click", (e) => {
    const c = e.target.closest(".vchip");
    if (!c) return;
    speak(c.dataset.en);
    addWord(c.dataset.en, c.dataset.uz);
  });

  // ---------- Xabar yuborish ----------
  let busy = false;
  async function sendMessage(text, opts = {}) {
    text = (text || "").trim();
    if (!text || busy) return;
    let s = opts.session || cur() || newSession("chat");
    if (!S.current) S.current = s.id;
    const userMsg = { role: "user", content: text };
    if (opts.hidden) userMsg.hidden = true;
    s.messages.push(userMsg);
    s.updated = Date.now();
    if (!opts.hidden) {
      day().msgs++; addXP(10);
      if (s.title === MODES[s.mode].name && s.mode === "chat" && !s.topic) s.title = text.slice(0, 40);
    }
    save();
    renderChat();

    const box = $("#messages");
    const am = { role: "assistant", content: "" };
    const el = msgEl(am);
    el.classList.add("typing");
    el.querySelector(".bubble").innerHTML = `<span class="dots"><i></i><i></i><i></i></span>`;
    box.appendChild(el);
    box.scrollTop = box.scrollHeight;
    busy = true; $("#send").disabled = true;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: s.messages.map(({ role, content }) => ({ role, content })),
          level: S.profile?.level, mode: s.mode, topic: s.topic, name: S.profile?.name,
        }),
      });
      if (!res.ok || !res.body) throw new Error((await res.json().catch(() => ({}))).error || "Server javob bermadi");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      const bubble = el.querySelector(".bubble");
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        am.content += dec.decode(value, { stream: true });
        bubble.innerHTML = md(am.content);
        const near = box.scrollHeight - box.scrollTop - box.clientHeight < 160;
        if (near) box.scrollTop = box.scrollHeight;
      }
    } catch (err) {
      am.content = am.content || `⚠️ Xatolik: ${err.message}. Server ishlayotganini tekshiring.`;
    } finally {
      busy = false; $("#send").disabled = false;
    }
    if (am.content.trim()) {
      s.messages.push(am);
      s.updated = Date.now();
      if (s.lessonId && !S.stats.lessons.includes(s.lessonId) && s.messages.filter((m) => m.role === "user" && !m.hidden).length >= 3) {
        S.stats.lessons.push(s.lessonId); day().lessons++; addXP(50); toast("🎉 Dars yakunlandi! +50 XP");
      }
      save();
    }
    renderChat();
    if (S.autoVoice && am.content) speakMessage(am.content);
  }

  const input = $("#input");
  function autosize() { input.style.height = "auto"; input.style.height = Math.min(input.scrollHeight, 160) + "px"; }
  input.addEventListener("input", autosize);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); $("#composer").requestSubmit(); }
  });
  $("#composer").addEventListener("submit", (e) => {
    e.preventDefault();
    const t = input.value; input.value = ""; autosize();
    sendMessage(t);
  });
  $("#btn-new").onclick = () => { S.current = null; save(); renderChat(); };
  $("#auto-voice").onchange = (e) => { S.autoVoice = e.target.checked; save(); };
  $("#btn-sessions").onclick = () => $("#sessions").classList.add("open");
  $("#close-sessions").onclick = () => $("#sessions").classList.remove("open");

  // ---------- Lug'at va takrorlash (Leitner) ----------
  const INTERVALS = [0, 1, 3, 7, 14, 30]; // kun
  function addWord(en, uz) {
    en = en.trim(); uz = uz.trim();
    if (!en) return;
    if (S.words.some((w) => w.en.toLowerCase() === en.toLowerCase())) return toast(`"${en}" lug'atda bor`);
    S.words.unshift({ en, uz, box: 0, due: today(), added: today() });
    addXP(5); save(); toast(`📒 "${en}" lug'atga qo'shildi`);
  }
  const dueWords = () => S.words.filter((w) => w.due <= today());

  function renderVocab() {
    $("#due-count").textContent = dueWords().length;
    const ul = $("#words");
    ul.innerHTML = S.words.length ? "" : `<li class="muted empty">Lug'at bo'sh. Suhbatdagi <b>so'z chiplarini</b> bosing yoki o'zingiz qo'shing.</li>`;
    S.words.forEach((w, i) => {
      const li = document.createElement("li");
      li.innerHTML = `<button class="tbtn" title="Tinglash">🔊</button><div class="w"><b>${esc(w.en)}</b><span>${esc(w.uz)}</span></div><div class="lv" title="O'zlashtirish">${"●".repeat(w.box)}${"○".repeat(5 - w.box)}</div><button class="del" title="O'chirish">✕</button>`;
      li.querySelector(".tbtn").onclick = () => speak(w.en);
      li.querySelector(".del").onclick = () => { S.words.splice(i, 1); save(); renderVocab(); };
      ul.appendChild(li);
    });
  }
  $("#add-word").addEventListener("submit", (e) => {
    e.preventDefault(); addWord($("#w-en").value, $("#w-uz").value);
    $("#w-en").value = $("#w-uz").value = ""; renderVocab(); $("#w-en").focus();
  });

  let queue = [], card = null;
  function nextCard() {
    card = queue.shift();
    if (!card) { endReview(); return toast("✅ Takrorlash tugadi!"); }
    const flip = Math.random() < 0.5;
    $("#flash-front").innerHTML = flip ? `<small>O'zbekchadan →</small>${esc(card.uz)}` : `<small>Inglizchadan →</small>${esc(card.en)}`;
    $("#flash-back").innerHTML = `<b>${esc(card.en)}</b><span>${esc(card.uz)}</span>`;
    $("#flash-back").classList.add("hidden");
    $("#flash-show").classList.remove("hidden");
    $("#flash-grade").classList.add("hidden");
    if (!flip) speak(card.en);
  }
  function endReview() { $("#flash").classList.add("hidden"); $("#words").classList.remove("hidden"); renderVocab(); }
  $("#btn-review").onclick = () => {
    queue = dueWords().sort(() => Math.random() - 0.5).slice(0, 20);
    if (!queue.length) return toast(S.words.length ? "Bugun takrorlash uchun so'z yo'q 👍" : "Avval lug'atga so'z qo'shing");
    $("#flash").classList.remove("hidden"); $("#words").classList.add("hidden");
    nextCard();
  };
  $("#btn-flip").onclick = () => {
    $("#flash-back").classList.remove("hidden"); $("#flash-show").classList.add("hidden"); $("#flash-grade").classList.remove("hidden");
    speak(card.en);
  };
  $$("#flash-grade button").forEach((b) => b.onclick = () => {
    const g = +b.dataset.grade;
    card.box = g === 0 ? 0 : g === 1 ? Math.max(1, card.box) : Math.min(5, card.box + 1);
    const d = new Date(); d.setDate(d.getDate() + INTERVALS[card.box]);
    card.due = g === 0 ? today() : d.toISOString().slice(0, 10);
    if (g === 0) queue.push(card);
    day().reviews++; addXP(2); save();
    nextCard();
  });
  $("#btn-end-review").onclick = endReview;

  // ---------- Darslar ----------
  let lessonLevel = null;
  function renderLessons() {
    const lvl = lessonLevel || S.profile?.level || "B1";
    $("#level-tabs").innerHTML = Object.keys(CURRICULUM).map((l) => `<button class="${l === lvl ? "on" : ""}" data-l="${l}">${l}</button>`).join("");
    $$("#level-tabs button").forEach((b) => b.onclick = () => { lessonLevel = b.dataset.l; renderLessons(); });
    const list = $("#lesson-list");
    list.innerHTML = "";
    CURRICULUM[lvl].forEach(([mode, topic, title], i) => {
      const id = `${lvl}-${i}`;
      const done = S.stats.lessons.includes(id);
      const b = document.createElement("button");
      b.className = "lesson" + (done ? " done" : "");
      b.innerHTML = `<span class="num">${done ? "✓" : i + 1}</span><span class="lt"><b>${esc(title)}</b><small>${MODES[mode].icon} ${MODES[mode].name} · ${esc(topic)}</small></span><span class="go">▶</span>`;
      b.onclick = () => startSession(mode, topic, title, id);
      list.appendChild(b);
    });
  }
  function nextLesson() {
    const lvl = S.profile?.level || "B1";
    const i = CURRICULUM[lvl].findIndex((_, i) => !S.stats.lessons.includes(`${lvl}-${i}`));
    return i < 0 ? null : { lvl, i, l: CURRICULUM[lvl][i] };
  }

  // ---------- Bosh sahifa ----------
  function renderHome() {
    const p = S.profile || {};
    const h = new Date().getHours();
    const greet = h < 12 ? "Xayrli tong" : h < 18 ? "Xayrli kun" : "Xayrli kech";
    $("#hello").textContent = `${greet}, ${p.name || "do'stim"}! 👋`;
    const goalTxt = { study: "o'qish va IELTS", work: "ish va karyera", travel: "sayohat", talk: "erkin suhbat" }[p.goal] || "ingliz tili";
    $("#hello-sub").textContent = `Maqsad: ${goalTxt} · ${p.level || "B1"} darajasidan yuqoriga.`;
    $("#streak").textContent = S.stats.lastDay && (S.stats.lastDay === today() || S.stats.lastDay === new Date(Date.now() - 864e5).toISOString().slice(0, 10)) ? S.stats.streak : 0;
    $("#st-xp").textContent = S.stats.xp;
    $("#st-level").textContent = p.level || "B1";
    $("#st-words").textContent = S.words.length;
    $("#st-lessons").textContent = S.stats.lessons.length;

    const daily = +(p.daily || 20);
    const d = day();
    const msgGoal = Math.round(daily / 2);
    const tasks = [
      { t: `Ustoz bilan ${msgGoal} ta xabar almashing`, n: d.msgs, of: msgGoal, act: () => { S.current = null; show("chat"); } },
      { t: "Bitta darsni yakunlang", n: d.lessons, of: 1, act: () => { const n = nextLesson(); n ? startSession(n.l[0], n.l[1], n.l[2], `${n.lvl}-${n.i}`) : show("lessons"); } },
      { t: "Lug'atdan 5 ta so'zni takrorlang", n: d.reviews, of: 5, act: () => { show("vocab"); $("#btn-review").click(); } },
    ];
    let pct = 0;
    $("#tasks").innerHTML = "";
    tasks.forEach((x) => {
      const ok = x.n >= x.of;
      pct += Math.min(1, x.n / x.of) / tasks.length;
      const li = document.createElement("li");
      li.className = ok ? "done" : "";
      li.innerHTML = `<span class="check">${ok ? "✓" : ""}</span><span class="tt">${x.t}<small>${Math.min(x.n, x.of)} / ${x.of}</small></span><button class="btn small">${ok ? "Yana" : "Boshlash"}</button>`;
      li.querySelector("button").onclick = x.act;
      $("#tasks").appendChild(li);
    });
    $("#daily-pct").textContent = Math.round(pct * 100) + "%";
    $("#daily-bar").style.width = Math.round(pct * 100) + "%";

    const n = nextLesson();
    $("#next-lesson").innerHTML = n
      ? `<button class="lesson big"><span class="num">${n.i + 1}</span><span class="lt"><b>${esc(n.l[2])}</b><small>${MODES[n.l[0]].icon} ${MODES[n.l[0]].name} · ${esc(n.l[1])}</small></span><span class="go">▶</span></button>`
      : `<p class="muted">🎉 ${n === null ? "Bu darajadagi barcha darslar tugadi! Profilda keyingi darajani tanlang." : ""}</p>`;
    if (n) $("#next-lesson .lesson").onclick = () => startSession(n.l[0], n.l[1], n.l[2], `${n.lvl}-${n.i}`);

    $("#quick").innerHTML = Object.entries(MODES).map(([k, v]) => `<button class="mode" data-mode="${k}"><span class="mi">${v.icon}</span><b>${v.name}</b><small>${v.desc}</small></button>`).join("");
    $$("#quick .mode").forEach((b) => b.onclick = () => {
      if (b.dataset.mode === "roleplay") { S.current = null; show("chat"); return pickScenario(); }
      startSession(b.dataset.mode);
    });
  }

  // ---------- Profil ----------
  function renderProfile() {
    const p = S.profile || {};
    $("#p-name").value = p.name || "";
    $("#p-level").value = p.level || "B1";
    $("#p-goal").value = p.goal || "study";
    $("#p-daily").value = p.daily || "20";
  }
  $("#profile-form").addEventListener("submit", (e) => {
    e.preventDefault();
    S.profile = { name: $("#p-name").value.trim(), level: $("#p-level").value, goal: $("#p-goal").value, daily: $("#p-daily").value };
    lessonLevel = null; save(); toast("Saqlandi ✓");
  });
  $("#btn-reset").onclick = () => {
    if (!confirm("Rostdan ham barcha ma'lumotlarni o'chirasizmi?")) return;
    try { localStorage.removeItem(KEY); } catch {}
    location.hash = ""; location.reload();
  };

  // ---------- Tanishuv (birinchi kirish) ----------
  function chips(id) {
    $$(`#${id} button`).forEach((b) => b.onclick = () => { $$(`#${id} button`).forEach((x) => x.classList.remove("on")); b.classList.add("on"); });
  }
  function onboard() {
    const q = new URLSearchParams(location.search);
    const preLevel = (q.get("target") || q.get("level") || "").toUpperCase();
    const preGoal = q.get("goal");
    if (preLevel) $$("#o-levels button").forEach((b) => b.classList.toggle("on", b.dataset.v === preLevel));
    if (preGoal) $$("#o-goals button").forEach((b) => b.classList.toggle("on", b.dataset.v === preGoal));
    chips("o-levels"); chips("o-goals");
    $("#onboard").classList.remove("hidden");
    $("#o-name").focus();
    $("#onboard-form").onsubmit = (e) => {
      e.preventDefault();
      S.profile = {
        name: $("#o-name").value.trim(),
        level: $("#o-levels .on")?.dataset.v || "B1",
        goal: $("#o-goals .on")?.dataset.v || "study",
        daily: "20",
      };
      save();
      $("#onboard").classList.add("hidden");
      show("home");
    };
  }

  // ---------- Ishga tushirish ----------
  const start = (location.hash || "#home").slice(1);
  show(["home", "chat", "lessons", "vocab", "profile"].includes(start) ? start : "home");
  if (!S.profile) onboard();
  fetch("/api/health").then((r) => r.json()).then((h) => { if (!h.key) toast("⚠️ Serverda ANTHROPIC_API_KEY o'rnatilmagan"); }).catch(() => {});
})();
