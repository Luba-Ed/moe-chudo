// «Моё чудо» — семейный планер Любы и Жени. Этап 1: календарь, «Сегодня», задачи, Саша.

const MONTHS = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
const MGEN = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
const WDS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const WDL = ["понедельник", "вторник", "среда", "четверг", "пятница", "суббота", "воскресенье"];
const WDN = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"];
const PEOPLE = {
  luba: { n: "Люба", c: "var(--luba)" }, zhenya: { n: "Женя", c: "var(--zhenya)" }, we: { n: "Мы", c: "var(--we)" },
  sasha: { n: "Саша", c: "var(--sasha)" }, babushka: { n: "Бабушка", c: "var(--babushka)" }, self: { n: "Сама", c: "var(--muted)" },
};
const CATS = [{ k: "work", n: "Работа" }, { k: "care", n: "Забота" }, { k: "sasha", n: "Саша" }, { k: "serv", n: "Служение" }, { k: "self", n: "Личное" }];
const catName = (k) => CATS.find((c) => c.k === k)?.n || "";
// тип задачи: что именно надо сделать (первым — «без выбора»)
const TASK_KINDS = [["", "Без выбора"], ["do", "Сделать"], ["call", "Созвониться"], ["pay", "Оплатить"], ["meet", "Встретиться"], ["plan", "Планёрка"]];
const kindName = (k) => (k ? TASK_KINDS.find((x) => x[0] === k)?.[1] || "" : "");
const catC = (k) => `var(--c-${k || "self"})`;
const VERB = { luba: { set: "поставила", take: "взяла", ask: "просит", no: "не успевает", talk: "хочет обсудить" }, zhenya: { set: "поставил", take: "взял", ask: "просит", no: "не успевает", talk: "хочет обсудить" } };
const PICKS = [["", "не назначено"], ["luba", "Люба"], ["zhenya", "Женя"], ["we", "Вместе"], ["babushka", "Бабушка"], ["self", "Сама / с тренером"]];
const ICONS = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3.5" y="4.5" width="17" height="16" rx="3"/><path d="M3.5 9.5h17M8 2.5v4M16 2.5v4"/><circle cx="12" cy="15" r="1.6" fill="currentColor"/></svg>',
  tasks: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="6" cy="7" r="2.5"/><path d="m4.9 7 .8.8 1.5-1.6"/><circle cx="6" cy="17" r="2.5"/><path d="M11 7h9M11 17h9"/></svg>',
  sasha: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="8" r="4"/><path d="M4.5 21c1-4 4-6 7.5-6s6.5 2 7.5 6"/></svg>',
  money: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="2.5" y="6" width="19" height="13" rx="3"/><path d="M2.5 10.5h19"/><path d="M6.5 15h4"/></svg>',
  more: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>',
};
const NAV_DESK = [["home", "Сегодня"], ["tasks", "Задачи"], ["sasha", "Саша"], ["money", "Деньги"], ["health", "Здоровье"], ["balance", "Баланс"], ["lists", "Списки"], ["more", "Ещё"]];
const NAV_MOB = [["home", "Сегодня"], ["tasks", "Задачи"], ["sasha", "Саша"], ["money", "Деньги"], ["more", "Ещё"]];
const SUBPAGES = ["health", "balance", "lists", "docs", "bdays"];

/* ---------- утилиты ---------- */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const addD = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const wd = (d) => (d.getDay() + 6) % 7;
const mondayOf = (d) => addD(d, -wd(d));
const fmtDate = (ds) => { const d = parse(ds); return `${d.getDate()} ${MGEN[d.getMonth()]}`; };
const fmtShort = (ds) => { const d = parse(ds); return `${WDS[wd(d)]} ${d.getDate()} ${MGEN[d.getMonth()]}`; };
const fmtLong = (ds) => { const d = parse(ds); return `${WDL[wd(d)]}, ${d.getDate()} ${MGEN[d.getMonth()]}`; };
const rangeLabel = (a) => { const b = addD(a, 6); return `${a.getDate()}${a.getMonth() !== b.getMonth() ? " " + MGEN[a.getMonth()] : ""}–${b.getDate()} ${MGEN[b.getMonth()]}`; };
const timeLabel = (o) => (o.all_day ? "весь день" : o.start ? (o.end ? `${o.start}–${o.end}` : o.start) : "");

const S = { me: null, items: [], tab: "home", view: "week", cursor: today(), sel: today(), filter: "all", ttab: "mine", sweek: 0, editLessons: false, editBreaks: null, fab: false };

function toast(msg) {
  const el = $("#toast"); el.textContent = msg; el.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => (el.hidden = true), 2400);
}
async function guard(fn) { try { return await fn(); } catch (e) { console.error(e); toast("Ошибка: " + (e.message || e)); } }

/* ---------- данные ---------- */
const partner = () => (S.me.person === "luba" ? "zhenya" : "luba");
const pn = (p) => PEOPLE[p]?.n || "";
const kv = (key) => S.items.find((i) => i.type === "kv" && i.data.key === key);
const sashaInfo = () => kv("sasha")?.data || SASHA_DEFAULT;
const breaks = () => kv("breaks")?.data.list || [];
const inBreak = (ds) => breaks().find((b) => ds >= b.from && ds <= (b.to || b.from));
const events = () => S.items.filter((i) => i.type === "event");
const tasks = () => S.items.filter((i) => i.type === "task");
const canEdit = (it) => it.created_by === S.me.id || it.vis === "shared" || it.data.assignee === S.me.person;

function occursOn(e, ds) {
  const d = e.data;
  if (!d.date) return false;
  if (d.repeat && d.repeat.days?.length) {
    if (ds < d.date) return false;
    if (d.repeat.until && ds > d.repeat.until) return false;
    if (!d.repeat.days.includes(wd(parse(ds)))) return false;
    if ((d.exceptions || []).includes(ds)) return false;
    if (d.skip_breaks && inBreak(ds)) return false;
    return true;
  }
  return ds >= d.date && ds <= (d.end_date || d.date);
}
const occ = (e, ds) => ({ ...e.data, ...((e.data.overrides || {})[ds] || {}), item: e, ds });
function passFilter(o) {
  const f = S.filter;
  if (f === "all") return true;
  if (f === "sasha") return o.who === "sasha" || o.cat === "sasha";
  if (f === "we") return o.who === "we";
  return o.who === f || o.who === "we" || o.drop === f || o.pick === f;
}
function passTask(t) {
  const f = S.filter, d = t.data;
  if (f === "all") return true;
  if (f === "sasha") return d.cat === "sasha";
  if (f === "we") return d.assignee === "we";
  return d.assignee === f || d.assignee === "we";
}
const byTime = (a, b) => (a.all_day === b.all_day ? (a.start || "99").localeCompare(b.start || "99") : a.all_day ? -1 : 1);
const eventsOn = (ds, all = false) => events().filter((e) => occursOn(e, ds)).map((e) => occ(e, ds)).filter((o) => all || passFilter(o)).sort(byTime);
function extrasOn(ds) {
  const out = [], f = S.filter;
  payments().forEach((p) => { if (payDueOn(p, ds) && (f === "all" || f === "we" || p.data.payer === f || p.data.payer === "any" || (f === "sasha" && p.data.cat === "sasha"))) {
    const paid = !!p.data.paid?.[payKey(p, ds)];
    out.push({ kind: "pay", id: p.id, title: +p.data.amount > 0 ? `${p.data.title} · ${rub(p.data.amount)}` : p.data.title, short: `₽ ${p.data.title}`, paid, over: !paid && ds < iso(today()) });
  } });
  if (f === "all" || f === "we") listItemsOn(ds).forEach(({ l, i }) => out.push({ kind: "list", id: l.id, title: i.t, short: i.t, paid: i.done }));
  docs().forEach((d) => { if (d.data.expires === ds) out.push({ kind: "doc", id: d.id, title: `Истекает: ${d.data.title}`, short: `Срок: ${d.data.title}` }); });
  bdaysOn(ds).forEach((b) => { const age = bdayAge(b, ds); out.push({ kind: "bday", id: b.id, title: `ДР: ${b.name}${age ? ` (${age})` : ""}`, short: `ДР: ${b.name}` }); });
  return out;
}
const extraAttr = (x) => (x.kind === "pay" ? `data-pay-open="${x.id}"` : x.kind === "doc" ? `data-open-doc="${x.id}"` : x.kind === "bday" ? `data-bday-open="${x.id}"` : `data-open-list="${x.id}"`);
const extraBtn = (x) => `<button class="ev extra ${x.kind}${x.paid ? " paid" : ""}${x.over ? " warn" : ""}" ${extraAttr(x)}><span class="tx"><span>${x.kind === "pay" ? (x.paid ? "оплачено" : "платёж") : x.kind === "doc" ? "документ" : x.kind === "bday" ? "день рождения" : "из списка"}</span><b>${esc(x.title)}</b></span></button>`;
const showCycle = () => S.cycleLayer && cycleItem();
const needsPick = (o) => o.who === "sasha" && !o.routine && !o.pick && !o.no_pick && !o.all_day;

function alertsList() {
  const out = [];
  for (let i = 0; i < 7; i++) {
    const ds = iso(addD(today(), i));
    eventsOn(ds, true).forEach((o) => { if (needsPick(o)) out.push({ o, ds }); });
  }
  return out;
}
const requestsToMe = () => tasks().filter((t) => t.data.assignee === S.me.person && t.data.by !== S.me.person && t.data.status === "asked");

async function reload() {
  S.items = (await guard(() => DB.load(S.me))) || S.items;
  if (await rollover()) S.items = (await guard(() => DB.load(S.me))) || S.items;
  render();
}
// Задачи «Сделать», «Созвониться», «Оплатить», которые не выполнены в срок,
// сами переезжают на сегодня — и так каждый день, пока их не отметят.
const ROLL_KINDS = ["do", "call", "pay"];
let rolling = false;
async function rollover() {
  if (rolling) return false;
  const t = iso(today());
  const late = tasks().filter((x) => ROLL_KINDS.includes(x.data.kind) && x.data.due && x.data.due < t
    && !["done", "declined"].includes(x.data.status) && canEdit(x));
  if (!late.length) return false;
  rolling = true;
  try {
    for (const x of late) {
      const d = x.data;
      await guard(() => DB.save({ ...x, data: { ...d, due: t, first_due: d.first_due || d.due } }, S.me));
    }
  } finally { rolling = false; }
  return true;
}
// открыли приложение после полуночи — переносим без перезагрузки
let lastDay = iso(today());
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && S.me?.person && iso(today()) !== lastDay) {
    lastDay = iso(today()); S.sel = today(); S.cursor = today(); reload();
  }
});
async function saveItem(item, msg) {
  await guard(() => DB.save(item, S.me));
  if (msg) toast(msg);
  await reload();
}

/* ---------- запуск и вход ---------- */
async function boot() {
  S.me = await guard(() => DB.session());
  if (!S.me) return renderLogin();
  if (!S.me.person) return renderNoProfile();
  S.items = (await guard(() => DB.load(S.me))) || [];
  if (await rollover()) S.items = (await guard(() => DB.load(S.me))) || S.items;
  try { S.cycleLayer = !!localStorage.getItem("pazlik-cycle-layer"); } catch {}
  DB.subscribe(reload);
  render();
}

function renderLogin() {
  const app = $("#app");
  if (DB.demo) {
    app.innerHTML = `<div class="demo-bar">Демо-режим: данные хранятся только в этом браузере</div>
      <div class="login"><img src="icon-180.png" alt=""><h1>Моё чудо</h1><p class="muted">Под кем войти?</p>
      <div class="who"><button data-p="luba"><i class="dot" style="background:var(--luba)"></i>Люба</button><button data-p="zhenya"><i class="dot" style="background:var(--zhenya)"></i>Женя</button></div></div>`;
    $$("[data-p]").forEach((b) => (b.onclick = async () => { S.me = await DB.demoLogin(b.dataset.p); boot(); }));
    return;
  }
  app.innerHTML = `<div class="login"><img src="icon-180.png" alt=""><h1>Моё чудо</h1>
    <form id="lf"><input id="em" type="email" autocomplete="username" placeholder="Почта" required><input id="pw" type="password" autocomplete="current-password" placeholder="Пароль" required>
    <button class="btn primary" type="submit">Войти</button><div class="err" id="err"></div></form></div>`;
  $("#lf").onsubmit = async (e) => {
    e.preventDefault();
    try { await DB.signIn($("#em").value.trim(), $("#pw").value); boot(); }
    catch (er) { $("#err").textContent = "Не получилось войти: проверьте почту и пароль"; }
  };
}
function renderNoProfile() {
  $("#app").innerHTML = `<div class="login"><img src="icon-180.png" alt=""><h1>Почти готово</h1>
    <p class="muted">Вход выполнен, но профиль не привязан к Любе или Жене. Выполните в Supabase команду из инструкции (шаг 2).</p>
    <button class="btn" id="out">Выйти</button></div>`;
  $("#out").onclick = async () => { await DB.signOut(); location.reload(); };
}

/* ---------- каркас ---------- */
function render() {
  const reqs = requestsToMe().length;
  const isOn = (k, mob) => S.tab === k || (mob && k === "more" && SUBPAGES.includes(S.tab)) || (!mob && k === "more" && ["docs", "bdays"].includes(S.tab));
  const navBtn = (k, n, cls) => `<button class="${cls || ""}${isOn(k, cls === "tb") ? " on" : ""}" data-tab="${k}">${cls === "tb" ? ICONS[k] : ""}<span>${n}</span>${k === "tasks" && reqs ? `<i class="badge">${reqs}</i>` : ""}</button>`;
  $("#app").innerHTML = `${DB.demo ? `<div class="demo-bar">Демо-режим: данные только в этом браузере · вы вошли как ${pn(S.me.person)}</div>` : ""}
    <div class="shell">
      <header class="top"><div class="brand"><img src="icon-180.png" alt="">Моё чудо</div>
        <nav class="nav">${NAV_DESK.map(([k, n]) => navBtn(k, n)).join("")}</nav>
        <div class="me"><i class="dot" style="background:${PEOPLE[S.me.person].c}"></i>${pn(S.me.person)}</div></header>
      <main class="main" id="main"></main>
    </div>
    <nav class="tabbar">${NAV_MOB.map(([k, n]) => navBtn(k, n, "tb")).join("")}</nav>
    ${S.tab !== "more" ? `<button class="fab" id="fab" aria-label="Добавить">${S.fab ? "×" : "+"}</button>` : ""}
    ${S.fab ? `<div class="fab-menu">${fabItems().map(([k, n]) => `<button data-new="${k}">${n}</button>`).join("")}</div>` : ""}`;
  $$("[data-tab]").forEach((b) => (b.onclick = () => go(b.dataset.tab)));
  const fab = $("#fab"); if (fab) fab.onclick = () => { S.fab = !S.fab; render(); };
  $$("[data-new]").forEach((b) => (b.onclick = () => {
    S.fab = false; render();
    const k = b.dataset.new, ds = iso(S.sel);
    ({
      task: () => openTask(null, { due: ds }), ctask: () => openTask(null, { cat: "care", care: true, due: "" }), sasha: () => openEvent(null, null, { who: "sasha", cat: "sasha", date: ds }), event: () => openEvent(null, null, { date: ds }),
      expense: () => openMoney(null, { kind: "expense" }), income: () => openMoney(null, { kind: "income" }), payment: () => openPayment(null),
      pill: () => openPill(null), witem: () => openWheelItem(null, { owner: S.wwho && S.wwho !== "both" ? S.wwho : S.me.person, sphere: S.wsel || "Спорт" }), goal: () => openGoal(null),
      list: () => openListMeta(null), card: () => openCard(null), doc: () => openDoc(null), bday: () => openBday(null),
    })[k]();
  }));
  const main = $("#main");
  ({ home: renderHome, tasks: renderTasks, sasha: renderSasha, more: renderMore, money: renderMoney, health: renderHealth, balance: renderBalance, lists: renderLists, cards: renderCards, docs: renderDocs, bdays: renderBdays })[S.tab](main);
  const bk = $("[data-tab-back]", main); if (bk) bk.onclick = () => go("more");
}
// привязка Telegram: утренняя сводка в 7:30, просьбы друг друга, задачи голосом
function tgPanel() {
  if (DB.demo) return '<span class="note">В демо-режиме Telegram не подключается.</span>';
  const bot = window.CONFIG?.BOT_USERNAME;
  if (!bot) return '<span class="note">Бот ещё не настроен.</span>';
  return `${S.me.tg ? `<span class="note">Подключён ✓ Сводка приходит каждое утро в 7:30, просьбы — сразу. Голосовые и сообщения боту @${bot} попадают в планер.</span>` : '<span class="note">Подключите — и каждое утро в 7:30 будет приходить сводка дня, просьбы партнёра — сразу, а задачи можно наговаривать голосом.</span>'}
    <button class="btn ${S.me.tg ? "" : "primary"}" data-tg-link>${S.me.tg ? "Переподключить" : "Подключить Telegram"}</button>`;
}
function go(tab, sub) {
  S.tab = tab; S.fab = false;
  if (tab === "lists") S.listOpen = null;
  if (sub) S.healthSub = sub;
  render(); window.scrollTo(0, 0);
}
function fabItems() {
  const base = [["event", "Событие"], ["task", "Задача"], ["sasha", "Занятие Саши"], ["payment", "Платёж"]];
  return ({
    money: [["payment", "Платёж"]], tasks: [["ctask", "Задача (забота)"]],
    health: [["pill", "Таблетка или витамин"]], balance: [["witem", "Дело в колесо"], ["goal", "Цель"]],
    lists: [["list", "Список"]], docs: [["doc", "Документ"]], bdays: [["bday", "День рождения"]],
  })[S.tab] || base;
}
const mobBack = () => '<button class="pill-btn mob-back" data-tab-back>‹ Ещё</button>';
const toggleRow = (k, on, t, h) => `<div class="field">${toggle(k, on, t, h)}</div>`;
function confirmDelete(m, item, after) {
  const del = $("[data-del]", m); if (!del || !item) return;
  del.onclick = async () => {
    if (del.dataset.sure !== "1") { del.dataset.sure = "1"; del.textContent = "Точно удалить?"; return; }
    closeModal(); await guard(() => DB.remove(item.id)); if (after) after(); toast("Удалено"); reload();
  };
}

/* ---------- главный экран ---------- */
function renderHome(main) {
  const c = S.cursor;
  let title, sub;
  if (S.view === "week") { const m = mondayOf(c); title = `${MONTHS[m.getMonth()]} ${m.getFullYear()}`; sub = rangeLabel(m); }
  else if (S.view === "month") { title = MONTHS[c.getMonth()]; sub = String(c.getFullYear()); }
  else { title = String(c.getFullYear()); sub = "год"; }
  const fl = [["all", "Все", ""], ["luba", "Люба", "luba"], ["zhenya", "Женя", "zhenya"], ["we", "Мы", "we"], ["sasha", "Саша", "sasha"]];
  main.innerHTML = `
    <div class="calbar">
      <div><div class="sub">${esc(sub)}</div><h1>${esc(title)}</h1></div>
      <div class="arrows"><button class="icon-btn" data-nav="-1" aria-label="Назад">‹</button><button class="pill-btn" data-nav="0">Сегодня</button><button class="icon-btn" data-nav="1" aria-label="Вперёд">›</button></div>
      <button class="btn primary add-ev" data-addev="${iso(S.sel)}">+ Событие</button>
      <div class="spacer"></div>
      <div class="seg" role="group" aria-label="Вид календаря">${[["week", "Неделя"], ["month", "Месяц"], ["year", "Год"]].map(([k, n]) => `<button class="${S.view === k ? "on" : ""}" data-view="${k}">${n}</button>`).join("")}</div>
      ${cycleItem() ? `<button class="pill-btn cyc-tog${S.cycleLayer ? " on" : ""}" data-cyc-layer aria-pressed="${!!S.cycleLayer}"><i class="dot" style="background:var(--luba)"></i>Цикл</button>` : ""}
      <div class="people" role="group" aria-label="Чьи дела">${fl.map(([k, n, p]) => `<button class="${S.filter === k ? "on" : ""}" data-filter="${k}">${p ? `<i class="dot" style="background:${PEOPLE[p].c}"></i>` : ""}${n}</button>`).join("")}</div>
    </div>
    <div class="cal">${S.view === "week" ? weekHTML() : S.view === "month" ? monthHTML() : yearHTML()}
      <div class="legend"><span><i style="background:var(--sasha);opacity:.65"></i>распорядок (школа)</span>${CATS.map((x) => `<span><i style="background:${catC(x.k)}"></i>${x.n}</span>`).join("")}</div></div>
    ${todayHTML()}`;
  $$("[data-nav]", main).forEach((b) => (b.onclick = () => {
    const n = +b.dataset.nav;
    if (n === 0) { S.cursor = today(); S.sel = today(); }
    else if (S.view === "week") S.cursor = addD(S.cursor, 7 * n);
    else if (S.view === "month") S.cursor = new Date(S.cursor.getFullYear(), S.cursor.getMonth() + n, 1);
    else S.cursor = new Date(S.cursor.getFullYear() + n, 0, 1);
    render();
  }));
  $$("[data-view]", main).forEach((b) => (b.onclick = () => { S.view = b.dataset.view; S.cursor = new Date(S.sel); render(); }));
  $$("[data-filter]", main).forEach((b) => (b.onclick = () => { S.filter = b.dataset.filter; render(); }));
  const cl = $("[data-cyc-layer]", main); if (cl) cl.onclick = () => { S.cycleLayer = !S.cycleLayer; try { localStorage.setItem("pazlik-cycle-layer", S.cycleLayer ? "1" : ""); } catch {} render(); };
  $$("[data-day]", main).forEach((el) => {
    const pick = () => { S.sel = parse(el.dataset.day); render(); };
    el.onclick = (e) => { if (!e.target.closest("[data-ev],[data-addev]")) pick(); };
    el.onkeydown = (e) => { if ((e.key === "Enter" || e.key === " ") && e.target === el) { e.preventDefault(); pick(); } };
  });
  $$("[data-month]", main).forEach((b) => (b.onclick = () => { S.cursor = new Date(S.cursor.getFullYear(), +b.dataset.month, 1); S.view = "month"; render(); }));
  bindToday(main);
}

function whoDots(o) {
  if (o.who === "sasha") {
    const ps = [o.drop, o.pick].filter(Boolean);
    if (!ps.length) return needsPick(o) ? '<span class="whos"><i class="none"></i></span>' : `<span class="whos"><i style="background:var(--sasha)"></i></span>`;
    return `<span class="whos">${[...new Set(ps)].map((p) => `<i style="background:${PEOPLE[p]?.c}"></i>`).join("")}${needsPick(o) ? '<i class="none"></i>' : ""}</span>`;
  }
  return `<span class="whos"><i style="background:${PEOPLE[o.who]?.c || "var(--muted)"}"></i></span>`;
}
function logiText(o, short = false) {
  if (o.who !== "sasha" || o.all_day) return "";
  if (needsPick(o)) return short ? "никто не заб" : "никто не забирает";
  if (o.pick) return o.pick === "we" ? (short ? "заб вместе" : "забирают вместе") : `${short ? "заб" : "забирает"} ${o.pick === "self" ? "сама" : pn(o.pick)}`;
  return o.drop ? (o.drop === "we" ? (short ? "отв вместе" : "отвозят вместе") : `${short ? "отв" : "отвозит"} ${pn(o.drop)}`) : "";
}
const evDone = (o) => (o.done_dates || []).includes(o.ds);
const evBtn = (o) => `<button class="ev${needsPick(o) ? " warn" : ""}${evDone(o) ? " done" : ""}${o.item.vis === "private" ? " private" : ""}" style="--c:${catC(o.cat)}" data-ev="${o.item.id}" data-ds="${o.ds}">
  <span class="tx"><span>${esc(timeLabel(o))}</span><b>${esc(o.title)}</b>${logiText(o, true) ? `<small>${esc(logiText(o, true))}</small>` : ""}</span>${whoDots(o)}</button>`;

// события на несколько дней (поездки, мероприятия) рисуем одной полосой через все их дни
const isSpan = (o) => !!(o.all_day && o.end_date && o.end_date > o.date && !(o.repeat && o.repeat.days?.length));
function spansIn(days) {
  const from = days[0], to = days[days.length - 1];
  return events().filter((e) => isSpan(e.data) && e.data.date <= to && e.data.end_date >= from)
    .map((e) => occ(e, e.data.date < from ? from : e.data.date)).filter(passFilter)
    .sort((a, b) => a.item.data.date.localeCompare(b.item.data.date));
}
const spanDates = (o) => { const a = parse(o.item.data.date), b = parse(o.item.data.end_date);
  return a.getMonth() === b.getMonth() ? `${a.getDate()}–${b.getDate()} ${MGEN[b.getMonth()]}` : `${a.getDate()} ${MGEN[a.getMonth()]} – ${b.getDate()} ${MGEN[b.getMonth()]}`; };
function spansRow(days, cls = "wk-spans") {
  const list = spansIn(days); if (!list.length) return "";
  return `<div class="${cls}">${list.map((o) => {
    const d = o.item.data, s = Math.max(0, days.indexOf(d.date < days[0] ? days[0] : d.date)), last = d.end_date > days[days.length - 1] ? days.length - 1 : days.indexOf(d.end_date);
    return `<button class="span${d.date < days[0] ? " cont-l" : ""}${d.end_date > days[days.length - 1] ? " cont-r" : ""}" style="--s:${s + 1};--e:${last + 2};--c:${PEOPLE[d.who]?.c || catC(d.cat)}" data-ev="${o.item.id}" data-ds="${o.ds}" title="${esc(d.title)} · ${spanDates(o)}">
      <b>${esc(d.title)}</b><small>${spanDates(o)}</small></button>`; }).join("")}</div>`;
}
function weekHTML() {
  const m = mondayOf(S.cursor), t = iso(today()), sel = iso(S.sel);
  const days = Array.from({ length: 7 }, (_, i) => iso(addD(m, i)));
  let h = `<div class="cal-scroll">${spansRow(days)}<div class="wk">`;
  for (let i = 0; i < 7; i++) {
    const d = addD(m, i), ds = iso(d), evs = eventsOn(ds).filter((o) => !isSpan(o)), br = inBreak(ds);
    const cph = showCycle() ? cyclePhase(ds) : null;
    h += `<div class="wk-day${ds === t ? " today" : ""}${ds === sel ? " sel" : ""}" data-day="${ds}" role="button" tabindex="0" aria-label="${fmtLong(ds)}">
      <span class="dn">${WDS[i]}<b>${d.getDate()}</b>${cph ? `<i class="cdot ${cph}" title="${PHASE_N[cph]}"></i>` : ""}</span>${br ? `<span class="brk">${esc(br.title)}</span>` : ""}
      ${evs.filter((o) => o.routine).map((o) => `<span class="routine" style="--rc:${catC(o.cat)}">${esc(o.title)} ${esc(timeLabel(o))}</span>`).join("")}
      ${evs.filter((o) => !o.routine).map(evBtn).join("")}${extrasOn(ds).map(extraBtn).join("")}
      <button class="day-add" data-addev="${ds}" aria-label="Добавить событие на ${fmtLong(ds)}">+ событие</button></div>`;
  }
  return h + "</div></div>";
}
function monthHTML() {
  const y = S.cursor.getFullYear(), mo = S.cursor.getMonth(), first = new Date(y, mo, 1), start = mondayOf(first), t = iso(today()), sel = iso(S.sel);
  let h = '<div class="mo">' + WDS.map((x) => `<div class="mo-h">${x}</div>`).join("");
  const cells = Math.ceil((wd(first) + new Date(y, mo + 1, 0).getDate()) / 7) * 7;
  for (let i = 0; i < cells; i++) {
    const d = addD(start, i);
    if (i % 7 === 0) h += spansRow(Array.from({ length: 7 }, (_, k) => iso(addD(start, i + k))), "mo-spans");
    const ds = iso(d), evs = eventsOn(ds).filter((o) => !isSpan(o)), ex = extrasOn(ds), main = [...evs.filter((o) => !o.routine).map((o) => ({ title: o.title, c: catC(o.cat), warn: needsPick(o) })), ...ex.map((x) => ({ title: x.short, c: x.kind === "pay" ? "var(--babushka)" : x.kind === "bday" ? "var(--sasha)" : "var(--we)", warn: x.over, paid: x.paid }))];
    const cph = showCycle() ? cyclePhase(ds) : null;
    h += `<div class="mo-c${d.getMonth() !== mo ? " out" : ""}${ds === t ? " today" : ""}${ds === sel ? " sel" : ""}" data-day="${ds}" role="button" tabindex="0" aria-label="${fmtLong(ds)}">
      <span class="n"><b>${d.getDate()}</b>${cph ? `<i class="cdot ${cph}" title="${PHASE_N[cph]}"></i>` : ""}</span>${evs.some((o) => o.routine) ? '<div class="bandline"></div>' : ""}
      ${main.slice(0, 3).map((o) => `<span class="chip${o.warn ? " warn" : ""}${o.paid ? " paid" : ""}" style="--c:${o.c}">${esc(o.title)}</span>`).join("")}
      ${main.length > 3 ? `<span class="more">ещё ${main.length - 3}</span>` : ""}</div>`;
  }
  return h + "</div>";
}
function yearHTML() {
  const y = S.cursor.getFullYear(), t = iso(today());
  let h = '<div class="yr">';
  for (let m = 0; m < 12; m++) {
    const first = new Date(y, m, 1), days = new Date(y, m + 1, 0).getDate();
    let cnt = 0, g = "";
    for (let i = 0; i < wd(first); i++) g += "<i></i>";
    for (let x = 1; x <= days; x++) {
      const ds = iso(new Date(y, m, x));
      const has = eventsOn(ds).some((o) => !o.routine && !(o.item.data.repeat && o.item.data.repeat.days?.length));
      if (has) cnt++;
      g += `<i class="${ds === t ? "t" : inBreak(ds) ? "b" : ""}${has ? " e" : ""}">${x}</i>`;
    }
    h += `<button class="ym" data-month="${m}"><h5>${MONTHS[m]}<span>${cnt ? cnt + " дн." : ""}</span></h5><div class="ym-g">${g}</div></button>`;
  }
  return h + '</div><div class="legend"><span><i style="background:color-mix(in srgb,var(--we) 40%,transparent)"></i>каникулы и праздники</span><span>• разовые события</span></div>';
}

/* ---------- «Сегодня» ---------- */
function dayTasks(ds) {
  const isT = ds === iso(today());
  return tasks().filter(passTask).filter((t) => {
    const d = t.data;
    if (d.status === "done") return d.done_on === ds || (d.due === ds && !d.done_on);
    if (d.status === "declined") return false;
    if (d.due === ds) return true;
    if (isT && d.due && d.due < ds) return true;
    return isT && d.important; // отмеченное звёздочкой видно в «Важном» сегодня, какой бы ни был срок
  });
}
function taskShort(t, ds) {
  const d = t.data, me = S.me.person;
  if (d.due && d.due < ds && d.status !== "done") return `было ${fmtDate(d.due)}`;
  if (d.first_due && d.first_due < d.due && d.status !== "done") return `переносится с ${fmtDate(d.first_due)}`;
  if (d.status === "asked") return d.by === me ? `ждёт ответа ${d.assignee === "zhenya" ? "Жени" : "Любы"}` : `просьба ${d.by === "zhenya" ? "Жени" : "Любы"}`;
  if (d.status === "discuss") return "надо обсудить";
  return d.note || "";
}
function todayHTML() {
  const ds = iso(S.sel), isT = ds === iso(today());
  const ts = dayTasks(ds), evs = eventsOn(ds);
  const done = ts.filter((t) => t.data.status === "done").length;
  const cols = [{ k: "important", n: "Важное" }, ...CATS];
  const colHTML = (c) => {
    const ct = ts.filter((t) => (c.k === "important" ? t.data.important : !t.data.important && t.data.cat === c.k));
    const ce = c.k === "important" ? [] : evs.filter((o) => o.cat === c.k && !isSpan(o));
    const cp = c.k === "important" ? payments().map((p) => ({ p, st: payStatus(p) })).filter((x) => !x.st.paid && !x.st.ended && (x.st.ds === ds || (isT && x.st.overdue))) : [];
    const n = ct.filter((t) => t.data.status === "done").length;
    const total = ct.length + cp.length;
    return `<div class="col${c.k === "important" ? " important" : ""}" style="--c:${catC(c.k)}">
      <h3>${c.n}<span>${n}/${total}</span></h3>${c.k !== "important" ? '<div class="stripe"></div>' : ""}
      ${cp.map(({ p, st }) => `<div class="trow${st.overdue ? " over" : ""}"><span class="rub">₽</span><button class="tt" data-pay-open="${p.id}"><span>${esc(p.data.title)} · ${payAmt(p)}</span><small>${p.data.urgent ? "срочно · " : ""}${st.overdue ? "просрочено с " + fmtDate(st.ds) : "оплатить сегодня"}</small></button><button class="paybtn" data-pay="${p.id}">Оплатить</button></div>`).join("")}
      ${ce.map((o) => o.wheel || o.task_id ? `<div class="trow${(o.done_dates || []).includes(o.ds) ? " done" : ""}"><button class="ck${(o.done_dates || []).includes(o.ds) ? " on" : ""}" data-evdone="${o.item.id}" data-ds="${o.ds}" aria-label="Сделано"></button><button class="tt" data-ev="${o.item.id}" data-ds="${o.ds}"><span>${esc(o.title)}</span><small>${esc([o.all_day ? "в течение дня" : o.start || "", o.wheel ? "колесо" : "событие"].filter(Boolean).join(" · "))}</small></button><i class="who" style="background:${PEOPLE[o.who]?.c}"></i></div>`
        : `<button class="erow" data-ev="${o.item.id}" data-ds="${o.ds}"><span class="t">${esc(o.all_day ? "день" : o.start || "")}</span><span>${esc(o.title)}${logiText(o) ? ` · ${esc(logiText(o))}` : ""}</span></button>`).join("")}
      ${ct.map((t) => { const d = t.data, over = d.due && d.due < ds && d.status !== "done";
        // в «Важном» подписываем, из какого списка задача и до какого числа
        const sh = c.k === "important" ? [kindName(d.kind), catName(d.cat), over ? `было ${fmtDate(d.due)}` : d.due && d.due !== ds ? `до ${fmtDate(d.due)}` : taskShort(t, ds)].filter(Boolean).join(" · ") : [kindName(d.kind), taskShort(t, ds)].filter(Boolean).join(" · ");
        return `<div class="trow${d.status === "done" ? " done" : ""}${over ? " over" : ""}"><button class="ck${d.status === "done" ? " on" : ""}" data-tdone="${t.id}" aria-label="Выполнено"></button>
        <button class="tt" data-task="${t.id}"><span>${esc(d.title)}</span>${sh ? `<small>${esc(sh)}</small>` : ""}</button>${starBtn(t)}<i class="who" style="background:${PEOPLE[d.assignee]?.c}"></i></div>`; }).join("")}
      <button class="add" data-addcat="${c.k}">+ Добавить</button></div>`;
  };
  const al = alertsList(), reqs = requestsToMe();
  const tds = iso(today());
  const payAl = payments().map((p) => ({ p, st: payStatus(p) })).filter((x) => !x.st.ended && !x.st.paid && x.st.soon && x.st.left > 0 && !x.p.data.urgent);
  const urgent = payments().map((p) => ({ p, st: payStatus(p) })).filter((x) => x.p.data.urgent && !x.st.paid && !x.st.ended);
  const docAl = docExpiring(30);
  const bdAl = bdayAlerts();
  const pct = ts.length ? Math.round((done / ts.length) * 100) : 0;
  return `<div class="today-h"><span class="d">${fmtLong(ds)}</span>${(() => { const sp = spansIn([ds]); return sp.length ? `<span class="today-spans">${sp.map((o) => `<button class="span" style="--c:${PEOPLE[o.item.data.who]?.c || catC(o.item.data.cat)}" data-ev="${o.item.id}" data-ds="${ds}"><b>${esc(o.item.data.title)}</b><small>${spanDates(o)}</small></button>`).join("")}</span>` : ""; })()}<h2>${isT ? "Сегодня" : WDN[wd(S.sel)]}</h2>
      <span class="st">задач ${ts.length} · сделано ${done} · осталось ${ts.length - done}</span>
      <span class="today-add"><button class="btn sm" data-addev="${ds}">+ Событие</button><button class="btn sm" data-addtask="${ds}">+ Задача</button></span>${isT ? "" : '<button class="back" data-nav-today>← вернуться к сегодня</button>'}</div>
    ${al.length || reqs.length || payAl.length || docAl.length || urgent.length || bdAl.length ? `<div class="alerts">
      ${bdAl.map((x) => `<div class="alert bd"><span>${bdayText(x)}${x.b.note ? ` · ${esc(x.b.note)}` : ""}</span><button data-bday-open="${x.b.id}">Открыть</button></div>`).join("")}
      ${urgent.map(({ p, st }) => `<div class="alert"><span><b>Срочно оплатить:</b> ${esc(p.data.title)} · ${payAmt(p)} · ${st.left < 0 ? "просрочено" : st.left === 0 ? "сегодня" : "до " + fmtDate(st.ds)}${p.data.note ? " · " + esc(p.data.note) : ""}</span><button data-pay="${p.id}">Оплатить</button></div>`).join("")}
      ${payAl.map(({ p, st }) => `<div class="alert info"><span>Скоро платёж: ${esc(p.data.title)} ${rub(p.data.amount)}, ${dueLabel(st)}</span><button data-pay="${p.id}">Оплатить</button></div>`).join("")}
      ${docAl.map((d) => `<div class="alert info"><span>${esc(d.data.title)}: ${d.data.expires < tds ? "срок истёк " + fmtDate(d.data.expires) : "действует до " + fmtDate(d.data.expires)}</span><button data-open-doc="${d.id}">Открыть</button></div>`).join("")}
      ${al.map((a) => `<div class="alert"><span>${fmtShort(a.ds)}, ${esc(a.o.title)} ${esc(a.o.start || "")}: никто не забирает Сашу</span><button data-fix="${a.o.item.id}" data-ds="${a.ds}">Назначить</button></div>`).join("")}
      ${reqs.map((t) => `<div class="alert info"><span>${pn(t.data.by)} ${VERB[t.data.by].ask}: ${esc(t.data.title)}${t.data.due ? ` · до ${fmtDate(t.data.due)}` : ""}</span><span style="display:flex;gap:6px"><button data-st="accepted" data-id="${t.id}">Беру</button><button data-st="discuss" data-id="${t.id}" style="background:var(--card-3);color:var(--fg)">Обсудить</button></span></div>`).join("")}
    </div>` : ""}
    <div class="cols">${cols.map(colHTML).join("")}</div>
    <div class="dayprog"><span>день</span><div class="bars">${Array.from({ length: 40 }, (_, i) => `<i class="${i < pct * 0.4 ? "on" : ""}"></i>`).join("")}</div><span>${pct}%</span></div>
    <div class="widgets">${pillsWidget()}${cycleWidget()}${paymentsWidget()}${goalsWidget()}</div>`;
}
function bindToday(root) {
  $$("[data-ev]", root).forEach((b) => (b.onclick = (e) => { e.stopPropagation(); openEvent(b.dataset.ev, b.dataset.ds); }));
  $$("[data-fix]", root).forEach((b) => (b.onclick = () => openEvent(b.dataset.fix, b.dataset.ds)));
  $$("[data-task]", root).forEach((b) => (b.onclick = () => openTask(b.dataset.task)));
  $$("[data-tdone]", root).forEach((b) => (b.onclick = () => toggleDone(b.dataset.tdone)));
  $$("[data-star]", root).forEach((b) => (b.onclick = (e) => { e.stopPropagation(); toggleStar(b.dataset.star); }));
  $$("[data-st]", root).forEach((b) => (b.onclick = () => setStatus(b.dataset.id, b.dataset.st)));
  $$("[data-addev]", root).forEach((b) => (b.onclick = (e) => { e.stopPropagation(); openEvent(null, null, { date: b.dataset.addev }); }));
  $$("[data-addtask]", root).forEach((b) => (b.onclick = () => openTask(null, { due: b.dataset.addtask })));
  $$("[data-addcat]", root).forEach((b) => (b.onclick = () => {
    const k = b.dataset.addcat;
    openTask(null, { due: iso(S.sel), cat: k === "important" ? "care" : k, important: k === "important" });
  }));
  const back = $("[data-nav-today]", root); if (back) back.onclick = () => { S.sel = today(); S.cursor = today(); render(); };
  $$("[data-go]", root).forEach((b) => (b.onclick = (e) => { e.stopPropagation(); go(b.dataset.go, b.dataset.sub); }));
  $$("[data-open-doc]", root).forEach((b) => (b.onclick = (e) => { e.stopPropagation(); openDoc(b.dataset.openDoc); }));
  $$("[data-open-list]", root).forEach((b) => (b.onclick = (e) => { e.stopPropagation(); S.tab = "lists"; S.listOpen = b.dataset.openList; S.listTab = "all"; render(); window.scrollTo(0, 0); }));
  bindMoney(root); bindHealth(root); bindBalance(root); bindBdays(root);
}

/* ---------- действия с задачами ---------- */
async function toggleDone(id) {
  const t = tasks().find((x) => x.id === id); if (!t) return;
  if (!canEdit(t)) return toast("Эту задачу может отметить только автор");
  const done = t.data.status !== "done";
  const data = { ...t.data, status: done ? "done" : t.data.taken_by ? "accepted" : "open", done_on: done ? iso(today()) : null, done_by: done ? S.me.person : null };
  await saveItem({ ...t, data }, done ? "Готово" : null);
  await syncLinkedEvent(t, done);
}
// задача и событие-дубль (например, «Сходить на чистку» и «Чистка в Небольсин») отмечаются вместе
async function syncLinkedEvent(t, done) {
  const e = t.data.event_id && events().find((x) => x.id === t.data.event_id);
  if (!e) return;
  const ds = t.data.event_date || e.data.date;
  const set = new Set(e.data.done_dates || []);
  if (done === set.has(ds)) return;
  done ? set.add(ds) : set.delete(ds);
  await saveItem({ ...e, data: { ...e.data, done_dates: [...set] } });
}
// звезда со скруглёнными лучами: контур — обычная задача, залитая — «Важное»
const STAR_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.2 14.7 8.7 20.8 9.6 16.4 13.9 17.4 20 12 17.1 6.6 20 7.6 13.9 3.2 9.6 9.3 8.7Z" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linejoin="round" stroke-linecap="round"/></svg>';
const starBtn = (t) => `<button class="star${t.data.important ? " on" : ""}" data-star="${t.id}" aria-pressed="${!!t.data.important}" aria-label="${t.data.important ? "Убрать из важного" : "В важное"}" title="${t.data.important ? "Убрать из важного" : "В важное"}">${STAR_SVG}</button>`;
async function toggleStar(id) {
  const t = tasks().find((x) => x.id === id); if (!t) return;
  if (!canEdit(t)) return toast("Эту задачу может менять только автор");
  const important = !t.data.important;
  await saveItem({ ...t, data: { ...t.data, important } }, important ? "Добавлено в «Важное»" : "Убрано из «Важного»");
}
async function setStatus(id, st) {
  const t = tasks().find((x) => x.id === id); if (!t) return;
  const data = { ...t.data, status: st };
  if (st === "accepted") data.taken_by = S.me.person;
  await saveItem({ ...t, data }, { accepted: "Задача взята", discuss: "Отметили: надо обсудить", declined: "Вернули автору" }[st]);
}

/* ---------- задачи ---------- */
function taskMeta(t) {
  const d = t.data, me = S.me.person, parts = [];
  if (d.kind) parts.push(kindName(d.kind));
  if (d.cat) parts.push(catName(d.cat));
  if (d.first_due && d.first_due < d.due && d.status !== "done") parts.push(`переносится с ${fmtDate(d.first_due)}`);
  if (d.by && d.assignee !== d.by) {
    if (d.status === "asked") parts.push(d.by === me ? `ждёт ответа ${d.assignee === "zhenya" ? "Жени" : "Любы"}` : `${pn(d.by)} ${VERB[d.by].ask}`);
    else if (d.status === "discuss") parts.push(`${pn(d.assignee)} ${VERB[d.assignee]?.talk || "хочет обсудить"}`);
    else if (d.status === "declined") parts.push(`${pn(d.assignee)} ${VERB[d.assignee]?.no || "не успевает"}`);
    else parts.push(`${VERB[d.by].set} ${pn(d.by)}${d.taken_by ? ` · ${VERB[d.taken_by].take} ${pn(d.taken_by)}` : ""}`);
  } else if (d.by && d.assignee === "we") parts.push(`${VERB[d.by].set} ${pn(d.by)} · для нас`);
  if (d.status === "done" && d.done_by) parts.push(`сделал${d.done_by === "luba" ? "а" : ""} ${pn(d.done_by)}`);
  if (t.vis === "private") parts.push("только мне");
  return parts.join(" · ");
}
// Вкладка «Задачи» — только «Забота»: дела, которые мы ставим себе, друг другу и просим.
// Работа, личное и прочее ставится во вкладке «Сегодня».
function careMeta(t) {
  const d = t.data, me = S.me.person, t0 = iso(today()), parts = [];
  const gen = (p) => (p === "zhenya" ? "Жени" : "Любы");
  if (d.status === "asked") parts.push(d.by === me ? `просьба · ждёт ответа ${gen(d.assignee)}` : `просьба ${gen(d.by)}`);
  else if (d.status === "discuss") parts.push("надо обсудить");
  else if (d.status === "declined") parts.push(`${pn(d.assignee)} не успевает`);
  else if (d.assignee === "we") parts.push("свободная · кто возьмёт");
  else parts.push(`взято · ${pn(d.taken_by || d.assignee)}`);
  if (d.kind) parts.push(kindName(d.kind).toLowerCase());
  const over = d.due && d.due < t0 && d.status !== "done";
  parts.push(over ? `просрочено · было ${fmtDate(d.due)}` : d.due ? (d.due === t0 ? "сегодня" : `до ${fmtDate(d.due)}`) : "без срока");
  if (d.first_due && d.first_due < d.due && d.status !== "done") parts.push(`переносится с ${fmtDate(d.first_due)}`);
  if (d.status === "done" && d.done_by) parts.push(`сделал${d.done_by === "luba" ? "а" : ""} ${pn(d.done_by)}`);
  return { text: parts.join(" · "), over };
}
function renderTasks(main) {
  const me = S.me.person, pa = partner(), t0 = iso(today());
  const care = tasks().filter((t) => t.data.cat === "care");
  const open = (t) => t.data.status !== "done";
  const sets = {
    all: care.filter((t) => open(t) && t.data.status !== "declined"),
    mine: care.filter((t) => open(t) && t.data.assignee === me && t.data.status !== "declined"),
    partner: care.filter((t) => open(t) && t.data.assignee === pa),
    free: care.filter((t) => open(t) && t.data.assignee === "we"),
    asks: care.filter((t) => open(t) && t.data.assignee !== "we" && t.data.by !== t.data.assignee && (t.data.assignee === me || t.data.by === me) && ["asked", "discuss", "declined"].includes(t.data.status)),
    done: care.filter((t) => !open(t)).sort((a, b) => (b.data.done_on || "").localeCompare(a.data.done_on || "")).slice(0, 60),
  };
  if (!sets[S.ttab]) S.ttab = "all";
  const tabs = [["all", "Все"], ["mine", "Мои"], ["partner", pn(pa)], ["free", "Свободные"], ["asks", "Просьбы"], ["done", "Сделано"]];
  const list = sets[S.ttab];
  const byDue = (a, b) => (a.data.due || "9999").localeCompare(b.data.due || "9999");
  const toMe = list.filter((t) => t.data.status === "asked" && t.data.assignee === me && t.data.by !== me);
  const rest = list.filter((t) => !toMe.includes(t)).sort(byDue);
  const groups = S.ttab === "done" ? [["Сделано", list]] : [["Просят меня", toMe], ["В работе", rest.filter((t) => t.data.due)], ["Без срока", rest.filter((t) => !t.data.due)]];
  const card = (t) => {
    const d = t.data, m = careMeta(t), color = PEOPLE[d.assignee]?.c || "var(--muted)";
    let act = "";
    if (d.status === "done") act = `<button class="btn" data-tdone="${t.id}">Вернуть</button>`;
    else if (d.status === "asked" && d.assignee === me && d.by !== me) act = `<span class="acts2"><button class="btn primary" data-st="accepted" data-id="${t.id}">Беру</button><button class="btn" data-st="discuss" data-id="${t.id}">Обсудить</button></span>`;
    else if (d.assignee === "we") act = `<button class="btn primary" data-take="${t.id}">Взять</button>`;
    else if (d.status === "declined" && d.by === me) act = `<button class="btn" data-task="${t.id}">Переназначить</button>`;
    else act = `<button class="btn primary" data-tdone="${t.id}">Выполнить</button>`;
    return `<div class="ccard${d.status === "done" ? " done" : ""}" style="--c:${color}">
      <button class="ring${d.status === "done" ? " on" : ""}" data-tdone="${t.id}" aria-label="${d.status === "done" ? "Вернуть в работу" : "Выполнено"}"></button>
      <button class="body" data-task="${t.id}"><span class="title">${esc(d.title)}</span><span class="meta${m.over ? " over" : ""}">${esc(m.text)}</span></button>
      ${act}</div>`;
  };
  main.innerHTML = `<div class="page-h"><h1>Задачи</h1><span class="spacer"></span><button class="icon-btn big-plus" data-care-new aria-label="Новая задача">+</button></div>
    <span class="note">Здесь «Забота»: дела себе, ${pa === "zhenya" ? "Жене" : "Любе"} и просьбы друг другу. Просьба приходит уведомлением. Работа и личное — во вкладке «Сегодня».</span>
    <div class="tabs">${tabs.map(([k, n]) => `<button class="${S.ttab === k ? "on" : ""}" data-tt="${k}">${n} · ${sets[k].length}</button>`).join("")}</div>
    <div class="list">${list.length ? groups.filter((g) => g[1].length).map(([n, l]) => `<div class="group-h">${n}</div>${l.map(card).join("")}`).join("") : '<div class="empty">Здесь пусто. Нажмите «+», чтобы поставить задачу себе, партнёру или попросить о чём-то.</div>'}</div>`;
  $$("[data-tt]", main).forEach((b) => (b.onclick = () => { S.ttab = b.dataset.tt; render(); }));
  $("[data-care-new]", main).onclick = () => openTask(null, { cat: "care", care: true, due: "" });
  $$("[data-take]", main).forEach((b) => (b.onclick = async () => {
    const t = tasks().find((x) => x.id === b.dataset.take); if (!t) return;
    await saveItem({ ...t, data: { ...t.data, assignee: S.me.person, taken_by: S.me.person, status: "accepted" } }, "Задача ваша");
  }));
  bindToday(main);
}

/* ---------- Саша ---------- */
function renderSasha(main) {
  // в выходные сразу показываем следующую неделю
  const base = wd(today()) >= 5 ? addD(mondayOf(today()), 7) : mondayOf(today());
  const info = sashaInfo(), mon = addD(base, S.sweek * 7), t = iso(today());
  const isSasha = (o) => o.who === "sasha" || o.cat === "sasha";
  let days = "";
  for (let i = 0; i < 7; i++) {
    const ds = iso(addD(mon, i)), evs = eventsOn(ds, true).filter(isSasha), br = inBreak(ds);
    const school = evs.some((o) => o.routine) && i < 5;
    const les = school ? (info.lessons[i] || []) : [];
    const bring = school ? (info.bring?.[i] || []) : [];
    if (!evs.length && !br && i > 4) continue;
    days += `<div class="sday"><div class="sday-h"><b class="${ds === t ? "today" : ""}">${WDN[i]}, ${fmtDate(ds)}</b><span>${br ? esc(br.title) : les.length ? `${les.length} урок${les.length < 5 ? "а" : "ов"}` : ""}</span></div>
      ${evs.map((o) => `<div class="srow${needsPick(o) ? " warn" : ""}" style="--c:${catC(o.cat)}"><span class="t">${esc(o.all_day ? "день" : o.start || "")}</span>
        <button class="ti" data-ev="${o.item.id}" data-ds="${ds}">${esc(o.title)}${o.end && !o.all_day ? `<small>до ${esc(o.end)}</small>` : ""}${o.to ? `<small>${esc(o.to)}</small>` : ""}</button>
        ${o.all_day ? "" : `<div class="logi"><label>отвозит ${logiSelect(o, "drop")}</label><label>забирает ${logiSelect(o, "pick")}</label></div>`}
        ${o.routine && bring.length ? `<div class="bring">Взять: ${esc(bring.join(", "))}</div>` : ""}</div>`).join("") || '<span class="note">Занятий нет</span>'}</div>`;
  }
  const up = [];
  for (let i = 0; i < 45; i++) { const ds = iso(addD(today(), i)); eventsOn(ds, true).filter((o) => isSasha(o) && !o.routine && !(o.item.data.repeat?.days?.length)).forEach((o) => up.push(o)); }
  const ed = S.editLessons;
  main.innerHTML = `<div class="page-h"><h1>Саша</h1><span class="spacer"></span>
      <div class="arrows"><button class="icon-btn" data-sw="-1" aria-label="Прошлая неделя">‹</button><button class="pill-btn" data-sw="0">${rangeLabel(mon)}</button><button class="icon-btn" data-sw="1" aria-label="Следующая неделя">›</button></div></div>
    <div class="grid2 sasha-grid">
      <div class="panel"><h2>Неделя и кто отвозит</h2>${days}<span class="note">Отвозит и забирает можно поменять прямо здесь, только для этого дня. Для всех повторов откройте занятие.</span></div>
      <div style="display:flex;flex-direction:column;gap:16px;min-width:0">
        <div class="panel"><h2>Уроки · 1Б-1 <button class="btn" id="edLes">${ed ? "Сохранить" : "Править"}</button></h2>
          <div class="lessons">${[0, 1, 2, 3, 4].map((i) => `<div><h4 class="${wd(today()) === i ? "today" : ""}">${WDS[i]}</h4>${ed ? `<textarea data-les="${i}" aria-label="Уроки, ${WDL[i]}">${esc((info.lessons[i] || []).join("\n"))}</textarea>` : `<ol>${(info.lessons[i] || []).map((l) => `<li>${esc(l)}</li>`).join("")}</ol>`}</div>`).join("")}</div>
          <div class="bells">${(info.bells || []).map((b, i) => `<span>${i + 1} · ${esc(b)}</span>`).join("")}</div></div>
        <div class="panel"><h2>Что взять с собой</h2>
          ${ed ? `<div class="lessons">${[0, 1, 2, 3, 4].map((i) => `<div><h4>${WDS[i]}</h4><textarea data-bring="${i}" style="min-height:70px" aria-label="Взять, ${WDL[i]}">${esc((info.bring?.[i] || []).join("\n"))}</textarea></div>`).join("")}</div>`
            : [0, 1, 2, 3, 4].filter((i) => info.bring?.[i]?.length).map((i) => `<div class="setrow"><span>${WDN[i]}</span><span class="muted">${esc(info.bring[i].join(", "))}</span></div>`).join("") || '<span class="note">Пока пусто. Нажмите «Править» у уроков.</span>'}</div>
        <div class="panel"><h2>Ближайшее</h2><div class="upc">${up.slice(0, 8).map((o) => `<div class="srow" style="--c:${catC(o.cat)}"><span class="t">${fmtDate(o.ds).replace(" ", "<br>")}</span><button class="ti" data-ev="${o.item.id}" data-ds="${o.ds}">${esc(o.title)}<small>${esc(timeLabel(o))}${logiText(o) ? " · " + esc(logiText(o)) : ""}</small></button></div>`).join("") || '<span class="note">Разовых событий нет</span>'}</div></div>
      </div>
    </div>`;
  $$("[data-sw]", main).forEach((b) => (b.onclick = () => { const n = +b.dataset.sw; S.sweek = n === 0 ? 0 : S.sweek + n; render(); }));
  $$("[data-logi]", main).forEach((s) => (s.onchange = () => setLogi(s.dataset.id, s.dataset.ds, s.dataset.logi, s.value)));
  $("#edLes").onclick = async () => {
    if (!S.editLessons) { S.editLessons = true; return render(); }
    const lines = (v) => v.split("\n").map((x) => x.trim()).filter(Boolean);
    const data = { ...info, key: "sasha", lessons: { ...info.lessons }, bring: { ...(info.bring || {}) } };
    $$("[data-les]", main).forEach((t) => (data.lessons[t.dataset.les] = lines(t.value)));
    $$("[data-bring]", main).forEach((t) => (data.bring[t.dataset.bring] = lines(t.value)));
    S.editLessons = false;
    const it = kv("sasha");
    await saveItem(it ? { ...it, data } : { type: "kv", vis: "shared", data }, "Расписание сохранено");
  };
  bindToday(main);
}
function logiSelect(o, k) {
  const v = o[k] || "";
  return `<select data-logi="${k}" data-id="${o.item.id}" data-ds="${o.ds}" class="${k === "pick" && needsPick(o) ? "none" : ""}" aria-label="${k === "drop" ? "Отвозит" : "Забирает"}">${PICKS.map(([p, n]) => `<option value="${p}"${p === v ? " selected" : ""}>${n}</option>`).join("")}</select>`;
}
async function setLogi(id, ds, k, v) {
  const e = events().find((x) => x.id === id); if (!e) return;
  if (!canEdit(e)) return toast("Это событие может менять только автор");
  const data = { ...e.data };
  if (data.repeat?.days?.length) { data.overrides = { ...(data.overrides || {}) }; data.overrides[ds] = { ...(data.overrides[ds] || {}), [k]: v }; }
  else data[k] = v;
  await saveItem({ ...e, data }, `${k === "drop" ? "Отвозит" : "Забирает"}: ${v ? PICKS.find((p) => p[0] === v)[1] : "не назначено"}`);
}

/* ---------- ещё ---------- */
function renderMore(main) {
  const br = S.editBreaks || breaks().map((b) => ({ ...b }));
  const c = cycleCalc(), cs = cycleSummary(c), exp = docExpiring(30).length;
  const tiles = [
    ["health", "Здоровье", `${(() => { const n = dosesOn(iso(today()), true).filter((d) => !d.taken).length; return n ? `${n} ${plural(n, "приём", "приёма", "приёмов")} сегодня` : "все таблетки на сегодня приняты"; })()}${c && !c.empty ? " · цикл: " + cs.big.toLowerCase() : ""}`],
    ["balance", "Баланс и цели", (() => { const n = goals().filter((g) => !g.data.done).length; return `${n} ${plural(n, "цель", "цели", "целей")} в работе`; })()],
    ["lists", "Списки и хотелки", `${lists().length} ${plural(lists().length, "список", "списка", "списков")}`],
    ["bdays", "Дни рождения", (() => { const n = bdays().length, a = bdayAlerts(); return n ? `${n} ${plural(n, "человек", "человека", "человек")}${a.length ? ` · ${a[0].left === 0 ? "сегодня" : a[0].left === 1 ? "завтра" : "через " + a[0].left + " дн."}: ${a[0].b.name}` : ""}` : "добавьте родных и друзей"; })()],
    ["docs", "Документы", `${docs().length} ${plural(docs().length, "документ", "документа", "документов")}${exp ? ` · ${exp} скоро ${exp === 1 ? "истекает" : "истекают"}` : ""}`],
  ];
  main.innerHTML = `<div class="page-h"><h1>Ещё</h1></div>
    <div class="tiles">${tiles.map(([k, n, sub]) => `<button class="tile" data-go="${k}"><b>${n}</b><small>${esc(sub)}</small></button>`).join("")}</div>
    <div class="grid2">
      <div class="panel"><h2>Каникулы и праздники <span style="display:flex;gap:6px">${S.editBreaks ? '<button class="btn" id="brAdd">+ Период</button><button class="btn primary" id="brSave">Сохранить</button>' : '<button class="btn" id="brEdit">Править</button>'}</span></h2>
        <span class="note">В эти дни занятия Саши с отметкой «пропускать каникулы» не показываются. Даты примерные, сверьте с классным руководителем.</span>
        ${S.editBreaks ? br.map((b, i) => `<div class="brk-row"><input data-bk="${i}" data-f="title" value="${esc(b.title)}" aria-label="Название"><input type="date" data-bk="${i}" data-f="from" value="${b.from}" aria-label="С"><input type="date" data-bk="${i}" data-f="to" value="${b.to}" aria-label="По"><button class="btn danger" data-bdel="${i}">Удалить</button></div>`).join("")
          : br.map((b) => `<div class="setrow"><span>${esc(b.title)}</span><span class="muted mono" style="font-size:12px">${fmtDate(b.from)}${b.to && b.to !== b.from ? " – " + fmtDate(b.to) : ""}</span></div>`).join("")}</div>
      <div style="display:flex;flex-direction:column;gap:16px">
        <div class="panel"><h2>Профиль</h2>
          <div class="setrow"><span>Вы вошли как</span><span><i class="dot" style="background:${PEOPLE[S.me.person].c}"></i> ${pn(S.me.person)}</span></div>
          <div class="setrow"><span>Режим</span><span class="muted">${DB.demo ? "демо, данные в этом браузере" : "общая база"}</span></div>
          <div class="setrow"><span></span><span style="display:flex;gap:6px">${DB.demo ? '<button class="btn ghost" id="reset">Сбросить демо</button>' : ""}<button class="btn" id="out">Выйти</button></span></div></div>
        <div class="panel"><h2>Telegram</h2>${tgPanel()}</div>
        <div class="panel"><h2>Как поставить на телефон</h2>
          <span class="note">iPhone: откройте приложение в Safari → «Поделиться» → «На экран Домой». Mac: в Safari «Файл» → «Добавить в Dock».</span></div>
        <div class="panel"><h2>Скоро</h2><span class="note">Telegram-бот: напоминания о платежах, таблетках и кружках, утренняя сводка в 7:30, просьбы друг другу. Голосовое добавление дел. Подписка в календарь телефона. Подключаются после общей базы.</span></div>
      </div>
    </div>`;
  const out = $("#out"); out.onclick = async () => { await DB.signOut(); location.reload(); };
  $$("[data-go]", main).forEach((b) => (b.onclick = () => go(b.dataset.go)));
  const tgb = $("[data-tg-link]", main);
  if (tgb) tgb.onclick = async () => {
    const code = Array.from(crypto.getRandomValues(new Uint8Array(12)), (x) => x.toString(16).padStart(2, "0")).join("");
    try { await DB.tgCode(code); } catch (e) { return toast("Не получилось: " + (e.message || e)); }
    location.href = `https://t.me/${window.CONFIG.BOT_USERNAME}?start=${code}`;
  };
  const rs = $("#reset"); if (rs) rs.onclick = () => DB.reset();
  const be = $("#brEdit"); if (be) be.onclick = () => { S.editBreaks = br; render(); };
  const ba = $("#brAdd"); if (ba) ba.onclick = () => { const d = iso(today()); S.editBreaks.push({ title: "Каникулы", from: d, to: d }); render(); };
  $$("[data-bk]", main).forEach((inp) => (inp.oninput = () => (S.editBreaks[inp.dataset.bk][inp.dataset.f] = inp.value)));
  $$("[data-bdel]", main).forEach((b) => (b.onclick = () => { S.editBreaks.splice(+b.dataset.bdel, 1); render(); }));
  const bs = $("#brSave"); if (bs) bs.onclick = async () => {
    const list = S.editBreaks.filter((b) => b.from).map((b) => ({ ...b, to: b.to && b.to >= b.from ? b.to : b.from })).sort((a, b) => a.from.localeCompare(b.from));
    S.editBreaks = null;
    const it = kv("breaks");
    await saveItem(it ? { ...it, data: { key: "breaks", list } } : { type: "kv", vis: "shared", data: { key: "breaks", list } }, "Каникулы сохранены");
  };
}

/* ---------- окно редактирования ---------- */
function openModal(html, bind) {
  const m = $("#modal");
  m.innerHTML = `<div class="sheet" role="dialog" aria-modal="true">${html}</div>`;
  m.hidden = false;
  m.onclick = (e) => { if (e.target === m) closeModal(); };
  bind(m);
}
function closeModal() { const m = $("#modal"); m.hidden = true; m.innerHTML = ""; }
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("#modal").hidden) closeModal(); });

const choice = (key, opts, val) => `<div class="choice" data-choice="${key}">${opts.map(([v, n, c]) => `<button type="button" class="${v === val ? "on" : ""}" data-v="${v}" style="${c ? `--c:${c}` : ""}">${c ? `<i class="dot" style="background:${c}"></i>` : ""}${n}</button>`).join("")}</div>`;
const toggle = (key, on, title, hint) => `<div class="switch"><span>${title}${hint ? `<small>${hint}</small>` : ""}</span><button type="button" class="tog${on ? " on" : ""}" data-tog="${key}" aria-pressed="${on}" aria-label="${title}"></button></div>`;
function bindForm(m, F, rerender) {
  $$("[data-k]", m).forEach((el) => (el.oninput = el.onchange = () => (F[el.dataset.k] = el.value)));
  $$("[data-choice]", m).forEach((g) => $$("button", g).forEach((b) => (b.onclick = () => { F[g.dataset.choice] = b.dataset.v; rerender(); })));
  $$("[data-tog]", m).forEach((b) => (b.onclick = () => { F[b.dataset.tog] = !F[b.dataset.tog]; rerender(); }));
}

function openEvent(id, ds, preset = {}) {
  const e = id ? events().find((x) => x.id === id) : null;
  if (id && !e) return;
  const recurring = !!(e && e.data.repeat?.days?.length);
  const src = e ? (ds ? occ(e, ds) : { ...e.data }) : {};
  const me = S.me.person;
  const F = {
    title: "", cat: "care", who: me, date: ds || iso(S.sel), start: "", end: "", all_day: false, end_date: "",
    drop: "", pick: "", from: "", to: "", note: "", routine: false, no_pick: false, ...src, ...preset,
  };
  delete F.item; delete F.ds;
  F.vis = e ? e.vis : F.who === me ? "visible" : "shared";
  F.rep = recurring; F.days = recurring ? [...e.data.repeat.days] : [wd(parse(F.date))]; F.until = recurring ? e.data.repeat.until || "" : "";
  F.skip_breaks = e ? !!e.data.skip_breaks : F.who === "sasha";
  if (recurring) F.date = e.data.date;
  const editable = !e || canEdit(e);
  const pa = partner();

  const draw = () => {
    const personal = F.who === me || F.who === pa;
    const html = `<div class="sheet-h"><button data-close>Отмена</button><b>${e ? (editable ? "Событие" : "Событие (только просмотр)") : "Новое событие"}</b>${editable ? '<button class="go" data-save="all">Готово</button>' : "<span></span>"}</div>
      <label class="field"><span>Название</span><input data-k="title" value="${esc(F.title)}" placeholder="Гимнастика, стоматолог, свидание" maxlength="120"></label>
      <div class="field"><span>Сфера</span>${choice("cat", CATS.map((c) => [c.k, c.n, catC(c.k)]), F.cat)}</div>
      <div class="field"><span>Чьё</span>${choice("who", [[me, "Моё", PEOPLE[me].c], [pa, pn(pa), PEOPLE[pa].c], ["we", "Мы", PEOPLE.we.c], ["sasha", "Саша", PEOPLE.sasha.c]], F.who)}</div>
      ${F.who === me ? `<div class="field"><span>Кто видит</span>${choice("vis", [["private", "только мне"], ["visible", `видно ${pa === "zhenya" ? "Жене" : "Любе"}`], ["shared", "править могут оба"]], F.vis)}</div>` : ""}
      <div class="frow3"><label class="field"><span>${F.rep ? "Начиная с" : "Дата"}</span><input type="date" data-k="date" value="${F.date}"></label>
        ${F.all_day ? `<label class="field" style="grid-column:span 2"><span>По (включительно)</span><input type="date" data-k="end_date" value="${F.end_date || ""}"></label>`
          : `<label class="field"><span>Начало</span><input type="time" data-k="start" value="${F.start || ""}"></label><label class="field"><span>Конец</span><input type="time" data-k="end" value="${F.end || ""}"></label>`}</div>
      <div class="field" style="gap:12px">${toggle("all_day", F.all_day, "Весь день", "поездка, праздник, несколько дней")}
        ${toggle("rep", F.rep, "Повторять по дням недели")}
        ${F.rep ? `<div class="days">${WDS.map((n, i) => `<button type="button" class="${F.days.includes(i) ? "on" : ""}" data-day-t="${i}">${n}</button>`).join("")}</div>
          <label class="switch"><span>До даты<small>пусто — без конца</small></span><input type="date" data-k="until" value="${F.until || ""}" style="background:var(--card-2);border:0;border-radius:8px;padding:6px 8px;max-width:160px"></label>
          ${toggle("skip_breaks", F.skip_breaks, "Пропускать каникулы и праздники")}
          ${toggle("routine", F.routine, "Распорядок", "показывать полоской, как школу")}` : ""}</div>
      ${F.who === "sasha" && !F.all_day ? `<div class="field" style="gap:10px"><span>Кто отвозит и забирает</span>
        <div class="frow"><label class="field" style="background:var(--card-2)"><span>Отвозит</span><select data-k="drop">${PICKS.map(([p, n]) => `<option value="${p}"${p === (F.drop || "") ? " selected" : ""}>${n}</option>`).join("")}</select></label>
          <label class="field" style="background:var(--card-2)"><span>Откуда</span><input data-k="from" value="${esc(F.from || "")}" placeholder="Школа"></label></div>
        <div class="frow"><label class="field" style="background:var(--card-2)"><span>Забирает</span><select data-k="pick">${PICKS.map(([p, n]) => `<option value="${p}"${p === (F.pick || "") ? " selected" : ""}>${n}</option>`).join("")}</select></label>
          <label class="field" style="background:var(--card-2)"><span>Куда</span><input data-k="to" value="${esc(F.to || "")}" placeholder="Зал"></label></div>
        ${toggle("no_pick", F.no_pick, "Забирать не нужно", "не предупреждать, если никто не назначен")}</div>` : ""}
      <label class="field"><span>Заметка</span><textarea data-k="note" placeholder="Взять полис, купальник…">${esc(F.note || "")}</textarea></label>
      ${!personal || F.who === me ? "" : '<span class="note">Событие мужа или жены: он(а) увидит его у себя.</span>'}
      ${editable ? `<div class="sheet-foot">
        <span style="display:flex;gap:6px;flex-wrap:wrap">${e ? (recurring && ds ? `<button class="btn danger" data-del="one">Удалить ${fmtDate(ds)}</button><button class="btn danger" data-del="all">Удалить все повторы</button>` : '<button class="btn danger" data-del="all">Удалить</button>') : ""}</span>
        <span style="display:flex;gap:6px;flex-wrap:wrap">${recurring && ds ? `<button class="btn" data-save="one">Только ${fmtDate(ds)}</button>` : ""}<button class="btn primary" data-save="all">${recurring && ds ? "Для всех повторов" : "Сохранить"}</button></span></div>` : ""}`;
    openModal(html, (m) => {
      bindForm(m, F, draw);
      $$("[data-day-t]", m).forEach((b) => (b.onclick = () => { const i = +b.dataset.dayT; F.days = F.days.includes(i) ? F.days.filter((x) => x !== i) : [...F.days, i].sort(); draw(); }));
      $("[data-close]", m).onclick = closeModal;
      $$("[data-save]", m).forEach((b) => (b.onclick = () => saveEvent(e, F, b.dataset.save === "one" ? ds : null, ds)));
      $$("[data-del]", m).forEach((b) => (b.onclick = () => deleteEvent(e, b.dataset.del === "one" ? ds : null, b)));
      if (!editable) $$("input,select,textarea,.choice button,.tog,.days button", m).forEach((x) => (x.disabled = true));
      const t = $('[data-k="title"]', m); if (!e && t) t.focus();
    });
  };
  draw();
}
async function saveEvent(e, F, onlyDs, openDs) {
  if (!F.title.trim()) return toast("Напишите название");
  if (F.rep && !F.days.length) return toast("Выберите хотя бы один день недели");
  if (onlyDs && e) {
    const keys = ["title", "start", "end", "drop", "pick", "from", "to", "note"];
    const ov = {};
    keys.forEach((k) => { if ((F[k] || "") !== (e.data[k] || "")) ov[k] = F[k] || ""; });
    const data = { ...e.data, overrides: { ...(e.data.overrides || {}) } };
    if (Object.keys(ov).length) data.overrides[onlyDs] = ov; else delete data.overrides[onlyDs];
    closeModal();
    return saveItem({ ...e, data }, `Изменено только ${fmtDate(onlyDs)}`);
  }
  const me = S.me.person;
  const d = {
    title: F.title.trim(), cat: F.cat, who: F.who, date: F.date, all_day: !!F.all_day,
    start: F.all_day ? "" : F.start || "", end: F.all_day ? "" : F.end || "", end_date: F.all_day && F.end_date >= F.date ? F.end_date : "",
    note: (F.note || "").trim(), by: e ? e.data.by : me,
  };
  if (F.who === "sasha") Object.assign(d, { drop: F.drop || "", pick: F.pick || "", from: F.from || "", to: F.to || "", no_pick: !!F.no_pick });
  if (F.rep) Object.assign(d, { repeat: { days: F.days, until: F.until || null }, skip_breaks: !!F.skip_breaks, routine: !!F.routine, exceptions: e?.data.exceptions || [], overrides: { ...(e?.data.overrides || {}) } });
  if (openDs && d.overrides) delete d.overrides[openDs];
  const vis = F.who === me ? F.vis : "shared";
  closeModal();
  await saveItem(e ? { ...e, vis, data: d } : { type: "event", vis, data: d }, e ? "Сохранено" : "Событие добавлено");
}
async function deleteEvent(e, onlyDs, btn) {
  if (btn.dataset.sure !== "1") { btn.dataset.sure = "1"; btn.textContent = "Точно удалить?"; return; }
  closeModal();
  if (onlyDs) {
    const data = { ...e.data, exceptions: [...(e.data.exceptions || []), onlyDs] };
    return saveItem({ ...e, data }, `${fmtDate(onlyDs)} убрано из повторов`);
  }
  await guard(() => DB.remove(e.id)); toast("Удалено"); reload();
}

function openTask(id, preset = {}) {
  const t = id ? tasks().find((x) => x.id === id) : null;
  if (id && !t) return;
  const me = S.me.person, pa = partner();
  const F = { title: "", cat: "care", assignee: me, due: iso(S.sel), important: false, note: "", ...(t ? t.data : {}), ...preset };
  F.vis = t ? t.vis : "shared";
  const editable = !t || canEdit(t);
  const draw = () => {
    const html = `<div class="sheet-h"><button data-close>Отмена</button><b>${t ? "Задача" : F.care ? "Новая задача · забота" : "Новая задача"}</b>${editable ? '<button class="go" data-save>Готово</button>' : "<span></span>"}</div>
      <label class="field"><span>Что сделать</span><input data-k="title" value="${esc(F.title)}" placeholder="Купить купальник Саше" maxlength="160"></label>
      <div class="field"><span>Кому</span>${choice("assignee", [[me, "Мне", PEOPLE[me].c], [pa, pa === "zhenya" ? "Жене" : "Любе", PEOPLE[pa].c], ["we", F.care || F.cat === "care" ? "Свободная" : "Нам", PEOPLE.we.c]], F.assignee)}
        ${F.assignee === pa ? `<span class="note">Придёт ${pa === "zhenya" ? "Жене" : "Любе"} уведомлением как просьба: ответит «Беру» или «Обсудить».</span>` : F.assignee === "we" && (F.care || F.cat === "care") ? '<span class="note">Свободная задача: возьмёт тот, у кого будет время.</span>' : ""}</div>
      <div class="field"><span>Тип</span>${choice("kind", TASK_KINDS, F.kind || "")}</div>
      ${(() => { const day = F.due || iso(today()); const evs = eventsOn(day, true).filter((o) => !o.routine);
        return evs.length || F.event_id ? `<div class="field"><span>Это то же, что событие ${fmtDate(day)}?</span>${choice("event_id", [["", "Нет"], ...evs.map((o) => [o.item.id, `${o.start ? o.start + " " : ""}${o.title}`])], F.event_id || "")}
          <span class="note">Отметите задачу — событие отметится сделанным, и наоборот.</span></div>` : ""; })()}
      ${F.care ? "" : `<div class="field"><span>Сфера</span>${choice("cat", CATS.map((c) => [c.k, c.n, catC(c.k)]), F.cat)}</div>`}
      ${F.assignee === me ? `<div class="field"><span>Кто видит</span>${choice("vis", [["private", "только мне"], ["shared", "видно обоим"]], F.vis === "private" ? "private" : "shared")}</div>` : ""}
      <div class="frow"><label class="field"><span>Срок</span><input type="date" data-k="due" value="${F.due || ""}"></label>
        <div class="field" style="justify-content:center">${toggle("important", F.important, "★ Важное")}</div></div>
      <label class="field"><span>Заметка</span><textarea data-k="note" placeholder="Размер, ссылка, подробности">${esc(F.note || "")}</textarea></label>
      ${t ? `<span class="note">${esc(taskMeta(t))}</span>` : ""}
      ${editable ? `<div class="sheet-foot"><span>${t ? '<button class="btn danger" data-del>Удалить</button>' : ""}</span><button class="btn primary" data-save>${t ? "Сохранить" : "Добавить"}</button></div>` : ""}`;
    openModal(html, (m) => {
      bindForm(m, F, draw);
      $("[data-close]", m).onclick = closeModal;
      $$("[data-save]", m).forEach((b) => (b.onclick = () => saveTask(t, F)));
      const del = $("[data-del]", m);
      if (del) del.onclick = async () => {
        if (del.dataset.sure !== "1") { del.dataset.sure = "1"; del.textContent = "Точно удалить?"; return; }
        closeModal(); await guard(() => DB.remove(t.id)); toast("Удалено"); reload();
      };
      if (!editable) $$("input,select,textarea,.choice button,.tog", m).forEach((x) => (x.disabled = true));
      const ti = $('[data-k="title"]', m); if (!t && ti) ti.focus();
    });
  };
  draw();
}
async function saveTask(t, F) {
  if (!F.title.trim()) return toast("Напишите, что сделать");
  const me = S.me.person;
  const prev = t ? t.data : {};
  let status = prev.status || "open";
  if (status !== "done") {
    if (F.assignee !== me && F.assignee !== "we" && (prev.assignee !== F.assignee || status === "declined" || !t)) status = "asked";
    else if (F.assignee === me || F.assignee === "we") status = prev.assignee === F.assignee && status !== "asked" ? status : "open";
  }
  if (t && (F.due || "") !== (prev.due || "")) delete prev.first_due; // срок поменяли вручную — счёт переносов заново
  const data = { ...prev, title: F.title.trim(), kind: F.kind || "", event_id: F.event_id || "", event_date: F.event_id ? F.due || iso(today()) : "", cat: F.cat, assignee: F.assignee, due: F.due || "", important: !!F.important, note: (F.note || "").trim(), status, by: prev.by || me };
  if (status === "asked" || status === "open") data.taken_by = status === "open" ? null : prev.taken_by || null;
  const vis = F.assignee === me && F.vis === "private" ? "private" : "shared";
  closeModal();
  const tid = t ? t.id : uid();
  if (data.event_id) { const e = events().find((x) => x.id === data.event_id); if (e && e.data.task_id !== tid) await guard(() => DB.save({ ...e, data: { ...e.data, task_id: tid } }, S.me)); }
  if (prev.event_id && prev.event_id !== data.event_id) { const e = events().find((x) => x.id === prev.event_id); if (e && e.data.task_id === tid) { const ed = { ...e.data }; delete ed.task_id; await guard(() => DB.save({ ...e, data: ed }, S.me)); } }
  await saveItem(t ? { ...t, vis, data } : { id: tid, type: "task", vis, data }, t ? "Сохранено" : status === "asked" ? `Просьба отправлена ${F.assignee === "zhenya" ? "Жене" : "Любе"}` : "Задача добавлена");
}

