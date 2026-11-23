// Деньги: обязательные платежи и общий бюджет.

const MCATS = [
  { k: "products", n: "Продукты", c: "#3fa36b" }, { k: "home", n: "Дом и коммуналка", c: "#e8924a" }, { k: "sasha", n: "Саша", c: "#e57bb0" },
  { k: "credit", n: "Кредиты", c: "#e5484d" }, { k: "health", n: "Здоровье и аптека", c: "#2bb3b8" }, { k: "transport", n: "Машина и транспорт", c: "#4a9cf0" },
  { k: "cafe", n: "Кафе и досуг", c: "#c9a227" }, { k: "clothes", n: "Одежда", c: "#b07be0" }, { k: "gifts", n: "Подарки", c: "#ff8fa3" },
  { k: "serv", n: "Служение", c: "#5fc4c9" }, { k: "subs", n: "Подписки", c: "#8b7bea" }, { k: "other", n: "Другое", c: "#9aa0ad" },
];
const ICATS = [{ k: "salary", n: "Зарплата" }, { k: "extra", n: "Подработка" }, { k: "gift", n: "Подарок" }, { k: "other", n: "Другое" }];
const mcat = (k) => MCATS.find((c) => c.k === k) || MCATS[MCATS.length - 1];
const rub = (n) => Math.round(n || 0).toLocaleString("ru-RU") + " ₽";
const payAmt = (p) => (+p.data.amount > 0 ? rub(p.data.amount) : "сумма не указана");
const payments = () => S.items.filter((i) => i.type === "payment");
const moneyOps = () => S.items.filter((i) => i.type === "money");
const budget = () => kv("budget")?.data || { key: "budget", salary_days: [10, 25] };
const daysBetween = (a, b) => Math.round((parse(b) - parse(a)) / 86400000);
const plural = (n, one, few, many) => { const a = Math.abs(n) % 100, b = a % 10; return a > 10 && a < 20 ? many : b > 1 && b < 5 ? few : b === 1 ? one : many; };

/* ----- расчёт сроков ----- */
function payDueIn(p, y, m) { // дата платежа в этом месяце (для ежемесячных) или году
  const d = p.data;
  if (d.kind === "monthly") { const last = new Date(y, m + 1, 0).getDate(); return iso(new Date(y, m, Math.min(d.day || 1, last))); }
  if (d.kind === "yearly") { const [, mm, dd] = (d.date || "2000-01-01").split("-").map(Number); return iso(new Date(y, mm - 1, dd)); }
  return d.date;
}
const payKey = (p, ds) => (p.data.kind === "monthly" ? ds.slice(0, 7) : p.data.kind === "yearly" ? ds.slice(0, 4) : "once");
function payActive(p, ds) { const d = p.data; return !(d.end_date && ds > d.end_date) && !(d.start && ds < d.start); }
function payDueOn(p, ds) {
  const d = parse(ds);
  if (!payActive(p, ds)) return false;
  return payDueIn(p, d.getFullYear(), d.getMonth()) === ds;
}
function payStatus(p) { // ближайший неоплаченный срок
  const t = today(), d = p.data, tds = iso(t);
  let ds, prevKey = null;
  if (d.kind === "once") ds = d.date;
  else if (d.kind === "monthly") {
    ds = payDueIn(p, t.getFullYear(), t.getMonth());
    if (d.paid?.[payKey(p, ds)]) { prevKey = payKey(p, ds); ds = payDueIn(p, t.getFullYear(), t.getMonth() + 1); }
  } else {
    ds = payDueIn(p, t.getFullYear(), 0);
    if (ds < tds && d.paid?.[payKey(p, ds)] || ds < tds && !d.paid?.[payKey(p, ds)] && daysBetween(ds, tds) > 60) ds = payDueIn(p, t.getFullYear() + 1, 0);
    if (d.paid?.[payKey(p, ds)]) ds = payDueIn(p, parse(ds).getFullYear() + 1, 0);
  }
  const key = payKey(p, ds), paid = !!d.paid?.[key];
  const left = daysBetween(tds, ds);
  const soon = !paid && left >= 0 && left <= (d.remind ?? 3);
  // за этот месяц уже заплатили, а следующий срок ещё не близко — показываем как оплаченный
  const settled = !!prevKey && !soon && left > 0;
  return { ds, key, paid, left, overdue: !paid && left < 0, soon, settled, prevKey, ended: !payActive(p, ds) };
}
function dueLabel(st) {
  if (st.paid) return "оплачено";
  if (st.settled) return `за ${MONTHS[+st.prevKey.slice(5) - 1].toLowerCase()} оплачено · следующий ${fmtDate(st.ds)}`;
  if (st.left < 0) return `просрочено ${-st.left} ${plural(-st.left, "день", "дня", "дней")}`;
  if (st.left === 0) return "сегодня";
  if (st.left === 1) return "завтра";
  return `${fmtDate(st.ds)} · через ${st.left} ${plural(st.left, "день", "дня", "дней")}`;
}
function nextSalary() {
  const t = today(), days = (budget().salary_days || []).filter(Boolean).sort((a, b) => a - b);
  for (let k = 0; k < 2; k++) for (const d of days) { const x = new Date(t.getFullYear(), t.getMonth() + k, d); if (x > t) return iso(x); }
  return null;
}

const MPREP = ["январе", "феврале", "марте", "апреле", "мае", "июне", "июле", "августе", "сентябре", "октябре", "ноябре", "декабре"];
/* ----- действия ----- */
// «Оплатить» — одно нажатие: платёж отмечается оплаченным и уходит из списка «к оплате»
async function payNow(id) {
  const p = payments().find((x) => x.id === id); if (!p) return;
  const st = payStatus(p), d = p.data;
  const data = { ...d, paid: { ...(d.paid || {}), [st.key]: { on: iso(today()), by: S.me.person, amount: +d.amount || 0 } } };
  await saveItem({ ...p, data }, `${d.title}: оплачено`);
}
async function unpay(id, key) {
  const p = payments().find((x) => x.id === id); if (!p) return;
  const rec = p.data.paid?.[key]; const paid = { ...(p.data.paid || {}) }; delete paid[key];
  if (rec?.money_id) await guard(() => DB.remove(rec.money_id)); // запись из старой версии с доходами/расходами
  await saveItem({ ...p, data: { ...p.data, paid } }, "Отметка об оплате снята");
}
// что оплачено в месяце: для статистики по категориям
function paidInMonth(mk) {
  const out = [];
  payments().forEach((p) => Object.entries(p.data.paid || {}).forEach(([key, r]) => {
    if ((r.on || "").startsWith(mk)) out.push({ p, key, r, amount: +r.amount || +p.data.amount || 0 });
  }));
  return out.sort((a, b) => (b.r.on || "").localeCompare(a.r.on || ""));
}
// что ещё надо оплатить в месяце
function dueInMonth(y, m) {
  const mk = `${y}-${pad(m + 1)}`, out = [];
  payments().forEach((p) => {
    const ds = payDueIn(p, y, m);
    if (!ds || !ds.startsWith(mk) || !payActive(p, ds)) return;
    if (p.data.paid?.[payKey(p, ds)]) return;
    out.push({ p, ds });
  });
  return out;
}

/* ----- виджет для главного экрана ----- */
function paymentsWidget() {
  const list = payments().map((p) => ({ p, st: payStatus(p) })).filter((x) => !x.st.ended && !x.st.paid && !x.st.settled && (x.st.overdue || x.st.left <= 14)).sort((a, b) => a.st.ds.localeCompare(b.st.ds)).slice(0, 5);
  const ns = nextSalary();
  const before = ns ? payments().map((p) => ({ p, st: payStatus(p) })).filter((x) => !x.st.paid && !x.st.settled && !x.st.ended && x.st.ds < ns) : [];
  return `<div class="w"><h4><button class="linkh" data-go="money">Платежи</button><span class="mono">${ns ? "до зарплаты " + fmtDate(ns) : ""}</span></h4>
    ${list.map(({ p, st }) => `<div class="payrow${st.overdue ? " over" : ""}"><button class="pt" data-pay-open="${p.id}"><b>${p.data.urgent ? '<em class="urg">срочно</em> ' : ""}${esc(p.data.title)}</b><small>${payAmt(p)} · ${dueLabel(st)}</small></button>
      <button class="btn sm" data-pay="${p.id}">Оплатить</button></div>`).join("") || '<span class="note">Ближайшие две недели всё оплачено</span>'}
    ${ns && before.length ? `<span class="note">До зарплаты осталось оплатить: ${before.length}${(() => { const sum = before.reduce((s, x) => s + (+x.p.data.amount || 0), 0); return sum ? " на " + rub(sum) : ""; })()}</span>` : ""}</div>`;
}

/* ----- страница ----- */
function renderMoney(main) {
  if (!S.mmonth) S.mmonth = new Date(today().getFullYear(), today().getMonth(), 1);
  const y = S.mmonth.getFullYear(), m = S.mmonth.getMonth(), mk = `${y}-${pad(m + 1)}`;
  const isCur = mk === iso(today()).slice(0, 7);
  const paid = paidInMonth(mk), total = paid.reduce((s, x) => s + x.amount, 0);
  const due = dueInMonth(y, m), dueSum = due.reduce((s, x) => s + (+x.p.data.amount || 0), 0);
  // к оплате: в текущем месяце — всё неоплаченное (включая просроченное и ближайшее), в другом — то, что на этот месяц
  const toPay = isCur
    ? payments().map((p) => ({ p, st: payStatus(p) })).filter((x) => !x.st.ended && !x.st.paid && !x.st.settled).sort((a, b) => a.st.ds.localeCompare(b.st.ds))
    : due.map(({ p, ds }) => ({ p, st: { ds, left: daysBetween(iso(today()), ds), overdue: ds < iso(today()), soon: false, paid: false } })).sort((a, b) => a.st.ds.localeCompare(b.st.ds));
  const limits = budget().limits || {};
  const byCat = MCATS.map((c) => ({ c, sum: paid.filter((x) => x.p.data.cat === c.k).reduce((s, x) => s + x.amount, 0), n: paid.filter((x) => x.p.data.cat === c.k).length, lim: +limits[c.k] || 0 })).filter((x) => x.sum || x.n || x.lim).sort((a, b) => b.sum - a.sum);
  const maxCat = Math.max(1, ...byCat.map((x) => Math.max(x.sum, x.lim)));
  const ns = nextSalary();
  const before = ns ? toPay.filter((x) => x.st.ds < ns) : [];
  const credits = payments().filter((p) => p.data.debt);
  const noSum = paid.filter((x) => !x.amount).length;
  main.innerHTML = `<div class="page-h">${mobBack()}<h1>Деньги</h1><span class="spacer"></span>
      <div class="arrows"><button class="icon-btn" data-mm="-1" aria-label="Прошлый месяц">‹</button><button class="pill-btn" data-mm="0">${MONTHS[m]} ${y}</button><button class="icon-btn" data-mm="1" aria-label="Следующий месяц">›</button></div>
      <button class="pill-btn" id="budgetSet">Настроить</button></div>
    <div class="stats stats3">
      <div class="stat"><span>Оплачено за ${MONTHS[m].toLowerCase()}</span><b>${rub(total)}</b><small class="muted">${paid.length} ${plural(paid.length, "платёж", "платежа", "платежей")}${noSum ? ` · ${noSum} без суммы` : ""}</small></div>
      <div class="stat"><span>Ещё оплатить в ${MPREP[m]}</span><b>${rub(dueSum)}</b><small class="muted">${due.length} ${plural(due.length, "платёж", "платежа", "платежей")}</small></div>
      <div class="stat"><span>Всего за месяц</span><b>${rub(total + dueSum)}</b><div class="bar"><i style="width:${total + dueSum ? Math.min(100, (total / (total + dueSum)) * 100) : 0}%;background:var(--we)"></i></div></div>
    </div>
    <div class="grid2">
      <div style="display:flex;flex-direction:column;gap:16px;min-width:0">
        <div class="panel"><h2>К оплате <button class="btn" data-new-pay>+ Платёж</button></h2>
          ${isCur && ns && before.length ? `<div class="alert info"><span>До зарплаты ${fmtDate(ns)}: ${before.length} ${plural(before.length, "платёж", "платежа", "платежей")}${(() => { const sum = before.reduce((s, x) => s + (+x.p.data.amount || 0), 0); return sum ? " на " + rub(sum) : ""; })()}</span></div>` : ""}
          ${toPay.map(({ p, st }) => `<div class="prow${st.overdue ? " over" : st.soon ? " soon" : ""}" style="--c:${mcat(p.data.cat).c}">
            <button class="pt" data-pay-open="${p.id}"><b>${p.data.urgent ? '<em class="urg">срочно</em> ' : ""}${esc(p.data.title)}</b><small>${payAmt(p)} · ${p.data.kind === "monthly" ? `каждое ${p.data.day} число` : p.data.kind === "yearly" ? "раз в год" : "разово"} · ${dueLabel(st)}${p.data.payer && p.data.payer !== "any" ? ` · платит ${pn(p.data.payer)}` : ""}</small>
            ${p.data.debt ? `<small>остаток долга ${rub(p.data.debt)}</small>` : ""}</button>
            <button class="btn sm primary" data-pay="${p.id}">Оплатить</button></div>`).join("") || '<div class="empty">Всё оплачено</div>'}
          <span class="note">Нажали «Оплатить» — платёж уходит в «Оплачено». Ежемесячный вернётся сюда к следующему сроку сам.</span></div>
        <div class="panel"><h2>Оплачено в ${MPREP[m]}</h2>
          ${paid.map(({ p, key, r, amount }) => `<div class="paidrow"><span class="mono">${fmtDate(r.on).replace(" ", "&nbsp;")}</span><button class="pt" data-pay-open="${p.id}"><b>${esc(p.data.title)}</b><small><i class="dot" style="background:${mcat(p.data.cat).c}"></i> ${mcat(p.data.cat).n}${r.by ? ` · ${pn(r.by)}` : ""}</small></button>
            <b class="sum">${amount ? rub(amount) : '<span class="muted">—</span>'}</b><button class="undo" data-unpay="${p.id}" data-key="${key}" title="Снять отметку об оплате" aria-label="Снять отметку об оплате">↩</button></div>`).join("") || '<span class="note">Пока ничего не оплачено</span>'}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:16px;min-width:0">
        <div class="panel"><h2>На что уходят деньги <span class="mono" style="font-size:16px">${rub(total)}</span></h2>
          ${byCat.map((x) => `<div class="catrow"><span><i class="dot" style="background:${x.c.c}"></i>${x.c.n}<small class="muted mono">${total ? Math.round((x.sum / total) * 100) + "%" : ""}</small></span><b>${rub(x.sum)}${x.lim ? `<small> из ${rub(x.lim)}</small>` : ""}</b>
            <div class="bar"><i style="width:${(x.sum / maxCat) * 100}%;background:${x.lim && x.sum > x.lim ? "var(--warn)" : x.c.c}"></i>${x.lim ? `<em style="left:${(x.lim / maxCat) * 100}%"></em>` : ""}</div></div>`).join("") || '<span class="note">Когда отметите платежи оплаченными, здесь появится разбивка по категориям.</span>'}
          ${noSum ? `<span class="note">У ${noSum} ${plural(noSum, "платежа", "платежей", "платежей")} не указана сумма — их нет в итогах. Откройте платёж и впишите сумму.</span>` : ""}</div>
        ${credits.length ? `<div class="panel"><h2>Кредиты</h2>${credits.map((p) => `<div class="setrow"><span>${esc(p.data.title)}</span><span class="mono">${rub(p.data.debt)}${p.data.end_date ? ` · до ${fmtDate(p.data.end_date)}` : ""}</span></div>`).join("")}<span class="note">Остаток долга обновляйте по выписке банка в карточке платежа.</span></div>` : ""}
      </div>
    </div>`;
  $$("[data-mm]", main).forEach((b) => (b.onclick = () => { const n = +b.dataset.mm; S.mmonth = n === 0 ? new Date(today().getFullYear(), today().getMonth(), 1) : new Date(y, m + n, 1); render(); }));
  $("[data-new-pay]", main).onclick = () => openPayment(null);
  $("#budgetSet", main).onclick = openBudget;
  bindToday(main);
}
function bindMoney(root) {
  $$("[data-pay]", root).forEach((b) => (b.onclick = (e) => { e.stopPropagation(); payNow(b.dataset.pay); }));
  $$("[data-unpay]", root).forEach((b) => (b.onclick = () => unpay(b.dataset.unpay, b.dataset.key)));
  $$("[data-pay-open]", root).forEach((b) => (b.onclick = (e) => { e.stopPropagation(); openPayment(b.dataset.payOpen); }));
}

/* ----- окна ----- */
function openPayment(id) {
  const p = id ? payments().find((x) => x.id === id) : null;
  const F = { title: "", amount: "", kind: "monthly", day: today().getDate(), date: iso(today()), cat: "home", payer: "any", remind: 3, debt: "", end_date: "", note: "", urgent: false, ...(p ? p.data : {}) };
  const draw = () => openModal(`<div class="sheet-h"><button data-close>Отмена</button><b>${p ? "Платёж" : "Новый обязательный платёж"}</b><button class="go" data-save>Готово</button></div>
    <label class="field"><span>Название</span><input data-k="title" value="${esc(F.title)}" placeholder="Кредит, гимнастика, коммуналка" maxlength="80"></label>
    <div class="frow"><label class="field"><span>Сумма, ₽</span><input data-k="amount" inputmode="decimal" value="${esc(F.amount)}" placeholder="можно указать позже"></label>
      ${F.kind === "monthly" ? `<label class="field"><span>Число месяца</span><input data-k="day" type="number" min="1" max="31" value="${esc(F.day)}"></label>` : `<label class="field"><span>${F.kind === "yearly" ? "Дата (каждый год)" : "Дата"}</span><input type="date" data-k="date" value="${F.date || ""}"></label>`}</div>
    <div class="field"><span>Как часто</span>${choice("kind", [["monthly", "Каждый месяц"], ["yearly", "Раз в год"], ["once", "Один раз"]], F.kind)}</div>
    <div class="field"><span>Категория</span>${choice("cat", MCATS.map((c) => [c.k, c.n, c.c]), F.cat)}</div>
    <div class="field"><span>Кто платит</span>${choice("payer", [["any", "Кто угодно"], ["luba", "Люба", PEOPLE.luba.c], ["zhenya", "Женя", PEOPLE.zhenya.c]], F.payer)}</div>
    <div class="frow"><label class="field"><span>Напомнить за, дней</span><input data-k="remind" type="number" min="0" max="30" value="${esc(F.remind)}"></label>
      <label class="field"><span>Последний платёж</span><input type="date" data-k="end_date" value="${F.end_date || ""}"></label></div>
    ${F.cat === "credit" ? `<label class="field"><span>Остаток долга, ₽</span><input data-k="debt" inputmode="decimal" value="${esc(F.debt || "")}" placeholder="по выписке банка"></label>` : ""}
    ${toggleRow("urgent", F.urgent, "Срочно", "покажется красным вверху «Сегодня»")}
    <label class="field"><span>Заметка</span><textarea data-k="note" placeholder="Реквизиты, номер договора">${esc(F.note || "")}</textarea></label>
    ${p ? `<div class="field"><span>История оплат</span>${Object.entries(p.data.paid || {}).sort().reverse().slice(0, 12).map(([k, r]) => `<div class="setrow"><span>${k.length === 7 ? MONTHS[+k.slice(5) - 1] + " " + k.slice(0, 4) : k}</span><span class="muted mono">${rub(r.amount)} · ${pn(r.by)} · ${fmtDate(r.on)}</span></div>`).join("") || '<span class="note">Пока не оплачивали</span>'}</div>` : ""}
    <div class="sheet-foot"><span>${p ? '<button class="btn danger" data-del>Удалить</button>' : ""}</span><button class="btn primary" data-save>${p ? "Сохранить" : "Добавить"}</button></div>`, (m) => {
    bindForm(m, F, draw);
    $("[data-close]", m).onclick = closeModal;
    $$("[data-save]", m).forEach((b) => (b.onclick = async () => {
      const amount = parseFloat(String(F.amount).replace(/\s/g, "").replace(",", "."));
      if (!F.title.trim()) return toast("Напишите название");
      if (String(F.amount).trim() && !(amount > 0)) return toast("Сумма указана неверно");
      const data = { ...(p ? p.data : {}), title: F.title.trim(), amount: amount > 0 ? amount : "", urgent: !!F.urgent, kind: F.kind, cat: F.cat, payer: F.payer, remind: Math.max(0, +F.remind || 0), end_date: F.end_date || "", note: (F.note || "").trim(), by: p ? p.data.by : S.me.person, paid: p ? p.data.paid || {} : {} };
      if (F.kind === "monthly") { data.day = Math.min(31, Math.max(1, +F.day || 1)); delete data.date; } else { if (!F.date) return toast("Укажите дату"); data.date = F.date; delete data.day; }
      data.debt = F.cat === "credit" && F.debt ? parseFloat(String(F.debt).replace(/\s/g, "").replace(",", ".")) || "" : "";
      closeModal();
      await saveItem(p ? { ...p, data } : { type: "payment", vis: "shared", data }, p ? "Сохранено" : "Платёж добавлен");
    }));
    confirmDelete(m, p);
  });
  draw();
}
function openMoney(id, preset = {}) {
  const o = id ? moneyOps().find((x) => x.id === id) : null;
  const F = { kind: "expense", amount: "", date: iso(today()), cat: "products", note: "", ...(o ? o.data : {}), ...preset };
  if (!o && preset.kind === "income") F.cat = "salary";
  const draw = () => openModal(`<div class="sheet-h"><button data-close>Отмена</button><b>${F.kind === "income" ? "Доход" : "Расход"}</b><button class="go" data-save>Готово</button></div>
    <div class="field"><span>Тип</span>${choice("kind", [["expense", "Расход"], ["income", "Доход"]], F.kind)}</div>
    <div class="frow"><label class="field"><span>Сумма, ₽</span><input data-k="amount" inputmode="decimal" value="${esc(F.amount)}" placeholder="0"></label>
      <label class="field"><span>Дата</span><input type="date" data-k="date" value="${F.date}"></label></div>
    <div class="field"><span>Категория</span>${F.kind === "income" ? choice("cat", ICATS.map((c) => [c.k, c.n]), F.cat) : choice("cat", MCATS.map((c) => [c.k, c.n, c.c]), F.cat)}</div>
    <label class="field"><span>Комментарий</span><input data-k="note" value="${esc(F.note || "")}" placeholder="${F.kind === "income" ? "Зарплата" : "Продукты на неделю"}" maxlength="100"></label>
    ${o?.data.payment_id ? '<span class="note">Создано кнопкой «Оплатить». Чтобы отменить оплату, снимите отметку у платежа.</span>' : ""}
    <div class="sheet-foot"><span>${o ? '<button class="btn danger" data-del>Удалить</button>' : ""}</span><button class="btn primary" data-save>${o ? "Сохранить" : "Добавить"}</button></div>`, (m) => {
    bindForm(m, F, () => { if (F.kind === "income" && !ICATS.some((c) => c.k === F.cat)) F.cat = "salary"; if (F.kind === "expense" && !MCATS.some((c) => c.k === F.cat)) F.cat = "products"; draw(); });
    $("[data-close]", m).onclick = closeModal;
    $$("[data-save]", m).forEach((b) => (b.onclick = async () => {
      const amount = parseFloat(String(F.amount).replace(/\s/g, "").replace(",", "."));
      if (!(amount > 0)) return toast("Укажите сумму");
      const data = { ...(o ? o.data : {}), kind: F.kind, amount, date: F.date || iso(today()), cat: F.cat, note: (F.note || "").trim(), by: o ? o.data.by : S.me.person };
      closeModal();
      await saveItem(o ? { ...o, data } : { type: "money", vis: "shared", data }, o ? "Сохранено" : F.kind === "income" ? "Доход записан" : "Расход записан");
    }));
    $('[data-k="amount"]', m)?.focus();
    confirmDelete(m, o);
  });
  draw();
}
function openBudget() {
  const b = budget();
  const F = { days: (b.salary_days || []).join(", "), limits: { ...(b.limits || {}) } };
  openModal(`<div class="sheet-h"><button data-close>Отмена</button><b>Настройки бюджета</b><button class="go" data-save>Готово</button></div>
    <label class="field"><span>Дни зарплаты</span><input id="sd" value="${esc(F.days)}" placeholder="10, 25"></label>
    <span class="note">По ним считается «сколько платежей до зарплаты».</span>
    <div class="field"><span>Лимиты на месяц, ₽ (необязательно)</span>${MCATS.map((c) => `<label class="setrow"><span><i class="dot" style="background:${c.c}"></i> ${c.n}</span><input data-lim="${c.k}" inputmode="numeric" value="${esc(F.limits[c.k] || "")}" placeholder="—" style="width:110px;text-align:right;background:var(--card-2);border:0;border-radius:8px;padding:6px 8px"></label>`).join("")}</div>
    <div class="sheet-foot"><span></span><button class="btn primary" data-save>Сохранить</button></div>`, (m) => {
    $("[data-close]", m).onclick = closeModal;
    $$("[data-save]", m).forEach((btn) => (btn.onclick = async () => {
      const days = $("#sd", m).value.split(/[,\s]+/).map(Number).filter((n) => n >= 1 && n <= 31);
      const limits = {}; $$("[data-lim]", m).forEach((i) => { const v = parseFloat(i.value.replace(/\s/g, "")); if (v > 0) limits[i.dataset.lim] = v; });
      const it = kv("budget"); const data = { ...b, key: "budget", salary_days: days, limits };
      closeModal();
      await saveItem(it ? { ...it, data } : { type: "kv", vis: "shared", data }, "Настройки сохранены");
    }));
  });
}
