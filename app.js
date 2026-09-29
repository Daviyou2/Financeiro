const SUPABASE_URL = 'https://ckcoymukqncylnjpcrxq.supabase.co';
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

const PASSWORD = "160225";

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
  const v = parseFloat(
    (prompt(q, d ?? "") || "").replace(",", ".")
  );

  return isNaN(v) ? null : v;
};

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

    who: t.who || ""
  };
};

let tx = [];

try {
  tx = JSON.parse(
    localStorage.getItem("fin_tx") || "[]"
  ).map(norm);
} catch {
  tx = [];
}

let cfg = {
  names: ["", ""],
  me: "",
  adj: 0,
  rules: {}
};

try {
  cfg = {
    ...cfg,
    ...JSON.parse(
      localStorage.getItem("fin_cfg") || "{}"
    )
  };
} catch {}

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
    y: window.scrollY
  };

  localStorage.setItem(
    "fin_ui",
    JSON.stringify(ui)
  );
};

const save = () => {
  localStorage.setItem(
    "fin_tx",
    JSON.stringify(tx)
  );

  localStorage.setItem(
    "fin_cfg",
    JSON.stringify(cfg)
  );

  saveUi();
};


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
const balNow = () => {
  const td = today();

  return (
    Number(cfg.adj || 0) +
    tx
      .filter(t =>
        t.done &&
        t.date <= td
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
const rule = m => {
  const keys = Object.keys(cfg.rules)
    .filter(x => x <= m)
    .sort();

  const k = keys.pop();

  if (k) {
    const r = cfg.rules[k];

    return {
      b: Number(r.b) || 0,
      s: [
        Number(r.s?.[0]) || 0,
        Number(r.s?.[1]) || 0,
        Number(r.s?.[2]) || 0
      ]
    };
  }

  return {
    b: 400,
    s: [200, 200, 0]
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
function flow(m) {
  const td = today();
  const end = monthEnd(m);

  let bal = balNow();

  const rows = tx
    .filter(t =>
      !t.done &&
      t.date > td &&
      t.date <= end
    )
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
   * Dinheiro que teoricamente pode ficar
   * protegido depois de reservar o orçamento.
   */
  const prot =
    sobra - r.b;

  return {
    a,
    r,
    sobra,
    spent,
    sp,
    rest,
    left,
    prot,
    perDay
  };
}


/* =========================================================
   TELA
   ========================================================= */

function render() {
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

      return (
        sum(ins(x)) -
        sum(outs(x))
      );
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
          <select id="cl">
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
              <label class="row note">
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


    <div class="row top">
      <span class="note">
        Lançando como
      </span>

      <select id="me" style="flex:0">
        ${opt(N, cfg.me)}
      </select>
    </div>


    <!-- SITUAÇÃO -->

    <div class="card">
      <h2>💰 Situação do mês</h2>

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
        lançamentos futuros ainda pendentes.
        O orçamento do casal é uma regra separada
        e não aumenta automaticamente quando sobra dinheiro.
      </p>


      <button class="g" id="eb">
        ✏️ Alterar orçamento
      </button>

    </div>


    <!-- ORÇAMENTO -->

    <div class="card">
      <h2>🛒 Quanto podemos gastar</h2>

      <div class="v big ${M.rest < 0 ? "out" : ""}">
        ${R(M.rest)}
      </div>

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
            <tr>
              <td>${esc(name)}</td>

              <td>
                ${R(M.r.s[i])}
              </td>

              <td>
                ${R(M.sp[i])}
              </td>

              <td
                class="${
                  M.r.s[i] - M.sp[i] < 0
                    ? "out"
                    : ""
                }"
              >
                ${R(M.r.s[i] - M.sp[i])}
              </td>
            </tr>
          `).join("")
        }
      </table>
    </div>


    ${form}


    <!-- FLUXO -->

    <div class="card">
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


              <button
                data-ok="${t.id}"
                title="${
                  t.type === "in"
                    ? "Marcar como recebido"
                    : "Marcar como pago"
                }"
              >
                ✓
              </button>

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

    <div class="card">
      <h2>
        Onde estamos gastando mais
      </h2>

      ${bars(cats)}
    </div>


    <!-- RESUMO -->

    <div class="card">
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

    <div class="card">
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

    <div class="card">
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
                      t.fixed
                        ? " 🔁"
                        : ""
                    }

                    ${
                      t.done
                        ? ""
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


                    <button
                      data-e="${t.id}"
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
    </div>


    <!-- BACKUP -->

    <div class="card">
      <h2>
        Backup
      </h2>

      <p class="note">
        Os dados ficam salvos neste navegador.
        Use Exportar para guardar uma cópia ou
        transferir os dados para outro aparelho.
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

        <button
          class="g"
          id="lk"
        >
          Bloquear
        </button>

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


  /* ---------- Quem está lançando ---------- */

  $("#me").onchange = ev => {
    cfg.me = ev.target.value;
    save();
  };


  /* ---------- Alterar orçamento ---------- */

  $("#eb").onclick = () => {
    const r = M.r;

    const b = num(
      "Orçamento do casal em " +
      label(cur) +
      " (R$)",
      r.b
    );

    if (b == null || b < 0) {
      return;
    }

    const a = num(
      "Parte de " +
      N[0] +
      " (R$)",
      r.s[0]
    );

    if (a == null || a < 0) {
      return;
    }

    const c = num(
      "Parte de " +
      N[1] +
      " (R$)",
      r.s[1]
    );

    if (c == null || c < 0) {
      return;
    }

    if (a + c > b) {
      alert(
        "As partes dos dois passam do orçamento total."
      );

      return;
    }

    cfg.rules[cur] = {
      b,
      s: [
        a,
        c,
        b - a - c
      ]
    };

    save();
    render();
  };


  /* ---------- Ajustar saldo ---------- */

  $("#sb").onclick = () => {
    const atual = balNow();

    const v = num(
      "Quanto tem na conta hoje? (R$)",
      atual
    );

    if (v == null) {
      return;
    }

    cfg.adj += v - atual;

    save();
    render();
  };


  /* ---------- Tipo do lançamento ---------- */

  if ($("#ty")) {
    $("#ty").onchange = ev => {
      if (editId) {
        return;
      }

      const kind =
        ev.target.value;

      if (kind === "entrada") {
        $("#dn").checked = true;
        $("#cl").value = "normal";
      }

      if (kind === "avulso") {
        $("#cl").value = "casal";
      }

      if (
        kind === "fixa" ||
        kind === "recorrente"
      ) {
        $("#cl").value = "normal";
      }
    };
  }


  /* ---------- Adicionar / editar ---------- */

  if ($("#ad")) {
    $("#ad").onclick = () => {
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
          Object.assign(
            item,
            base
          );

          /*
           * Mantém o fato de ser uma
           * recorrência antiga.
           */
          item.fixed =
            item.fixed || false;
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
        kind !== "avulso" &&
        kind !== "entrada";


      const total =
        repeat
          ? 12
          : 1;


      const groupId =
        Date.now().toString(36) +
        Math.random()
          .toString(36)
          .slice(2, 7);


      for (let k = 0; k < total; k++) {
        tx.push({
          id:
            groupId +
            "-" +
            k,

          ...base,

          date:
            addMonths(
              date,
              k
            ),

          /*
           * Apenas o primeiro mês
           * fica pago/recebido.
           *
           * Os próximos ficam
           * pendentes.
           */
          done:
            k === 0
              ? base.done
              : false,

          fixed:
            repeat,

          recurrenceId:
            repeat
              ? groupId
              : null,

          recurrenceIndex:
            repeat
              ? k
              : 0
        });
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
      button.onclick = () => {
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

          t.value = v;
        }

        t.done = true;

        save();
        render();
      };
    });


  /* ---------- Excluir ---------- */

  document
    .querySelectorAll("[data-d]")
    .forEach(button => {
      button.onclick = () => {
        const index =
          tx.findIndex(
            t =>
              t.id ===
              button.dataset.d
          );

        if (index < 0) {
          return;
        }

        const item =
          tx[index];

        const ok = confirm(
          `Excluir "${item.desc || item.cat}" no valor de ${R(item.value)}?`
        );

        if (!ok) {
          return;
        }

        tx.splice(
          index,
          1
        );

        undo.push({
          t: item,
          i: index
        });

        /*
         * Mantém no máximo 20
         * exclusões no histórico.
         */
        undo =
          undo.slice(-20);

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


  /* ---------- Bloquear ---------- */

  $("#lk").onclick = () => {
    localStorage.removeItem(
      "fin_ok"
    );

    sessionStorage.removeItem(
      "fin_ok"
    );

    lock();
  };


  /* ---------- Exportar ---------- */

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

        if (
          !confirm(
            "Isso vai substituir os lançamentos deste aparelho. Continuar?"
          )
        ) {
          return;
        }

        tx =
          list.map(norm);

        if (
          data.cfg &&
          typeof data.cfg === "object"
        ) {
          cfg = {
            ...cfg,
            ...data.cfg,
            rules:
              data.cfg.rules || {}
          };
        }

        if (
          data.ui?.cur &&
          /^\d{4}-\d{2}$/.test(
            data.ui.cur
          )
        ) {
          cur = data.ui.cur;
        }

        save();

        render();

        toast(
          "✅ Dados importados com sucesso"
        );

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

function doUndo() {
  const item =
    undo.pop();

  if (!item) {
    toast(
      "Nada para desfazer."
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
   SENHA
   ========================================================= */

function lock() {
  $("#app").innerHTML = `
    <div class="lock">

      <div
        style="
          font-size:42px;
          margin-bottom:10px
        "
      >
        💰
      </div>

      <h1>
        Nosso Controle
      </h1>

      <p class="note">
        Digite a senha para entrar
      </p>

      <input
        id="pw"
        type="password"
        inputmode="numeric"
        autocomplete="current-password"
        placeholder="Senha"
      >

      <label
        class="row note"
        style="justify-content:center"
      >
        <input
          id="kp"
          type="checkbox"
          style="flex:0;min-width:0"
          checked
        >

        Manter conectado neste aparelho
      </label>

      <button
        id="go"
        style="
          width:100%;
          margin-top:10px
        "
      >
        Entrar
      </button>

      <p
        class="note out"
        id="er"
        style="margin-top:10px"
      ></p>

    </div>
  `;


  const go = () => {
    const p =
      $("#pw").value;

    if (
      p !== PASSWORD
    ) {
      $("#er").textContent =
        "Senha incorreta.";

      $("#pw").value = "";

      $("#pw").focus();

      return;
    }


    const storage =
      $("#kp").checked
        ? localStorage
        : sessionStorage;

    storage.setItem(
      "fin_ok",
      "1"
    );

    start();
  };


  $("#go").onclick =
    go;


  $("#pw").onkeydown =
    ev => {
      if (
        ev.key === "Enter"
      ) {
        go();
      }
    };


  $("#pw").focus();
}


/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */

function start() {
  const logged =
    localStorage.getItem("fin_ok") ||
    sessionStorage.getItem("fin_ok");

  if (!logged) {
    lock();
    return;
  }

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

iniciarSistema();