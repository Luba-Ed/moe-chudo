// Здоровье: таблетки и витамины, календарь цикла Любы.

const pills = () => S.items.filter((i) => i.type === "pill");
const pillActive = (p, ds) => (!p.data.start || p.data.start <= ds) && (!p.data.end || ds <= p.data.end);
function dosesOn(ds, all = false) {
  const out = [];
  pills().filter((p) => pillActive(p, ds)).forEach((p) => (p.data.times || []).forEach((tm) => out.push({ p, tm, taken: (p.data.log?.[ds] || []).includes(tm) })));
  return out.filter((d) => all || S.filter === "all" || S.filter === "we" || d.p.data.who === S.filter).sort((a, b) => a.tm.localeCompare(b.tm));
}
async function togglePill(id, ds, tm) {
  const p = pills().find((x) => x.id === id); if (!p) return;
  const day = new Set(p.data.log?.[ds] || []);
  day.has(tm) ? day.delete(tm) : day.add(tm);
  const log = { ...(p.data.log || {}), [ds]: [...day] };
  if (!log[ds].length) delete log[ds];
  await saveItem({ ...p, data: { ...p.data, log } }, day.has(tm) ? `${p.data.name}: принято` : null);
}
function courseText(p) {
  const d = p.data, t = iso(today());
  if (d.end && d.start) { const all = daysBetween(d.start, d.end) + 1, n = Math.min(all, daysBetween(d.start, t) + 1); return t > d.end ? "курс закончен" : `курс: день ${n} из ${all}`; }
  return "постоянно";
}
function pillsWidget() {
  const ds = iso(today()), list = dosesOn(ds);
  const n = list.filter((d) => d.taken).length;
  return `<div class="w"><h4><button class="linkh" data-go="health">Таблетки и витамины</button><span class="mono">${n} из ${list.length}</span></h4>
    ${list.map((d) => pillBtn(d, ds)).join("") || '<span class="note">На сегодня ничего</span>'}</div>`;
}
const pillBtn = (d, ds) => `<button class="pill${d.taken ? " taken" : ""}" data-pill="${d.p.id}" data-ds="${ds}" data-tm="${d.tm}"><span class="ic"></span><span class="nm">${esc(d.p.data.name)}<small>${d.tm} · ${esc(d.p.data.dose || "")}</small></span><i class="dot" style="background:${PEOPLE[d.p.data.who]?.c}"></i></button>`;

/* ----- цикл ----- */
// Прогноз считается по истории отмеченных месячных (как «Здоровье» на iPhone):
// средняя длина последних 6 циклов, овуляция — за 14 дней до следующих месячных,
// фертильное окно — 5 дней до овуляции и день после, ПМС — 5 дней до месячных.
// Если циклов меньше трёх — по настройкам. «Безопасные» — 3 дня после месячных (правило Любы).
const CYC_DEF = { min: 26, max: 28, plen: 5, safe: 3, auto: true };
const cycleItem = () => S.items.find((i) => i.type === "cycle");
const addDs = (ds, n) => iso(addD(parse(ds), n));
function cycleStats(ps, st) {
  const lens = [];
  for (let i = 1; i < ps.length; i++) lens.push(daysBetween(ps[i - 1].start, ps[i].start));
  const recent = lens.filter((l) => l >= 18 && l <= 50).slice(-6);
  if (st.auto !== false && recent.length >= 3) {
    const avg = recent.reduce((s, x) => s + x, 0) / recent.length;
    const sd = Math.sqrt(recent.reduce((s, x) => s + (x - avg) ** 2, 0) / recent.length);
    return { avg: Math.round(avg), lo: Math.round(avg - sd), hi: Math.round(avg + sd), n: recent.length, min: Math.min(...recent), max: Math.max(...recent), fromHistory: true };
  }
  return { avg: Math.round((st.min + st.max) / 2), lo: st.min, hi: st.max, n: recent.length, min: st.min, max: st.max, fromHistory: false };
}
function cycleCalc() {
  const it = cycleItem(); if (!it) return null;
  const st = { ...CYC_DEF, ...(it.data.settings || {}) };
  const ps = [...(it.data.periods || [])].filter((p) => p.start).sort((a, b) => a.start.localeCompare(b.start));
  if (!ps.length) return { ps, empty: true, st };
  const stats = cycleStats(ps, st), avg = stats.avg;
  const last = ps[ps.length - 1], tds = iso(today());
  const lastEnd = last.end || addDs(last.start, st.plen - 1);
  const open = !last.end && daysBetween(last.start, tds) + 1 <= 10;
  const late = tds > addDs(last.start, stats.hi) ? daysBetween(addDs(last.start, stats.hi), tds) : 0;
  const c = { ps, st, stats, avg, last, lastEnd, open, late };
  c.cur = cycleAt(tds, c) || { start: last.start, n: 1, k: 0 };
  c.day = c.cur.n;
  const s0 = c.cur.start, pe = c.cur.k === 0 && c.cur.base === last.start ? daysBetween(s0, lastEnd) + 1 : st.plen;
  const ov = addDs(s0, avg - 15);
  c.dates = {
    next: addDs(s0, avg), nextRange: [addDs(s0, stats.lo), addDs(s0, stats.hi)],
    ov, fert: [addDs(ov, -5), addDs(ov, 1)],
    safe: [addDs(s0, pe), addDs(s0, pe + st.safe - 1)],
    pms: addDs(s0, avg - 5),
  };
  c.next = c.dates.next; c.ov = ov;
  return c;
}
// в каком цикле день и какой это день цикла: по отмеченным месячным, дальше — прогноз по средней длине
function cycleAt(ds, c) {
  const before = c.ps.filter((p) => p.start <= ds);
  if (!before.length) return null;
  const base = before[before.length - 1], i = c.ps.indexOf(base), nextRec = c.ps[i + 1];
  if (nextRec) return { start: base.start, n: daysBetween(base.start, ds) + 1, k: 0, base: base.start, len: daysBetween(base.start, nextRec.start), end: base.end };
  const k = Math.floor(daysBetween(base.start, ds) / c.avg), start = addDs(base.start, k * c.avg);
  return { start, n: daysBetween(start, ds) + 1, k, base: base.start, len: null, end: k === 0 ? base.end : "" };
}
function cyclePhase(ds, c = cycleCalc()) {
  if (!c || c.empty) return null;
  for (const p of c.ps) { const end = p.end || addDs(p.start, c.st.plen - 1); if (ds >= p.start && ds <= end) return "period"; }
  const at = cycleAt(ds, c); if (!at) return null;
  const st = c.st, n = at.n, len = at.len || c.avg;
  if (at.k > 0 && n <= st.plen) return "pred";
  const ovN = len - 14, fert = [ovN - 5, ovN + 1];
  const pe = at.end ? daysBetween(at.start, at.end) + 1 : st.plen;
  if (n > pe && n <= pe + st.safe) return n >= fert[0] ? "safe risk" : "safe";
  if (n === ovN) return "ov";
  if (n >= fert[0] && n <= fert[1]) return "fert";
  if (n >= len - 4) return "pms";
  return null;
}
const PHASE_N = { period: "месячные", pred: "месячные (прогноз)", fert: "фертильные дни", ov: "овуляция", pms: "ПМС", safe: "безопасные дни", "safe risk": "безопасные по правилу 3 дней, но могут совпасть с фертильным окном" };
const rangeTxt = (a, b) => (a === b ? fmtDate(a) : parse(a).getMonth() === parse(b).getMonth() ? `${parse(a).getDate()}–${fmtDate(b)}` : `${fmtDate(a)} – ${fmtDate(b)}`);
function cycleSummary(c) {
  if (!c || c.empty) return { big: "Нет данных", sub: "Отметьте начало месячных" };
  const t = iso(today()), ph = cyclePhase(t, c);
  const phase = ph ? PHASE_N[ph].split(" по ")[0] : c.day <= c.avg - 14 ? "фолликулярная фаза" : "лютеиновая фаза";
  const D = c.dates, left = daysBetween(t, D.next);
  const lines = [];
  lines.push(c.late ? `Задержка ${c.late} ${plural(c.late, "день", "дня", "дней")}` : `Месячные ~${fmtDate(D.next)}${left > 0 ? `, через ${left} ${plural(left, "день", "дня", "дней")}` : ""} (может быть ${rangeTxt(D.nextRange[0], D.nextRange[1])})`);
  lines.push(`Овуляция ~${fmtDate(D.ov)}, фертильные ${rangeTxt(D.fert[0], D.fert[1])}`);
  if (D.safe[1] >= t) lines.push(`Безопасные дни: ${rangeTxt(D.safe[0], D.safe[1])}`);
  lines.push(`ПМС с ~${fmtDate(D.pms)}`);
  return { big: `День ${c.day}`, sub: phase, lines, next: lines[0], ph };
}
function partnerHint(c) {
  if (!c || c.empty) return "";
  const t = iso(today()), ph = cyclePhase(t, c), toPms = daysBetween(t, c.dates.pms);
  if (ph === "period") return "У Любы месячные. Хороший день взять на себя побольше дел.";
  if (ph === "pms") return "У Любы ПМС: может быть раздражительной, это гормоны, а не ты. Побольше бережности и терпения.";
  if (toPms > 0 && toPms <= 3) return `Через ${toPms} ${plural(toPms, "день", "дня", "дней")} у Любы начнётся ПМС.`;
  return "";
}
function cycleWidget() {
  const c = cycleCalc(); if (!c) return "";
  const s = cycleSummary(c), isLuba = S.me.person === "luba";
  const strip = c.empty ? "" : `<div class="cyc-strip">${Array.from({ length: c.avg }, (_, i) => { const ds = addDs(c.cur.start, i); const ph = cyclePhase(ds, c) || ""; return `<i class="${ph}${ds === iso(today()) ? " now" : ""}" title="день ${i + 1}${ph ? ": " + PHASE_N[ph] : ""}"></i>`; }).join("")}</div>`;
  return `<div class="w"><h4><button class="linkh" data-go="health" data-sub="cycle">Цикл Любы</button><span class="mono">${isLuba ? "видит и Женя" : "заносит Люба"}</span></h4>
    <div><div class="cyc-big">${s.big}</div><div class="mono muted" style="font-size:11px;text-transform:uppercase;letter-spacing:.06em">${esc(s.sub)}</div></div>
    ${strip}${(s.lines || []).map((l) => `<span class="note">${esc(l)}</span>`).join("")}
    ${!isLuba && partnerHint(c) ? `<span class="hint-card">${esc(partnerHint(c))}</span>` : ""}
    ${isLuba ? (cyclePhase(iso(today()), c) === "period" ? `<span class="note">Идут месячные, день ${c.day} из ${c.st.plen}</span>` : '<button class="btn sm" data-cyc-quick>Начались месячные</button>') : ""}</div>`;
}
function openCycleSettings() {
  const it = cycleItem(), d = it ? it.data : { periods: [], days: {} };
  const F = { ...CYC_DEF, ...(d.settings || {}) };
  const draw = () => openModal(settingsHTML(), bindS);
  const settingsHTML = () => `<div class="sheet-h"><button data-close>Отмена</button><b>Настройки цикла</b><button class="go" data-save>Готово</button></div>
    ${toggleRow("auto", F.auto !== false, "Считать по моей истории", "средняя длина последних циклов; вручную — по полям ниже")}
    <div class="frow"><label class="field"><span>Цикл от, дней</span><input data-k="min" type="number" min="20" max="40" value="${F.min}"></label><label class="field"><span>до, дней</span><input data-k="max" type="number" min="20" max="40" value="${F.max}"></label></div>
    <div class="frow"><label class="field"><span>Месячные, дней</span><input data-k="plen" type="number" min="2" max="10" value="${F.plen}"></label><label class="field"><span>Безопасных дней после</span><input data-k="safe" type="number" min="0" max="7" value="${F.safe}"></label></div>
    <span class="note">Овуляция — за 14 дней до следующих месячных, фертильное окно — 5 дней до неё и день после. ПМС — 5 дней до месячных.</span>
    <div class="sheet-foot"><span></span><button class="btn primary" data-save>Сохранить</button></div>`;
  const bindS = (m) => {
    bindForm(m, F, draw);
    $("[data-close]", m).onclick = closeModal;
    $$("[data-save]", m).forEach((b) => (b.onclick = async () => {
      const n = (k, lo, hi) => Math.min(hi, Math.max(lo, Math.round(+F[k] || CYC_DEF[k])));
      let min = n("min", 20, 40), max = n("max", 20, 40); if (max < min) [min, max] = [max, min];
      closeModal();
      await saveCycle({ ...d, settings: { min, max, plen: n("plen", 2, 10), safe: n("safe", 0, 7), auto: F.auto !== false } }, "Настройки цикла сохранены");
    }));
  };
  return draw();
  openModal(`<div class="sheet-h"><button data-close>Отмена</button><b>Настройки цикла</b><button class="go" data-save>Готово</button></div>
    <div class="frow"><label class="field"><span>Цикл от, дней</span><input data-k="min" type="number" min="20" max="40" value="${F.min}"></label><label class="field"><span>до, дней</span><input data-k="max" type="number" min="20" max="40" value="${F.max}"></label></div>
    <div class="frow"><label class="field"><span>Месячные, дней</span><input data-k="plen" type="number" min="2" max="10" value="${F.plen}"></label><label class="field"><span>Безопасных дней после</span><input data-k="safe" type="number" min="0" max="7" value="${F.safe}"></label></div>
    <span class="note">Овуляция считается за 14 дней до следующих месячных, фертильное окно — 5 дней до неё и день после. ПМС — 5 дней до месячных.</span>
    <div class="sheet-foot"><span></span><button class="btn primary" data-save>Сохранить</button></div>`, (m) => {
    bindForm(m, F, () => {});
    $("[data-close]", m).onclick = closeModal;
    $$("[data-save]", m).forEach((b) => (b.onclick = async () => {
      const n = (k, lo, hi) => Math.min(hi, Math.max(lo, Math.round(+F[k] || CYC_DEF[k])));
      let min = n("min", 20, 40), max = n("max", 20, 40); if (max < min) [min, max] = [max, min];
      closeModal();
      await saveCycle({ ...d, settings: { min, max, plen: n("plen", 2, 10), safe: n("safe", 0, 7) } }, "Настройки цикла сохранены");
    }));
  });
}

/* ----- вода: стаканы по 250 мл ----- */
const WATER_GOAL = { luba: 1500, zhenya: 2000 }, GLASS_ML = 250;
const waterItem = (p) => S.items.find((i) => i.type === "kv" && i.data.key === "water_" + p);
const waterCount = (p, ds = iso(today())) => waterItem(p)?.data.log?.[ds] || 0;
async function setWater(p, n) {
  const it = waterItem(p), ds = iso(today());
  const data = { key: "water_" + p, goal: WATER_GOAL[p], ...(it ? it.data : {}) };
  data.log = { ...(data.log || {}), [ds]: Math.max(0, n) };
  const goalN = Math.round((data.goal || WATER_GOAL[p]) / GLASS_ML);
  await saveItem(it ? { ...it, data } : { type: "kv", vis: "shared", data }, n >= goalN && waterCount(p) < goalN ? `${pn(p)}: норма воды выполнена` : null);
}
const glassSVG = (on) => `<svg viewBox="0 0 24 32" aria-hidden="true"><path d="M3 3h18l-2.2 25a2 2 0 0 1-2 1.8H7.2a2 2 0 0 1-2-1.8z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>${on ? '<path d="M5 11h14l-1.5 16.6a1.5 1.5 0 0 1-1.5 1.4H8a1.5 1.5 0 0 1-1.5-1.4z" fill="var(--water)"/>' : ""}</svg>`;
function waterPanel() {
  return `<div class="panel"><h2>Вода <span class="mono muted" style="font-size:11px;font-weight:400">стакан = 250 мл</span></h2>
    ${["luba", "zhenya"].map((p) => { const goal = waterItem(p)?.data.goal || WATER_GOAL[p], total = Math.round(goal / GLASS_ML), n = waterCount(p);
      return `<div class="water"><div class="water-h"><span><i class="dot" style="background:${PEOPLE[p].c}"></i> ${pn(p)}</span><span class="mono">${(n * GLASS_ML / 1000).toLocaleString("ru-RU")} из ${(goal / 1000).toLocaleString("ru-RU")} л${n >= total ? " ✓" : ""}</span></div>
        <div class="glasses">${Array.from({ length: Math.max(total, n) }, (_, i) => `<button class="glass${i < n ? " on" : ""}${i >= total ? " extra" : ""}" data-water="${p}" data-i="${i + 1}" aria-label="${i < n ? "Убрать" : "Выпит"} стакан ${i + 1}">${glassSVG(i < n)}</button>`).join("")}
          <button class="glass add" data-water="${p}" data-i="${n + 1}" aria-label="Ещё стакан сверх нормы">+</button></div></div>`; }).join("")}
    <span class="note">Нажмите на стакан, когда выпили. Нажали лишний — нажмите на последний полный, он опустеет. Каждый день начинается с пустых стаканов.</span></div>`;
}
async function saveCycle(data, msg) {
  const it = cycleItem();
  if (S.me.person !== "luba") return toast("Цикл заносит только Люба");
  await saveItem(it ? { ...it, data } : { type: "cycle", vis: "visible", data: { periods: [], days: {}, ...data } }, msg);
}
// Отмечается только первый день месячных — остальные дни (по настройке, 5) добавляются сами.
const periodEnd = (p, plen) => p.end || addDs(p.start, plen - 1);
const cyclePlen = (d) => ({ ...CYC_DEF, ...(d.settings || {}) }).plen;
async function cycleMark(ds) {
  const it = cycleItem(), d = it ? it.data : { periods: [], days: {} }, plen = cyclePlen(d);
  const ps = [...(d.periods || [])].sort((a, b) => a.start.localeCompare(b.start));
  const inside = ps.find((p) => ds >= p.start && ds <= periodEnd(p, plen));
  const near = ps.find((p) => Math.abs(daysBetween(p.start, ds)) <= 10);
  if (inside || near) return openCycleDay(ds); // рядом уже есть месячные — спросим, что сделать
  ps.push({ start: ds, end: "" });
  await saveCycle({ ...d, periods: ps }, `Месячные с ${fmtDate(ds)}, ${plen} ${plural(plen, "день", "дня", "дней")} отмечены`);
}
function openCycleDay(ds) {
  const it = cycleItem(), d = it ? it.data : { periods: [], days: {} };
  const isLuba = S.me.person === "luba";
  const F = { mood: "", pain: "", note: "", ...(d.days?.[ds] || {}) };
  const plen = cyclePlen(d);
  const per = (d.periods || []).find((p) => ds >= p.start && ds <= periodEnd(p, plen));
  const near = !per && (d.periods || []).find((p) => Math.abs(daysBetween(p.start, ds)) <= 10);
  const draw = () => openModal(`<div class="sheet-h"><button data-close>${isLuba ? "Отмена" : "Закрыть"}</button><b>${fmtLong(ds)}</b>${isLuba ? '<button class="go" data-save>Готово</button>' : "<span></span>"}</div>
    <span class="note">${PHASE_N[cyclePhase(ds)] ? "Фаза: " + PHASE_N[cyclePhase(ds)] : "Обычный день цикла"}</span>
    <div class="field"><span>Самочувствие</span>${choice("mood", [["good", "Хорошо"], ["ok", "Нормально"], ["bad", "Плохо"]], F.mood)}</div>
    <div class="field"><span>Боль</span>${choice("pain", [["none", "Нет"], ["light", "Слабая"], ["strong", "Сильная"]], F.pain)}</div>
    <label class="field"><span>Заметка</span><textarea data-k="note" placeholder="Как прошёл день">${esc(F.note)}</textarea></label>
    ${isLuba ? `<div class="sheet-foot"><span style="display:flex;gap:6px;flex-wrap:wrap">${per ? `${ds !== per.start ? '<button class="btn" data-end-here>Закончились в этот день</button>' : ""}<button class="btn danger" data-rm-period>Удалить месячные с ${fmtDate(per.start)}</button>` : near ? `<button class="btn" data-move-start>Начались в этот день, а не ${fmtDate(near.start)}</button>` : `<button class="btn" data-mark>Начались месячные</button>`}</span><button class="btn primary" data-save>Сохранить</button></div>` : ""}`, (m) => {
    bindForm(m, F, draw);
    $("[data-close]", m).onclick = closeModal;
    if (!isLuba) $$("input,textarea,.choice button", m).forEach((x) => (x.disabled = true));
    $$("[data-save]", m).forEach((b) => (b.onclick = async () => { const days = { ...(d.days || {}) }; if (F.mood || F.pain || F.note.trim()) days[ds] = { mood: F.mood, pain: F.pain, note: F.note.trim() }; else delete days[ds]; closeModal(); await saveCycle({ ...d, days }, "Сохранено"); }));
    const mk = $("[data-mark]", m); if (mk) mk.onclick = () => { closeModal(); cycleMark(ds); };
    const eh = $("[data-end-here]", m); if (eh) eh.onclick = async () => { closeModal(); await saveCycle({ ...d, periods: d.periods.map((p) => (p === per ? { ...p, end: ds } : p)) }, `Месячные: ${fmtDate(per.start)} – ${fmtDate(ds)}`); };
    const ms = $("[data-move-start]", m); if (ms) ms.onclick = async () => { closeModal(); await saveCycle({ ...d, periods: d.periods.map((p) => (p === near ? { start: ds, end: "" } : p)) }, `Начало месячных перенесено на ${fmtDate(ds)}`); };
    const rm = $("[data-rm-period]", m); if (rm) rm.onclick = async () => { if (rm.dataset.sure !== "1") { rm.dataset.sure = "1"; rm.textContent = "Точно удалить?"; return; } closeModal(); await saveCycle({ ...d, periods: d.periods.filter((p) => p !== per) }, "Удалено"); };
  });
  draw();
}

/* ----- страница ----- */
function renderHealth(main) {
  if (!S.cmonth) S.cmonth = new Date(today().getFullYear(), today().getMonth(), 1);
  const ds = iso(today()), doses = dosesOn(ds, true), c = cycleCalc(), s = cycleSummary(c), isLuba = S.me.person === "luba";
  const by = ["luba", "zhenya", "sasha"].map((w) => ({ w, list: doses.filter((d) => d.p.data.who === w) })).filter((g) => g.list.length);
  const last7 = Array.from({ length: 7 }, (_, i) => iso(addD(today(), i - 6)));
  // календарь цикла на месяц
  const y = S.cmonth.getFullYear(), mo = S.cmonth.getMonth(), first = new Date(y, mo, 1), start = mondayOf(first);
  const cells = Math.ceil((wd(first) + new Date(y, mo + 1, 0).getDate()) / 7) * 7;
  let grid = WDS.map((x) => `<div class="mo-h">${x}</div>`).join("");
  for (let i = 0; i < cells; i++) {
    const d = addD(start, i), dd = iso(d), ph = cyclePhase(dd, c) || "", note = cycleItem()?.data.days?.[dd];
    grid += `<button class="cyc-day ${ph}${d.getMonth() !== mo ? " out" : ""}${dd === ds ? " today" : ""}" data-cday="${dd}" aria-label="${fmtLong(dd)}${ph ? ", " + PHASE_N[ph] : ""}">${d.getDate()}${note ? "<i></i>" : ""}</button>`;
  }
  main.innerHTML = `<div class="page-h">${mobBack()}<h1>Здоровье</h1></div>
    <div class="grid2">
      <div style="display:flex;flex-direction:column;gap:16px;min-width:0">
        ${waterPanel()}
        <div class="panel"><h2>Таблетки сегодня <button class="btn" data-new-pill>+ Таблетка</button></h2>
          ${by.map((g) => `<div class="mini-h"><i class="dot" style="background:${PEOPLE[g.w].c}"></i> ${pn(g.w)}</div>${g.list.map((d) => pillBtn(d, ds)).join("")}`).join("") || '<span class="note">Добавьте витамины или курс таблеток — приложение будет напоминать.</span>'}</div>
        <div class="panel"><h2>Все таблетки и курсы</h2>
          ${pills().map((p) => { const per = p.data.times?.length || 1; return `<button class="medrow" data-pill-open="${p.id}"><i class="dot" style="background:${PEOPLE[p.data.who]?.c}"></i><span class="on"><b>${esc(p.data.name)}</b><small>${esc(p.data.dose || "")} · ${(p.data.times || []).join(", ")} · ${courseText(p)}</small></span>
            <span class="adh" aria-label="Последние 7 дней">${last7.map((d) => { const n = (p.data.log?.[d] || []).length; return `<i class="${!pillActive(p, d) ? "na" : n >= per ? "ok" : n ? "half" : ""}"></i>`; }).join("")}</span></button>`; }).join("") || '<span class="note">Пусто</span>'}
          <span class="note">Квадратики — последние 7 дней: зелёный — всё принято.</span></div>
      </div>
      <div class="panel" id="cycle"><h2>Цикл Любы <span class="mono muted" style="font-size:11px;font-weight:400">${isLuba ? "видит и Женя, менять можете только вы" : "заносит только Люба"}</span></h2>
        ${c ? `<div class="cyc-sum"><div><div class="cyc-big">${s.big}</div><div class="mono muted" style="font-size:11px;text-transform:uppercase;letter-spacing:.06em">${esc(s.sub)}</div></div><div class="cyc-lines">${(s.lines || []).map((l) => `<span>${esc(l)}</span>`).join("")}</div></div>
          ${!isLuba && partnerHint(c) ? `<span class="hint-card">${esc(partnerHint(c))}</span>` : ""}
          <div class="calbar" style="gap:8px"><b style="font-size:16px">${MONTHS[mo]} ${y}</b><span class="spacer"></span><div class="arrows"><button class="icon-btn" data-cm="-1" aria-label="Прошлый месяц">‹</button><button class="icon-btn" data-cm="1" aria-label="Следующий месяц">›</button></div></div>
          <div class="cyc-grid">${grid}</div>
          <div class="legend"><span><i style="background:var(--luba)"></i>месячные</span><span><i style="box-shadow:0 0 0 1.5px var(--luba) inset"></i>прогноз</span><span><i style="background:color-mix(in srgb,var(--luba) 28%,transparent)"></i>фертильные</span><span><i style="box-shadow:0 0 0 2px var(--fg) inset"></i>овуляция</span><span><i style="background:color-mix(in srgb,var(--c-care) 32%,transparent)"></i>ПМС</span><span><i style="background:color-mix(in srgb,var(--we) 40%,transparent)"></i>безопасные</span><span><i style="background:repeating-linear-gradient(135deg,color-mix(in srgb,var(--we) 40%,transparent) 0 3px,color-mix(in srgb,var(--luba) 28%,transparent) 3px 6px)"></i>безопасные, но рядом фертильное окно</span></div>
          ${isLuba ? `<span class="note">Отмечайте только первый день — остальные ${c.st.plen} дней отметятся сами. Нажмите на любой день, чтобы записать самочувствие, сдвинуть начало или отметить, что закончились раньше.</span>${cyclePhase(iso(today()), c) === "period" ? "" : '<button class="btn primary" data-cyc-quick>Начались месячные сегодня</button>'}` : ""}
          <span class="note">${c.stats.fromHistory ? `Считаю по вашей истории: средний цикл ${c.avg} ${plural(c.avg, "день", "дня", "дней")} (последние ${c.stats.n} циклов были от ${c.stats.min} до ${c.stats.max} дней)` : `Считаю по циклу ${c.st.min}–${c.st.max} дней — отметьте ещё месячные, и прогноз пойдёт по вашей истории`}, месячные ${c.st.plen} ${plural(c.st.plen, "день", "дня", "дней")}${isLuba ? ' (<button class="linkbtn" data-cyc-set>изменить</button>)' : ""}. «Безопасные» — ${c.st.safe} дня после месячных, как вы просили. Календарный способ не защищает надёжно: если эти дни задевают фертильное окно, они помечены штриховкой.</span>`
          : isLuba ? `<span class="note">Отметьте начало последних месячных — приложение посчитает прогноз.</span><button class="btn primary" data-cyc-quick>Начались месячные сегодня</button>` : '<span class="note">Люба ещё не заполнила календарь.</span>'}
      </div>
    </div>`;
  $("[data-new-pill]", main).onclick = () => openPill(null);
  const cs = $("[data-cyc-set]", main); if (cs) cs.onclick = openCycleSettings;
  $$("[data-pill-open]", main).forEach((b) => (b.onclick = () => openPill(b.dataset.pillOpen)));
  $$("[data-cm]", main).forEach((b) => (b.onclick = () => { S.cmonth = new Date(y, mo + +b.dataset.cm, 1); render(); }));
  $$("[data-cday]", main).forEach((b) => (b.onclick = () => {
    const dd = b.dataset.cday, ph = cyclePhase(dd, c);
    if (!isLuba || ph === "period" || cycleItem()?.data.days?.[dd] || dd > iso(today())) return openCycleDay(dd);
    cycleMark(dd);
  }));
  if (S.healthSub === "cycle") { S.healthSub = null; setTimeout(() => $("#cycle")?.scrollIntoView({ behavior: "smooth" }), 50); }
  bindToday(main);
}
function bindHealth(root) {
  $$("[data-pill]", root).forEach((b) => (b.onclick = () => togglePill(b.dataset.pill, b.dataset.ds, b.dataset.tm)));
  $$("[data-cyc-quick]", root).forEach((b) => (b.onclick = () => cycleMark(iso(today()))));
  $$("[data-water]", root).forEach((b) => (b.onclick = () => { const p = b.dataset.water, i = +b.dataset.i; setWater(p, waterCount(p) === i ? i - 1 : i); }));
}
function openPill(id) {
  const p = id ? pills().find((x) => x.id === id) : null;
  const F = { who: S.me.person, name: "", dose: "", times: "08:00", start: iso(today()), end: "", note: "", ...(p ? { ...p.data, times: (p.data.times || []).join(", ") } : {}) };
  const draw = () => openModal(`<div class="sheet-h"><button data-close>Отмена</button><b>${p ? "Таблетка" : "Новая таблетка или витамин"}</b><button class="go" data-save>Готово</button></div>
    <div class="field"><span>Кто принимает</span>${choice("who", [["luba", "Люба", PEOPLE.luba.c], ["zhenya", "Женя", PEOPLE.zhenya.c], ["sasha", "Саша", PEOPLE.sasha.c]], F.who)}</div>
    <div class="frow"><label class="field"><span>Название</span><input data-k="name" value="${esc(F.name)}" placeholder="Витамин D" maxlength="60"></label>
      <label class="field"><span>Доза</span><input data-k="dose" value="${esc(F.dose)}" placeholder="2000 МЕ" maxlength="40"></label></div>
    <label class="field"><span>Время приёма</span><input data-k="times" value="${esc(F.times)}" placeholder="08:00, 20:00"></label>
    <div class="frow"><label class="field"><span>С</span><input type="date" data-k="start" value="${F.start || ""}"></label><label class="field"><span>По (пусто — постоянно)</span><input type="date" data-k="end" value="${F.end || ""}"></label></div>
    <label class="field"><span>Заметка</span><textarea data-k="note" placeholder="После еды, не вместе с кофе">${esc(F.note || "")}</textarea></label>
    <div class="sheet-foot"><span>${p ? '<button class="btn danger" data-del>Удалить</button>' : ""}</span><button class="btn primary" data-save>${p ? "Сохранить" : "Добавить"}</button></div>`, (m) => {
    bindForm(m, F, draw);
    $("[data-close]", m).onclick = closeModal;
    $$("[data-save]", m).forEach((b) => (b.onclick = async () => {
      const times = [...new Set(String(F.times).split(/[,\s]+/).map((x) => x.replace(".", ":")).filter((x) => /^\d{1,2}:\d{2}$/.test(x)).map((x) => x.padStart(5, "0")))].sort();
      if (!F.name.trim()) return toast("Напишите название");
      if (!times.length) return toast("Укажите время, например 08:00");
      const data = { ...(p ? p.data : { log: {} }), who: F.who, name: F.name.trim(), dose: F.dose.trim(), times, start: F.start || iso(today()), end: F.end || "", note: (F.note || "").trim(), by: p ? p.data.by : S.me.person };
      closeModal();
      await saveItem(p ? { ...p, data } : { type: "pill", vis: "shared", data }, p ? "Сохранено" : "Добавлено");
    }));
    confirmDelete(m, p);
  });
  draw();
}
