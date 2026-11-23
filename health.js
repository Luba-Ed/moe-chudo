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
const cycleItem = () => S.items.find((i) => i.type === "cycle");
function cycleCalc() {
  const it = cycleItem(); if (!it) return null;
  const ps = [...(it.data.periods || [])].filter((p) => p.start).sort((a, b) => a.start.localeCompare(b.start));
  if (!ps.length) return { ps, empty: true };
  const lens = []; for (let i = 1; i < ps.length; i++) lens.push(daysBetween(ps[i - 1].start, ps[i].start));
  const recent = lens.slice(-6).filter((l) => l >= 18 && l <= 45);
  const avg = recent.length ? Math.round(recent.reduce((s, x) => s + x, 0) / recent.length) : 28;
  const plens = ps.filter((p) => p.end).map((p) => daysBetween(p.start, p.end) + 1).filter((l) => l > 0 && l < 12).slice(-6);
  const plen = plens.length ? Math.round(plens.reduce((s, x) => s + x, 0) / plens.length) : 5;
  const last = ps[ps.length - 1], tds = iso(today());
  const day = daysBetween(last.start, tds) + 1;
  const next = iso(addD(parse(last.start), avg));
  const late = tds > next ? daysBetween(next, tds) : 0;
  const ov = iso(addD(parse(next), -14));
  const open = !last.end && day <= 10;
  return { ps, avg, plen, last, day, next, late, ov, open };
}
function cyclePhase(ds, c = cycleCalc()) {
  if (!c || c.empty) return null;
  for (const p of c.ps) { const end = p.end || iso(addD(parse(p.start), c.plen - 1)); if (ds >= p.start && ds <= end) return "period"; }
  if (ds < c.last.start) return null;
  for (let k = 0; k < 8; k++) {
    const st = iso(addD(parse(c.last.start), c.avg * k)), nx = iso(addD(parse(st), c.avg));
    if (ds < st || ds >= nx) continue;
    if (k > 0 && ds <= iso(addD(parse(st), c.plen - 1))) return "pred";
    const ov = iso(addD(parse(nx), -14));
    if (ds === ov) return "ov";
    if (ds >= iso(addD(parse(ov), -5)) && ds <= iso(addD(parse(ov), 1))) return "fert";
    if (ds >= iso(addD(parse(nx), -5))) return "pms";
    return null;
  }
  return null;
}
const PHASE_N = { period: "месячные", pred: "месячные (прогноз)", fert: "фертильные дни", ov: "овуляция", pms: "ПМС" };
function cycleSummary(c) {
  if (!c || c.empty) return { big: "Нет данных", sub: "Отметьте начало месячных" };
  const ph = cyclePhase(iso(today()), c);
  const phase = ph === "period" ? "месячные" : ph === "ov" ? "овуляция" : ph === "fert" ? "фертильные дни" : ph === "pms" ? "ПМС" : c.day <= 14 ? "фолликулярная фаза" : "лютеиновая фаза";
  const left = daysBetween(iso(today()), c.next);
  return { big: `День ${c.day} из ${c.avg}`, sub: phase, next: c.late ? `задержка ${c.late} ${plural(c.late, "день", "дня", "дней")}` : `месячные ~${fmtDate(c.next)}, через ${left} ${plural(left, "день", "дня", "дней")}`, ph };
}
function partnerHint(c) {
  if (!c || c.empty) return "";
  const t = iso(today()), ph = cyclePhase(t, c), left = daysBetween(t, c.next);
  if (ph === "period") return "У Любы месячные. Хороший день взять на себя побольше дел.";
  if (ph === "pms") return `У Любы ПМС, месячные примерно через ${left} ${plural(left, "день", "дня", "дней")}. Побольше бережности.`;
  if (left > 0 && left <= 7) return `Через ${left} ${plural(left, "день", "дня", "дней")} у Любы начнётся ПМС.`;
  return "";
}
function cycleWidget() {
  const c = cycleCalc(); if (!c) return "";
  const s = cycleSummary(c), isLuba = S.me.person === "luba";
  const strip = c.empty ? "" : `<div class="cyc-strip">${Array.from({ length: c.avg }, (_, i) => { const ds = iso(addD(parse(c.last.start), i)); const ph = cyclePhase(ds, c) || ""; return `<i class="${ph}${ds === iso(today()) ? " now" : ""}" title="день ${i + 1}"></i>`; }).join("")}</div>`;
  return `<div class="w"><h4><button class="linkh" data-go="health" data-sub="cycle">Цикл Любы</button><span class="mono">${isLuba ? "видит и Женя" : "заносит Люба"}</span></h4>
    <div><div class="cyc-big">${s.big}</div><div class="mono muted" style="font-size:11px;text-transform:uppercase;letter-spacing:.06em">${esc(s.sub)}</div></div>
    ${strip}${s.next ? `<span class="note">${esc(s.next)}</span>` : ""}
    ${!isLuba && partnerHint(c) ? `<span class="hint-card">${esc(partnerHint(c))}</span>` : ""}
    ${isLuba ? `<button class="btn sm" data-cyc-quick>${c.open ? "Месячные закончились" : "Начались месячные"}</button>` : ""}</div>`;
}
async function saveCycle(data, msg) {
  const it = cycleItem();
  if (S.me.person !== "luba") return toast("Цикл заносит только Люба");
  await saveItem(it ? { ...it, data } : { type: "cycle", vis: "visible", data: { periods: [], days: {}, ...data } }, msg);
}
async function cycleMark(ds) {
  const it = cycleItem(), d = it ? it.data : { periods: [], days: {} };
  const ps = [...(d.periods || [])].sort((a, b) => a.start.localeCompare(b.start));
  const inside = ps.find((p) => ds >= p.start && ds <= (p.end || p.start));
  const openP = ps.find((p) => !p.end && daysBetween(p.start, ds) >= 0 && daysBetween(p.start, ds) <= 10);
  let msg;
  if (openP && ds > openP.start) { openP.end = ds; msg = `Месячные: ${fmtDate(openP.start)} – ${fmtDate(ds)}`; }
  else if (inside) { return openCycleDay(ds); }
  else { ps.push({ start: ds, end: "" }); msg = `Начало месячных: ${fmtDate(ds)}`; }
  await saveCycle({ ...d, periods: ps }, msg);
}
function openCycleDay(ds) {
  const it = cycleItem(), d = it ? it.data : { periods: [], days: {} };
  const isLuba = S.me.person === "luba";
  const F = { mood: "", pain: "", note: "", ...(d.days?.[ds] || {}) };
  const per = (d.periods || []).find((p) => ds >= p.start && ds <= (p.end || p.start));
  const draw = () => openModal(`<div class="sheet-h"><button data-close>${isLuba ? "Отмена" : "Закрыть"}</button><b>${fmtLong(ds)}</b>${isLuba ? '<button class="go" data-save>Готово</button>' : "<span></span>"}</div>
    <span class="note">${PHASE_N[cyclePhase(ds)] ? "Фаза: " + PHASE_N[cyclePhase(ds)] : "Обычный день цикла"}</span>
    <div class="field"><span>Самочувствие</span>${choice("mood", [["good", "Хорошо"], ["ok", "Нормально"], ["bad", "Плохо"]], F.mood)}</div>
    <div class="field"><span>Боль</span>${choice("pain", [["none", "Нет"], ["light", "Слабая"], ["strong", "Сильная"]], F.pain)}</div>
    <label class="field"><span>Заметка</span><textarea data-k="note" placeholder="Как прошёл день">${esc(F.note)}</textarea></label>
    ${isLuba ? `<div class="sheet-foot"><span style="display:flex;gap:6px;flex-wrap:wrap">${per ? `<button class="btn danger" data-rm-period>Удалить месячные ${fmtDate(per.start)}</button>` : `<button class="btn" data-mark>Начало месячных</button>`}</span><button class="btn primary" data-save>Сохранить</button></div>` : ""}`, (m) => {
    bindForm(m, F, draw);
    $("[data-close]", m).onclick = closeModal;
    if (!isLuba) $$("input,textarea,.choice button", m).forEach((x) => (x.disabled = true));
    $$("[data-save]", m).forEach((b) => (b.onclick = async () => { const days = { ...(d.days || {}) }; if (F.mood || F.pain || F.note.trim()) days[ds] = { mood: F.mood, pain: F.pain, note: F.note.trim() }; else delete days[ds]; closeModal(); await saveCycle({ ...d, days }, "Сохранено"); }));
    const mk = $("[data-mark]", m); if (mk) mk.onclick = () => { closeModal(); cycleMark(ds); };
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
        <div class="panel"><h2>Сегодня <button class="btn" data-new-pill>+ Таблетка</button></h2>
          ${by.map((g) => `<div class="mini-h"><i class="dot" style="background:${PEOPLE[g.w].c}"></i> ${pn(g.w)}</div>${g.list.map((d) => pillBtn(d, ds)).join("")}`).join("") || '<span class="note">Добавьте витамины или курс таблеток — приложение будет напоминать.</span>'}</div>
        <div class="panel"><h2>Все таблетки и курсы</h2>
          ${pills().map((p) => { const per = p.data.times?.length || 1; return `<button class="medrow" data-pill-open="${p.id}"><i class="dot" style="background:${PEOPLE[p.data.who]?.c}"></i><span class="on"><b>${esc(p.data.name)}</b><small>${esc(p.data.dose || "")} · ${(p.data.times || []).join(", ")} · ${courseText(p)}</small></span>
            <span class="adh" aria-label="Последние 7 дней">${last7.map((d) => { const n = (p.data.log?.[d] || []).length; return `<i class="${!pillActive(p, d) ? "na" : n >= per ? "ok" : n ? "half" : ""}"></i>`; }).join("")}</span></button>`; }).join("") || '<span class="note">Пусто</span>'}
          <span class="note">Квадратики — последние 7 дней: зелёный — всё принято.</span></div>
      </div>
      <div class="panel" id="cycle"><h2>Цикл Любы <span class="mono muted" style="font-size:11px;font-weight:400">${isLuba ? "видит и Женя, менять можете только вы" : "заносит только Люба"}</span></h2>
        ${c ? `<div class="cyc-sum"><div><div class="cyc-big">${s.big}</div><div class="mono muted" style="font-size:11px;text-transform:uppercase;letter-spacing:.06em">${esc(s.sub)}</div></div><div class="note" style="text-align:right">${esc(s.next || "")}${c.ov && !c.empty ? `<br>овуляция ~${fmtDate(c.ov)}` : ""}</div></div>
          ${!isLuba && partnerHint(c) ? `<span class="hint-card">${esc(partnerHint(c))}</span>` : ""}
          <div class="calbar" style="gap:8px"><b style="font-size:16px">${MONTHS[mo]} ${y}</b><span class="spacer"></span><div class="arrows"><button class="icon-btn" data-cm="-1" aria-label="Прошлый месяц">‹</button><button class="icon-btn" data-cm="1" aria-label="Следующий месяц">›</button></div></div>
          <div class="cyc-grid">${grid}</div>
          <div class="legend"><span><i style="background:var(--luba)"></i>месячные</span><span><i style="box-shadow:0 0 0 1.5px var(--luba) inset"></i>прогноз</span><span><i style="background:color-mix(in srgb,var(--luba) 28%,transparent)"></i>фертильные</span><span><i style="box-shadow:0 0 0 2px var(--fg) inset"></i>овуляция</span><span><i style="background:color-mix(in srgb,var(--c-care) 32%,transparent)"></i>ПМС</span></div>
          ${isLuba ? `<span class="note">Нажмите на день: первый раз — начало месячных, второй (в течение 10 дней) — конец. На отмеченный день — самочувствие и заметка.</span><button class="btn primary" data-cyc-quick>${c.open ? "Месячные закончились сегодня" : "Начались месячные сегодня"}</button>` : ""}
          ${!c.empty ? `<span class="note">Средний цикл ${c.avg} ${plural(c.avg, "день", "дня", "дней")}, месячные ${c.plen} ${plural(c.plen, "день", "дня", "дней")}. Прогноз точнее, когда отмечено 3+ цикла. Это не метод контрацепции.</span>` : ""}`
          : isLuba ? `<span class="note">Отметьте начало последних месячных — приложение посчитает прогноз.</span><button class="btn primary" data-cyc-quick>Начались месячные сегодня</button>` : '<span class="note">Люба ещё не заполнила календарь.</span>'}
      </div>
    </div>`;
  $("[data-new-pill]", main).onclick = () => openPill(null);
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
