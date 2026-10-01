const SUPABASE_URL = 
  "https://ckcoymukqncylnjpcrxq.supabase.co";

const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_7l21hE8p5B1vrB3T5nO5lg_k7F4E1-k';

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

console.log('Supabase conectado:', supabaseClient);

const CATS = [
  "Moradia",
  "Mercado",
  "Transporte",
  "Lazer",
  "Saúde",
  "Contas",
  "Outros"
];

const KINDS = {
  fixa: "📋 Conta fixa (vencimento)",
  recorrente: "🔄 Gasto recorrente (previsão do mês)",
  avulso: "⚡ Gasto avulso",
  entrada: "💵 Entrada (quando recebe)"
};

const ICON = {
  fixa: "📋",
  recorrente: "🔄",
  avulso: "⚡",
  entrada: "💵"
};

const KN = {
  fixa: "Conta fixa",
  recorrente: "Gasto recorrente",
  avulso: "Gasto avulso",
  entrada: "Entrada"
};

const CLS = {
  normal: "Normal",
  casal: "❤️ Orçamento do casal",
  protegido: "🔒 Não mexer"
};

const PAYS = [
  "Pix",
  "Débito",
  "Crédito",
  "Dinheiro",
  "Boleto"
];

const MN = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez"
];

const $ = s => document.querySelector(s);

const R = v => {
  const n = Number(v) || 0;
  return (n < 0 ? "-" : "") +
    "R$ " +
    Math.abs(n).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
};

const esc = s =>
  String(s ?? "").replace(/[&<>"]/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;"
  }[c]));

const num = (q, d) => {
  const raw = (prompt(q, d ?? "") || "").replace(/[R$\s]/g, "");

  const v = parseFloat(
    raw.includes(",")
      ? raw.replace(/\./g, "").replace(",", ".")
      : raw
  );

  return isNaN(v) ? null : v;
};

const uuid = () => crypto.randomUUID ? crypto.randomUUID() :
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === "x" ? r : (r & 3 | 8)).toString(16); });

const today = () => {
  const d = new Date();

  return d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0");
};

const currentMonth = () => today().slice(0, 7);

const label = m =>
  MN[Number(m.slice(5)) - 1] + "/" + m.slice(2, 4);

const dm = d =>
  d ? d.slice(8) + "/" + d.slice(5, 7) : "";

const shift = (m, d) => {
  const [y, mo] = m.split("-").map(Number);
  const t = new Date(y, mo - 1 + d, 1);

  return (
    t.getFullYear() +
    "-" +
    String(t.getMonth() + 1).padStart(2, "0")
  );
};

const addMonths = (d, n) => {
  const [y, m, dd] = d.split("-").map(Number);
  const target = new Date(y, m - 1 + n, 1);
  const last = new Date(
    target.getFullYear(),
    target.getMonth() + 1,
    0
  ).getDate();

  return (
    target.getFullYear() +
    "-" +
    String(target.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(Math.min(dd, last)).padStart(2, "0")
  );
};

const monthEnd = m => {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(y, mo, 0).getDate();

  return (
    m +
    "-" +
    String(d).padStart(2, "0")
  );
};


/* =========================================================
   ARMAZENAMENTO
   ========================================================= */

const norm = t => {
  const oldKind =
    t.kind ||
    (t.type === "in" ? "entrada" : "avulso");

  const kind =
    {
      gasto: "avulso",
      conta: "fixa"
    }[oldKind] || oldKind;

  return {
    id: t.id || (
      Date.now().toString(36) +
      Math.random().toString(36).slice(2)
    ),

    type: t.type === "in" ? "in" : "out",
    kind: KINDS[kind] ? kind : "avulso",

    desc: t.desc || "",
    value: Number(t.value) || 0,

    cat: t.cat || "Outros",
    by: t.by || "",
    pay: t.pay || "",

    cls:
      t.cls === "protegido" ||
      t.cls === "normal" ||
      t.cls === "casal"
        ? t.cls
        : kind === "avulso"
          ? "casal"
          : "normal",

    date: t.date || today(),

    done: t.done !== false,

    fixed: !!t.fixed,

    who: t.who || "",
    membroId: t.membroId || null,

    recurrenceId: t.recurrenceId || null,
    recurrenceIndex: Number(t.recurrenceIndex) || 0,

    doneAt: t.done !== false ? (t.doneAt || null) : null,
    planned: t.planned == null ? null : Number(t.planned)
  };
};

let tx = [];
let legacy = {tx: [], cfg: null}; // dados antigos, salvos só neste aparelho
try {
  legacy.tx = JSON.parse(localStorage.getItem("fin_tx") || "[]").map(norm);
  legacy.cfg = JSON.parse(localStorage.getItem("fin_cfg") || "null");
} catch {}

let cfg = {
  names: ["", ""],
  me: "",
  adj: 0,
  rules: {}
};



if (!Array.isArray(cfg.names)) {
  cfg.names = ["", ""];
}

if (!cfg.names[0]) cfg.names[0] = "";
if (!cfg.names[1]) cfg.names[1] = "";

if (!cfg.rules || typeof cfg.rules !== "object") {
  cfg.rules = {};
}


/* ---------- Interface salva ---------- */

let ui = {};

try {
  ui = JSON.parse(
    localStorage.getItem("fin_ui") || "{}"
  );
} catch {
  ui = {};
}

let cur =
  /^\d{4}-\d{2}$/.test(ui.cur || "")
    ? ui.cur
    : currentMonth();

let editId = null;
let showForm = false;
let cardForm = false;
let tab = ["cartoes", "resumo", "ajustes"].includes(ui.tab) ? ui.tab : "mes";


/* ---------- Desfazer ---------- */

let undo = [];

try {
  undo = JSON.parse(
    sessionStorage.getItem("fin_undo") || "[]"
  );

  if (!Array.isArray(undo)) {
    undo = [];
  }
} catch {
  undo = [];
}

const saveUndo = () => {
  sessionStorage.setItem(
    "fin_undo",
    JSON.stringify(undo.slice(-20))
  );
};


/* ---------- Salvamento ---------- */

const saveUi = () => {
  ui = {
    cur,
    tab,
    y: window.scrollY
  };

  localStorage.setItem(
    "fin_ui",
    JSON.stringify(ui)
  );
};

const save = () => saveUi(); // neste aparelho só ficam mês e posição da tela

const registroDe = t => ({
  tipo: t.type === "in" ? "entrada" : "saida",
  categoria: t.cat || "Outros",
  descricao: t.desc || "",
  valor: Number(t.value) || 0,
  data: t.date,
  pago: !!t.done,
  pago_em: t.doneAt || null,
  valor_previsto: t.planned == null ? null : Number(t.planned),
  quem: t.by || "",
  forma_pagamento: t.pay || "",
  classificacao: t.cls === "casal" || t.cls === "protegido" ? t.cls : "normal",
  tipo_lancamento: KINDS[t.kind] ? t.kind : "avulso",
  recorrente: !!t.recurrenceId,
  recorrencia_id: t.recurrenceId || null,
  recorrencia_indice: t.recurrenceId ? (Number(t.recurrenceIndex) || 0) : null
});

async function inserirLancamentos(list, manterId = false) {
  if (!window.controleId || !window.membroId) throw new Error("Controle ou membro não identificado.");
  const rows = list.map(t => ({
    controle_id: window.controleId,
    membro_id: t.membroId || window.membroId,
    ...registroDe(t),
    ...(manterId && t.id ? {id: t.id} : {})
  }));
  const {data, error} = await supabaseClient.from("lancamentos").insert(rows).select();
  if (error) { console.error("Erro ao salvar:", error); throw error; }
  return data;
}

const salvarLancamentoSupabase = async (t, manterId) => (await inserirLancamentos([t], manterId))[0];

/* Configurações compartilhadas (orçamento, "Não mexer", saldo ajustado) ficam em controles.config.
   Lê o valor mais recente, altera e grava, para um não apagar a mudança do outro. */
async function atualizarConfig(mut) {
  const {data, error} = await supabaseClient.from("controles").select("config").eq("id", window.controleId).single();
  if (error) throw error;
  const c = {rules: {}, adj: 0, ...(data.config || {})};
  mut(c);
  const r = await supabaseClient.from("controles").update({config: c}).eq("id", window.controleId).select("id");
  if (r.error) throw r.error;
  if (!r.data || !r.data.length) throw new Error("Banco bloqueou a gravação da configuração.");
  cfg.rules = c.rules; cfg.adj = Number(c.adj) || 0; cfg.adjMonth = c.adjMonth;
  cfg.carry = c.carry || {};
  cfg.cartoes = c.cartoes || {cards: [], compras: {}};
}

async function atualizarLancamentoSupabase(t) {
  if (!t.id) throw new Error("Lançamento sem ID.");
  const {data, error} = await supabaseClient.from("lancamentos").update(registroDe(t))
    .eq("id", t.id).eq("controle_id", window.controleId).select("id");
  if (error) { console.error(error); throw error; }
  if (!data || !data.length) throw new Error("Nenhum registro foi atualizado (permissão do banco?).");
}

async function excluirLancamentoSupabase(id) {
  if (!id) {
    throw new Error("Lançamento sem ID.");
  }

  const { data, error } =
    await supabaseClient
      .from("lancamentos")
      .delete()
      .eq("id", id)
      .eq("controle_id", window.controleId)
      .select("id");

  if (error) {
    console.error("Erro ao excluir lançamento:", error);
    throw error;
  }

  /*
   * Sem erro mas sem linha apagada = o banco
   * bloqueou (permissão/RLS) ou o registro não existe.
   */
  if (!data || !data.length) {
    throw new Error("Nenhum registro foi apagado no Supabase.");
  }
}

async function atualizarStatusSupabase(t) {
  if (!t.id) throw new Error("Lançamento sem ID.");
  const {data, error} = await supabaseClient.from("lancamentos").update({
    pago: !!t.done, pago_em: t.doneAt || null,
    valor: Number(t.value) || 0,
    valor_previsto: t.planned == null ? null : Number(t.planned)
  }).eq("id", t.id).eq("controle_id", window.controleId).select("id");
  if (error) { console.error(error); throw error; }
  if (!data || !data.length) throw new Error("Nenhum registro foi atualizado (permissão do banco?).");
}

async function carregarLancamentosSupabase() {
  if (!window.controleId) { tx = []; return false; }
  const [lan, mem, ctl] = await Promise.all([
    supabaseClient.from("lancamentos").select("*").eq("controle_id", window.controleId).order("data", {ascending: true}),
    supabaseClient.from("membros").select("id,nome").eq("controle_id", window.controleId).order("id"),
    supabaseClient.from("controles").select("config").eq("id", window.controleId).maybeSingle()
  ]);
  if (lan.error) { console.error(lan.error); toast("⚠️ Não foi possível carregar do banco"); return false; }
  if (ctl.error) console.error("Falta rodar o SQL de configuração?", ctl.error);

  /* Nomes e "quem sou eu" vêm dos membros do controle (mesmos nos dois celulares). */
  const nomes = {};
  (mem.data || []).forEach(m => nomes[m.id] = m.nome);
  const lista = (mem.data || []).map(m => m.nome);
  cfg.names = [lista[0] || "Pessoa 1", lista[1] || "Pessoa 2"];
  cfg.me = nomes[window.membroId] || cfg.names[0];

  const c = ctl.data?.config || {};
  cfg.rules = c.rules || {};
  cfg.adj = Number(c.adj) || 0;
  cfg.adjMonth = c.adjMonth;
  cfg.carry = c.carry || {};
  cfg.cartoes = c.cartoes || {cards: [], compras: {}};

  tx = (lan.data || []).map(t => norm({
    id: t.id,
    type: t.tipo === "entrada" ? "in" : "out",
    kind: t.tipo_lancamento,
    desc: t.descricao,
    value: t.valor,
    cat: t.categoria,
    by: t.quem,
    pay: t.forma_pagamento,
    cls: t.classificacao,
    date: t.data,
    done: !!t.pago,
    doneAt: t.pago ? t.pago_em : null,
    planned: t.valor_previsto,
    fixed: !!t.recorrente,
    who: nomes[t.membro_id] || "",
    membroId: t.membro_id,
    recurrenceId: t.recorrencia_id,
    recurrenceIndex: t.recorrencia_indice
  }));
  return true;
}

/* Os dois celulares se atualizam: tempo real + ao voltar para o app + a cada 30 s. */
let canal = null, recarregando = false;
async function recarregar() {
  if (recarregando || !window.controleId || editId || showForm || cardForm) return;
  recarregando = true;
  try { if (await carregarLancamentosSupabase()) render(); } finally { recarregando = false; }
}
function assinarTempoReal() {
  if (canal) supabaseClient.removeChannel(canal);
  const f = "controle_id=eq." + window.controleId;
  canal = supabaseClient.channel("controle-" + window.controleId)
    .on("postgres_changes", {event: "*", schema: "public", table: "lancamentos", filter: f}, recarregar)
    .on("postgres_changes", {event: "*", schema: "public", table: "membros", filter: f}, recarregar)
    .on("postgres_changes", {event: "*", schema: "public", table: "controles", filter: "id=eq." + window.controleId}, recarregar)
    .subscribe();
}
document.addEventListener("visibilitychange", () => { if (!document.hidden) recarregar(); });
setInterval(recarregar, 30000);

/* =========================================================
   NOMES
   ========================================================= */

function ensureNames() {
  if (!Array.isArray(cfg.names)) {
    cfg.names = ["Pessoa 1", "Pessoa 2"];
  }

  if (!cfg.names[0]) cfg.names[0] = "Pessoa 1";
  if (!cfg.names[1]) cfg.names[1] = "Pessoa 2";

  if (!cfg.me) {
    cfg.me = cfg.names[0];
  }
}

/* =========================================================
   CÁLCULOS
   ========================================================= */

const sg = t =>
  t.type === "in"
    ? Number(t.value)
    : -Number(t.value);

const inM = m =>
  tx.filter(t =>
    String(t.date).slice(0, 7) === m
  );

const sum = arr =>
  arr.reduce(
    (s, t) => s + Number(t.value || 0),
    0
  );

const outs = arr =>
  arr.filter(t => t.type === "out");

const ins = arr =>
  arr.filter(t => t.type === "in");


/*
 * Saldo real de hoje.
 *
 * Só considera:
 * - entradas já recebidas;
 * - gastos já pagos.
 *
 * Lançamentos futuros, mesmo que existam,
 * não entram no saldo atual.
 */
/* Dia em que o dinheiro realmente saiu/entrou.
   Pago hoje = hoje, mesmo que o vencimento seja em outra data. */
const effDate = t => t.doneAt || t.date;

const balNow = () => {
  const td = today();

  return (
    Number(cfg.adj || 0) +
    tx
      .filter(t =>
        t.done &&
        effDate(t) <= td
      )
      .reduce(
        (s, t) => s + sg(t),
        0
      )
  );
};


/*
 * Orçamento do casal.
 *
 * Mantém a regra definida para o mês.
 * Se não houver regra naquele mês,
 * usa a última regra existente.
 *
 * Padrão:
 * R$ 400
 * R$ 200 para cada um.
 */
const cents = x => Math.round(x * 100) / 100;

/* Divide um valor meio a meio sem perder centavo. */
const split = v => {
  const a = Math.round(v * 50) / 100;

  return [a, cents(v - a)];
};

const rule = m => {
  const keys = Object.keys(cfg.rules)
    .filter(x => x <= m)
    .sort();

  const k = keys.pop();

  /* s = [pessoa 1, pessoa 2, Juntos]. Juntos é o orçamento total;
     cada pessoa fica com metade dele. */
  if (k) {
    const b = Number(cfg.rules[k].b) || 0;

    return { b, s: [...split(b), b] };
  }

  return {
    b: 400,
    s: [200, 200, 400]
  };
};


/*
 * Agrupamento para gráficos.
 */
function group(arr, key) {
  const obj = {};

  arr.forEach(t => {
    const k = key(t) || "Outros";

    obj[k] =
      (obj[k] || 0) +
      Number(t.value || 0);
  });

  return Object.entries(obj)
    .sort((a, b) => b[1] - a[1]);
}


function bars(list) {
  if (!list.length) {
    return '<p class="note">Sem dados ainda.</p>';
  }

  const mx = Math.max(
    1,
    ...list.map(x => x[1])
  );

  return list.map(([name, value]) => `
    <div class="bar">
      <span class="n">${esc(name)}</span>
      <span class="t">
        <i style="width:${Math.min(100, value / mx * 100)}%"></i>
      </span>
      <span class="s">${R(value)}</span>
    </div>
  `).join("");
}


/*
 * Apenas gastos que realmente pertencem
 * ao orçamento do casal.
 */
const coupleExpenses = arr =>
  outs(arr).filter(
    t => t.cls === "casal"
  );


/*
 * Quanto já foi comprometido do orçamento.
 *
 * Aqui entram gastos do casal mesmo que
 * ainda estejam pendentes, porque a ideia
 * é reservar esse dinheiro.
 */
const coupleSpent = arr =>
  sum(coupleExpenses(arr));


/*
 * Fluxo futuro.
 *
 * Começa no saldo real de hoje.
 *
 * Depois adiciona apenas lançamentos
 * que ainda não aconteceram e que estejam
 * entre amanhã e o final do mês selecionado.
 */


const monthOf = t => String(t.date).slice(0, 7);

/*
 * Contas NÃO pagas do mês anterior a m.
 * Se o mês anterior também estiver com "Trazer pendentes"
 * ligado, as pendentes dele (vindas de antes) seguem junto.
 */
function pendFrom(m) {
  const p = shift(m, -1);
  let list = tx.filter(t => monthOf(t) === p && !t.done);

  if (cfg.carry && cfg.carry[p]) {
    list = list.concat(pendFrom(p));
  }

  return list;
}

/* Pendentes que o usuário escolheu trazer para o mês m. */
const carried = m =>
  cfg.carry && cfg.carry[m]
    ? pendFrom(m)
    : [];

/*
 * Cada mês só enxerga o que pertence a ele.
 * Pendências de meses anteriores só entram
 * se "Trazer pendentes?" estiver ligado naquele mês.
 */
function flow(m) {
  const td = today();

  let bal = balNow();

  const rows = tx
    .filter(t =>
      monthOf(t) === m &&
      (!t.done || effDate(t) > td)
    )
    .concat(carried(m))
    .sort((a, b) =>
      a.date.localeCompare(b.date)
    )
    .map(t => {
      bal += sg(t);

      return {
        t,
        bal
      };
    });

  return {
    rows,
    final: bal
  };
}


/*
 * Dados resumidos do mês.
 */
function month(m) {
  const a = inM(m);
  const N = cfg.names;
  const r = rule(m);

  const av = coupleExpenses(a);

  const sp = [0, 0, 0];

  av.forEach(t => {
    if (t.by === N[0]) {
      sp[0] += Number(t.value);
    } else if (t.by === N[1]) {
      sp[1] += Number(t.value);
    } else {
      sp[2] += Number(t.value);
    }
  });

  const spent =
    sp[0] +
    sp[1] +
    sp[2];

  /* Gasto "Juntos" sai 50% de cada um. */
  const j0 = Math.round(sp[2] * 50) / 100;
  const j1 = cents(sp[2] - j0);

  const pg = [
    cents(sp[0] + j0),
    cents(sp[1] + j1),
    cents(spent)
  ];

  const F = flow(m);

  /*
   * Quanto sobra depois das contas
   * e compromissos futuros.
   */
  const sobra = F.final;

  const [y, mo] =
    m.split("-").map(Number);

  const daysInMonth =
    new Date(y, mo, 0).getDate();

  const now = new Date();

  let left;

  if (m === currentMonth()) {
    left =
      daysInMonth -
      now.getDate() +
      1;
  } else if (m > currentMonth()) {
    left = daysInMonth;
  } else {
    left = 0;
  }

  const rest =
    r.b - spent;

  const perDay =
    left > 0
      ? Math.max(0, rest) / left
      : 0;

  /*
   * Dinheiro que fica protegido ("Não mexer").
   *
   * A "sobra" já desconta os gastos do casal (pagos ou
   * pendentes). Esses gastos saem de dentro do orçamento,
   * então só o que ainda falta gastar (rest) fica reservado.
   * Assim, gastar do orçamento não diminui o "Não mexer".
   * Se passar do orçamento, o excesso sai do dinheiro real
   * (rest negativo não devolve nada).
   */
  const prot =
    sobra - Math.max(0, rest);

  return {
    a,
    r,
    sobra,
    spent,
    sp,
    pg,
    rest,
    left,
    prot,
    perDay
  };
}


/* =========================================================
   CARTÕES — COMPRAS PARCELADAS

   Cada parcela é um lançamento normal (tabela "lancamentos"),
   todas com o mesmo recorrencia_id e recorrencia_indice 0, 1, 2...
   Os dados da compra (nº de parcelas, cartão) ficam em
   controles.config.cartoes, então não precisa mexer no banco.
   Excluir uma parcela apaga só aquele lançamento: as outras
   continuam, com a numeração original (ex.: 3/10, 5/10).
   ========================================================= */

const comprasCfg = () => (cfg.cartoes && cfg.cartoes.compras) || {};

const compraDe = t =>
  (t.recurrenceId && comprasCfg()[t.recurrenceId]) || null;

const numParcela = t => (Number(t.recurrenceIndex) || 0) + 1;

const parcTag = t => {
  const c = compraDe(t);

  return c
    ? `<span class="tag">${numParcela(t)}/${c.n}</span>`
    : "";
};

const parcelasDaCompra = rid =>
  tx
    .filter(t => t.recurrenceId === rid)
    .sort((a, b) => a.recurrenceIndex - b.recurrenceIndex);

const parcelasDoMes = m =>
  tx.filter(t => monthOf(t) === m && compraDe(t));

/* Divide em centavos; os centavos que sobram vão para as primeiras parcelas. */
const dividirParcelas = (v, n, modo) => {
  const total =
    modo === "parcela"
      ? Math.round(v * 100) * n
      : Math.round(v * 100);

  const base = Math.floor(total / n);
  const resto = total - base * n;

  return Array.from(
    { length: n },
    (_, k) => (base + (k < resto ? 1 : 0)) / 100
  );
};


/* ---------- Abas (barra fixa embaixo) ---------- */

/* ---------- Temas (salvos só neste aparelho) ---------- */

const THEMES = [
  ["auto", "Padrão", "linear-gradient(135deg,#0f766e,#1b1f24)"],
  ["claro", "Claro", "linear-gradient(135deg,#fff,#d1d5db)"],
  ["escuro", "Escuro", "linear-gradient(135deg,#1a1f26,#2dd4bf)"],
  ["cinna", "Cinnamoroll ☁️", "linear-gradient(135deg,#cfeaff,#4fb3ec 60%,#ffd1e1)"],
  ["sakura", "Sakura 🌸", "linear-gradient(135deg,#ffe3ec,#e0719a)"]
];

const themeNow = () => {
  try { return localStorage.getItem("fin_theme") || "auto"; } catch { return "auto"; }
};

const applyTheme = t => { document.documentElement.dataset.theme = t; };

function setTheme(t) {
  try { localStorage.setItem("fin_theme", t); } catch {}

  applyTheme(t);
  render();
}

applyTheme(themeNow());

const TABS = [
  ["mes", "📅", "Mês"],
  ["cartoes", "💳", "Cartões"],
  ["resumo", "📊", "Resumo"],
  ["ajustes", "⚙️", "Ajustes"]
];

const tabsHtml = () => `
  <nav class="nav">
    ${TABS.map(([k, i, l]) => `
      <button data-go="${k}" class="${tab === k ? "on" : ""}">
        <span>${i}</span>${l}
      </button>
    `).join("")}
  </nav>
`;

function setTab(t) {
  if (tab === t) return;

  tab = t;
  editId = null;
  showForm = false;
  cardForm = false;

  saveUi();
  render();
  window.scrollTo(0, 0);
}

function bindTabs() {
  document.querySelectorAll(".nav button").forEach(b => {
    b.onclick = () => setTab(b.dataset.go);
  });
}


/* ---------- Ações ---------- */

const cardPayBtn = t => t.done
  ? `<button data-crv="${esc(t.id)}" title="Voltar para pendente">↩️</button>`
  : `<button data-cok="${esc(t.id)}" title="Marcar como pago">✓</button>`;

async function pagarParcela(id) {
  const t = tx.find(x => x.id === id);

  if (!t) return;

  t.done = true;
  t.doneAt = today();

  try {
    await atualizarStatusSupabase(t);
  } catch (erro) {
    console.error("Erro ao sincronizar pagamento:", erro);

    await carregarLancamentosSupabase();
    render();

    alert("Não foi possível sincronizar o status.\n\n" + (erro?.message || ""));
    return;
  }

  save();
  render();

  toast(
    "✓ Pago — saldo agora " + R(balNow()),
    "Desfazer",
    () => reverter(t.id)
  );
}

/* Exclui SÓ a parcela daquele mês. As outras continuam. */
async function excluirParcela(id) {
  const t = tx.find(x => x.id === id);

  if (!t) return;

  const c = compraDe(t);
  const nome =
    (t.desc || "Compra") + " " + numParcela(t) + "/" + (c ? c.n : "?");

  const ok = confirm(
    `Excluir só a parcela ${numParcela(t)}/${c ? c.n : "?"} de "${t.desc}" ` +
    `(${label(monthOf(t))}) no valor de ${R(t.value)}?\n\n` +
    "As outras parcelas continuam."
  );

  if (!ok) return;

  try {
    await excluirLancamentoSupabase(t.id);
  } catch (erro) {
    console.error(erro);

    alert("Não foi possível excluir no Supabase. A parcela foi mantida.");
    return;
  }

  const index = tx.findIndex(x => x.id === t.id);

  if (index >= 0) tx.splice(index, 1);

  undo.push({ t, i: Math.max(0, index) });
  undo = undo.slice(-20);

  saveUndo();
  save();
  render();

  toast(
    "🗑️ " + nome + " (" + label(monthOf(t)) + ") apagada",
    "Desfazer",
    doUndo
  );
}

/* Exclui todas as parcelas AINDA NÃO PAGAS da compra. As já pagas ficam no histórico. */
async function excluirParcelamento(rid) {
  const c = comprasCfg()[rid];
  const todas = parcelasDaCompra(rid);
  const pend = todas.filter(t => !t.done);
  const pagas = todas.length - pend.length;

  if (!c || !pend.length) {
    toast("Nenhuma parcela pendente para excluir.");
    return;
  }

  const ok = confirm(
    `Excluir as ${pend.length} parcelas pendentes de "${c.desc}" ` +
    `(${R(sum(pend))})?\n\n` +
    (pagas
      ? `As ${pagas} já pagas continuam no histórico.`
      : "Nenhuma parcela foi paga ainda.")
  );

  if (!ok) return;

  try {
    const { data, error } = await supabaseClient
      .from("lancamentos")
      .delete()
      .eq("controle_id", window.controleId)
      .eq("recorrencia_id", rid)
      .eq("pago", false)
      .select("id");

    if (error) throw error;

    if (!data || !data.length) {
      throw new Error("Nenhum registro foi apagado no Supabase.");
    }

    if (!pagas) {
      await atualizarConfig(n => {
        if (n.cartoes && n.cartoes.compras) delete n.cartoes.compras[rid];
      });
    }
  } catch (erro) {
    console.error(erro);

    await carregarLancamentosSupabase();
    render();

    alert("Não foi possível excluir no Supabase.\n\n" + (erro?.message || ""));
    return;
  }

  await carregarLancamentosSupabase();
  save();
  render();

  toast("🗑️ Parcelas pendentes de " + c.desc + " apagadas");
}


/* ---------- Tela ---------- */

function renderCartoes() {
  $("#app").dataset.tab = "cartoes";
  const td = today();
  const cm = currentMonth();
  const N = cfg.names;

  const lista = parcelasDoMes(cur).sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      a.recurrenceIndex - b.recurrenceIndex
  );

  const totMes = cents(sum(lista));
  const pagoMes = cents(sum(lista.filter(t => t.done)));
  const pendMes = cents(totMes - pagoMes);

  const porCartao = group(
    lista,
    t => compraDe(t).cartao || "Sem cartão"
  );

  const rids = Object.keys(comprasCfg())
    .filter(rid => parcelasDaCompra(rid).length)
    .sort((a, b) => {
      const pa = parcelasDaCompra(a).find(t => !t.done);
      const pb = parcelasDaCompra(b).find(t => !t.done);

      return (pa ? pa.date : "9999").localeCompare(pb ? pb.date : "9999");
    });

  const opt = (list, selected) =>
    list.map(o => `
      <option value="${esc(o)}" ${o === selected ? "selected" : ""}>
        ${esc(o)}
      </option>
    `).join("");

  const f = (title, html) => `
    <label class="f">
      <span class="k">${title}</span>
      ${html}
    </label>
  `;


  /* ---------- Formulário ---------- */

  const cards = (cfg.cartoes && cfg.cartoes.cards) || [];

  const form = cardForm ? `
    <div class="card" id="fm">
      <h2>Nova compra parcelada</h2>

      <div class="row fm">

        ${f("Descrição", `
          <input id="c_de" placeholder="Ex.: notebook, geladeira...">
        `)}

        ${f("Valor", `
          <input id="c_va" type="number" step="0.01" min="0"
                 inputmode="decimal" placeholder="R$ 0,00">
        `)}

        ${f("O valor informado é", `
          <select id="c_md">
            <option value="total">Total da compra</option>
            <option value="parcela">Valor de cada parcela</option>
          </select>
        `)}

        ${f("Nº de parcelas", `
          <input id="c_n" type="number" min="1" max="60" step="1"
                 inputmode="numeric" value="2">
        `)}

        ${f("Cartão (opcional)", `
          <input id="c_cc" list="c_cards" placeholder="Ex.: Nubank">
          <datalist id="c_cards">
            ${cards.map(x => `<option value="${esc(x)}">`).join("")}
          </datalist>
        `)}

        ${f("Vencimento da 1ª parcela", `
          <input id="c_da" type="date" value="${addMonths(td, 1)}">
        `)}

        ${f("Categoria", `
          <select id="c_ca">${opt(CATS, "Outros")}</select>
        `)}

        ${f("Quem", `
          <select id="c_by">${opt([...N, "Juntos"], cfg.me)}</select>
        `)}

        ${f("Classificação do dinheiro", `
          <select id="c_cl">
            ${Object.entries(CLS).map(([k, v]) => `
              <option value="${k}" ${k === "casal" ? "selected" : ""}>${v}</option>
            `).join("")}
          </select>
        `)}

        <div class="row">
          <button id="c_ad">Adicionar</button>
          <button class="g" id="c_cn">Cancelar</button>
        </div>
      </div>

      <p class="note" id="c_pv"></p>

      <p class="note">
        As parcelas são criadas automaticamente, uma por mês, a partir
        do vencimento da 1ª. Dá para excluir uma parcela isolada depois.
      </p>
    </div>
  ` : `
    <button class="fab" id="nw">+ Compra parcelada</button>
  `;


  /* ---------- Compras (em qual parcela estou) ---------- */

  const comprasHtml = rids.map(rid => {
    const c = comprasCfg()[rid];
    const ps = parcelasDaCompra(rid);
    const pagas = ps.filter(t => t.done).length;
    const falta = ps.filter(t => !t.done);
    const noMes = ps.find(t => monthOf(t) === cm);
    const prox = falta[0];

    const st = [];

    if (!prox) {
      st.push("✅ Quitado");
    } else {
      if (noMes) {
        st.push(
          `Você está na parcela <b>${numParcela(noMes)}/${c.n}</b> (${label(cm)})` +
          (noMes.done ? " · paga" : "")
        );
      } else if (monthOf(prox) > cm) {
        st.push(
          `Começa/continua na parcela <b>${numParcela(prox)}/${c.n}</b> em ${label(monthOf(prox))}`
        );
      }

      if (monthOf(prox) < cm) {
        st.push(
          `⚠️ parcela ${numParcela(prox)}/${c.n} de ${label(monthOf(prox))} ainda não paga`
        );
      }
    }

    const pct = ps.length ? pagas / ps.length * 100 : 0;

    return `
      <div class="li">
        <div>
          💳 ${esc(c.desc)}
          ${c.cartao ? `<span class="tag">${esc(c.cartao)}</span>` : ""}
          <br>
          <small>${st.join(" · ")}</small>

          <div class="bar">
            <span class="t"><i style="width:${pct}%"></i></span>
            <span class="s">${pagas}/${ps.length} pagas</span>
          </div>

          <small>
            ${falta.length
              ? "faltam " + R(sum(falta)) + " em " + falta.length + (falta.length > 1 ? " parcelas" : " parcela")
              : "sem parcelas pendentes"}
            · ${c.n}x · ${label(monthOf(ps[0]))} a ${label(monthOf(ps[ps.length - 1]))}
          </small>
        </div>

        <div class="row">
          <button data-cdall="${esc(rid)}" title="Excluir parcelas pendentes">🗑️</button>
        </div>
      </div>
    `;
  }).join("");


  /* ---------- HTML ---------- */

  $("#app").innerHTML = `

    <div class="row top">
      <h1>💰 Nosso Controle</h1>

      <div class="row">
        <button class="g" id="pv">‹</button>
        <b>${label(cur)}</b>
        <button class="g" id="nx">›</button>
      </div>
    </div>

    ${tabsHtml()}

    <div class="card">
      <h2>💳 Cartões em ${label(cur)}</h2>

      <div class="k">Total de parcelas do mês</div>
      <div class="v big">${R(totMes)}</div>

      <div class="g3" style="margin-top:10px;grid-template-columns:repeat(2,1fr)">
        <div>
          <div class="k">Já pago</div>
          <div class="v in">${R(pagoMes)}</div>
        </div>

        <div>
          <div class="k">A pagar</div>
          <div class="v out">${R(pendMes)}</div>
        </div>
      </div>

      ${lista.length ? `
        <div class="k" style="margin-top:12px">Por cartão</div>
        ${bars(porCartao)}
      ` : ""}
    </div>

    ${form}

    <div class="card">
      <h2>Parcelas de ${label(cur)}</h2>

      ${lista.length ? lista.map(t => {
        const c = compraDe(t);

        return `
          <div class="li ${t.done ? "" : "pend"}">
            <div>
              💳 ${esc(t.desc || "Compra")}
              ${parcTag(t)}
              ${c.cartao ? `<span class="tag">${esc(c.cartao)}</span>` : ""}
              ${t.done
                ? '<span class="tag">✓ pago</span>'
                : `<span class="tag ${t.date < td ? "late" : ""}">pendente</span>`}
              <br>
              <small>
                vence ${dm(t.date)}
                · ${esc(t.cat || "Outros")}
                · ${esc(t.by || "—")}
              </small>
            </div>

            <div class="row">
              <b class="out">-${R(t.value)}</b>
              ${cardPayBtn(t)}<button data-cdp="${esc(t.id)}" title="Excluir só esta parcela">🗑️</button>
            </div>
          </div>
        `;
      }).join("") : `
        <p class="note">Nenhuma parcela de cartão em ${label(cur)}.</p>
      `}

      <p class="note">
        🗑️ apaga somente a parcela deste mês; o restante do parcelamento continua.
      </p>
    </div>

    <div class="card">
      <h2>Compras parceladas</h2>

      ${comprasHtml || `
        <p class="note">Nenhuma compra parcelada cadastrada ainda.</p>
      `}

      ${comprasHtml ? `
        <p class="note">
          🗑️ aqui apaga todas as parcelas ainda não pagas da compra.
          As já pagas ficam no histórico.
        </p>
      ` : ""}
    </div>

  `;


  /* ---------- Eventos ---------- */

  $("#pv").onclick = () => {
    cur = shift(cur, -1);
    saveUi();
    render();
  };

  $("#nx").onclick = () => {
    cur = shift(cur, 1);
    saveUi();
    render();
  };

  bindTabs();

  if ($("#nw")) {
    $("#nw").onclick = () => {
      cardForm = true;
      render();

      setTimeout(() => {
        $("#fm")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    };
  }

  if ($("#c_cn")) {
    $("#c_cn").onclick = () => {
      cardForm = false;
      render();
    };
  }

  if ($("#c_ad")) {
    /* Prévia: "10x de R$ 100,00 · Nov/26 a Ago/27" */
    const prever = () => {
      const v = parseFloat($("#c_va").value);
      const n = parseInt($("#c_n").value, 10);
      const d = $("#c_da").value;
      const el = $("#c_pv");

      if (!(v > 0) || !(n >= 1) || !d) {
        el.textContent = "";
        return;
      }

      const ps = dividirParcelas(v, n, $("#c_md").value);
      const tot = cents(ps.reduce((a, b) => a + b, 0));
      const iguais = ps.every(x => x === ps[0]);

      el.textContent =
        n + "x " +
        (iguais ? "de " + R(ps[0]) : "de " + R(ps[n - 1]) + " a " + R(ps[0])) +
        " · total " + R(tot) +
        " · " + label(d.slice(0, 7)) + " a " + label(addMonths(d, n - 1).slice(0, 7));
    };

    ["c_va", "c_n", "c_da", "c_md"].forEach(id => {
      $("#" + id).oninput = prever;
      $("#" + id).onchange = prever;
    });

    $("#c_ad").onclick = async () => {
      const desc = $("#c_de").value.trim();
      const v = parseFloat($("#c_va").value);
      const n = parseInt($("#c_n").value, 10);
      const date = $("#c_da").value;

      if (!desc || !(v > 0) || !(n >= 1 && n <= 60) || !date) {
        alert("Informe descrição, valor, número de parcelas (1 a 60) e o vencimento da 1ª parcela.");
        return;
      }

      $("#c_ad").disabled = true;

      const valores = dividirParcelas(v, n, $("#c_md").value);
      const total = cents(valores.reduce((a, b) => a + b, 0));

      let cartao = $("#c_cc").value.trim();
      const jaTem = cards.find(x => x.toLowerCase() === cartao.toLowerCase());

      if (jaTem) cartao = jaTem;

      const rid = uuid();
      const cls = $("#c_cl").value;

      const base = {
        type: "out",
        kind: "avulso",
        desc,
        cat: $("#c_ca").value || "Outros",
        by: $("#c_by").value || cfg.me,
        pay: "Crédito",
        cls,
        done: false,
        fixed: true,
        who: cfg.me,
        recurrenceId: rid
      };

      const novos = valores.map((valor, k) => ({
        ...base,
        value: valor,
        date: addMonths(date, k),
        recurrenceIndex: k
      }));

      try {
        /* Primeiro registra a compra; depois cria as parcelas. */
        await atualizarConfig(c => {
          c.cartoes = c.cartoes || {};
          c.cartoes.cards = c.cartoes.cards || [];
          c.cartoes.compras = c.cartoes.compras || {};

          if (cartao && !c.cartoes.cards.some(x => x.toLowerCase() === cartao.toLowerCase())) {
            c.cartoes.cards.push(cartao);
          }

          c.cartoes.compras[rid] = {
            desc,
            n,
            cartao,
            total,
            primeira: date
          };
        });

        try {
          await inserirLancamentos(novos);
        } catch (erro) {
          await atualizarConfig(c => {
            if (c.cartoes && c.cartoes.compras) delete c.cartoes.compras[rid];
          }).catch(() => {});

          throw erro;
        }

        await carregarLancamentosSupabase();
      } catch (erro) {
        console.error(erro);

        alert("Não foi possível salvar no banco. A compra NÃO foi criada.\n\n" + (erro?.message || ""));
        $("#c_ad").disabled = false;
        return;
      }

      cardForm = false;
      cur = date.slice(0, 7);

      save();
      render();

      toast(
        "💳 " + n + " parcelas criadas (" +
        label(date.slice(0, 7)) + " a " + label(addMonths(date, n - 1).slice(0, 7)) + ")"
      );
    };
  }

  document.querySelectorAll("[data-cok]").forEach(b => {
    b.onclick = () => pagarParcela(b.dataset.cok);
  });

  document.querySelectorAll("[data-crv]").forEach(b => {
    b.onclick = () => reverter(b.dataset.crv);
  });

  document.querySelectorAll("[data-cdp]").forEach(b => {
    b.onclick = () => excluirParcela(b.dataset.cdp);
  });

  document.querySelectorAll("[data-cdall]").forEach(b => {
    b.onclick = () => excluirParcelamento(b.dataset.cdall);
  });
}


/* =========================================================
   TELA
   ========================================================= */

function render() {
  $("#app").dataset.tab = tab;
  if (tab === "cartoes") { renderCartoes(); return; }

  const M = month(cur);
  const F = flow(cur);
  const td = today();
  const N = cfg.names;

  const cats =
    group(
      outs(M.a),
      t => t.cat
    );

  const totIn =
    sum(ins(M.a));

  const totOut =
    sum(outs(M.a));

  const e =
    editId
      ? tx.find(t => t.id === editId)
      : null;

  const k0 =
    e
      ? e.kind
      : "avulso";

  const months =
    [5, 4, 3, 2, 1, 0]
      .map(k => shift(cur, -k));

  const sv =
    months.map(m => {
      const x = inM(m);

      let resultado =
        sum(ins(x)) -
        sum(outs(x));

      /*
      * Considera o ajuste/negativado
      * no mês em que ele foi registrado.
      */
      if (
        cfg.adjMonth === m
      ) {
        resultado += cfg.adj;
      }

      return resultado;
    });

  const mx =
    Math.max(
      1,
      ...sv.map(v => Math.abs(v))
    );

  const opt = (list, selected) =>
    list.map(o => `
      <option
        value="${esc(o)}"
        ${o === selected ? "selected" : ""}
      >
        ${esc(o)}
      </option>
    `).join("");

  const f = (title, html) => `
    <label class="f">
      <span class="k">${title}</span>
      ${html}
    </label>
  `;


  /* ---------- Formulário ---------- */

  const form = (e || showForm) ? `
    <div class="card" id="fm">
      <h2>
        ${e ? "✏️ Editar lançamento" : "Novo lançamento"}
      </h2>

      <div class="row fm">

        ${f(
          "Tipo",
          `
          <select id="ty">
            ${Object.entries(KINDS).map(([k, v]) => `
              <option
                value="${k}"
                ${k === k0 ? "selected" : ""}
              >
                ${v}
              </option>
            `).join("")}
          </select>
          `
        )}

        ${f(
          "Descrição",
          `
          <input
            id="de"
            placeholder="Ex.: aluguel, mercado, salário..."
            value="${e ? esc(e.desc) : ""}"
          >
          `
        )}

        ${f(
          "Valor",
          `
          <input
            id="va"
            type="number"
            step="0.01"
            min="0"
            inputmode="decimal"
            placeholder="R$ 0,00"
            value="${e ? e.value : ""}"
          >
          `
        )}

        ${f(
          "Categoria",
          `
          <select id="ca">
            ${opt(
              CATS,
              e?.cat || "Outros"
            )}
          </select>
          `
        )}

        ${f(
          "Quem",
          `
          <select id="by">
            ${opt(
              [...N, "Juntos"],
              e?.by || cfg.me
            )}
          </select>
          `
        )}

        ${f(
          "Classificação do dinheiro",
          `
          <select id="cl" ${k0 === "entrada" ? "disabled" : ""}>
            ${Object.entries(CLS).map(([k, v]) => `
              <option
                value="${k}"
                ${k === (e?.cls || "casal") ? "selected" : ""}
              >
                ${v}
              </option>
            `).join("")}
          </select>
          `
        )}

        ${f(
          "Forma de pagamento",
          `
          <select id="pg">
            <option value="">—</option>
            ${opt(PAYS, e?.pay || "")}
          </select>
          `
        )}

        ${f(
          "Data",
          `
          <input
            id="da"
            type="date"
            value="${
              e
                ? e.date
                : cur === td.slice(0, 7)
                  ? td
                  : cur + "-01"
            }"
          >
          `
        )}

        <label class="row note">
          <input
            id="dn"
            type="checkbox"
            style="flex:0;min-width:0"
            ${e
              ? (e.done ? "checked" : "")
              : "checked"
            }
          >
          Já pago/recebido
        </label>

        ${
          e
            ? ""
            : `
              <label
                class="row note"
                id="fxw"
                style="display:${k0 === "avulso" ? "none" : "flex"}"
              >
                <input
                  id="fx"
                  type="checkbox"
                  style="flex:0;min-width:0"
                >
                Repetir todo mês (12 meses)
              </label>
            `
        }

        <div class="row">
          <button id="ad">
            ${e ? "Salvar alteração" : "Adicionar"}
          </button>

          <button
            class="g"
            id="cn"
          >
            Cancelar
          </button>
        </div>

      </div>

      <p class="note">
        Conta fixa = vencimento.
        Recorrente = previsão.
        Avulso = gasto eventual.
        Entrada = dinheiro recebido.
        A classificação define como o dinheiro é tratado.
      </p>
    </div>
  ` : `
    <button class="fab" id="nw">
      + Novo lançamento
    </button>
  `;


  /* ---------- HTML ---------- */

  $("#app").innerHTML = `

    <div class="row top">
      <h1>💰 Nosso Controle</h1>

      <div class="row">
        <button class="g" id="pv">‹</button>
        <b>${label(cur)}</b>
        <button class="g" id="nx">›</button>
      </div>
    </div>


    ${tabsHtml()}

    <div class="row top"><span class="note">Lançando como <b>${esc(cfg.me)}</b></span></div>





    <!-- SITUAÇÃO -->

    <div class="card hero" data-s="mes">
      <h2><span class="e1">💰</span><span class="e2">☕</span> Situação do mês</h2>

      <div class="cup" aria-hidden="true">☕</div>

      <div class="k">
        Saldo disponível agora
      </div>

      <div class="v big">
        ${R(balNow())}
      </div>


      <div class="g3" style="margin-top:10px">

        <div>
          <div class="k">
            Previsão de sobra
          </div>

          <div class="v ${M.sobra < 0 ? "out" : "in"}">
            ${R(M.sobra)}
          </div>
        </div>


        <div>
          <div class="k">
            🎯 Nosso orçamento
          </div>

          <div class="v">
            ${R(M.r.b)}
          </div>
        </div>


        <div>
          <div class="k">
            🔒 Não mexer
          </div>

          <div class="v ${M.prot < 0 ? "out" : ""}">
            ${R(M.prot)}
          </div>
        </div>

      </div>


      <div
        class="g3"
        style="
          margin-top:10px;
          grid-template-columns:repeat(2,1fr)
        "
      >

        <div>
          <div class="k">
            ⬇️ Entradas lançadas
          </div>

          <div class="v in">
            ${R(totIn)}
          </div>
        </div>


        <div>
          <div class="k">
            ⬆️ Saídas lançadas
          </div>

          <div class="v out">
            ${R(totOut)}
          </div>
        </div>

      </div>


      <p class="note">
        A previsão considera o saldo atual e os
        lançamentos pendentes deste mês (mais os do mês anterior,
        se você ligar "Trazer pendentes").
        O saldo atual sobe e desce sozinho quando você marca algo
        como pago ou recebido, e o botão ↩️ desfaz.
        O orçamento do casal é uma regra separada
        e não aumenta automaticamente quando sobra dinheiro.
      </p>


      ${(() => {
        const pp = pendFrom(cur);
        const on = !!(cfg.carry && cfg.carry[cur]);

        if (!pp.length && !on) return "";

        return `
          <label class="row note" style="margin-top:10px">
            <input id="cy" type="checkbox" style="flex:0;min-width:0" ${on ? "checked" : ""}>
            Trazer pendentes?
            (${pp.length
              ? pp.length + (pp.length > 1 ? " contas" : " conta") + " de " + label(shift(cur, -1)) + " · " + R(sum(pp))
              : "nenhuma pendente"})
          </label>
        `;
      })()}

      <button class="g" id="eb">
        ✏️ Alterar "Não mexer"
      </button>

    </div>


    <!-- ORÇAMENTO -->

    <div class="card" data-s="mes">
      <h2>🛒 Quanto podemos gastar</h2>

      <div class="v big ${M.rest < 0 ? "out" : ""}">
        ${R(M.rest)}
      </div>

      ${(() => {
        const pct = M.r.b > 0 ? M.spent / M.r.b * 100 : (M.spent > 0 ? 100 : 0);
        const col = pct < 70 ? "var(--in)" : pct < 90 ? "#f59e0b" : "var(--out)";

        return `<div class="meter" title="${Math.round(pct)}% do orçamento"><i style="width:${Math.min(100, pct)}%;background:${col}"></i></div>`;
      })()}

      <p class="note">
        ${
          M.left > 0
            ? `Restam ${M.left} dias · ${R(M.perDay)} por dia`
            : "Mês encerrado"
        }
        · comprometido: ${R(M.spent)}
        de ${R(M.r.b)}
      </p>


      <table class="tb">
        <tr>
          <th></th>
          <th>Orçamento</th>
          <th>Gasto</th>
          <th>Restante</th>
        </tr>

        ${
          [
            N[0],
            N[1],
            "Juntos"
          ].map((name, i) => `
            <tr style="${i === 2 ? "font-weight:700" : ""}">
              <td>${esc(name)}</td>

              <td>${R(M.r.s[i])}</td>

              <td>${R(M.pg[i])}</td>

              <td class="${cents(M.r.s[i] - M.pg[i]) < 0 ? "out" : ""}">
                ${R(cents(M.r.s[i] - M.pg[i]))}
              </td>
            </tr>
          `).join("")
        }
      </table>

      <p class="note">
        "Juntos" é o orçamento total. Um gasto lançado em "Juntos"
        sai 50% de cada um.
      </p>
    </div>


    ${form}


    <!-- FLUXO -->

    <div class="card" data-s="mes">
      <h2>
        Fluxo de caixa até o fim de ${label(cur)}
      </h2>

      <div class="li">
        <div>
          Saldo atual
        </div>

        <b>
          ${R(balNow())}
        </b>
      </div>


      ${
        F.rows.map(({t, bal}) => `
          <div class="li">

            <div>
              ${ICON[t.kind] || "💸"}
              ${esc(t.desc || t.cat)}

              <span
                class="tag ${
                  t.date < td
                    ? "late"
                    : ""
                }"
              >
                ${dm(t.date)}
              </span>

              <br>

              <small>
                ${esc(t.by || "—")}
                · ${esc(t.cat || "Outros")}
                ${t.pay ? " · " + esc(t.pay) : ""}
              </small>
            </div>


            <div class="row">

              <div style="text-align:right">
                <b
                  class="${
                    t.type === "out"
                      ? "out"
                      : "in"
                  }"
                >
                  ${
                    t.type === "out"
                      ? "-"
                      : "+"
                  }${R(t.value)}
                </b>

                <br>

                <small>
                  saldo ${R(bal)}
                </small>
              </div>


              ${payBtn(t)}

            </div>

          </div>
        `).join("")
        ||
        '<p class="note">Nenhuma movimentação futura pendente.</p>'
      }


      <div class="li">
        <div>
          Saldo previsto no final
        </div>

        <b class="${F.final < 0 ? "out" : ""}">
          ${R(F.final)}
        </b>
      </div>


      <button class="g" id="sb">
        Ajustar saldo atual
      </button>
    </div>


    <!-- CATEGORIAS -->

    <div class="card" data-s="resumo">
      <h2>
        Onde estamos gastando mais
      </h2>

      ${bars(cats)}
    </div>


    <!-- RESUMO -->

    <div class="card" data-s="resumo">
      <h2>
        Resumo de ${label(cur)}
      </h2>

      <p class="note">
        Gasto marcado como orçamento do casal:
        <b>
          ${R(M.spent)}
        </b>
      </p>


      <div class="k">
        Por tipo
      </div>

      ${bars(
        group(
          outs(M.a),
          t => KN[t.kind] || "Outro"
        )
      )}


      <div class="k" style="margin-top:12px">
        Por classificação do dinheiro
      </div>

      ${bars(
        group(
          outs(M.a),
          t => CLS[t.cls] || "Normal"
        )
      )}
    </div>


    <!-- ECONOMIA -->

    <div class="card" data-s="resumo">
      <h2>
        Resultado dos últimos meses
      </h2>

      <div class="cols">

        ${
          sv.map((v, k) => `
            <div>
              <span>
                ${R(v).replace("R$ ", "")}
              </span>

              <b
                style="
                  height:${Math.max(
                    2,
                    Math.abs(v) / mx * 80
                  )}px;
                  background:${
                    v >= 0
                      ? "var(--in)"
                      : "var(--out)"
                  }
                "
              ></b>

              ${label(months[k])}
            </div>
          `).join("")
        }

      </div>
    </div>


    <!-- LANÇAMENTOS -->

    <div class="card" data-s="mes">
      <h2>
        Lançamentos de ${label(cur)}
      </h2>

      ${
        M.a.length
          ? [...M.a]
              .sort(
                (x, y) =>
                  y.date.localeCompare(x.date)
              )
              .map(t => `
                <div
                  class="li ${
                    t.done
                      ? ""
                      : "pend"
                  }"
                >

                  <div>

                    ${
                      ICON[t.kind] ||
                      "💸"
                    }

                    ${esc(
                      t.desc ||
                      t.cat ||
                      "Sem descrição"
                    )}

                    ${
                      t.fixed && !compraDe(t)
                        ? " 🔁"
                        : ""
                    }
                    ${parcTag(t)}

                    ${
                      t.done
                        ? `<span class="tag">${t.type === "in" ? "✓ recebido" : "✓ pago"}</span>`
                        : `
                          <span class="tag">
                            pendente
                          </span>
                        `
                    }

                    <br>

                    <small>
                      ${dm(t.date)}
                      · ${esc(t.cat || "Outros")}
                      · ${esc(t.by || "—")}

                      ${
                        t.pay
                          ? " · " +
                            esc(t.pay)
                          : ""
                      }

                      · ${esc(
                        CLS[t.cls] ||
                        "Normal"
                      )}

                      · lançou:
                      ${esc(t.who || "—")}
                    </small>

                  </div>


                  <div class="row">

                    <b
                      class="${
                        t.type === "out"
                          ? "out"
                          : "in"
                      }"
                    >
                      ${
                        t.type === "out"
                          ? "-"
                          : "+"
                      }${R(t.value)}
                    </b>


                    ${payBtn(t)}<button data-e="${t.id}"
                      title="Editar"
                    >
                      ✏️
                    </button>


                    <button
                      data-d="${t.id}"
                      title="Excluir"
                    >
                      🗑️
                    </button>

                  </div>

                </div>
              `)
              .join("")
          : `
            <p class="note">
              Nada lançado neste mês.
            </p>
          `
      }

      ${
        carried(cur).length
          ? `
            <h2 style="margin-top:16px">
              ⤵️ Pendentes trazidos de ${label(shift(cur, -1))}
            </h2>
            <p class="note">
              Não entram nos totais nem no orçamento de ${label(cur)};
              só na previsão de sobra e no fluxo.
            </p>
            ${[...carried(cur)]
              .sort((x, y) => x.date.localeCompare(y.date))
              .map(t => `
                <div class="li pend">
                  <div>
                    ${ICON[t.kind] || "💸"}
                    ${esc(t.desc || t.cat || "Sem descrição")}
                    ${parcTag(t)}
                    <span class="tag late">de ${label(monthOf(t))}</span>
                    <br>
                    <small>
                      venceu ${dm(t.date)}
                      · ${esc(t.cat || "Outros")}
                      · ${esc(t.by || "—")}
                    </small>
                  </div>

                  <div class="row">
                    <b class="${t.type === "out" ? "out" : "in"}">
                      ${t.type === "out" ? "-" : "+"}${R(t.value)}
                    </b>
                    ${payBtn(t)}
                  </div>
                </div>
              `).join("")}
          `
          : ""
      }
    </div>


    ${legacy.tx.length ? `<div class="card" data-s="ajustes"><h2>📦 Dados só neste aparelho</h2>
      <p class="note">Achei ${legacy.tx.length} lançamentos da versão antiga, salvos apenas neste navegador. Envie para o banco para aparecerem nos dois celulares.</p>
      <div class="row"><button id="lgs">Enviar para o banco</button><button class="g" id="lgd">Descartar</button></div></div>` : ""}

    <!-- TEMA -->

    <div class="card" data-s="ajustes">
      <h2>🎨 Tema</h2>

      <div class="themes">
        ${THEMES.map(([k, n, g]) => `
          <button class="th ${themeNow() === k ? "on" : ""}" data-th="${k}">
            <i style="background:${g}"></i>${n}
          </button>
        `).join("")}
      </div>

      <p class="note">O tema fica salvo só neste aparelho.</p>
    </div>

    <!-- BACKUP -->

    <div class="card" data-s="ajustes">
      <h2>
        Backup
      </h2>

      <p class="note">
        Os dados ficam no banco online, iguais nos dois celulares. Exportar baixa uma cópia; Importar adiciona ao banco os lançamentos de um arquivo.
      </p>

      <div class="row">

        <button
          class="g"
          id="ex"
        >
          Exportar
        </button>

        <button
          class="g"
          id="im"
        >
          Importar
        </button>

      </div>
    </div>


    <!-- CONTROLE -->

    <div class="card" data-s="ajustes">
      <h2>👥 ${esc(window.controleAtual?.nome || "Nosso controle")}</h2>

      <p class="note">Código para convidar outra pessoa:</p>

      <div class="v code">${esc(window.controleAtual?.codigo_convite || "—")}</div>

      <div class="row">
        <button class="g" id="copiarCodigo">📋 Copiar código</button>
        <button class="g" id="nm">✏️ Alterar meu nome</button>
      </div>

      <div class="row" style="margin-top:8px">
        <button class="g" id="lk">Sair do controle</button>
        <button class="g" id="lo">Sair da conta</button>
      </div>
    </div>

  `;


  /* =======================================================
     EVENTOS
     ======================================================= */


  /* ---------- Navegação ---------- */

  $("#pv").onclick = () => {
    cur = shift(cur, -1);
    saveUi();
    render();
  };

  $("#nx").onclick = () => {
    cur = shift(cur, 1);
    saveUi();
    render();
  };


  

  bindTabs();

  document.querySelectorAll("[data-th]").forEach(b => {
    b.onclick = () => setTheme(b.dataset.th);
  });

  /* ---------- Trazer pendentes do mês anterior ---------- */

  if ($("#cy")) {
    $("#cy").onchange = async ev => {
      const on = ev.target.checked;
      const mes = cur;

      ev.target.disabled = true;

      try {
        await atualizarConfig(c => {
          c.carry = c.carry || {};

          if (on) c.carry[mes] = true;
          else delete c.carry[mes];
        });
      } catch (erro) {
        console.error(erro);
        alert("Não foi possível salvar no banco. Nada foi alterado.");
      }

      render();
    };
  }

  /* ---------- Alterar "Não mexer" ---------- */

  $("#eb").onclick = async () => {
    const r = M.r;

    const v = num(
      "Quanto deixar em \"Não mexer\" em " +
      label(cur) +
      " (R$)",
      Math.max(0, M.prot)
    );

    if (v == null || v < 0) {
      return;
    }

    /*
     * Dinheiro disponível antes de gastar do orçamento
     * = sobra + o que já foi gasto/comprometido do casal.
     * Não mexer = disponível - orçamento, então:
     * orçamento = disponível - não mexer.
     * (Gastos por si só não mexem no orçamento nem nas partes.)
     */
    const b = Math.round((M.sobra + M.spent - v) * 100) / 100;

    if (b < 0) {
      alert(
        "O valor passa do dinheiro disponível (" +
        R(M.sobra + M.spent) +
        "). Escolha um valor menor."
      );

      return;
    }

    const mes = cur;

    try {
      await atualizarConfig(c => {
        c.rules = c.rules || {};
        c.rules[mes] = {b, s: [...split(b), b]};
      });
    } catch (erro) {
      console.error(erro);
      alert("Não foi possível salvar no banco. Nada foi alterado.");
      return;
    }

    render();
  };


  /* ---------- Ajustar saldo ---------- */

  $("#sb").onclick = async () => {
    const atual = balNow();

    const v = num(
      "Quanto tem na conta hoje? (R$)",
      atual
    );

    if (v == null) {
      return;
    }

    const mes = cur;

    try {
      await atualizarConfig(c => {
        c.adj = (Number(c.adj) || 0) + (v - atual);
        c.adjMonth = mes;
      });
    } catch (erro) {
      console.error(erro);
      alert("Não foi possível salvar no banco. Nada foi alterado.");
      return;
    }

    render();
  };


  /* ---------- Tipo do lançamento ---------- */

  if ($("#ty")) {
    $("#ty").onchange = ev => {
      const kind = ev.target.value;

      $("#cl").disabled = kind === "entrada";

      const fxw = $("#fxw");

      if (fxw) {
        fxw.style.display = kind === "avulso" ? "none" : "flex";

        if (kind === "avulso") {
          $("#fx").checked = false;
        }
      }

      if (editId) return;

      if (kind === "entrada") {
        $("#dn").checked = true;
        $("#cl").value = "normal";
      } else if (kind === "avulso") {
        $("#cl").value = "casal";
      } else {
        $("#cl").value = "normal";
      }
    };
  }


  /* ---------- Adicionar / editar ---------- */

  if ($("#ad")) {
    $("#ad").onclick = async () => {
      const value =
        parseFloat($("#va").value);

      const date =
        $("#da").value;

      const kind =
        $("#ty").value;

      if (
        !(value > 0) ||
        !date
      ) {
        alert(
          "Informe um valor e uma data válidos."
        );

        return;
      }

$("#ad").disabled = true;

      const type =
        kind === "entrada"
          ? "in"
          : "out";

      let cls =
        $("#cl").value;

      /*
       * Entrada nunca entra no orçamento
       * do casal.
       */
      if (type === "in") {
        cls = "normal";
      }

      const base = {
        type,
        kind,
        desc:
          $("#de").value.trim() ||
          "Sem descrição",

        value,

        cat:
          $("#ca").value ||
          "Outros",

        by:
          $("#by").value ||
          cfg.me,

        pay:
          $("#pg").value,

        cls,

        date,

        done:
          $("#dn").checked,

        who:
          cfg.me
      };


      /* ---------- Edição ---------- */

    if (editId) {
      const item =
        tx.find(t => t.id === editId);

      if (item) {

        const copia = {...item, ...base};
        if (copia.done && !item.done) copia.doneAt = today();
        if (!copia.done) copia.doneAt = null;

        try {
          await atualizarLancamentoSupabase(copia);
          Object.assign(item, copia);

        } catch (erro) {

          console.error(
            "Erro ao atualizar lançamento:",
            erro
          );

          alert(
            "Não foi possível salvar a alteração.\n\n" + (erro?.message || "")
          );
          $("#ad").disabled = false;

          return;
        }
      }

      editId = null;
      showForm = false;

      save();
      render();

      return;
    }

      /* ---------- Novo lançamento ---------- */

      const repeat =
        $("#fx") &&
        $("#fx").checked &&
        kind !== "avulso";


      const total =
        repeat
          ? 12
          : 1;


      const groupId = repeat ? uuid() : null;

      const novos = [];

      for (let k = 0; k < total; k++) {
        novos.push({
          ...base,
          date: addMonths(date, k),
          done: k === 0 ? base.done : false,
          fixed: repeat,
          recurrenceId: groupId,
          recurrenceIndex: repeat ? k : 0
        });
      }

      /* Só aparece na tela se o banco confirmou. */
      try {
        await inserirLancamentos(novos);
        await carregarLancamentosSupabase();
      } catch (erro) {
        console.error(erro);
        alert("Não foi possível salvar no banco. O lançamento NÃO foi criado.\n\n" + (erro?.message || ""));
        $("#ad").disabled = false;
        return;
      }

      showForm = false;

      save();
      render();
    };
  }


  /* ---------- Cancelar ---------- */

  if ($("#cn")) {
    $("#cn").onclick = () => {
      editId = null;
      showForm = false;

      render();
    };
  }


  /* ---------- Novo lançamento ---------- */

  if ($("#nw")) {
    $("#nw").onclick = () => {
      editId = null;
      showForm = true;

      render();

      setTimeout(() => {
        $("#fm")?.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }, 50);
    };
  }


  /* ---------- Editar ---------- */

  document
    .querySelectorAll("[data-e]")
    .forEach(button => {
      button.onclick = () => {
        editId =
          button.dataset.e;

        showForm = false;

        render();

        setTimeout(() => {
          $("#fm")?.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });
        }, 50);
      };
    });


  /* ---------- Marcar pago/recebido ---------- */

  document
    .querySelectorAll("[data-ok]")
    .forEach(button => {
      button.onclick = async () => {
        const t =
          tx.find(
            x =>
              x.id ===
              button.dataset.ok
          );

        if (!t) {
          return;
        }

        /*
         * Para recorrentes, permite informar
         * o valor real no momento do pagamento.
         */
        if (
          t.kind === "recorrente" &&
          t.type === "out"
        ) {
          const v = num(
            "Valor real pago (R$)",
            t.value
          );

          if (v == null || v <= 0) {
            return;
          }

          if (t.planned == null) t.planned = t.value;
          t.value = v;
        }

        t.done = true;
        t.doneAt = today();

        try {
          await atualizarStatusSupabase(t);
        } catch (erro) {
          console.error(
            "Erro ao sincronizar pagamento:",
            erro
          );

          await carregarLancamentosSupabase();
          render();

          alert(
            "Não foi possível sincronizar o status.\n\n" + (erro?.message || "")
          );

          return;
        }

        setTimeout(() => toast(
          (t.type === "in" ? "✓ Recebido" : "✓ Pago") +
            " — saldo agora " + R(balNow()),
          "Desfazer",
          () => reverter(t.id)
        ), 0);

        save();
        render();
      };
    });


  /* ---------- Reverter pago/recebido ---------- */

  document
    .querySelectorAll("[data-rv]")
    .forEach(button => {
      button.onclick = async () => reverter(button.dataset.rv);
    });


  /* ---------- Excluir ---------- */

  document
    .querySelectorAll("[data-d]")
    .forEach(button => {
      button.onclick = async () => {
        const item =
          tx.find(
            t => t.id === button.dataset.d
          );

        if (!item) {
          return;
        }

        const ok = confirm(
          `Excluir "${item.desc || item.cat}" no valor de ${R(item.value)}?`
        );

        if (!ok) {
          return;
        }

        /*
         * Apaga primeiro no Supabase. Se falhar,
         * o lançamento continua na tela.
         */
        try {
          await excluirLancamentoSupabase(item.id);
        } catch (erro) {
          alert(
            "Não foi possível excluir no Supabase. " +
            "O lançamento foi mantido."
          );

          return;
        }

        const index =
          tx.findIndex(t => t.id === item.id);

        if (index >= 0) {
          tx.splice(index, 1);
        }

        undo.push({
          t: item,
          i: Math.max(0, index)
        });

        undo = undo.slice(-20);

        saveUndo();
        save();
        render();

        toast(
          "🗑️ " +
          (item.desc || item.cat) +
          " — " +
          R(item.value) +
          " apagado",
          "Desfazer",
          doUndo
        );
      };
    });


  $("#lk").onclick = async () => {
    const ok = confirm(
      "Sair deste controle?\n\nVocê continuará conectado à sua conta e poderá entrar em outro controle usando um código de convite."
    );

    if (!ok) return;

    const { error } = await supabaseClient.rpc(
      "sair_controle"
    );

    if (error) {
      console.error(error);
      alert("Não foi possível sair do controle.");
      return;
    }

    window.controleId = null;
    window.membroId = null;
    window.controleAtual = null;

    mostrarTelaControle();
  };


  /* ---------- Copiar código ---------- */

  $("#copiarCodigo").onclick = async () => {
    const codigo = window.controleAtual?.codigo_convite;

    if (!codigo) return;

    try {
      await navigator.clipboard.writeText(codigo);
      toast("✅ Código copiado!");
    } catch {
      alert("Código: " + codigo);
    }
  };


  /* ---------- Alterar meu nome ---------- */

  $("#nm").onclick = async () => {
    const velho = cfg.me;
    const novo = (prompt("Seu nome", velho) || "").trim();
    if (!novo || novo === velho) return;

    const outro = cfg.names.find(n => n !== velho) || "";

    if (novo.toLowerCase() === "juntos" || novo.toLowerCase() === outro.toLowerCase()) {
      alert("Use um nome diferente do outro e que não seja “Juntos”.");
      return;
    }

    const {data, error} = await supabaseClient.from("membros")
      .update({nome: novo}).eq("id", window.membroId).select("id");

    if (error || !data?.length) {
      console.error(error);
      alert("Não foi possível alterar o nome.");
      return;
    }

    await supabaseClient.from("lancamentos").update({quem: novo})
      .eq("controle_id", window.controleId).eq("quem", velho);

    await carregarLancamentosSupabase();
    render();
  };


  /* ---------- Sair da conta ---------- */

  $("#lo").onclick = async () => {
    if (!confirm("Sair da sua conta neste aparelho?")) return;

    await supabaseClient.auth.signOut();

    window.controleId = null;
    window.membroId = null;
    window.controleAtual = null;

    mostrarLogin();
  };


  /* ---------- Exportar ---------- */

  if ($("#lgs")) $("#lgs").onclick = async () => {
    try {
      await inserirLancamentos(legacy.tx.map(t => ({...t, id: null, membroId: null, recurrenceId: null, recurrenceIndex: 0})));
      const c = legacy.cfg;
      if (c) await atualizarConfig(n => {
        n.rules = {...(c.rules || {}), ...(n.rules || {})};
        if (!n.adj && c.adj) { n.adj = Number(c.adj) || 0; n.adjMonth = c.adjMonth; }
      });
      localStorage.removeItem("fin_tx"); localStorage.removeItem("fin_cfg");
      legacy = {tx: [], cfg: null};
      await carregarLancamentosSupabase();
      render();
      toast("✅ Enviado para o banco");
    } catch (erro) {
      console.error(erro);
      alert("Não foi possível enviar. Nada foi apagado deste aparelho.");
    }
  };
  if ($("#lgd")) $("#lgd").onclick = () => {
    if (!confirm("Descartar os dados antigos deste aparelho?")) return;
    localStorage.removeItem("fin_tx"); localStorage.removeItem("fin_cfg");
    legacy = {tx: [], cfg: null};
    render();
  };

  $("#ex").onclick = () => {
    const data = {
      version: 2,
      exportedAt:
        new Date().toISOString(),

      tx,
      cfg,
      ui: {
        cur
      }
    };

    const blob =
      new Blob(
        [
          JSON.stringify(
            data,
            null,
            2
          )
        ],
        {
          type:
            "application/json"
        }
      );

    const link =
      document.createElement("a");

    link.href =
      URL.createObjectURL(blob);

    link.download =
      "controle-financeiro.json";

    link.click();

    setTimeout(() => {
      URL.revokeObjectURL(
        link.href
      );
    }, 1000);
  };


  /* ---------- Importar ---------- */

  $("#im").onclick = () => {
    const input =
      document.createElement("input");

    input.type = "file";
    input.accept = ".json";

    input.onchange = async () => {
      const file =
        input.files?.[0];

      if (!file) {
        return;
      }

      try {
        const data =
          JSON.parse(
            await file.text()
          );

        const list =
          Array.isArray(data)
            ? data
            : data.tx;

        if (!Array.isArray(list)) {
          throw new Error(
            "Formato inválido"
          );
        }

        if (!confirm("Isso vai ADICIONAR " + list.length + " lançamentos ao banco compartilhado (nada será apagado). Continuar?")) return;

        await inserirLancamentos(
          list.map(norm).map(t => ({...t, id: null, membroId: null, recurrenceId: null, recurrenceIndex: 0}))
        );
        await carregarLancamentosSupabase();
        render();
        toast("✅ Dados enviados para o banco");

      } catch (err) {
        console.error(err);

        alert(
          "Arquivo inválido ou corrompido."
        );
      }
    };

    input.click();
  };
}

/* =========================================================
   DESFAZER
   ========================================================= */

const payBtn = t => t.done
  ? `<button data-rv="${esc(t.id)}" title="Voltar para pendente">↩️</button>`
  : `<button data-ok="${esc(t.id)}" title="${t.type === "in" ? "Marcar como recebido" : "Marcar como pago"}">✓</button>`;

/* Desfaz um "pago/recebido": volta para pendente e o saldo atual volta ao que era. */
async function reverter(id) {

  const t = tx.find(x => x.id === id);

  if (!t) return;

  const doneAnterior = t.done;
  const doneAtAnterior = t.doneAt;
  const valorAnterior = t.value;
  const plannedAnterior = t.planned;

  t.done = false;
  t.doneAt = null;

  if (t.planned != null) {

    t.value = t.planned;
    t.planned = null;

  }

  try {

    await atualizarStatusSupabase(t);

  } catch (erro) {

    console.error(
      "Erro ao sincronizar reversão:",
      erro
    );

    // Volta o lançamento para o estado anterior
    t.done = doneAnterior;
    t.doneAt = doneAtAnterior;
    t.value = valorAnterior;
    t.planned = plannedAnterior;

    alert(
      "Não foi possível sincronizar a alteração.\n\n" + (erro?.message || "")
    );

    return;
  }

  save();
  render();

  toast(
    "↩️ Voltou para pendente — saldo agora " +
    R(balNow())
  );
}

async function doUndo() {
  const item =
    undo.pop();

  if (!item) {
    toast(
      "Nada para desfazer."
    );

    return;
  }

  /*
   * Recria o lançamento no Supabase com o mesmo ID.
   */
  try {
    await salvarLancamentoSupabase(
      item.t,
      true
    );
  } catch (erro) {
    console.error(
      "Erro ao restaurar lançamento:",
      erro
    );

    undo.push(item);
    saveUndo();

    alert(
      "Não foi possível restaurar no Supabase."
    );

    return;
  }

  /*
   * Se o índice original já não existir,
   * coloca no final.
   */
  const index =
    Math.min(
      item.i,
      tx.length
    );

  tx.splice(
    index,
    0,
    item.t
  );

  saveUndo();
  save();
  render();

  toast(
    "↩️ Lançamento restaurado"
  );
}


function toast(
  msg,
  lbl,
  fn
) {
  let el =
    $("#toast");

  if (!el) {
    el =
      document.createElement("div");

    el.id = "toast";

    document.body.appendChild(
      el
    );
  }

  el.innerHTML =
    esc(msg) +
    (
      fn
        ? ` <button id="tu">${esc(lbl)}</button>`
        : ""
    );

  el.className =
    "show";

  if (fn) {
    $("#tu").onclick = fn;
  }

  clearTimeout(
    toast.t
  );

  toast.t =
    setTimeout(
      () => {
        el.className = "";
      },
      8000
    );
}


/* =========================================================
   CTRL + Z
   ========================================================= */

addEventListener(
  "keydown",
  ev => {
    const active =
      document.activeElement;

    const editingText =
      active &&
      /INPUT|SELECT|TEXTAREA/.test(
        active.tagName
      );

    if (
      (ev.ctrlKey || ev.metaKey) &&
      ev.key.toLowerCase() === "z" &&
      !editingText
    ) {
      ev.preventDefault();

      doUndo();
    }
  }
);


/* =========================================================
   SALVAR POSIÇÃO DA PÁGINA
   ========================================================= */

addEventListener(
  "scroll",
  () => {
    clearTimeout(
      saveUi.t
    );

    saveUi.t =
      setTimeout(
        saveUi,
        300
      );
  }
);


/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */

async function start() {
  ensureNames();

  /*
   * Recarrega o mês salvo.
   *
   * Isso evita voltar para setembro
   * simplesmente porque a página foi
   * atualizada.
   */
  try {
    const saved =
      JSON.parse(
        localStorage.getItem("fin_ui") ||
        "{}"
      );

    if (
      /^\d{4}-\d{2}$/.test(
        saved.cur || ""
      )
    ) {
      cur = saved.cur;
    }

    ui = saved;

  } catch {
    cur = currentMonth();
  }


  /*
   * Carrega os lançamentos
   * do controle atual no Supabase.
   */
  await carregarLancamentosSupabase();
  assinarTempoReal();


  render();


  /*
   * Volta para a posição em que
   * o usuário estava.
   */
  setTimeout(() => {
    const y =
      Number(ui.y);

    if (
      Number.isFinite(y) &&
      y > 0
    ) {
      window.scrollTo(
        0,
        y
      );
    }
  }, 50);
}


// ===============================
// AUTENTICAÇÃO SUPABASE
// ===============================

async function mostrarLogin() {
  const app = document.getElementById("app");

  app.innerHTML = `
    <div class="lock">
      <div class="card">
        <h1>Nosso Controle Financeiro</h1>
        <p class="note" style="margin-top:6px">
          Entre na sua conta para acessar o controle.
        </p>

        <input
          id="loginEmail"
          type="email"
          placeholder="Seu e-mail"
          autocomplete="email"
        >

        <input
          id="loginSenha"
          type="password"
          placeholder="Sua senha"
          autocomplete="current-password"
        >

        <button id="btnEntrar" style="width:100%;margin-top:4px">
          Entrar
        </button>

        <button
          id="btnCriarConta"
          class="g"
          style="width:100%;margin-top:8px"
        >
          Criar conta
        </button>

        <div
          id="loginMsg"
          class="note"
          style="margin-top:12px"
        ></div>
      </div>
    </div>
  `;

  document.getElementById("btnEntrar").onclick = async () => {
    const email = document.getElementById("loginEmail").value.trim();
    const senha = document.getElementById("loginSenha").value;
    const msg = document.getElementById("loginMsg");

    if (!email || !senha) {
      msg.textContent = "Preencha e-mail e senha.";
      return;
    }

    msg.textContent = "Entrando...";

    const { error } = await supabaseClient.auth.signInWithPassword({
      email,
      password: senha
    });

    if (error) {
      msg.textContent = "Erro: " + error.message;
      return;
    }

    msg.textContent = "Login realizado.";

    await iniciarSistema();
  };

  document.getElementById("loginSenha").addEventListener("keydown", ev => {
    if (ev.key === "Enter") {
      document.getElementById("btnEntrar").click();
    }
  });

  document.getElementById("btnCriarConta").onclick = async () => {
    const email = document.getElementById("loginEmail").value.trim();
    const senha = document.getElementById("loginSenha").value;
    const msg = document.getElementById("loginMsg");

    if (!email || !senha) {
      msg.textContent = "Preencha e-mail e senha para criar a conta.";
      return;
    }

    if (senha.length < 6) {
      msg.textContent = "A senha precisa ter pelo menos 6 caracteres.";
      return;
    }

    msg.textContent = "Criando conta...";

    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password: senha
    });

    if (error) {
      msg.textContent = "Erro: " + error.message;
      return;
    }

    if (data.user && !data.session) {
      msg.textContent =
        "Conta criada! Verifique seu e-mail para confirmar a conta.";
      return;
    }

    msg.textContent = "Conta criada com sucesso.";

    await iniciarSistema();
  };
}


// ===============================
// INICIAR SISTEMA
// ===============================

async function iniciarSistema() {
  const {
    data: { session },
    error
  } = await supabaseClient.auth.getSession();

  if (error) {
    console.error(error);
    mostrarLogin();
    return;
  }

  if (!session) {
    mostrarLogin();
    return;
  }

  console.log("Usuário autenticado:", session.user.email);

  // A partir daqui continua o sistema financeiro antigo.
  // O próximo passo será substituir os dados do localStorage
  // pelos dados do Supabase.

  await verificarControle();
}


// ===============================
// VERIFICAR LOGIN AO ABRIR
// ===============================

// ===============================
// CONTROLE DO CASAL
// ===============================

async function verificarControle() {
  const {
    data: { user }
  } = await supabaseClient.auth.getUser();

  if (!user) {
    mostrarLogin();
    return;
  }

  const { data, error } = await supabaseClient
    .from("membros")
    .select(`
      id,
      nome,
      email,
      controle_id,
      controles (
        id,
        nome,
        codigo_convite
      )
    `)
    .eq("usuario_auth_id", user.id)
    .maybeSingle();

  if (error) {
    console.error(error);
    alert("Erro ao verificar seu controle.");
    return;
  }

  // Já pertence a um controle
  if (data) {
    window.controleId = data.controle_id;
    window.membroId = data.id;
    window.controleAtual = data.controles;

    console.log("Controle encontrado:", data.controles);

    start();
    return;
  }

  // Ainda não pertence a nenhum controle
  mostrarTelaControle();
}


// ===============================
// TELA PARA CRIAR / ENTRAR
// ===============================

function mostrarTelaControle() {
  const app = document.getElementById("app");

  app.innerHTML = `
    <div class="lock">
      <div class="card">

        <h1>Nosso Controle Financeiro</h1>

        <p class="note" style="margin-top:6px">
          Você ainda não está vinculado a um controle.
        </p>

        <button
          id="btnCriarControle"
          style="width:100%;margin-top:15px"
        >
          Criar novo controle
        </button>

        <button
          id="btnEntrarControle"
          class="g"
          style="width:100%;margin-top:8px"
        >
          Entrar em um controle existente
        </button>

        <div
          id="controleForm"
          style="margin-top:14px"
        ></div>

        <div
          id="controleMsg"
          class="note"
          style="margin-top:12px"
        ></div>

      </div>
    </div>
  `;

  document.getElementById("btnCriarControle").onclick =
    mostrarFormularioCriarControle;

  document.getElementById("btnEntrarControle").onclick =
    mostrarFormularioEntrarControle;
}


// ===============================
// CRIAR CONTROLE
// ===============================

function mostrarFormularioCriarControle() {
  const form = document.getElementById("controleForm");

  form.innerHTML = `
    <input
      id="nomeControle"
      placeholder="Nome do controle"
      value="Nosso Controle"
    >

    <input
      id="nomeMembro"
      placeholder="Seu nome"
      style="margin-top:8px"
    >

    <button
      id="confirmarCriacao"
      style="width:100%;margin-top:8px"
    >
      Criar
    </button>
  `;

  document.getElementById("confirmarCriacao").onclick =
    criarControle;
}


async function criarControle() {
  const nomeControle =
    document.getElementById("nomeControle").value.trim();

  const nomeMembro =
    document.getElementById("nomeMembro").value.trim();

  const msg = document.getElementById("controleMsg");

  if (!nomeControle || !nomeMembro) {
    msg.textContent = "Preencha os dois campos.";
    return;
  }

  msg.textContent = "Criando controle...";

  const { data, error } = await supabaseClient.rpc(
    "criar_controle",
    {
      p_nome: nomeControle,
      p_nome_membro: nomeMembro
    }
  );

  if (error) {
    console.error(error);
    msg.textContent = "Erro: " + error.message;
    return;
  }

  window.controleId = data;

  msg.textContent = "Controle criado!";

  await verificarControle();
}


// ===============================
// ENTRAR EM CONTROLE EXISTENTE
// ===============================

function mostrarFormularioEntrarControle() {
  const form = document.getElementById("controleForm");

  form.innerHTML = `
    <input
      id="codigoControle"
      placeholder="Código do convite"
      maxlength="8"
      style="text-transform:uppercase"
    >

    <input
      id="nomeMembro"
      placeholder="Seu nome"
      style="margin-top:8px"
    >

    <button
      id="confirmarEntrada"
      style="width:100%;margin-top:8px"
    >
      Entrar
    </button>
  `;

  document.getElementById("confirmarEntrada").onclick =
    entrarControle;
}


async function entrarControle() {
  const codigo =
    document.getElementById("codigoControle").value
      .trim()
      .toUpperCase();

  const nome =
    document.getElementById("nomeMembro").value.trim();

  const msg = document.getElementById("controleMsg");

  if (!codigo || !nome) {
    msg.textContent = "Preencha o código e seu nome.";
    return;
  }

  msg.textContent = "Entrando no controle...";

  const { data, error } = await supabaseClient.rpc(
    "entrar_controle",
    {
      p_codigo: codigo,
      p_nome: nome
    }
  );

  if (error) {
    console.error(error);
    msg.textContent = "Erro: " + error.message;
    return;
  }

  window.controleId = data;

  msg.textContent = "Controle encontrado!";

  await verificarControle();
}

/* =========================================================
   ANIMAÇÕES (só visual: não mexe em dados nem em regras)
   ========================================================= */
(function () {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let prevCur = null, prevTab = null, prevVals = [], prevIds = new Set(), hadForm = false;

  const parseBRL = s => {
    const m = /^(-?)R\$\s*([\d.]+),(\d{2})$/.exec((s || "").replace(/\u00a0/g, " ").trim());
    return m ? (m[1] ? -1 : 1) * parseFloat(m[2].replace(/\./g, "") + "." + m[3]) : null;
  };

  function tween(el, from, to) {
    const t0 = performance.now(), d = 700;
    const step = t => {
      const p = Math.min(1, (t - t0) / d), e = 1 - Math.pow(1 - p, 3);
      el.textContent = R(p < 1 ? from + (to - from) * e : to);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function polish() {
    const root = document.getElementById("app");
    if (!root || !root.querySelector(".card") || reduce) return;

    const first = prevCur === null;
    const monthChanged = !first && prevCur !== cur;
    const tabChanged = prevTab !== null && prevTab !== tab;
    const enter = first || monthChanged || tabChanged;
    const dir = monthChanged ? (cur > prevCur ? "from-r" : "from-l") : "";

    // cards entram em sequência (só ao abrir e ao trocar de mês)
    root.querySelectorAll(".card").forEach((c, i) => {
      c.style.setProperty("--i", Math.min(i, 9));
      if (enter) { c.classList.add("rise"); if (dir) c.classList.add(dir); }
    });

    // números: contam até o valor novo
    const vals = [...root.querySelectorAll(".v")];
    const now = vals.map(el => parseBRL(el.textContent));
    vals.forEach((el, i) => {
      const to = now[i];
      if (to === null) return;
      const from = enter || prevVals.length !== now.length ? 0 : prevVals[i];
      if (from !== null && from !== to) {
        el.classList.add("bump");
        tween(el, from, to);
      }
    });
    prevVals = now;

    // lançamento novo desliza e brilha
    const ids = new Set([...root.querySelectorAll("button[data-e]")].map(b => b.dataset.e));
    if (!enter) {
      ids.forEach(id => {
        if (!prevIds.has(id)) {
          const b = root.querySelector('button[data-e="' + id + '"]');
          if (b && b.closest(".li")) b.closest(".li").classList.add("fresh");
        }
      });
    }
    prevIds = ids;

    // formulário aparece com "pop"
    const fm = document.getElementById("fm");
    if (fm && !hadForm && !first) fm.classList.add("pop");
    hadForm = !!fm;

    // botão + entra girando
    const nw = document.getElementById("nw");
    if (nw && enter) nw.classList.add("pop");

    prevCur = cur;
    prevTab = tab;
  }

  const baseRender = render;
  render = function () {
    baseRender.apply(this, arguments);
    document.querySelectorAll("#app .card").forEach((c, i) => { c.dataset.sp = i % 5; });
    try { polish(); } catch (err) { console.warn("animação:", err); }
  };

  // onda ao tocar nos botões
  document.addEventListener("pointerdown", ev => {
    const b = ev.target.closest && ev.target.closest("button");
    if (!b || b.disabled || reduce) return;
    const r = b.getBoundingClientRect(), s = Math.max(r.width, r.height) * 2;
    const sp = document.createElement("span");
    sp.className = "rip";
    sp.style.cssText = "width:" + s + "px;height:" + s + "px;left:" + (ev.clientX - r.left - s / 2) + "px;top:" + (ev.clientY - r.top - s / 2) + "px";
    b.appendChild(sp);
    sp.addEventListener("animationend", () => sp.remove());
  }, {passive: true});
})();

iniciarSistema();