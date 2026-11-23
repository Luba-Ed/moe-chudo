// Дни рождения родных и друзей: близким напоминаем за неделю, остальным — за день.
// Хранятся одним списком (kv «birthdays»), в календаре видны каждый год.

const bdayKv = () => kv("birthdays");
const bdays = () => (bdayKv()?.data.list || []).slice();
const BD_REL = [["family", "Родные"], ["friend", "Друзья"], ["other", "Другие"]];
const isLeapLess = (y) => new Date(y, 1, 29).getMonth() !== 1;

function bdayNext(b, from = today()) { // ближайшая дата ДР начиная с from (29 февраля в невисокосный год — 28-го)
  const at = (y) => (b.m === 2 && b.d === 29 && isLeapLess(y) ? new Date(y, 1, 28) : new Date(y, b.m - 1, b.d));
  let d = at(from.getFullYear());
  if (d < from) d = at(from.getFullYear() + 1);
  return iso(d);
}
const bdayAge = (b, ds) => (b.y ? parse(ds).getFullYear() - b.y : null);
const bdayLead = (b) => (b.close ? 7 : 1);
function bdaysOn(ds) {
  const d = parse(ds);
  return bdays().filter((b) => b.m === d.getMonth() + 1 && (b.d === d.getDate() || (b.m === 2 && b.d === 29 && d.getDate() === 28 && isLeapLess(d.getFullYear()))));
}
function bdayAlerts() {
  const t = today();
  return bdays().map((b) => { const ds = bdayNext(b, t); return { b, ds, left: daysBetween(iso(t), ds) }; })
    .filter((x) => x.left <= bdayLead(x.b)).sort((a, b) => a.left - b.left);
}
function bdayText({ b, ds, left }) {
  const age = bdayAge(b, ds), who = esc(b.name) + (age ? ` (${age} ${plural(age, "год", "года", "лет")})` : "");
  if (left === 0) return `Сегодня день рождения: ${who}`;
  if (left === 1) return `Завтра день рождения: ${who}`;
  return `Через ${left} ${plural(left, "день", "дня", "дней")} день рождения: ${who} · ${fmtDate(ds)}`;
}

function renderBdays(main) {
  const t = today(), list = bdays().map((b) => ({ b, ds: bdayNext(b, t) })).sort((a, b) => a.ds.localeCompare(b.ds));
  main.innerHTML = `<div class="page-h">${mobBack()}<h1>Дни рождения</h1><span class="spacer"></span><button class="btn primary" data-bday-new>+ День рождения</button></div>
    <span class="note">Близким напомню за неделю, остальным — за день. Напоминание появится вверху «Сегодня», а сам день — в календаре каждый год.</span>
    <div class="list">${list.map(({ b, ds }) => { const left = daysBetween(iso(t), ds), age = bdayAge(b, ds), rel = BD_REL.find((r) => r[0] === b.rel);
      return `<button class="bday${left <= bdayLead(b) ? " soon" : ""}" data-bday-open="${b.id}"><span class="bd-date"><b>${parse(ds).getDate()}</b><small>${MGEN[parse(ds).getMonth()].slice(0, 3)}</small></span>
        <span class="bd-body"><b>${esc(b.name)}</b><small>${b.close ? "близкий · напомню за неделю" : "напомню за день"}${age ? ` · исполнится ${age}` : ""}${rel ? ` · ${rel[1].toLowerCase()}` : ""}${b.note ? " · " + esc(b.note) : ""}</small></span>
        <span class="bd-left mono">${left === 0 ? "сегодня" : left === 1 ? "завтра" : `через ${left} ${plural(left, "день", "дня", "дней")}`}</span></button>`; }).join("") || '<div class="empty">Добавьте дни рождения родных и друзей — приложение будет напоминать заранее.</div>'}</div>`;
  $("[data-bday-new]", main).onclick = () => openBday(null);
  bindToday(main);
}

function openBday(id) {
  const it = bdayKv(), all = bdays(), b = id ? all.find((x) => x.id === id) : null;
  const F = { name: "", d: "", m: "", y: "", close: true, rel: "family", note: "", ...(b || {}) };
  const draw = () => openModal(`<div class="sheet-h"><button data-close>Отмена</button><b>${b ? "День рождения" : "Новый день рождения"}</b><button class="go" data-save>Готово</button></div>
    <label class="field"><span>Кто</span><input data-k="name" value="${esc(F.name)}" placeholder="Мама, Катя Иванова" maxlength="60"></label>
    <div class="frow3"><label class="field"><span>День</span><input data-k="d" type="number" min="1" max="31" value="${esc(F.d)}" placeholder="12"></label>
      <label class="field"><span>Месяц</span><select data-k="m"><option value="">—</option>${MGEN.map((mn, i) => `<option value="${i + 1}"${+F.m === i + 1 ? " selected" : ""}>${mn}</option>`).join("")}</select></label>
      <label class="field"><span>Год, если знаете</span><input data-k="y" type="number" min="1900" max="2100" value="${esc(F.y || "")}" placeholder="1985"></label></div>
    <div class="field"><span>Кто это</span>${choice("rel", BD_REL, F.rel)}</div>
    ${toggleRow("close", F.close, "Близкий человек", "напомню за неделю, иначе — за день")}
    <label class="field"><span>Заметка</span><input data-k="note" value="${esc(F.note || "")}" placeholder="Что подарить, любит пионы" maxlength="120"></label>
    <div class="sheet-foot"><span>${b ? '<button class="btn danger" data-del-bday>Удалить</button>' : ""}</span><button class="btn primary" data-save>${b ? "Сохранить" : "Добавить"}</button></div>`, (m) => {
    bindForm(m, F, draw);
    $("[data-close]", m).onclick = closeModal;
    $$("[data-save]", m).forEach((btn) => (btn.onclick = async () => {
      const d = +F.d, mo = +F.m, y = +F.y || null;
      if (!F.name.trim()) return toast("Напишите, чей день рождения");
      if (!(mo >= 1 && mo <= 12) || !(d >= 1 && d <= new Date(2024, mo, 0).getDate())) return toast("Проверьте день и месяц");
      const rec = { id: b ? b.id : uid(), name: F.name.trim(), d, m: mo, y, close: !!F.close, rel: F.rel, note: (F.note || "").trim() };
      const list = b ? all.map((x) => (x.id === b.id ? rec : x)) : [...all, rec];
      closeModal();
      await saveItem(it ? { ...it, data: { ...it.data, list } } : { type: "kv", vis: "shared", data: { key: "birthdays", list } }, b ? "Сохранено" : "День рождения добавлен");
    }));
    const del = $("[data-del-bday]", m);
    if (del) del.onclick = async () => {
      if (del.dataset.sure !== "1") { del.dataset.sure = "1"; del.textContent = "Точно удалить?"; return; }
      closeModal(); await saveItem({ ...it, data: { ...it.data, list: all.filter((x) => x.id !== b.id) } }, "Удалено");
    };
  });
  draw();
}
function bindBdays(root) {
  $$("[data-bday-open]", root).forEach((b) => (b.onclick = (e) => { e.stopPropagation(); openBday(b.dataset.bdayOpen); }));
}
