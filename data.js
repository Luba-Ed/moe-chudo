// Слой данных: Supabase (рабочий режим) или localStorage (демо-режим).
// Оба отдают одинаковые функции, app.js не знает, какой работает.

const SASHA_DEFAULT = {
  key: "sasha",
  lessons: {
    0: ["Разговоры о важном", "Письмо", "Азбука", "Математика", "ИЗО"],
    1: ["Письмо", "Азбука", "Физ-ра", "Математика", "Окружающий мир"],
    2: ["Письмо", "Азбука", "Математика", "Музыка", "Орлята России"],
    3: ["Математика", "Физ-ра", "Письмо", "Труд", "Мой родной русский язык"],
    4: ["Физ-ра", "Письмо", "Азбука", "Окружающий мир", "Мы раскрасим целый мир"],
  },
  bells: ["8:30–9:10", "9:25–10:05", "10:20–11:00", "11:20–12:00", "12:15–12:55", "13:05–13:45"],
  bring: { 1: ["Форма на физ-ру"], 3: ["Форма на физ-ру"], 4: ["Форма на физ-ру"] },
};
const BREAKS_DEFAULT = {
  key: "breaks",
  list: [
    { from: "2026-11-04", to: "2026-11-04", title: "День народного единства" },
    { from: "2026-12-29", to: "2027-01-11", title: "Зимние каникулы" },
    { from: "2027-02-15", to: "2027-02-21", title: "Доп. каникулы 1 класса (уточнить)" },
    { from: "2027-02-23", to: "2027-02-23", title: "День защитника Отечества" },
    { from: "2027-03-08", to: "2027-03-08", title: "8 Марта" },
    { from: "2027-03-22", to: "2027-03-29", title: "Весенние каникулы (уточнить)" },
    { from: "2027-05-01", to: "2027-05-03", title: "Майские" },
    { from: "2027-05-09", to: "2027-05-11", title: "День Победы" },
    { from: "2027-05-26", to: "2027-08-31", title: "Летние каникулы" },
  ],
};

const blobToDataURL = (blob) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob); });
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));

/* ---------------- демо-режим ---------------- */
function demoDB() {
  const KEY = "pazlik-demo-v2";
  const SKEY = "pazlik-demo-session";
  let db;
  try { db = JSON.parse(localStorage.getItem(KEY)); } catch { db = null; }
  if (!db) db = seed();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); return true; } catch { return false; } };
  save();
  let listeners = [];

  function seed() {
    const p2 = (n) => String(n).padStart(2, "0");
    const iso = (d) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
    const t = new Date(); t.setHours(0, 0, 0, 0);
    const day = (n) => { const d = new Date(t); d.setDate(d.getDate() + n); return iso(d); };
    const mon = new Date(t); mon.setDate(t.getDate() - ((t.getDay() + 6) % 7));
    const wk = (w, n) => { const d = new Date(mon); d.setDate(mon.getDate() + w * 7 + n); return iso(d); };
    const start = iso(new Date(t.getFullYear(), t.getMonth() - 1, 1));
    const ev = (by, vis, data) => ({ id: uid(), type: "event", vis, created_by: by, data: { by, ...data } });
    const task = (by, vis, data) => ({ id: uid(), type: "task", vis, created_by: by, data: { by, status: "open", ...data } });
    const nextWed = wk(0, 2) >= day(0) ? wk(0, 2) : wk(1, 2);
    const ym = (d) => d.slice(0, 7);
    const mk = (type, by, vis, data) => ({ id: uid(), type, vis, created_by: by, data: { by, ...data } });
    const extra = () => {
      // деньги: обязательные платежи; всё, что раньше сегодняшнего числа, кроме продлёнки, уже оплачено
      const tm = ym(day(0)), td = t.getDate();
      const pay = (title, amount, dayN, cat, payer, more = {}) => mk("payment", "luba", "shared", {
        title, amount, kind: "monthly", day: dayN, cat, payer, remind: 3, ...more,
        paid: dayN < td && title !== "Продлёнка" ? { [tm]: { on: iso(new Date(t.getFullYear(), t.getMonth(), dayN)), by: payer === "any" ? "luba" : payer, amount } } : {},
      });
      const w = (owner, sphere, title, target) => ({ id: uid(), type: "wheel", vis: "shared", created_by: owner === "zhenya" ? "zhenya" : "luba", data: { by: owner === "zhenya" ? "zhenya" : "luba", kind: "item", owner, sphere, title, target } });
      const wl = [
        w("luba", "Спорт", "Растяжка", 4), w("luba", "Спорт", "Пилатес", 2), w("luba", "Спорт", "Прогулка 8000 шагов", 5),
        w("luba", "Работа", "Глубокая работа 2 часа", 5), w("luba", "Служение", "Служение", 1), w("luba", "Дом", "Уборка", 2),
        w("luba", "Отдых", "Ванна и книга", 2), w("luba", "Мы", "Свидание", 1), w("luba", "Развитие", "Курс по типографике", 3), w("luba", "Здоровье", "Сон до 23:30", 5),
        w("zhenya", "Спорт", "Зал", 3), w("zhenya", "Работа", "Проекты", 5), w("zhenya", "Служение", "Встреча группы", 1), w("zhenya", "Развитие", "Английский", 3), w("zhenya", "Мы", "Свидание", 1),
        w("we", "Мы", "Свидание", 1), w("we", "Мы", "Планёрка «Мы»", 1), w("we", "Отдых", "Выходной без дел", 1), w("we", "Дом", "Закупка на неделю", 1), w("we", "Спорт", "Прогулка втроём", 1),
      ];
      const stretch = wl[0].id, walk = wl[2].id, gym = wl[10].id;
      const past = [0, 1, 2, 3, 4, 5, 6].map((n) => wk(0, n)).filter((d) => d < day(0));
      return [
        { id: uid(), type: "kv", vis: "shared", created_by: null, data: { key: "budget", salary_days: [10, 25] } },
        pay("Кредит", 18400, 28, "credit", "zhenya", { debt: 1240000 }),
        pay("Гимнастика", 4500, 25, "sasha", "luba"),
        pay("Вокал и фортепиано", 6000, 1, "sasha", "luba"),
        pay("Продлёнка", 3200, 3, "sasha", "zhenya"),
        pay("Коммуналка", 7800, 15, "home", "zhenya"),
        pay("Интернет и связь", 1200, 5, "home", "any"),
        mk("payment", "zhenya", "shared", { title: "ОСАГО", amount: 9600, kind: "yearly", date: `${t.getFullYear() + 1}-03-14`, cat: "transport", payer: "zhenya", remind: 14, paid: {} }),
        mk("money", "luba", "shared", { kind: "income", amount: 95000, date: day(-12), cat: "salary", note: "Зарплата" }),
        mk("money", "zhenya", "shared", { kind: "income", amount: 110000, date: day(-12), cat: "salary", note: "Зарплата" }),
        mk("money", "luba", "shared", { kind: "expense", amount: 12400, date: day(-6), cat: "products", note: "Продукты на неделю" }),
        mk("money", "zhenya", "shared", { kind: "expense", amount: 3900, date: day(-4), cat: "clothes", note: "Колготки и купальник Саше" }),
        mk("money", "luba", "shared", { kind: "expense", amount: 1250, date: day(-3), cat: "health", note: "Аптека" }),
        mk("money", "zhenya", "shared", { kind: "expense", amount: 2100, date: day(-1), cat: "cafe", note: "Кафе втроём" }),
        mk("money", "luba", "shared", { kind: "expense", amount: 8700, date: day(-1), cat: "products", note: "Продукты" }),
        // здоровье
        mk("pill", "luba", "shared", { who: "luba", name: "Витамин D", dose: "2000 МЕ", times: ["08:00"], start: day(-60), log: { [day(0)]: ["08:00"] } }),
        mk("pill", "luba", "shared", { who: "luba", name: "Железо", dose: "1 таблетка", times: ["13:00"], start: day(-12), end: day(17), log: {} }),
        mk("pill", "luba", "shared", { who: "luba", name: "Омега-3", dose: "2 капсулы", times: ["20:00"], start: day(-30), log: {} }),
        mk("pill", "zhenya", "shared", { who: "zhenya", name: "Магний", dose: "400 мг", times: ["21:00"], start: day(-20), log: {} }),
        mk("pill", "luba", "shared", { who: "sasha", name: "Детские витамины", dose: "1 жевательная", times: ["08:00"], start: day(-40), log: { [day(0)]: ["08:00"] } }),
        mk("cycle", "luba", "visible", { periods: [{ start: day(-73), end: day(-69) }, { start: day(-45), end: day(-41) }, { start: day(-17), end: day(-13) }], days: {} }),
        // баланс и цели
        ...wl,
        ...past.slice(0, 2).map((d) => ev("luba", "visible", { title: "Растяжка", cat: "self", who: "luba", date: d, start: "20:00", end: "20:20", wheel: stretch, done_dates: [d] })),
        ev("luba", "visible", { title: "Растяжка", cat: "self", who: "luba", date: day(1), start: "20:00", end: "20:20", wheel: stretch }),
        ...past.slice(0, 3).map((d) => ev("luba", "visible", { title: "Прогулка 8000 шагов", cat: "self", who: "luba", date: d, all_day: true, wheel: walk, done_dates: [d] })),
        ev("zhenya", "visible", { title: "Зал", cat: "self", who: "zhenya", date: day(2), start: "19:00", end: "20:00", wheel: gym }),
        mk("goal", "luba", "shared", { owner: "we", sphere: "Отдых", title: "Отпуск летом", mode: "num", current: 76, target: 200, unit: "тыс ₽", deadline: `${t.getFullYear() + 1}-06-01` }),
        mk("goal", "luba", "shared", { owner: "sasha", sphere: "Спорт", title: "Шпагат к весне", mode: "steps", steps: [{ t: "Растяжка каждый день 2 недели", done: true }, { t: "Полушпагат", done: true }, { t: "Поперечный шпагат", done: false }, { t: "Продольный шпагат", done: false }], deadline: `${t.getFullYear() + 1}-03-31` }),
        mk("goal", "luba", "visible", { owner: "luba", sphere: "Развитие", title: "Курс по типографике", mode: "num", current: 9, target: 20, unit: "уроков" }),
        mk("goal", "zhenya", "visible", { owner: "zhenya", sphere: "Спорт", title: "Зал 3 раза в неделю", mode: "num", current: 7, target: 10, unit: "недель" }),
        // хранилище
        mk("card", "luba", "shared", { name: "Пятёрочка", number: "277000123456", format: "ean13", color: "#d7262f", owner: "we" }),
        mk("card", "luba", "shared", { name: "Перекрёсток", number: "778900314455", format: "ean13", color: "#1f7a3a", owner: "we" }),
        mk("card", "luba", "shared", { name: "Аптека Ригла", number: "RG4601223300", format: "code128", color: "#2d6db5", owner: "luba" }),
        mk("card", "luba", "shared", { name: "Детский мир", number: "992100457761", format: "ean13", color: "#3c5ea8", owner: "we" }),
        mk("card", "zhenya", "shared", { name: "Лента", number: "602388124409", format: "ean13", color: "#1b3f8f", owner: "zhenya" }),
        mk("card", "luba", "shared", { name: "Золотое яблоко", number: "GA-3310-7720-5584", format: "qr", color: "#9c7a3c", owner: "luba" }),
        mk("doc", "zhenya", "shared", { title: "ОСАГО", folder: "car", owner: "we", expires: day(20), number: "ХХХ 0123456789", files: [], note: "Продлить за 2 недели" }),
        mk("doc", "luba", "shared", { title: "Полис ОМС Саши", folder: "sasha", owner: "sasha", expires: "", files: [] }),
        mk("doc", "luba", "shared", { title: "Справка для гимнастики", folder: "sasha", owner: "sasha", expires: day(45), files: [] }),
        mk("doc", "luba", "visible", { title: "Паспорт Любы", folder: "ids", owner: "luba", expires: "2031-05-12", files: [] }),
        mk("list", "luba", "shared", { title: "Покупки", sub: "продукты и дом", kind: "shop", anyone: true, items: [
          { id: uid(), t: "Молоко", by: "luba" }, { id: uid(), t: "Яблоки", by: "zhenya" }, { id: uid(), t: "Порошок для стирки", by: "luba" }, { id: uid(), t: "Хлеб", by: "luba", done: true, done_by: "zhenya" }] }),
        mk("list", "luba", "shared", { title: "Покупки для Саши", sub: "рост 128, обувь 31", kind: "shop", anyone: true, items: [
          { id: uid(), t: "Купальник для выступления", by: "zhenya" }, { id: uid(), t: "Чешки", by: "luba" }, { id: uid(), t: "Тетради в косую линию", by: "luba" }] }),
        mk("list", "luba", "shared", { title: "Куда сходить", sub: "этой зимой", kind: "list", anyone: true, items: [
          { id: uid(), t: "Каток в парке", by: "luba", date: day(6) }, { id: uid(), t: "Театр кукол с Сашей", by: "zhenya" }, { id: uid(), t: "Новогодняя ярмарка", by: "luba" }] }),
        mk("list", "luba", "shared", { title: "Хотелки Любы", sub: "идеи подарков", kind: "wish", owner: "luba", anyone: true, items: [
          { id: uid(), t: "Массаж", by: "luba" }, { id: uid(), t: "Книга по типографике", by: "luba" }, { id: uid(), t: "Цветы без повода", by: "luba" }] }),
        mk("list", "zhenya", "shared", { title: "Хотелки Жени", sub: "идеи подарков", kind: "wish", owner: "zhenya", anyone: true, items: [
          { id: uid(), t: "Наушники для бега", by: "zhenya" }, { id: uid(), t: "Билеты на футбол", by: "zhenya" }] }),
      ];
    };
    return {
      items: [
        { id: uid(), type: "kv", vis: "shared", created_by: null, data: SASHA_DEFAULT },
        { id: uid(), type: "kv", vis: "shared", created_by: null, data: BREAKS_DEFAULT },
        ev("luba", "shared", { title: "Школа", cat: "sasha", who: "sasha", date: start, start: "08:30", end: "13:30", routine: true, skip_breaks: true, repeat: { days: [0, 1, 2, 3, 4] }, drop: "zhenya", from: "Дом", to: "Школа" }),
        ev("luba", "shared", { title: "Гимнастика", cat: "sasha", who: "sasha", date: start, start: "13:30", end: "14:30", skip_breaks: true, repeat: { days: [0, 2, 4] }, drop: "babushka", pick: "luba", from: "Школа", to: "Зал", overrides: { [nextWed]: { drop: "babushka", pick: "" } } }),
        ev("luba", "shared", { title: "Вокал", cat: "sasha", who: "sasha", date: start, start: "16:00", end: "17:00", skip_breaks: true, repeat: { days: [1] }, drop: "luba", pick: "zhenya", from: "Дом", to: "Музыкальная школа" }),
        ev("zhenya", "shared", { title: "Фортепиано", cat: "sasha", who: "sasha", date: start, start: "16:00", end: "17:00", skip_breaks: true, repeat: { days: [3] }, drop: "zhenya", pick: "zhenya", from: "Дом", to: "Музыкальная школа" }),
        ev("luba", "visible", { title: "Планёрка CAST", cat: "work", who: "luba", date: start, start: "10:00", end: "11:00", repeat: { days: [0] } }),
        ev("zhenya", "visible", { title: "Зал", cat: "self", who: "zhenya", date: start, start: "08:00", end: "09:00", repeat: { days: [1, 3] } }),
        ev("luba", "shared", { title: "Служение", cat: "serv", who: "we", date: start, start: "11:00", end: "13:00", repeat: { days: [6] } }),
        ev("luba", "shared", { title: "Планёрка «Мы»", cat: "self", who: "we", date: start, start: "20:00", end: "20:30", repeat: { days: [6] } }),
        ev("luba", "shared", { title: "Стоматолог", cat: "care", who: "sasha", date: day(3), start: "15:30", end: "16:15", drop: "luba", pick: "luba", from: "Дом", to: "Клиника", note: "Взять полис" }),
        ev("luba", "shared", { title: "Свидание", cat: "self", who: "we", date: wk(0, 5), start: "19:00", end: "22:00" }),
        ev("luba", "visible", { title: "Бизнес-встреча", cat: "work", who: "luba", date: day(2), start: "12:00", end: "13:30" }),
        ev("luba", "shared", { title: "Выступление по гимнастике", cat: "sasha", who: "sasha", date: day(20), start: "12:00", end: "14:00", drop: "luba", pick: "zhenya", note: "Купальник, пучок, взнос" }),
        ev("zhenya", "shared", { title: "Поездка к родителям", cat: "care", who: "we", date: day(12), end_date: day(14), all_day: true }),
        task("zhenya", "shared", { title: "Оплатить продлёнку", cat: "care", assignee: "zhenya", due: day(-4), important: true }),
        task("zhenya", "shared", { title: "Купить купальник Саше", cat: "sasha", assignee: "luba", due: day(0), status: "asked", note: "Размер 128" }),
        task("luba", "shared", { title: "Записать машину на шиномонтаж", cat: "care", assignee: "zhenya", due: day(1), status: "accepted" }),
        task("luba", "visible", { title: "Проверить макеты команды", cat: "work", assignee: "luba", due: day(0) }),
        task("luba", "shared", { title: "Решить, кто забирает Сашу в среду", cat: "sasha", assignee: "we", due: day(0), important: true }),
        task("luba", "shared", { title: "Повторить стихотворение с Сашей", cat: "sasha", assignee: "zhenya", due: day(0), status: "accepted" }),
        task("luba", "visible", { title: "Растяжка 20 минут", cat: "self", assignee: "luba", due: day(0), status: "done" }),
        task("luba", "private", { title: "Подарок Жене на годовщину", cat: "self", assignee: "luba" }),
        task("zhenya", "shared", { title: "Список продуктов на неделю", cat: "care", assignee: "we", due: day(0), status: "done" }),
        task("zhenya", "visible", { title: "Подготовить служение", cat: "serv", assignee: "zhenya", due: day(1) }),
        ...extra(),
      ],
    };
  }

  const notify = () => listeners.forEach((f) => f());
  const visibleTo = (me) => (i) => i.vis !== "private" || i.created_by === me;

  return {
    demo: true,
    async session() {
      let p; try { p = localStorage.getItem(SKEY); } catch {}
      return p ? { id: p, person: p } : null;
    },
    async demoLogin(person) { try { localStorage.setItem(SKEY, person); } catch {} return { id: person, person }; },
    async signOut() { try { localStorage.removeItem(SKEY); } catch {} },
    async load(me) { return JSON.parse(JSON.stringify(db.items.filter(visibleTo(me.id)))); },
    async save(item, me) {
      const i = db.items.findIndex((x) => x.id === item.id);
      const clean = JSON.parse(JSON.stringify(item));
      if (i >= 0) db.items[i] = { ...db.items[i], ...clean };
      else db.items.push({ id: uid(), created_by: me.id, ...clean });
      if (!save()) { db = JSON.parse(localStorage.getItem(KEY)); throw new Error("в демо-режиме закончилось место (фото занимают много). В общей базе такого ограничения нет"); }
      notify();
    },
    async remove(id) { db.items = db.items.filter((x) => x.id !== id); save(); notify(); },
    subscribe(fn) { listeners.push(fn); window.addEventListener("storage", (e) => { if (e.key === KEY) { try { db = JSON.parse(e.newValue); } catch {} fn(); } }); },
    reset() { try { localStorage.removeItem(KEY); } catch {} location.reload(); },
    // в демо фото хранится прямо в браузере, поэтому место ограничено (~5 МБ на всё)
    async upload(blob) { return await blobToDataURL(blob); },
    async fileUrl(ref) { return ref; },
    async removeFile() {},
  };
}

/* ---------------- Supabase ---------------- */
function supaDB() {
  const sb = window.supabase.createClient(window.CONFIG.SUPABASE_URL, window.CONFIG.SUPABASE_ANON_KEY);
  const ok = ({ data, error }) => { if (error) throw error; return data; };
  return {
    demo: false,
    async session() {
      const { data } = await sb.auth.getSession();
      const u = data.session?.user;
      if (!u) return null;
      const p = ok(await sb.from("profiles").select("person,name").eq("id", u.id).maybeSingle());
      return { id: u.id, email: u.email, person: p?.person || null };
    },
    async signIn(email, password) { ok(await sb.auth.signInWithPassword({ email, password })); },
    async signOut() { await sb.auth.signOut(); },
    async load() { return ok(await sb.from("items").select("id,type,vis,created_by,data").order("created_at")); },
    async save(item) {
      const row = { type: item.type, vis: item.vis, data: item.data };
      // id может быть задан заранее (например, расход, созданный кнопкой «Оплатить»)
      if (item.id) {
        const upd = ok(await sb.from("items").update(row).eq("id", item.id).select("id"));
        if (!upd.length) ok(await sb.from("items").insert({ id: item.id, ...row }));
      } else ok(await sb.from("items").insert(row));
    },
    async remove(id) { ok(await sb.from("items").delete().eq("id", id)); },
    subscribe(fn) {
      let t;
      sb.channel("items").on("postgres_changes", { event: "*", schema: "public", table: "items" }, () => { clearTimeout(t); t = setTimeout(fn, 250); }).subscribe();
    },
    async upload(blob) {
      const path = `${uid()}.${blob.type === "application/pdf" ? "pdf" : "jpg"}`;
      ok(await sb.storage.from("docs").upload(path, blob, { contentType: blob.type }));
      return "sb:" + path;
    },
    async fileUrl(ref) {
      if (!ref.startsWith("sb:")) return ref;
      const { data } = await sb.storage.from("docs").createSignedUrl(ref.slice(3), 3600);
      return data?.signedUrl || "";
    },
    async removeFile(ref) { if (ref?.startsWith("sb:")) await sb.storage.from("docs").remove([ref.slice(3)]); },
  };
}

const DB = window.CONFIG?.SUPABASE_URL && window.supabase ? supaDB() : demoDB();
