// «Моё чудо» — Telegram-бот (Supabase Edge Function «bot»).
// • /start <код> — привязка Telegram к Любе или Жене (код выдаёт приложение: Ещё → Telegram)
// • голосовое или текст → Yandex SpeechKit (речь в текст) → YandexGPT (понять фразу) → запись в планер
// • ?cron=morning — утренняя сводка в 7:30 (вызывает pg_cron)
// • ?notify=<id> — уведомление о новой просьбе (вызывает триггер базы)
// • ?setup=1 — подключить вебхук Telegram
// Секреты (Supabase → Edge Functions → Secrets): TELEGRAM_BOT_TOKEN, YANDEX_API_KEY, YANDEX_FOLDER_ID.
// Служебный ключ для cron/триггера/вебхука лежит в таблице bot_config (key = 'secret'), читать её может только сервер.
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const TG = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
const YKEY = Deno.env.get("YANDEX_API_KEY") || "";
const YFOLDER = Deno.env.get("YANDEX_FOLDER_ID") || "";
const TZ = 3; // Москва, UTC+3
const FN_URL = `${Deno.env.get("SUPABASE_URL")}/functions/v1/bot`;

/* ---------------- даты ---------------- */
const MGEN = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
const WDL = ["понедельник", "вторник", "среда", "четверг", "пятница", "суббота", "воскресенье"];
const todayIso = () => new Date(Date.now() + TZ * 3600e3).toISOString().slice(0, 10);
const parse = (ds: string) => new Date(ds + "T00:00:00Z");
const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDs = (ds: string, n: number) => iso(new Date(parse(ds).getTime() + n * 864e5));
const wd = (ds: string) => (parse(ds).getUTCDay() + 6) % 7;
const daysBetween = (a: string, b: string) => Math.round((parse(b).getTime() - parse(a).getTime()) / 864e5);
const fmtDate = (ds: string) => { const d = parse(ds); return `${d.getUTCDate()} ${MGEN[d.getUTCMonth()]}`; };
const plural = (n: number, a: string, b: string, c: string) => { const x = Math.abs(n) % 100, y = x % 10; return x > 10 && x < 20 ? c : y > 1 && y < 5 ? b : y === 1 ? a : c; };
const esc = (s: unknown) => String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));

type Item = { id: string; type: string; vis: string; created_by: string | null; data: any };
const PN: Record<string, string> = { luba: "Люба", zhenya: "Женя", we: "вместе", babushka: "бабушка", self: "сама", sasha: "Саша" };
const CAT: Record<string, string> = { work: "Работа", care: "Забота", sasha: "Саша", serv: "Служение", self: "Личное" };

/* ---------------- Telegram ---------------- */
async function tg(method: string, body: Record<string, unknown>) {
  const r = await fetch(`https://api.telegram.org/bot${TG}/${method}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  return r.json();
}
const send = (chat: number, text: string) => tg("sendMessage", { chat_id: chat, text, parse_mode: "HTML", disable_web_page_preview: true });

async function secret(): Promise<string> {
  const { data } = await sb.from("bot_config").select("value").eq("key", "secret").maybeSingle();
  return data?.value || "";
}

/* ---------------- данные ---------------- */
async function loadAll(): Promise<Item[]> {
  const { data, error } = await sb.from("items").select("id,type,vis,created_by,data");
  if (error) throw error;
  return data as Item[];
}
async function profiles() {
  const { data } = await sb.from("profiles").select("id,person,name,tg_chat_id,tg_last");
  return (data || []) as { id: string; person: string; name: string; tg_chat_id: number | null; tg_last: any }[];
}
const visibleTo = (uid: string) => (i: Item) => i.vis !== "private" || i.created_by === uid;

function inBreak(items: Item[], ds: string) {
  const list = items.find((i) => i.type === "kv" && i.data.key === "breaks")?.data.list || [];
  return list.find((b: any) => ds >= b.from && ds <= (b.to || b.from));
}
function occursOn(items: Item[], e: Item, ds: string) {
  const d = e.data; if (!d.date) return false;
  if (d.repeat?.days?.length) {
    if (ds < d.date || (d.repeat.until && ds > d.repeat.until) || !d.repeat.days.includes(wd(ds)) || (d.exceptions || []).includes(ds)) return false;
    if (d.skip_breaks && inBreak(items, ds)) return false;
    return true;
  }
  return ds >= d.date && ds <= (d.end_date || d.date);
}
const occ = (e: Item, ds: string) => ({ ...e.data, ...((e.data.overrides || {})[ds] || {}), id: e.id });

function payDue(p: any, ds: string): { due: string; paid: boolean } | null {
  const d = parse(ds), y = d.getUTCFullYear(), m = d.getUTCMonth();
  let due: string, key: string;
  if (p.kind === "monthly") { const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate(); due = iso(new Date(Date.UTC(y, m, Math.min(p.day || 1, last)))); key = due.slice(0, 7); }
  else if (p.kind === "yearly") { const [, mm, dd] = (p.date || "2000-01-01").split("-").map(Number); due = iso(new Date(Date.UTC(y, mm - 1, dd))); key = due.slice(0, 4); }
  else { due = p.date; key = "once"; }
  if (!due || (p.end_date && due > p.end_date)) return null;
  return { due, paid: !!p.paid?.[key] };
}

function cycleInfo(items: Item[], ds: string) {
  const c = items.find((i) => i.type === "cycle"); if (!c) return null;
  const st = { plen: 5, min: 26, max: 28, auto: true, ...(c.data.settings || {}) };
  const ps = (c.data.periods || []).filter((p: any) => p.start).sort((a: any, b: any) => a.start.localeCompare(b.start));
  if (!ps.length) return null;
  const lens: number[] = []; for (let i = 1; i < ps.length; i++) lens.push(daysBetween(ps[i - 1].start, ps[i].start));
  const rec = lens.filter((l) => l >= 18 && l <= 50).slice(-6);
  const avg = st.auto !== false && rec.length >= 3 ? Math.round(rec.reduce((s, x) => s + x, 0) / rec.length) : Math.round((st.min + st.max) / 2);
  const last = ps[ps.length - 1]; const k = Math.max(0, Math.floor(daysBetween(last.start, ds) / avg));
  const start = addDs(last.start, k * avg), n = daysBetween(start, ds) + 1;
  const pe = k === 0 && last.end ? daysBetween(start, last.end) + 1 : st.plen;
  const phase = n <= pe ? "period" : n >= avg - 4 ? "pms" : n >= avg - 19 && n <= avg - 13 ? "fert" : null;
  return { n, avg, phase, next: addDs(start, avg) };
}

/* ---------------- утренняя сводка ---------------- */
function summary(items: Item[], me: { id: string; person: string }, ds = todayIso()) {
  const p = me.person, pa = p === "luba" ? "zhenya" : "luba";
  const vis = items.filter(visibleTo(me.id));
  const out: string[] = [];
  const d = parse(ds);
  out.push(`☀️ <b>Доброе утро! ${WDL[wd(ds)][0].toUpperCase() + WDL[wd(ds)].slice(1)}, ${fmtDate(ds)}</b>`);
  const br = inBreak(items, ds); if (br) out.push(`🏖 ${esc(br.title)}`);

  // события дня
  const evs = vis.filter((e) => e.type === "event" && occursOn(items, e, ds)).map((e) => occ(e, ds))
    .filter((o: any) => o.who === p || o.who === "we" || o.who === "sasha" || o.drop === p || o.pick === p)
    .sort((a: any, b: any) => (a.all_day ? "00" : a.start || "99").localeCompare(b.all_day ? "00" : b.start || "99"));
  if (evs.length) {
    out.push("\n<b>📅 События</b>");
    evs.forEach((o: any) => {
      const t = o.all_day ? "весь день" : o.start ? (o.end ? `${o.start}–${o.end}` : o.start) : "";
      let line = `• ${t ? t + " " : ""}${esc(o.title)}`;
      if (o.who === "sasha" && !o.all_day) {
        const lg = [o.drop ? `отвозит ${PN[o.drop] || o.drop}` : "", o.pick ? `забирает ${PN[o.pick] || o.pick}` : (!o.routine && !o.no_pick ? "⚠️ никто не забирает" : "")].filter(Boolean).join(", ");
        if (lg) line += ` — ${lg}`;
        if (o.drop === p || o.pick === p || o.drop === "we" || o.pick === "we") line = "👉 " + line.slice(2);
      }
      out.push(line);
    });
  }
  // что взять Саше
  const sasha = items.find((i) => i.type === "kv" && i.data.key === "sasha")?.data;
  const bring = !br && wd(ds) < 5 ? sasha?.bring?.[wd(ds)] : null;
  if (bring?.length) out.push(`🎒 Саше взять: ${esc(bring.join(", "))}`);

  // задачи
  const tasks = vis.filter((t) => t.type === "task" && !["done", "declined"].includes(t.data.status));
  const asks = tasks.filter((t) => t.data.assignee === p && t.data.by !== p && t.data.status === "asked");
  const mine = tasks.filter((t) => (t.data.assignee === p || t.data.assignee === "we") && !asks.includes(t) && ((t.data.due && t.data.due <= ds) || t.data.important));
  if (asks.length) { out.push(`\n<b>🙏 ${PN[pa]} просит</b>`); asks.forEach((t) => out.push(`• ${esc(t.data.title)}${t.data.due ? ` (до ${fmtDate(t.data.due)})` : ""}`)); }
  if (mine.length) {
    out.push("\n<b>✅ Задачи</b>");
    mine.sort((a, b) => Number(!!b.data.important) - Number(!!a.data.important)).forEach((t) => {
      const over = t.data.due && t.data.due < ds;
      out.push(`• ${t.data.important ? "⭐ " : ""}${esc(t.data.title)}${over ? ` — <i>с ${fmtDate(t.data.first_due && t.data.first_due < t.data.due ? t.data.first_due : t.data.due)}</i>` : ""}`);
    });
  }
  // платежи
  const pays = vis.filter((i) => i.type === "payment").map((i) => ({ i, s: payDue(i.data, ds) }))
    .filter((x) => x.s && !x.s.paid && (x.s.due <= ds || daysBetween(ds, x.s.due) <= (x.i.data.remind ?? 3)));
  if (pays.length) {
    out.push("\n<b>💳 Платежи</b>");
    pays.forEach(({ i, s }) => out.push(`• ${i.data.urgent ? "❗ " : ""}${esc(i.data.title)}${+i.data.amount > 0 ? ` — ${Math.round(i.data.amount).toLocaleString("ru-RU")} ₽` : ""} · ${s!.due < ds ? "просрочено" : s!.due === ds ? "сегодня" : fmtDate(s!.due)}`));
  }
  // таблетки
  const pills = items.filter((i) => i.type === "pill" && (i.data.who === p || i.data.who === "sasha") && (!i.data.start || i.data.start <= ds) && (!i.data.end || ds <= i.data.end));
  if (pills.length) { out.push("\n<b>💊 Таблетки</b>"); pills.forEach((i) => out.push(`• ${(i.data.times || []).join(", ")} ${esc(i.data.name)}${i.data.who === "sasha" ? " (Саша)" : ""}`)); }
  // дни рождения
  const bd = items.find((i) => i.type === "kv" && i.data.key === "birthdays")?.data.list || [];
  const bdl = bd.map((b: any) => { let x = iso(new Date(Date.UTC(d.getUTCFullYear(), b.m - 1, b.d))); if (x < ds) x = iso(new Date(Date.UTC(d.getUTCFullYear() + 1, b.m - 1, b.d))); return { b, x, left: daysBetween(ds, x) }; })
    .filter((y: any) => y.left <= (y.b.close ? 7 : 1)).sort((a: any, b: any) => a.left - b.left);
  if (bdl.length) { out.push(""); bdl.forEach(({ b, left, x }: any) => out.push(`🎂 ${left === 0 ? "Сегодня" : left === 1 ? "Завтра" : `Через ${left} ${plural(left, "день", "дня", "дней")} (${fmtDate(x)})`} день рождения: ${esc(b.name)}`)); }
  // цикл
  const cy = cycleInfo(items, ds);
  if (cy && p === "luba") out.push(`\n🌸 День цикла ${cy.n}${cy.phase === "pms" ? " · ПМС, будьте к себе бережнее" : cy.phase === "period" ? " · месячные" : cy.phase === "fert" ? " · фертильные дни" : ""}`);
  if (cy && p === "zhenya" && (cy.phase === "pms" || cy.phase === "period")) out.push(`\n🌸 ${cy.phase === "pms" ? "У Любы ПМС — побольше бережности и терпения" : "У Любы месячные — хороший день взять на себя побольше дел"}`);
  // вода
  out.push(`\n💧 Норма воды: ${p === "luba" ? "1,5 л (6 стаканов)" : "2 л (8 стаканов)"}`);
  if (out.length <= 3) out.push("\nНа сегодня ничего не запланировано. Хорошего дня!");
  return out.join("\n");
}

/* ---------------- речь и смысл (Yandex) ---------------- */
async function speechToText(fileId: string): Promise<string> {
  const f = await tg("getFile", { file_id: fileId });
  const path = f?.result?.file_path; if (!path) throw new Error("не получилось скачать голосовое");
  const audio = await (await fetch(`https://api.telegram.org/file/bot${TG}/${path}`)).arrayBuffer();
  const r = await fetch(`https://stt.api.cloud.yandex.net/speech/v1/stt:recognize?lang=ru-RU&folderId=${YFOLDER}&format=oggopus`, {
    method: "POST", headers: { Authorization: `Api-Key ${YKEY}` }, body: audio,
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j?.error_message || "распознавание речи не сработало");
  return (j.result || "").trim();
}
async function understand(text: string, me: string, ds: string): Promise<any> {
  const pa = me === "luba" ? "zhenya" : "luba";
  const sys = `Ты помощник семейного планера. Говорит ${PN[me]} (${me === "luba" ? "жена" : "муж"}), второй супруг — ${PN[pa]}. Дочь — Саша, 7 лет. Ещё есть бабушка.
Сегодня ${ds} (${WDL[wd(ds)]}). Верни ТОЛЬКО JSON без пояснений:
{"action":"task|event|payment|shopping|done|today|unknown",
"title":"кратко, с заглавной буквы","date":"YYYY-MM-DD или null","time":"HH:MM или null","end_time":"HH:MM или null",
"assignee":"me|partner|we","who":"me|partner|we|sasha","cat":"work|care|sasha|serv|self",
"kind":"do|call|pay|meet|plan|","important":false,"drop":"luba|zhenya|we|babushka|self|null","pick":"luba|zhenya|we|babushka|self|null",
"amount":null,"urgent":false,"items":[]}
Правила: дело без точного времени — task; встреча, приём, занятие, мероприятие со временем или датой — event; «оплатить/заплатить N рублей» — payment;
«купить X, Y» или «в список покупок» — shopping (items — что купить); «сделала/выполнил/готово X» — done (title — что сделано); «что сегодня/план на день» — today.
«попроси ${PN[pa]}/пусть ${PN[pa]}/${PN[pa]} должен» — assignee=partner. «нам/вместе/кто-нибудь» — assignee=we. Иначе assignee=me.
cat: работа/клиенты — work; дом, быт, врачи, покупки, документы — care; всё о Саше — sasha; церковь/служение — serv; спорт, отдых, личное — self.
kind: позвонить — call; оплатить — pay; встретиться — meet; планёрка — plan; иначе do. «срочно/важно» — important=true (для платежа urgent=true).
Для событий Саши: кто отвозит — drop, кто забирает — pick (я = ${me}, ${PN[pa]} = ${pa}, вместе = we).
Даты: «завтра», «в пятницу», «25-го» переводи в YYYY-MM-DD относительно сегодняшней даты; без даты — null.`;
  const r = await fetch("https://llm.api.cloud.yandex.net/foundationModels/v1/completion", {
    method: "POST", headers: { Authorization: `Api-Key ${YKEY}`, "x-folder-id": YFOLDER, "content-type": "application/json" },
    body: JSON.stringify({ modelUri: `gpt://${YFOLDER}/yandexgpt/latest`, completionOptions: { stream: false, temperature: 0.1, maxTokens: 600 }, messages: [{ role: "system", text: sys }, { role: "user", text }] }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j?.error?.message || "YandexGPT не ответил");
  const raw = j?.result?.alternatives?.[0]?.message?.text || "";
  const m = raw.match(/\{[\s\S]*\}/); if (!m) return { action: "unknown" };
  try { return JSON.parse(m[0]); } catch { return { action: "unknown" }; }
}

/* ---------------- действия ---------------- */
function words(s: string) { return s.toLowerCase().replace(/[^а-яёa-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length > 2); }
async function act(a: any, me: { id: string; person: string }, ds: string) {
  const p = me.person, pa = p === "luba" ? "zhenya" : "luba";
  const map = (x: string | null | undefined) => (x === "me" ? p : x === "partner" ? pa : x || "");
  const ins = async (type: string, vis: string, data: any) => {
    const { data: row, error } = await sb.from("items").insert({ type, vis, created_by: me.id, data: { by: p, ...data } }).select("id").single();
    if (error) throw error; return row.id as string;
  };
  if (a.action === "task") {
    const assignee = map(a.assignee) || p;
    const status = assignee !== p && assignee !== "we" ? "asked" : "open";
    const id = await ins("task", "shared", { title: a.title, cat: a.cat || "care", kind: a.kind || "", assignee, due: a.date || "", important: !!a.important, status, note: "" });
    return { last: { id }, reply: `✅ Задача: <b>${esc(a.title)}</b>\n${assignee === pa ? `Отправила ${pa === "zhenya" ? "Жене" : "Любе"} как просьбу` : assignee === "we" ? "Свободная — кто возьмёт" : "Вам"} · ${CAT[a.cat] || "Забота"}${a.date ? ` · ${fmtDate(a.date)}` : ""}${a.important ? " · ⭐ важное" : ""}`, notifyTask: status === "asked" ? id : null };
  }
  if (a.action === "event") {
    const who = map(a.who) || p;
    const data: any = { title: a.title, cat: a.cat || (who === "sasha" ? "sasha" : "care"), who, date: a.date || ds, start: a.time || "", end: a.end_time || "", all_day: !a.time, end_date: "", note: "" };
    if (who === "sasha") Object.assign(data, { drop: a.drop || "", pick: a.pick || "", from: "", to: "" });
    const id = await ins("event", who === p ? "visible" : "shared", data);
    return { last: { id }, reply: `📅 Событие: <b>${esc(a.title)}</b>\n${fmtDate(data.date)}${a.time ? ` в ${a.time}` : ""}${who === "sasha" ? " · Саша" : who === "we" ? " · вместе" : ""}${data.drop ? ` · отвозит ${PN[data.drop]}` : ""}${data.pick ? ` · забирает ${PN[data.pick]}` : ""}` };
  }
  if (a.action === "payment") {
    const id = await ins("payment", "shared", { title: a.title, amount: a.amount || "", kind: "once", date: a.date || ds, cat: "other", payer: "any", remind: 1, urgent: !!(a.urgent || a.important), paid: {}, end_date: "", note: "" });
    return { last: { id }, reply: `💳 Платёж: <b>${esc(a.title)}</b>${a.amount ? ` — ${a.amount} ₽` : ""} · ${fmtDate(a.date || ds)}${a.urgent || a.important ? " · срочно" : ""}` };
  }
  if (a.action === "shopping") {
    const items = await loadAll();
    let list = items.find((i) => i.type === "list" && i.data.kind === "shop" && /покупки/i.test(i.data.title) && !/саш/i.test(i.data.title));
    const add = (a.items?.length ? a.items : [a.title]).filter(Boolean).map((t: string) => ({ id: crypto.randomUUID(), t: t[0].toUpperCase() + t.slice(1), by: p }));
    if (!list) { const id = await ins("list", "shared", { title: "Покупки", sub: "продукты и дом", kind: "shop", anyone: true, items: add }); return { last: { id }, reply: `🛒 Создала список «Покупки»: ${add.map((x: any) => esc(x.t)).join(", ")}` }; }
    await sb.from("items").update({ data: { ...list.data, items: [...(list.data.items || []), ...add] } }).eq("id", list.id);
    return { last: { list: list.id, ids: add.map((x: any) => x.id) }, reply: `🛒 В «Покупки»: ${add.map((x: any) => esc(x.t)).join(", ")}` };
  }
  if (a.action === "done") {
    const items = (await loadAll()).filter(visibleTo(me.id)).filter((t) => t.type === "task" && t.data.status !== "done");
    const q = words(a.title || "");
    const scored = items.map((t) => ({ t, s: words(t.data.title).filter((w) => q.some((x) => x.slice(0, 5) === w.slice(0, 5))).length })).filter((x) => x.s > 0).sort((x, y) => y.s - x.s);
    if (!scored.length) return { reply: `Не нашла задачу «${esc(a.title)}». Напишите точнее, как она называется.` };
    const t = scored[0].t;
    await sb.from("items").update({ data: { ...t.data, status: "done", done_on: ds, done_by: p } }).eq("id", t.id);
    return { last: { undone: t.id }, reply: `👍 Отметила сделанной: <b>${esc(t.data.title)}</b>` };
  }
  if (a.action === "today") return { reply: summary(await loadAll(), me, ds) };
  return { reply: "Не поняла, что сделать 🤔 Скажите, например: «Завтра в 15:00 стоматолог Саша, забирает бабушка», «Попроси Женю купить молоко», «Купить хлеб и яйца», «Оплатить пельмени 1200 рублей сегодня»." };
}
async function undo(me: { id: string; person: string }, last: any) {
  if (!last) return "Нечего отменять.";
  if (last.id) { await sb.from("items").delete().eq("id", last.id); return "↩️ Отменила."; }
  if (last.list) { const { data } = await sb.from("items").select("data").eq("id", last.list).single(); if (data) await sb.from("items").update({ data: { ...data.data, items: (data.data.items || []).filter((x: any) => !last.ids.includes(x.id)) } }).eq("id", last.list); return "↩️ Убрала из списка."; }
  if (last.undone) { const { data } = await sb.from("items").select("data").eq("id", last.undone).single(); if (data) await sb.from("items").update({ data: { ...data.data, status: "open", done_on: null, done_by: null } }).eq("id", last.undone); return "↩️ Вернула задачу в работу."; }
  return "Нечего отменять.";
}
async function notifyAsk(taskId: string) {
  const { data: t } = await sb.from("items").select("data").eq("id", taskId).single();
  if (!t || t.data.status !== "asked") return;
  const ps = await profiles(); const to = ps.find((x) => x.person === t.data.assignee);
  if (!to?.tg_chat_id) return;
  await send(to.tg_chat_id, `🙏 <b>${PN[t.data.by] || ""} просит:</b> ${esc(t.data.title)}${t.data.due ? `\nДо ${fmtDate(t.data.due)}` : ""}${t.data.note ? `\n${esc(t.data.note)}` : ""}\n\nОтветить можно в приложении: «Беру» или «Обсудить».`);
}

/* ---------------- вход ---------------- */
Deno.serve(async (req) => {
  const url = new URL(req.url);
  let upd: any = null;
  try {
    const key = await secret();
    // служебные вызовы: только со служебным ключом
    if (url.searchParams.has("cron") || url.searchParams.has("notify") || url.searchParams.has("setup")) {
      if (!key || url.searchParams.get("key") !== key) return new Response("forbidden", { status: 403 });
      if (url.searchParams.get("setup")) {
        const r = await tg("setWebhook", { url: FN_URL, secret_token: key, allowed_updates: ["message"] });
        return Response.json(r);
      }
      if (url.searchParams.get("notify")) { await notifyAsk(url.searchParams.get("notify")!); return new Response("ok"); }
      if (url.searchParams.get("cron") === "morning") {
        const items = await loadAll();
        for (const pr of await profiles()) if (pr.tg_chat_id && pr.person) await send(pr.tg_chat_id, summary(items, { id: pr.id, person: pr.person }));
        return new Response("ok");
      }
      return new Response("unknown", { status: 400 });
    }
    // вебхук Telegram
    if (req.headers.get("x-telegram-bot-api-secret-token") !== key) return new Response("forbidden", { status: 403 });
    upd = await req.json();
    const msg = upd.message; if (!msg) return new Response("ok");
    const chat = msg.chat.id as number;
    const ps = await profiles();
    const text0: string = msg.text || "";
    if (text0.startsWith("/start")) {
      const code = text0.split(/\s+/)[1];
      const { data: pr } = code ? await sb.from("profiles").select("id,person").eq("tg_code", code).maybeSingle() : { data: null };
      if (!pr) { await send(chat, "Привет! Я бот планера «Моё чудо». Чтобы подключиться, откройте приложение → «Ещё» → «Telegram» → «Подключить»."); return new Response("ok"); }
      await sb.from("profiles").update({ tg_chat_id: chat, tg_code: null }).eq("id", pr.id);
      await send(chat, `Готово, ${PN[pr.person]}! 🌟\nКаждое утро в 7:30 пришлю сводку дня, а просьбы ${pr.person === "luba" ? "Жени" : "Любы"} — сразу.\n\nМожно писать или говорить голосом:\n• «Завтра в 15:00 стоматолог Саша, забирает бабушка»\n• «Попроси Женю купить молоко»\n• «Купить хлеб, яйца, сыр»\n• «Оплатить пельмени 1200 рублей сегодня, срочно»\n• «Позвонила Алексе» — отмечу сделанным\n• «Что сегодня?» — пришлю план\n/undo — отменить последнее`);
      return new Response("ok");
    }
    const me = ps.find((x) => x.tg_chat_id === chat);
    if (!me) { await send(chat, "Я вас пока не знаю. Подключитесь из приложения: «Ещё» → «Telegram» → «Подключить»."); return new Response("ok"); }
    const ds = todayIso();
    if (/^\/undo/.test(text0)) { await send(chat, await undo(me, me.tg_last)); await sb.from("profiles").update({ tg_last: null }).eq("id", me.id); return new Response("ok"); }
    if (/^\/(today|сегодня)/i.test(text0)) { await send(chat, summary(await loadAll(), me, ds)); return new Response("ok"); }
    let text = text0;
    if (msg.voice) {
      if (!YKEY) { await send(chat, "Голос пока не подключён: нужен ключ Yandex Cloud."); return new Response("ok"); }
      if ((msg.voice.duration || 0) > 29) { await send(chat, "Голосовое длиннее 30 секунд я пока не разберу — скажите короче или разбейте на два."); return new Response("ok"); }
      text = await speechToText(msg.voice.file_id);
      if (!text) { await send(chat, "Не расслышала 🙈 Попробуйте ещё раз."); return new Response("ok"); }
    }
    if (!text.trim()) return new Response("ok");
    if (!YKEY) { await send(chat, "Понимать фразы я начну, когда подключат YandexGPT. Пока могу: /today — план на сегодня."); return new Response("ok"); }
    const a = await understand(text, me.person, ds);
    const res: any = await act(a, me, ds);
    if (res.last) await sb.from("profiles").update({ tg_last: res.last }).eq("id", me.id);
    await send(chat, `${msg.voice ? `🎙 <i>${esc(text)}</i>\n\n` : ""}${res.reply}${res.last ? "\n\n/undo — отменить" : ""}`);
    // уведомление партнёру о просьбе отправит триггер базы (так же, как для просьб из приложения)
    return new Response("ok");
  } catch (e) {
    console.error(e);
    try { const m = upd?.message; if (m?.chat?.id) await send(m.chat.id, "Что-то пошло не так 😔 Попробуйте ещё раз чуть позже."); } catch { /* */ }
    return new Response("ok");
  }
});
