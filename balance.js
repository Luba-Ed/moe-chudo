// Баланс: колесо со списками дел по сферам и цели.

const SPHERES = ["Работа", "Служение", "Спорт", "Дом", "Отдых", "Мы", "Развитие", "Здоровье"];
const SPHERE_CAT = { "Работа": "work", "Служение": "serv", "Спорт": "self", "Дом": "care", "Отдых": "self", "Мы": "self", "Развитие": "self", "Здоровье": "care" };
const OWNER_C = { luba: "var(--luba)", zhenya: "var(--zhenya)", we: "var(--we)", sasha: "var(--sasha)" };
const wheelItems = (owner) => S.items.filter((i) => i.type === "wheel" && i.data.kind === "item" && (!owner || i.data.owner === owner));
const goals = () => S.items.filter((i) => i.type === "goal");
const weekDays = (mon) => Array.from({ length: 7 }, (_, i) => iso(addD(mon, i)));

function wheelProgress(item, mon) {
  const days = weekDays(mon), planned = [];
  events().filter((e) => e.data.wheel === item.id).forEach((e) => days.forEach((ds) => { if (occursOn(e, ds)) planned.push({ e, ds, done: (e.data.done_dates || []).includes(ds) }); }));
  tasks().filter((t) => t.data.wheel === item.id).forEach((t) => { if (t.data.status === "done" && days.includes(t.data.done_on)) planned.push({ t, ds: t.data.done_on, done: true }); });
  planned.sort((a, b) => a.ds.localeCompare(b.ds));
  return { done: planned.filter((p) => p.done).length, planned };
}
function spherePct(owner, sphere, mon) {
  const its = wheelItems(owner).filter((i) => i.data.sphere === sphere);
  if (!its.length) return null;
  return Math.round((its.reduce((s, i) => s + Math.min(1, wheelProgress(i, mon).done / Math.max(1, +i.data.target || 1)), 0) / its.length) * 100);
}
const ratingItem = (owner, mon) => S.items.find((i) => i.type === "wheel" && i.data.kind === "rating" && i.data.owner === owner && i.data.week === iso(mon));

// Выполненная задача сама попадает в колесо баланса того, кто её сделал:
// сначала ищем дело колеса с похожим названием, иначе берём сферу по категории задачи.
// Если в этой сфере ещё нет дел, создаём «Дела из задач» (5 раз в неделю — можно поменять).
const CAT_SPHERE = { work: "Работа", serv: "Служение", care: "Дом", sasha: "Мы", self: null };
const KIND_SPHERE = { meet: "Мы" };
const normT = (x) => (x || "").toLowerCase().replace(/ё/g, "е").replace(/[^a-zа-я0-9 ]/g, " ").split(/\s+/).filter((w) => w.length > 2);
async function wheelAuto(t, data, done) {
  if (!done) { if (data.wheel_auto) { delete data.wheel; delete data.wheel_auto; } return null; }
  if (data.wheel) { const w = wheelItems().find((i) => i.id === data.wheel); return w ? w.data.sphere : null; }
  const owner = S.me.person, its = wheelItems(owner), words = normT(data.title);
  let best = its.map((i) => ({ i, n: normT(i.data.title).filter((w) => words.some((x) => x.startsWith(w.slice(0, 4)) || w.startsWith(x.slice(0, 4)))).length })).filter((x) => x.n).sort((a, b) => b.n - a.n)[0]?.i;
  const sphere = best ? best.data.sphere : CAT_SPHERE[data.cat] || KIND_SPHERE[data.kind] || null;
  if (!sphere) return null;
  if (!best) {
    const mon = mondayOf(today()), inS = its.filter((i) => i.data.sphere === sphere);
    best = inS.sort((a, b) => wheelProgress(a, mon).done / (+a.data.target || 1) - wheelProgress(b, mon).done / (+b.data.target || 1))[0];
    if (!best) {
      await guard(() => DB.save({ type: "wheel", vis: "shared", data: { kind: "item", title: "Дела из задач", sphere, owner, target: 5, by: owner, auto: true } }, S.me));
      S.items = (await guard(() => DB.load(S.me))) || S.items;
      best = wheelItems(owner).find((i) => i.data.sphere === sphere && i.data.auto);
      if (!best) return null;
    }
  }
  data.wheel = best.id; data.wheel_auto = true;
  return sphere;
}

async function toggleEvDone(id, ds) {
  const e = events().find((x) => x.id === id); if (!e) return;
  if (!canEdit(e)) return toast("Это может отметить только автор");
  const set = new Set(e.data.done_dates || []);
  set.has(ds) ? set.delete(ds) : set.add(ds);
  await saveItem({ ...e, data: { ...e.data, done_dates: [...set] } }, set.has(ds) ? "Сделано" : null);
  // если событие связано с задачей — отмечаем и её
  const t = e.data.task_id && tasks().find((x) => x.id === e.data.task_id);
  if (t && (t.data.status === "done") !== set.has(ds)) {
    const done = set.has(ds);
    await saveItem({ ...t, data: { ...t.data, status: done ? "done" : t.data.taken_by ? "accepted" : "open", done_on: done ? iso(today()) : null, done_by: done ? S.me.person : null } });
  }
}

function wheelSVG(owner, mon, sel, size = 440, labels = true) {
  const cx = size / 2, cy = size / 2, R = size * 0.465, r0 = size * 0.095, n = 8, gap = 0.028;
  const arc = (r1, r2, a0, a1) => { const P = (r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)]; const [x0, y0] = P(r2, a0), [x1, y1] = P(r2, a1), [x2, y2] = P(r1, a1), [x3, y3] = P(r1, a0); return `M${x0} ${y0}A${r2} ${r2} 0 0 1 ${x1} ${y1}L${x2} ${y2}A${r1} ${r1} 0 0 0 ${x3} ${y3}Z`; };
  let g = "";
  SPHERES.forEach((s, i) => {
    const a0 = -Math.PI / 2 - Math.PI / n + (i * 2 * Math.PI) / n + gap, a1 = a0 + (2 * Math.PI) / n - 2 * gap, v = spherePct(owner, s, mon), on = s === sel;
    const rr = r0 + ((R - r0) * Math.max(v || 0, 3)) / 100, am = (a0 + a1) / 2, lr = R * 0.66;
    g += `<g class="sec${on ? " on" : ""}" ${labels ? `data-sphere="${s}" tabindex="0" role="button" aria-label="${s}: ${v ?? "нет дел"}${v != null ? "%" : ""}"` : ""}>
      <path d="${arc(r0, R, a0, a1)}" fill="var(--card-2)" ${on ? 'stroke="var(--fg)" stroke-width="1.5"' : ""}/>
      ${v != null ? `<path d="${arc(r0, rr, a0, a1)}" fill="${OWNER_C[owner]}" opacity="${on ? 1 : 0.72}"/>` : ""}
      ${labels ? `<text x="${cx + lr * Math.cos(am)}" y="${cy + lr * Math.sin(am) - 6}" text-anchor="middle" font-size="${size * 0.045}" font-weight="700" font-family="JetBrains Mono, monospace" fill="var(--fg)">${v ?? "—"}</text>
      <text x="${cx + lr * Math.cos(am)}" y="${cy + lr * Math.sin(am) + size * 0.03}" text-anchor="middle" font-size="${size * 0.028}" font-family="Onest, system-ui" fill="var(--fg)" opacity=".8">${s}</text>` : ""}</g>`;
  });
  return `<svg viewBox="0 0 ${size} ${size}" class="wheel" role="img" aria-label="Колесо баланса">${g}<circle cx="${cx}" cy="${cy}" r="${r0 - 6}" fill="var(--bg)"/></svg>`;
}

// «Рядом»: оба колеса и сравнение по сферам — видно, как дела у партнёра
function compareHTML(mon) {
  const me = S.me.person, pa = me === "luba" ? "zhenya" : "luba", order = [me, pa];
  const gen = (p) => (p === "zhenya" ? "Жени" : "Любы");
  const rates = Object.fromEntries(order.map((p) => [p, ratingItem(p, mon)?.data.scores || {}]));
  const low = SPHERES.map((s) => ({ s, r: rates[pa][s] })).filter((x) => x.r && x.r <= 4).sort((a, b) => a.r - b.r);
  const top = SPHERES.map((s) => ({ s, r: rates[pa][s] })).filter((x) => x.r && x.r >= 8);
  const cell = (p, s) => { const v = spherePct(p, s, mon), r = rates[p][s]; return `<td><b>${v == null ? "—" : v + "%"}</b>${r ? `<small class="${r <= 4 ? "lowr" : ""}">оценка ${r}/10</small>` : '<small>без оценки</small>'}</td>`; };
  return `<div class="cmp-wheels">${order.map((p) => `<div class="panel cmp-w" data-wowner="${p}" style="align-items:center"><h2 style="justify-content:center"><i class="dot" style="background:${OWNER_C[p]}"></i>${p === me ? "Я" : pn(p)}</h2>${wheelSVG(p, mon, null, 360)}</div>`).join("")}</div>
    <div class="panel"><h2>Как дела у ${gen(pa)}</h2>
      ${low.length ? `<span class="hint-card">Сейчас ${pa === "zhenya" ? "Жене" : "Любе"} тяжелее всего: ${low.map((x) => `${x.s.toLowerCase()} (${x.r}/10)`).join(", ")}. Можно спросить, чем помочь, или взять что-то на себя.</span>` : ""}
      ${top.length ? `<span class="note">Хорошо: ${top.map((x) => x.s.toLowerCase()).join(", ")}.</span>` : ""}
      ${!low.length && !top.length ? `<span class="note">${pn(pa)} ещё не ставил${pa === "luba" ? "а" : ""} оценки на этой неделе. Проценты считаются по сделанным делам.</span>` : ""}
      <div class="cmp-scroll"><table class="cmp"><thead><tr><th>Сфера</th>${order.map((p) => `<th><i class="dot" style="background:${OWNER_C[p]}"></i> ${p === me ? "Я" : pn(p)}</th>`).join("")}</tr></thead>
        <tbody>${SPHERES.map((s) => `<tr><td>${s}</td>${order.map((p) => cell(p, s)).join("")}</tr>`).join("")}</tbody></table></div>
      <span class="note">Процент — сколько запланированных дел сферы сделано за неделю. Оценку каждый ставит себе сам. Нажмите на сферу в колесе, чтобы открыть её дела.</span></div>`;
}
function goalPct(g) {
  const d = g.data;
  if (d.mode === "steps") { const st = d.steps || []; return st.length ? Math.round((st.filter((x) => x.done).length / st.length) * 100) : 0; }
  return d.target ? Math.min(100, Math.round(((+d.current || 0) / +d.target) * 100)) : 0;
}
const goalLine = (g) => g.data.mode === "steps" ? `${(g.data.steps || []).filter((x) => x.done).length} из ${(g.data.steps || []).length} шагов` : `${g.data.current || 0} из ${g.data.target} ${g.data.unit || ""}`;
function goalsWidget() {
  const list = goals().filter((g) => !g.data.done && (S.filter === "all" || g.data.owner === S.filter || g.data.owner === "we")).slice(0, 4);
  return `<div class="w"><h4><button class="linkh" data-go="balance">Цели</button></h4>
    ${list.map((g) => `<button class="goal" data-goal="${g.id}"><span>${esc(g.data.title)}</span><div class="bar"><i style="width:${goalPct(g)}%;background:${OWNER_C[g.data.owner]}"></i></div><span class="mono muted">${pn(g.data.owner).toUpperCase()} · ${esc(goalLine(g))}</span></button>`).join("") || '<span class="note">Целей пока нет</span>'}</div>`;
}

/* ----- страница ----- */
function renderBalance(main) {
  const me = S.me.person;
  if (!S.wwho) S.wwho = me;
  if (!S.wsel) S.wsel = "Спорт";
  const mon = addD(mondayOf(today()), (S.wweek || 0) * 7), owner = S.wwho;
  const its = wheelItems(owner).filter((i) => i.data.sphere === S.wsel);
  const pct = spherePct(owner, S.wsel, mon);
  const rate = ratingItem(owner, mon)?.data.scores || {};
  const canRate = owner === me || owner === "we";
  const glist = goals().filter((g) => !S.gfilter || S.gfilter === "all" || g.data.owner === S.gfilter).sort((a, b) => (a.data.done ? 1 : 0) - (b.data.done ? 1 : 0));
  main.innerHTML = `<div class="page-h">${mobBack()}<h1>Баланс</h1><span class="spacer"></span>
      <div class="arrows"><button class="icon-btn" data-ww="-1" aria-label="Прошлая неделя">‹</button><button class="pill-btn" data-ww="0">${rangeLabel(mon)}</button><button class="icon-btn" data-ww="1" aria-label="Следующая неделя">›</button></div>
      <div class="seg">${[["luba", "Люба"], ["zhenya", "Женя"], ["we", "Мы"], ["both", "Рядом"]].map(([k, n]) => `<button class="${owner === k ? "on" : ""}" data-wwho="${k}">${n}</button>`).join("")}</div></div>
    ${owner === "both" ? compareHTML(mon) : `<div class="grid2 wheel-grid">
      <div class="panel" style="align-items:center">${wheelSVG(owner, mon, S.wsel)}
        <span class="note" style="text-align:center">Процент — сколько дел сферы сделано из плана на неделю. Нажмите на сферу.</span></div>
      <div class="panel">
        <h2>${S.wsel} <span class="mono" style="font-size:22px">${pct == null ? "—" : pct + "%"}</span></h2>
        ${its.map((i) => { const pr = wheelProgress(i, mon), tg = +i.data.target || 1; return `<div class="witem"><div class="r"><button class="wt" data-witem="${i.id}">${esc(i.data.title)}</button><span class="c">${pr.done} из ${tg}</span><button class="plus" data-wplan="${i.id}" aria-label="Запланировать «${esc(i.data.title)}»">+</button></div><div class="bar"><i style="width:${Math.min(100, (pr.done / tg) * 100)}%;background:${OWNER_C[owner]}"></i></div></div>`; }).join("") || '<span class="note">В этой сфере пока нет дел.</span>'}
        <button class="btn" data-wnew>+ Дело в «${S.wsel}»</button>
        <div class="mini-h">Запланировано на неделю</div>
        <div class="planned">${its.flatMap((i) => wheelProgress(i, mon).planned.map((p) => ({ ...p, i }))).sort((a, b) => a.ds.localeCompare(b.ds)).map((p) => `<div class="plrow${p.done ? " done" : ""}">${p.e ? `<button class="ck${p.done ? " on" : ""}" data-evdone="${p.e.id}" data-ds="${p.ds}" aria-label="Сделано"></button>` : '<span class="ck on"></span>'}<span>${esc(p.i.data.title)}</span><span class="mono muted">${fmtShort(p.ds)}${p.e && p.e.data.start ? " · " + p.e.data.start : ""}</span></div>`).join("") || '<span class="note">Нажмите «+» у дела — оно встанет в календарь.</span>'}</div>
        <div class="mini-h">${owner === me ? "Моя оценка" : owner === "we" ? "Наша оценка" : `Оценка ${owner === "zhenya" ? "Жени" : "Любы"}`} сферы за неделю</div>
        <div class="rate">${Array.from({ length: 10 }, (_, k) => `<button class="${(rate[S.wsel] || 0) > k ? "on" : ""}" data-rate="${k + 1}" ${canRate ? "" : "disabled"} aria-label="${k + 1} из 10">${k + 1}</button>`).join("")}</div>
        <span class="note">Сравните: сколько сделано и как вы себя чувствуете в этой сфере. ${canRate ? "" : "Оценку ставит сам человек."}</span>
      </div>
    </div>`}
    <div class="panel"><h2>Цели <span style="display:flex;gap:6px;flex-wrap:wrap"><span class="tabs">${[["all", "Все"], ["luba", "Люба"], ["zhenya", "Женя"], ["we", "Мы"], ["sasha", "Саша"]].map(([k, n]) => `<button class="${(S.gfilter || "all") === k ? "on" : ""}" data-gf="${k}">${n}</button>`).join("")}</span><button class="btn primary" data-gnew>+ Цель</button></span></h2>
      <div class="goals">${glist.map((g) => { const d = g.data, p = goalPct(g); return `<div class="gcard${d.done ? " done" : ""}" style="--c:${OWNER_C[d.owner]}">
        <button class="gt" data-goal="${g.id}"><b>${esc(d.title)}</b><small>${pn(d.owner)} · ${esc(d.sphere || "")}${d.deadline ? ` · до ${fmtDate(d.deadline)}` : ""}</small></button>
        <div class="bar"><i style="width:${p}%;background:var(--c)"></i></div>
        <div class="gfoot"><span class="mono">${p}% · ${esc(goalLine(g))}</span>${!d.done && d.mode !== "steps" ? `<button class="btn sm" data-gadd="${g.id}">Обновить</button>` : ""}</div>
        ${d.mode === "steps" ? `<div class="steps">${(d.steps || []).map((s, k) => `<button class="${s.done ? "on" : ""}" data-gstep="${g.id}" data-k="${k}"><span class="ck${s.done ? " on" : ""}"></span>${esc(s.t)}</button>`).join("")}</div>` : ""}</div>`; }).join("") || '<span class="note">Добавьте первую цель: общую, личную или для Саши.</span>'}</div></div>`;
  $$("[data-ww]", main).forEach((b) => (b.onclick = () => { const n = +b.dataset.ww; S.wweek = n === 0 ? 0 : (S.wweek || 0) + n; render(); }));
  $$("[data-wwho]", main).forEach((b) => (b.onclick = () => { S.wwho = b.dataset.wwho; render(); }));
  $$("[data-sphere]", main).forEach((g) => { const go = () => { S.wsel = g.dataset.sphere; const w = g.closest("[data-wowner]"); if (w) S.wwho = w.dataset.wowner; render(); }; g.onclick = go; g.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } }; });
  $$("[data-witem]", main).forEach((b) => (b.onclick = () => openWheelItem(b.dataset.witem)));
  $$("[data-wplan]", main).forEach((b) => (b.onclick = () => planWheel(b.dataset.wplan)));
  const wn = $("[data-wnew]", main); if (wn) wn.onclick = () => openWheelItem(null, { owner, sphere: S.wsel });
  $$("[data-rate]", main).forEach((b) => (b.onclick = async () => {
    const it = ratingItem(owner, mon), scores = { ...(it?.data.scores || {}), [S.wsel]: +b.dataset.rate };
    const data = { kind: "rating", owner, week: iso(mon), scores, by: me };
    await saveItem(it ? { ...it, data } : { type: "wheel", vis: "shared", data }, "Оценка сохранена");
  }));
  $$("[data-gf]", main).forEach((b) => (b.onclick = () => { S.gfilter = b.dataset.gf; render(); }));
  $("[data-gnew]", main).onclick = () => openGoal(null);
  bindToday(main);
}
function bindBalance(root) {
  $$("[data-evdone]", root).forEach((b) => (b.onclick = (e) => { e.stopPropagation(); toggleEvDone(b.dataset.evdone, b.dataset.ds); }));
  $$("[data-goal]", root).forEach((b) => (b.onclick = () => openGoal(b.dataset.goal)));
  $$("[data-gadd]", root).forEach((b) => (b.onclick = () => goalUpdate(b.dataset.gadd)));
  $$("[data-gstep]", root).forEach((b) => (b.onclick = async () => {
    const g = goals().find((x) => x.id === b.dataset.gstep); if (!g) return;
    const steps = (g.data.steps || []).map((s, k) => (k === +b.dataset.k ? { ...s, done: !s.done } : s));
    const done = steps.length && steps.every((s) => s.done);
    await saveItem({ ...g, data: { ...g.data, steps, done } }, done ? "Цель достигнута!" : null);
  }));
}

/* ----- окна ----- */
function openWheelItem(id, preset = {}) {
  const it = id ? wheelItems().find((x) => x.id === id) : null;
  const F = { title: "", sphere: "Спорт", owner: S.me.person, target: 1, ...(it ? it.data : {}), ...preset };
  const draw = () => openModal(`<div class="sheet-h"><button data-close>Отмена</button><b>${it ? "Дело сферы" : "Новое дело"}</b><button class="go" data-save>Готово</button></div>
    <label class="field"><span>Что делать</span><input data-k="title" value="${esc(F.title)}" placeholder="Зал, растяжка, свидание" maxlength="60"></label>
    <div class="field"><span>Сфера</span>${choice("sphere", SPHERES.map((s) => [s, s]), F.sphere)}</div>
    <div class="field"><span>Чьё колесо</span>${choice("owner", [["luba", "Люба", OWNER_C.luba], ["zhenya", "Женя", OWNER_C.zhenya], ["we", "Мы", OWNER_C.we]], F.owner)}</div>
    <label class="field"><span>Сколько раз в неделю</span><input data-k="target" type="number" min="1" max="21" value="${esc(F.target)}"></label>
    <div class="sheet-foot"><span>${it ? '<button class="btn danger" data-del>Удалить</button>' : ""}</span><button class="btn primary" data-save>${it ? "Сохранить" : "Добавить"}</button></div>`, (m) => {
    bindForm(m, F, draw);
    $("[data-close]", m).onclick = closeModal;
    $$("[data-save]", m).forEach((b) => (b.onclick = async () => {
      if (!F.title.trim()) return toast("Напишите, что делать");
      const data = { ...(it ? it.data : {}), kind: "item", title: F.title.trim(), sphere: F.sphere, owner: F.owner, target: Math.max(1, +F.target || 1), by: it ? it.data.by : S.me.person };
      closeModal(); S.wsel = F.sphere; S.wwho = F.owner;
      await saveItem(it ? { ...it, data } : { type: "wheel", vis: "shared", data }, it ? "Сохранено" : "Добавлено в колесо");
    }));
    confirmDelete(m, it);
  });
  draw();
}
function planWheel(id) {
  const it = wheelItems().find((x) => x.id === id); if (!it) return;
  const F = { date: iso(today()), start: "", end: "", all_day: false };
  const draw = () => openModal(`<div class="sheet-h"><button data-close>Отмена</button><b>Запланировать: ${esc(it.data.title)}</b><button class="go" data-save>Готово</button></div>
    <div class="frow3"><label class="field"><span>Дата</span><input type="date" data-k="date" value="${F.date}"></label>
      ${timeField("Начало", "start", F.start)}${timeField("Конец", "end", F.end)}</div>
    <span class="note">Дело появится в календаре и в колонке «Сегодня» этого дня с галочкой «сделано».</span>
    <div class="sheet-foot"><span></span><button class="btn primary" data-save>В календарь</button></div>`, (m) => {
    bindForm(m, F, draw);
    $("[data-close]", m).onclick = closeModal;
    $$("[data-save]", m).forEach((b) => (b.onclick = async () => {
      if (!F.date) return toast("Выберите дату");
      const o = it.data.owner, data = { title: it.data.title, cat: SPHERE_CAT[it.data.sphere] || "self", who: o, date: F.date, start: F.start || "", end: F.end || "", all_day: !F.start, wheel: it.id, by: S.me.person };
      closeModal();
      await saveItem({ type: "event", vis: o === "we" ? "shared" : "visible", data }, `«${it.data.title}» в календаре: ${fmtShort(F.date)}${F.start ? " " + F.start : ""}`);
    }));
  });
  draw();
}
function openGoal(id) {
  const g = id ? goals().find((x) => x.id === id) : null;
  const F = { title: "", owner: "we", sphere: "Мы", mode: "num", current: 0, target: "", unit: "", deadline: "", stepsText: "", ...(g ? g.data : {}) };
  F.stepsText = (g?.data.steps || []).map((s) => s.t).join("\n");
  const draw = () => openModal(`<div class="sheet-h"><button data-close>Отмена</button><b>${g ? "Цель" : "Новая цель"}</b><button class="go" data-save>Готово</button></div>
    <label class="field"><span>Цель</span><input data-k="title" value="${esc(F.title)}" placeholder="Отпуск летом, шпагат к весне" maxlength="80"></label>
    <div class="field"><span>Чья</span>${choice("owner", [["we", "Общая", OWNER_C.we], ["luba", "Люба", OWNER_C.luba], ["zhenya", "Женя", OWNER_C.zhenya], ["sasha", "Саша", OWNER_C.sasha]], F.owner)}</div>
    <div class="field"><span>Сфера</span>${choice("sphere", SPHERES.map((s) => [s, s]), F.sphere)}</div>
    <div class="field"><span>Как мерить</span>${choice("mode", [["num", "Числом"], ["steps", "Шагами"]], F.mode)}</div>
    ${F.mode === "num" ? `<div class="frow3"><label class="field"><span>Сейчас</span><input data-k="current" inputmode="decimal" value="${esc(F.current)}"></label><label class="field"><span>Цель</span><input data-k="target" inputmode="decimal" value="${esc(F.target)}" placeholder="200"></label><label class="field"><span>Чего</span><input data-k="unit" value="${esc(F.unit)}" placeholder="тыс ₽"></label></div>`
      : `<label class="field"><span>Шаги, каждый с новой строки</span><textarea data-k="stepsText" style="min-height:110px" placeholder="Полушпагат\nПоперечный шпагат">${esc(F.stepsText)}</textarea></label>`}
    <label class="field"><span>Срок</span><input type="date" data-k="deadline" value="${F.deadline || ""}"></label>
    ${g ? toggleRow("done", !!F.done, "Цель достигнута") : ""}
    <div class="sheet-foot"><span>${g ? '<button class="btn danger" data-del>Удалить</button>' : ""}</span><button class="btn primary" data-save>${g ? "Сохранить" : "Добавить"}</button></div>`, (m) => {
    bindForm(m, F, draw);
    $("[data-close]", m).onclick = closeModal;
    $$("[data-save]", m).forEach((b) => (b.onclick = async () => {
      if (!F.title.trim()) return toast("Напишите цель");
      const data = { ...(g ? g.data : {}), title: F.title.trim(), owner: F.owner, sphere: F.sphere, mode: F.mode, deadline: F.deadline || "", done: !!F.done, by: g ? g.data.by : S.me.person };
      if (F.mode === "num") { data.target = parseFloat(String(F.target).replace(",", ".")); data.current = parseFloat(String(F.current).replace(",", ".")) || 0; data.unit = F.unit.trim(); if (!(data.target > 0)) return toast("Укажите, сколько нужно"); }
      else { const old = g?.data.steps || []; data.steps = F.stepsText.split("\n").map((x) => x.trim()).filter(Boolean).map((t) => ({ t, done: !!old.find((o) => o.t === t)?.done })); if (!data.steps.length) return toast("Добавьте хотя бы один шаг"); }
      closeModal();
      await saveItem(g ? { ...g, data } : { type: "goal", vis: F.owner === S.me.person ? "visible" : "shared", data }, g ? "Сохранено" : "Цель добавлена");
    }));
    confirmDelete(m, g);
  });
  draw();
}
function goalUpdate(id) {
  const g = goals().find((x) => x.id === id); if (!g) return;
  const F = { add: "", current: g.data.current || 0 };
  openModal(`<div class="sheet-h"><button data-close>Отмена</button><b>${esc(g.data.title)}</b><button class="go" data-save>Готово</button></div>
    <span class="note">Сейчас ${g.data.current || 0} из ${g.data.target} ${esc(g.data.unit || "")}</span>
    <div class="frow"><label class="field"><span>Добавить</span><input data-k="add" inputmode="decimal" placeholder="+10"></label><label class="field"><span>Или задать итог</span><input data-k="current" inputmode="decimal" value="${esc(F.current)}"></label></div>
    <div class="sheet-foot"><span></span><button class="btn primary" data-save>Сохранить</button></div>`, (m) => {
    bindForm(m, F, () => {});
    $("[data-close]", m).onclick = closeModal;
    $('[data-k="add"]', m).focus();
    $$("[data-save]", m).forEach((b) => (b.onclick = async () => {
      const add = parseFloat(String(F.add).replace(",", ".")) || 0, cur = parseFloat(String(F.current).replace(",", "."));
      const current = add ? (+g.data.current || 0) + add : isNaN(cur) ? +g.data.current || 0 : cur;
      const done = current >= +g.data.target;
      closeModal();
      await saveItem({ ...g, data: { ...g.data, current, done } }, done ? "Цель достигнута!" : "Прогресс обновлён");
    }));
  });
}
