// Хранилище: дисконтные карты, документы, списки и хотелки.

/* ================= штрихкоды ================= */
const C128 = "212222 222122 222221 121223 121322 131222 122213 122312 132212 221213 221312 231212 112232 122132 122231 113222 123122 123221 223211 221132 221231 213212 223112 312131 311222 321122 321221 312212 322112 322211 212123 212321 232121 111323 131123 131321 112313 132113 132311 211313 231113 231311 112133 112331 132131 113123 113321 133121 313121 211331 231131 213113 213311 213131 311123 311321 331121 312113 312311 332111 314111 221411 431111 111224 111422 121124 121421 141122 141221 112214 112412 122114 122411 142112 142211 241211 221114 413111 241112 134111 111242 121142 121241 114212 124112 124211 411212 421112 421211 212141 214121 412121 111143 111341 131141 114113 114311 411113 411311 113141 114131 311141 411131 211412 211214 211232".split(" ");
function code128Modules(text) {
  // только цифры чётной длины — набор C (короче), иначе набор B
  let vals;
  if (/^\d+$/.test(text) && text.length % 2 === 0 && text.length >= 4) { vals = [105]; for (let i = 0; i < text.length; i += 2) vals.push(+text.slice(i, i + 2)); }
  else { vals = [104]; for (const ch of text) { const c = ch.charCodeAt(0); if (c < 32 || c > 126) return null; vals.push(c - 32); } }
  let sum = vals[0]; for (let i = 1; i < vals.length; i++) sum += vals[i] * i;
  vals.push(sum % 103);
  let w = vals.map((v) => C128[v]).join("") + "2331112", bits = "";
  [...w].forEach((n, i) => (bits += (i % 2 === 0 ? "1" : "0").repeat(+n)));
  return bits;
}
const EAN_L = ["0001101", "0011001", "0010011", "0111101", "0100011", "0110001", "0101111", "0111011", "0110111", "0001011"];
const EAN_G = ["0100111", "0110011", "0011011", "0100001", "0011101", "0111001", "0000101", "0010001", "0001001", "0010111"];
const EAN_R = ["1110010", "1100110", "1101100", "1000010", "1011100", "1001110", "1010000", "1000100", "1001000", "1110100"];
const EAN_P = ["LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG", "LGGLLG", "LGGGLL", "LGLGLG", "LGLGGL", "LGGLGL"];
const eanCheck = (d12) => { let s = 0; for (let i = 0; i < 12; i++) s += +d12[i] * (i % 2 ? 3 : 1); return (10 - (s % 10)) % 10; };
function ean13(num) {
  let d = num.replace(/\D/g, "");
  if (d.length === 12) d += eanCheck(d);
  if (d.length !== 13 || +d[12] !== eanCheck(d.slice(0, 12))) return null;
  const par = EAN_P[+d[0]];
  let bits = "101";
  for (let i = 1; i <= 6; i++) bits += (par[i - 1] === "L" ? EAN_L : EAN_G)[+d[i]];
  bits += "01010";
  for (let i = 7; i <= 12; i++) bits += EAN_R[+d[i]];
  return { bits: bits + "101", text: d };
}
const bitsSVG = (bits, h = 110) => {
  let x = 0, r = "";
  for (let i = 0; i < bits.length; ) { let j = i; while (j < bits.length && bits[j] === bits[i]) j++; if (bits[i] === "1") r += `<rect x="${x + 10}" y="0" width="${j - i}" height="${h}"/>`; x += j - i; i = j; }
  return `<svg viewBox="0 0 ${x + 20} ${h}" preserveAspectRatio="none" class="bc" role="img" aria-label="Штрихкод"><rect width="100%" height="100%" fill="#fff"/><g fill="#000">${r}</g></svg>`;
};
function barcodeHTML(card) {
  const n = (card.number || "").trim(); if (!n) return "";
  if (card.format === "ean13") { const e = ean13(n); return e ? bitsSVG(e.bits) : `<span class="note">Для EAN-13 нужно 12–13 цифр с верной контрольной цифрой. Попробуйте формат Code 128.</span>`; }
  if (card.format === "code128") { const b = code128Modules(n); return b ? bitsSVG(b) : '<span class="note">Номер содержит символы, которые нельзя закодировать.</span>'; }
  if (card.format === "qr") {
    if (!window.qrcode) return '<span class="note">QR-код загружается… Проверьте интернет.</span>';
    const q = qrcode(0, "M"); q.addData(n); q.make();
    const c = q.getModuleCount(); let r = "";
    for (let y = 0; y < c; y++) for (let x = 0; x < c; x++) if (q.isDark(y, x)) r += `M${x + 2} ${y + 2}h1v1h-1z`;
    return `<svg viewBox="0 0 ${c + 4} ${c + 4}" class="qr" role="img" aria-label="QR-код"><rect width="100%" height="100%" fill="#fff"/><path d="${r}" fill="#000"/></svg>`;
  }
  return "";
}

/* ================= карты ================= */
const cards = () => S.items.filter((i) => i.type === "card");
const CARD_COLORS = ["#d7262f", "#1f7a3a", "#2d6db5", "#3c5ea8", "#1b3f8f", "#9c7a3c", "#e8924a", "#8b7bea", "#2bb3b8", "#3a3b44"];
function renderCards(main) {
  const list = cards().sort((a, b) => (b.data.used || "").localeCompare(a.data.used || "") || a.data.name.localeCompare(b.data.name));
  main.innerHTML = `<div class="page-h">${mobBack()}<h1>Карты</h1><span class="spacer"></span><button class="btn primary" data-card-new>+ Карта</button></div>
    <span class="note">Дисконтные карты магазинов и аптек. Нажмите на карту — покажется штрихкод для кассы. Сверху — те, что открывали недавно.</span>
    <div class="dcards">${list.map((c) => `<button class="dc" data-card="${c.id}" style="background:${c.data.color || "#3a3b44"}"><b>${esc(c.data.name)}</b><span class="meta"><span>${c.data.format === "qr" ? "QR" : "•••• " + esc((c.data.number || "").slice(-4))}</span><i class="dot" style="background:${PEOPLE[c.data.owner]?.c};box-shadow:0 0 0 1.5px #fff"></i></span></button>`).join("") || '<div class="empty">Добавьте первую карту: название и номер с обратной стороны.</div>'}</div>`;
  $("[data-card-new]", main).onclick = () => openCard(null);
  $$("[data-card]", main).forEach((b) => (b.onclick = () => showCard(b.dataset.card)));
}
function showCard(id) {
  const c = cards().find((x) => x.id === id); if (!c) return;
  openModal(`<div class="sheet-h"><button data-close>Закрыть</button><b>${esc(c.data.name)}</b>${canEdit(c) ? '<button class="go" data-edit>Изменить</button>' : "<span></span>"}</div>
    <div class="cardshow">${barcodeHTML(c.data)}<div class="num">${esc(c.data.number)}</div>
    <span class="note" style="color:#555">${PEOPLE[c.data.owner] ? (c.data.owner === "we" ? "общая карта" : "карта: " + pn(c.data.owner)) : ""} · сделайте яркость экрана повыше</span></div>
    ${c.data.note ? `<span class="note">${esc(c.data.note)}</span>` : ""}`, (m) => {
    $("[data-close]", m).onclick = closeModal;
    const e = $("[data-edit]", m); if (e) e.onclick = () => openCard(id);
  });
  saveItem({ ...c, data: { ...c.data, used: new Date().toISOString() } });
}
function openCard(id) {
  const c = id ? cards().find((x) => x.id === id) : null;
  const F = { name: "", number: "", format: "ean13", color: CARD_COLORS[0], owner: "we", note: "", ...(c ? c.data : {}) };
  const draw = () => openModal(`<div class="sheet-h"><button data-close>Отмена</button><b>${c ? "Карта" : "Новая карта"}</b><button class="go" data-save>Готово</button></div>
    <label class="field"><span>Магазин</span><input data-k="name" value="${esc(F.name)}" placeholder="Пятёрочка, Ригла" maxlength="40"></label>
    <label class="field"><span>Номер карты</span><input data-k="number" value="${esc(F.number)}" placeholder="Цифры под штрихкодом" maxlength="64" inputmode="text"></label>
    <div class="field"><span>Формат кода</span>${choice("format", [["ean13", "Штрихкод EAN-13"], ["code128", "Штрихкод Code 128"], ["qr", "QR-код"], ["none", "Только номер"]], F.format)}
      <span class="note">Если под штрихкодом ровно 13 цифр — EAN-13. Если касса не считала, попробуйте Code 128.</span></div>
    <div class="cardprev">${barcodeHTML(F)}</div>
    <div class="field"><span>Цвет</span><div class="choice">${CARD_COLORS.map((x) => `<button type="button" class="swatch${F.color === x ? " on" : ""}" data-color="${x}" style="background:${x}" aria-label="Цвет"></button>`).join("")}</div></div>
    <div class="field"><span>Чья</span>${choice("owner", [["we", "Общая", PEOPLE.we.c], ["luba", "Люба", PEOPLE.luba.c], ["zhenya", "Женя", PEOPLE.zhenya.c]], F.owner)}</div>
    <label class="field"><span>Заметка</span><input data-k="note" value="${esc(F.note || "")}" placeholder="Скидка 5% по средам" maxlength="80"></label>
    <div class="sheet-foot"><span>${c ? '<button class="btn danger" data-del>Удалить</button>' : ""}</span><button class="btn primary" data-save>${c ? "Сохранить" : "Добавить"}</button></div>`, (m) => {
    bindForm(m, F, draw);
    $('[data-k="number"]', m).addEventListener("change", draw);
    $$("[data-color]", m).forEach((b) => (b.onclick = () => { F.color = b.dataset.color; draw(); }));
    $("[data-close]", m).onclick = closeModal;
    $$("[data-save]", m).forEach((b) => (b.onclick = async () => {
      if (!F.name.trim()) return toast("Напишите название магазина");
      if (!F.number.trim()) return toast("Введите номер карты");
      const data = { ...(c ? c.data : {}), name: F.name.trim(), number: F.number.trim(), format: F.format, color: F.color, owner: F.owner, note: (F.note || "").trim(), by: c ? c.data.by : S.me.person };
      closeModal();
      await saveItem(c ? { ...c, data } : { type: "card", vis: "shared", data }, c ? "Сохранено" : "Карта добавлена");
    }));
    confirmDelete(m, c);
  });
  draw();
}

/* ================= документы ================= */
const docs = () => S.items.filter((i) => i.type === "doc");
const FOLDERS = [["ids", "Паспорта и удостоверения"], ["sasha", "Саша"], ["car", "Машина"], ["home", "Квартира"], ["med", "Медицина"], ["money", "Финансы и договоры"], ["other", "Другое"]];
const folderName = (k) => FOLDERS.find((f) => f[0] === k)?.[1] || "Другое";
function docExpiring(days = 30) { const t = iso(today()), lim = iso(addD(today(), days)); return docs().filter((d) => d.data.expires && d.data.expires <= lim); }
function renderDocs(main) {
  const f = S.dfolder || "all", t = iso(today());
  const list = docs().filter((d) => f === "all" || d.data.folder === f).sort((a, b) => a.data.title.localeCompare(b.data.title));
  const exp = docExpiring(30);
  main.innerHTML = `<div class="page-h">${mobBack()}<h1>Документы</h1><span class="spacer"></span><button class="btn primary" data-doc-new>+ Документ</button></div>
    ${exp.map((d) => `<div class="alert"><span>${esc(d.data.title)}: ${d.data.expires < t ? "срок истёк " + fmtDate(d.data.expires) : "действует до " + fmtDate(d.data.expires)}</span><button data-doc="${d.id}">Открыть</button></div>`).join("")}
    <div class="tabs"><button class="${f === "all" ? "on" : ""}" data-df="all">Все · ${docs().length}</button>${FOLDERS.map(([k, n]) => { const c = docs().filter((d) => d.data.folder === k).length; return c ? `<button class="${f === k ? "on" : ""}" data-df="${k}">${n} · ${c}</button>` : ""; }).join("")}</div>
    <div class="docgrid">${list.map((d) => `<button class="docc" data-doc="${d.id}"><div class="thumb" data-thumb="${esc(d.data.files?.[0] || "")}">${d.data.files?.length ? "" : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/></svg>'}</div>
      <b>${esc(d.data.title)}</b><small>${folderName(d.data.folder)}${d.data.files?.length ? ` · ${d.data.files.length} фото` : ""}</small>${d.data.expires ? `<small class="${d.data.expires <= iso(addD(today(), 30)) ? "warnt" : ""}">до ${fmtDate(d.data.expires)} ${parse(d.data.expires).getFullYear()}</small>` : ""}</button>`).join("") || '<div class="empty">Добавьте фото документов: паспорта, полисы, справки, свидетельство Саши.</div>'}</div>
    <span class="note">${DB.demo ? "В демо-режиме фото хранятся в этом браузере, места мало (~5 МБ). В общей базе — закрытое хранилище, доступ только у вас двоих." : "Фото лежат в закрытом хранилище, открыть их можете только вы двое."}</span>`;
  $("[data-doc-new]", main).onclick = () => openDoc(null, f !== "all" ? { folder: f } : {});
  $$("[data-df]", main).forEach((b) => (b.onclick = () => { S.dfolder = b.dataset.df; render(); }));
  $$("[data-doc]", main).forEach((b) => (b.onclick = () => openDoc(b.dataset.doc)));
  $$("[data-thumb]", main).forEach(async (el) => { const ref = el.dataset.thumb; if (!ref || ref.startsWith("pdf:")) return; const u = await DB.fileUrl(ref); if (u) el.style.backgroundImage = `url("${u}")`; });
}
async function compressImage(file) {
  if (file.type === "application/pdf") return file;
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(file); });
  const max = DB.demo ? 1100 : 2000, k = Math.min(1, max / Math.max(img.width, img.height));
  const cv = document.createElement("canvas"); cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
  cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
  return await new Promise((res) => cv.toBlob(res, "image/jpeg", DB.demo ? 0.72 : 0.85));
}
function openDoc(id, preset = {}) {
  const d = id ? docs().find((x) => x.id === id) : null;
  const F = { title: "", folder: "other", owner: "we", number: "", expires: "", note: "", files: [], ...(d ? d.data : {}), ...preset };
  F.files = [...(F.files || [])];
  const removed = [];
  const draw = () => openModal(`<div class="sheet-h"><button data-close>Отмена</button><b>${d ? "Документ" : "Новый документ"}</b><button class="go" data-save>Готово</button></div>
    <label class="field"><span>Название</span><input data-k="title" value="${esc(F.title)}" placeholder="Полис ОМС Саши" maxlength="80"></label>
    <div class="field"><span>Папка</span>${choice("folder", FOLDERS, F.folder)}</div>
    <div class="field"><span>Чей</span>${choice("owner", [["we", "Общий", PEOPLE.we.c], ["luba", "Люба", PEOPLE.luba.c], ["zhenya", "Женя", PEOPLE.zhenya.c], ["sasha", "Саша", PEOPLE.sasha.c]], F.owner)}</div>
    <div class="frow"><label class="field"><span>Номер</span><input data-k="number" value="${esc(F.number || "")}" placeholder="Серия и номер" maxlength="60"></label>
      <label class="field"><span>Действует до</span><input type="date" data-k="expires" value="${F.expires || ""}"></label></div>
    <div class="field"><span>Фото и файлы</span><div class="files">${F.files.map((ref, i) => `<div class="fthumb" data-fview="${i}" data-ref="${esc(ref)}" role="button" tabindex="0" aria-label="Открыть фото">${ref.startsWith("pdf:") || ref.endsWith(".pdf") ? "PDF" : ""}<button class="fx" data-frm="${i}" aria-label="Убрать">×</button></div>`).join("")}
      <label class="fadd"><input type="file" accept="image/*,application/pdf" multiple hidden id="fileIn">+ Фото</label></div>
      <span class="note">JPEG, PNG или PDF. Фото сжимаются, чтобы быстро открывались.</span></div>
    <label class="field"><span>Заметка</span><textarea data-k="note" placeholder="Где лежит оригинал">${esc(F.note || "")}</textarea></label>
    <span class="note">Напоминание за 30 дней до конца срока появится на главном экране.</span>
    <div class="sheet-foot"><span>${d ? '<button class="btn danger" data-del>Удалить</button>' : ""}</span><button class="btn primary" data-save>${d ? "Сохранить" : "Добавить"}</button></div>`, (m) => {
    bindForm(m, F, draw);
    $("[data-close]", m).onclick = closeModal;
    $$("[data-ref]", m).forEach(async (el) => { const r = el.dataset.ref; if (r.startsWith("pdf:") || r.endsWith(".pdf")) return; const u = await DB.fileUrl(r); if (u) el.style.backgroundImage = `url("${u}")`; });
    $$("[data-fview]", m).forEach((el) => (el.onclick = async (e) => { if (e.target.closest("[data-frm]")) return; const u = await DB.fileUrl(F.files[+el.dataset.fview]); if (u) viewFile(u); }));
    $$("[data-frm]", m).forEach((b) => (b.onclick = (e) => { e.stopPropagation(); removed.push(F.files[+b.dataset.frm]); F.files.splice(+b.dataset.frm, 1); draw(); }));
    $("#fileIn", m).onchange = async (e) => {
      const fs = [...e.target.files]; if (!fs.length) return;
      toast("Загружаю…");
      for (const f of fs) {
        try { const blob = await compressImage(f); const ref = await DB.upload(blob); F.files.push(f.type === "application/pdf" && DB.demo ? "pdf:" + ref : ref); }
        catch (er) { console.error(er); toast("Не получилось загрузить " + f.name); }
      }
      draw();
    };
    $$("[data-save]", m).forEach((b) => (b.onclick = async () => {
      if (!F.title.trim()) return toast("Напишите название");
      const data = { ...(d ? d.data : {}), title: F.title.trim(), folder: F.folder, owner: F.owner, number: (F.number || "").trim(), expires: F.expires || "", note: (F.note || "").trim(), files: F.files, by: d ? d.data.by : S.me.person };
      closeModal();
      await saveItem(d ? { ...d, data } : { type: "doc", vis: "shared", data }, d ? "Сохранено" : "Документ добавлен");
      removed.forEach((r) => DB.removeFile(r));
    }));
    confirmDelete(m, d, () => (d.data.files || []).forEach((r) => DB.removeFile(r)));
  });
  draw();
}
function viewFile(url) {
  const ov = document.createElement("div");
  ov.className = "lightbox";
  const isPdf = url.startsWith("pdf:") || /\.pdf|application\/pdf/.test(url);
  const u = url.replace(/^pdf:/, "");
  ov.innerHTML = isPdf ? `<div class="lb-pdf"><a href="${esc(u)}" target="_blank" rel="noopener">Открыть PDF</a></div>` : `<img src="${esc(u)}" alt="Фото документа">`;
  ov.innerHTML += '<button class="lb-x" aria-label="Закрыть">×</button>';
  ov.onclick = (e) => { if (e.target.tagName !== "A") ov.remove(); };
  document.body.appendChild(ov);
}

/* ================= списки и хотелки ================= */
const lists = () => S.items.filter((i) => i.type === "list");
const LIST_TPL = {
  shop: { title: "Покупки", sub: "продукты и дом", items: [] },
  go: { title: "Куда сходить", sub: "", items: [] },
  watch: { title: "Что посмотреть", sub: "фильмы и мультфильмы", items: [] },
  cook: { title: "Что приготовить", sub: "", items: [] },
  trip: { title: "Поездка", sub: "что взять", items: ["Документы", "Зарядки", "Аптечка", "Одежда Саши", "Пижамы", "Игрушка в дорогу"] },
  sasha: { title: "Покупки для Саши", sub: "", items: [] },
  wish: { title: "Хотелки", sub: "идеи подарков", items: [] },
  empty: { title: "", sub: "", items: [] },
};
function renderLists(main) {
  if (S.listOpen) return renderListOne(main, S.listOpen);
  const all = lists(), wishes = all.filter((l) => l.data.kind === "wish"), rest = all.filter((l) => l.data.kind !== "wish");
  const card = (l) => { const its = l.data.items || [], done = its.filter((i) => i.done).length;
    return `<button class="lcard" data-list="${l.id}"><span class="mono muted">${esc((l.data.sub || "").toUpperCase())}</span><b>${esc(l.data.title)}</b>
      <div class="bar"><i style="width:${its.length ? (done / its.length) * 100 : 0}%;background:var(--we)"></i></div><span class="mono">${l.data.kind === "wish" ? its.filter((i) => !i.done).length + " идей" : `${done} из ${its.length}`}</span>
      ${l.data.owner ? `<i class="dot" style="background:${PEOPLE[l.data.owner]?.c};position:absolute;top:14px;right:14px"></i>` : ""}</button>`; };
  main.innerHTML = `<div class="page-h">${mobBack()}<h1>Списки</h1><span class="spacer"></span><button class="btn primary" data-list-new>+ Список</button></div>
    <div class="lgrid">${rest.map(card).join("") || '<div class="empty">Создайте список покупок или «куда сходить».</div>'}</div>
    <div class="group-h">Хотелки — идеи подарков друг другу</div>
    <div class="lgrid">${wishes.map(card).join("")}<button class="lcard add" data-wish-new>+ Хотелки</button></div>
    <span class="note">Пункт с датой сам появляется в календаре. Отметить галочкой может любой из вас, если в списке это разрешено.</span>`;
  $("[data-list-new]", main).onclick = () => openListMeta(null);
  $("[data-wish-new]", main).onclick = () => openListMeta(null, "wish");
  $$("[data-list]", main).forEach((b) => (b.onclick = () => { S.listOpen = b.dataset.list; S.listTab = "left"; render(); window.scrollTo(0, 0); }));
}
function renderListOne(main, id) {
  const l = lists().find((x) => x.id === id);
  if (!l) { S.listOpen = null; return renderLists(main); }
  const d = l.data, its = d.items || [], tab = S.listTab || "left";
  const shown = its.filter((i) => (tab === "left" ? !i.done : tab === "done" ? i.done : true));
  const me = S.me.person, canCheck = (i) => d.anyone || i.by === me;
  main.innerHTML = `<div class="page-h"><button class="pill-btn" data-lback>‹ Списки</button><span class="spacer"></span><button class="pill-btn" data-lmeta>Настроить</button></div>
    <div><h1 style="margin:0;font-size:32px;font-weight:800;letter-spacing:-.02em">${esc(d.title)}</h1><span class="mono muted" style="font-size:12px">${d.kind === "wish" ? "хотелки · " + pn(d.owner) : "список на двоих"}${d.sub ? " · " + esc(d.sub) : ""}</span></div>
    ${d.kind !== "wish" ? `<div class="lprog"><div class="bar"><i style="width:${its.length ? (its.filter((i) => i.done).length / its.length) * 100 : 0}%;background:var(--we)"></i></div><b>${its.filter((i) => i.done).length} из ${its.length}</b></div>` : ""}
    <div class="tabs">${[["left", d.kind === "wish" ? "Идеи" : "Осталось", its.filter((i) => !i.done).length], ["done", d.kind === "wish" ? "Подарено" : "Сделано", its.filter((i) => i.done).length], ["all", "Всё", its.length]].map(([k, n, c]) => `<button class="${tab === k ? "on" : ""}" data-ltab="${k}">${n} · ${c}</button>`).join("")}</div>
    <form class="ladd" id="ladd"><input id="litem" placeholder="${d.kind === "wish" ? "Добавить идею" : "Добавить пункт"}" maxlength="120" aria-label="Новый пункт"><input id="ldate" type="date" aria-label="Дата (необязательно)" title="Дата — пункт появится в календаре"><button class="btn primary" type="submit">Добавить</button></form>
    <div class="list">${shown.map((i) => `<div class="litem${i.done ? " done" : ""}"><button class="ck2${i.done ? " on" : ""}" style="--c:var(--we)" data-lck="${i.id}" ${canCheck(i) ? "" : "disabled"} aria-label="Отметить"></button>
      <div class="lbody"><span>${esc(i.t)}</span><small>${pn(i.by)}${i.date ? " · " + fmtDate(i.date) : ""}${i.done && i.done_by ? ` · отметил${i.done_by === "luba" ? "а" : ""} ${pn(i.done_by)}` : ""}</small></div>
      <button class="lx" data-lrm="${i.id}" aria-label="Удалить пункт">×</button></div>`).join("") || '<div class="empty">Пусто</div>'}</div>
    ${d.kind === "wish" && d.owner && d.owner !== me ? `<span class="note">Это хотелки ${d.owner === "zhenya" ? "Жени" : "Любы"}. Отметьте «подарено», когда сделаете сюрприз.</span>` : ""}`;
  const save = (items, msg) => saveItem({ ...l, data: { ...d, items } }, msg);
  $("[data-lback]", main).onclick = () => { S.listOpen = null; render(); };
  $("[data-lmeta]", main).onclick = () => openListMeta(l.id);
  $$("[data-ltab]", main).forEach((b) => (b.onclick = () => { S.listTab = b.dataset.ltab; render(); }));
  $("#ladd", main).onsubmit = (e) => { e.preventDefault(); const t = $("#litem", main).value.trim(); if (!t) return; save([...its, { id: uid(), t, by: me, date: $("#ldate", main).value || "" }]); };
  $$("[data-lck]", main).forEach((b) => (b.onclick = () => save(its.map((i) => (i.id === b.dataset.lck ? { ...i, done: !i.done, done_by: !i.done ? me : null } : i)))));
  $$("[data-lrm]", main).forEach((b) => (b.onclick = () => save(its.filter((i) => i.id !== b.dataset.lrm), "Пункт удалён")));
}
function openListMeta(id, kind) {
  const l = id ? lists().find((x) => x.id === id) : null;
  const me = S.me.person;
  const F = { title: "", sub: "", kind: kind || "list", owner: kind === "wish" ? me : "", anyone: true, tpl: kind === "wish" ? "wish" : "empty", ...(l ? l.data : {}) };
  if (kind === "wish" && !l) F.title = `Хотелки ${me === "luba" ? "Любы" : "Жени"}`;
  const draw = () => openModal(`<div class="sheet-h"><button data-close>Отмена</button><b>${l ? "Настройки списка" : "Новый список"}</b><button class="go" data-save>Готово</button></div>
    <label class="field"><span>Название</span><input data-k="title" value="${esc(F.title)}" placeholder="Куда сходить" maxlength="60"></label>
    <label class="field"><span>Уточнение</span><input data-k="sub" value="${esc(F.sub || "")}" placeholder="Москва, этой зимой" maxlength="60"></label>
    ${!l && F.kind !== "wish" ? `<div class="field"><span>Начать с шаблона</span>${choice("tpl", [["shop", "Покупки"], ["go", "Куда сходить"], ["watch", "Что посмотреть"], ["cook", "Что приготовить"], ["trip", "Поездка"], ["sasha", "Покупки для Саши"], ["empty", "Пустой"]], F.tpl)}</div>` : ""}
    ${F.kind === "wish" ? `<div class="field"><span>Чьи хотелки</span>${choice("owner", [["luba", "Любы", PEOPLE.luba.c], ["zhenya", "Жени", PEOPLE.zhenya.c], ["sasha", "Саши", PEOPLE.sasha.c]], F.owner)}</div>` : ""}
    <div class="field">${toggle("anyone", F.anyone, "Отмечать может любой", "выключите — только автор пункта")}</div>
    <div class="sheet-foot"><span>${l ? '<button class="btn danger" data-del>Удалить список</button>' : ""}</span><button class="btn primary" data-save>${l ? "Сохранить" : "Создать"}</button></div>`, (m) => {
    bindForm(m, F, () => { if (!l && LIST_TPL[F.tpl] && (!F.title || Object.values(LIST_TPL).some((t) => t.title === F.title))) { F.title = LIST_TPL[F.tpl].title; F.sub = LIST_TPL[F.tpl].sub; } draw(); });
    $("[data-close]", m).onclick = closeModal;
    $$("[data-save]", m).forEach((b) => (b.onclick = async () => {
      if (!F.title.trim()) return toast("Напишите название");
      const items = l ? l.data.items : (LIST_TPL[F.tpl]?.items || []).map((t) => ({ id: uid(), t, by: me }));
      const data = { ...(l ? l.data : {}), title: F.title.trim(), sub: (F.sub || "").trim(), kind: F.kind === "wish" ? "wish" : F.tpl === "shop" || F.tpl === "sasha" ? "shop" : F.kind, owner: F.kind === "wish" ? F.owner : "", anyone: !!F.anyone, items, by: l ? l.data.by : me };
      closeModal();
      if (l) await saveItem({ ...l, data }, "Сохранено");
      else { const nid = uid(); await saveItem({ id: nid, type: "list", vis: "shared", data }, "Список создан"); if (!DB.demo) { S.listOpen = null; } else { S.listOpen = nid; S.listTab = "left"; render(); } }
    }));
    confirmDelete(m, l, () => { S.listOpen = null; });
  });
  draw();
}
function listItemsOn(ds) {
  const out = [];
  lists().forEach((l) => (l.data.items || []).forEach((i) => { if (i.date === ds) out.push({ l, i }); }));
  return out;
}
