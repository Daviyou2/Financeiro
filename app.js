const CATS = ["Moradia","Mercado","Transporte","Lazer","Saúde","Contas","Outros"];
const MN = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const $ = s => document.querySelector(s);
const R = v => (v < 0 ? "-" : "") + "R$ " + Math.abs(v).toLocaleString("pt-BR", {minimumFractionDigits: 2, maximumFractionDigits: 2});
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const today = () => new Date().toISOString().slice(0, 10);
const label = m => MN[+m.slice(5) - 1] + "/" + m.slice(2, 4);
const shift = (m, d) => {
  const [y, mo] = m.split("-").map(Number);
  const t = new Date(y, mo - 1 + d, 1);
  return t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, "0");
};

/* ---------- Armazenamento (fica neste navegador) ---------- */
let tx = JSON.parse(localStorage.getItem("fin_tx") || "[]");
let cur = today().slice(0, 7);
const save = () => localStorage.setItem("fin_tx", JSON.stringify(tx));

/* ---------- Senha ---------- */
async function hash(s) {
  try {
    const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("casal:" + s));
    return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
  } catch (e) {
    // plano B para navegadores que bloqueiam crypto.subtle (ex.: página aberta fora de https)
    let h = 5381;
    for (const c of "casal:" + s) h = ((h << 5) + h + c.charCodeAt(0)) >>> 0;
    return "f" + h.toString(16);
  }
}

function lock() {
  const saved = localStorage.getItem("fin_pw");
  $("#app").innerHTML = `<div class="lock card"><h1>💰 Nosso Controle</h1>
    <p class="note">${saved ? "Digite a senha do casal" : "Primeiro acesso: crie a senha de vocês"}</p>
    <input id="pw" type="password" placeholder="Senha">
    <button id="go" style="width:100%">${saved ? "Entrar" : "Criar senha"}</button>
    <p id="er" class="out"></p></div>`;
  const go = async () => {
    try {
      const p = $("#pw").value;
      if (p.length < 4) return $("#er").textContent = "Mínimo 4 caracteres";
      const h = await hash(p);
      if (!saved) localStorage.setItem("fin_pw", h);
      else if (h !== saved) return $("#er").textContent = "Senha incorreta";
      sessionStorage.setItem("fin_ok", "1");
      render();
    } catch (e) {
      $("#er").textContent = "Erro: " + e.message;
    }
  };
  $("#go").onclick = go;
  $("#pw").onkeydown = e => e.key === "Enter" && go();
  $("#pw").focus();
}

/* ---------- Cálculos ---------- */
const inM = m => tx.filter(t => t.date.slice(0, 7) === m);
const sum = a => a.reduce((s, t) => s + t.value, 0);
const outs = a => a.filter(t => t.type === "out");
const ins = a => a.filter(t => t.type === "in");

function byCat(a) {
  const o = {};
  a.forEach(t => o[t.cat] = (o[t.cat] || 0) + t.value);
  return Object.entries(o).sort((x, y) => y[1] - x[1]);
}

function bars(list) {
  const mx = Math.max(1, ...list.map(x => x[1]));
  if (!list.length) return '<p class="note">Sem dados ainda.</p>';
  return list.map(([n, v]) => `<div class="bar"><span class="n">${esc(n)}</span>
    <span class="t"><i style="width:${v / mx * 100}%"></i></span><span class="s">${R(v)}</span></div>`).join("");
}

// Previsão do mês seguinte: fixos do mês atual + média dos variáveis dos últimos 3 meses
function project(m) {
  const fx = inM(m).filter(t => t.fixed);
  const fixOut = sum(outs(fx)), fixIn = sum(ins(fx));
  const prev = [0, -1, -2].map(i => shift(m, i));
  const n = prev.filter(p => inM(p).length).length || 1;
  const cats = {};
  prev.forEach(p => outs(inM(p)).filter(t => !t.fixed).forEach(t => cats[t.cat] = (cats[t.cat] || 0) + t.value));
  const varList = Object.entries(cats).map(([k, v]) => [k, v / n]).sort((a, b) => b[1] - a[1]);
  const varOut = varList.reduce((s, x) => s + x[1], 0);
  const inc = fixIn || prev.reduce((s, p) => s + sum(ins(inM(p))), 0) / n;
  return {fixOut, varOut, inc, varList, save: inc - fixOut - varOut};
}

/* ---------- Tela ---------- */
function render() {
  if (sessionStorage.getItem("fin_ok") !== "1") return lock();
  const a = inM(cur), i = sum(ins(a)), o = sum(outs(a)), cats = byCat(outs(a));
  const p = project(cur), nx = shift(cur, 1);
  const months = [5,4,3,2,1,0].map(k => shift(cur, -k));
  const sv = months.map(m => { const x = inM(m); return sum(ins(x)) - sum(outs(x)); });
  const mx = Math.max(1, ...sv.map(Math.abs));
  const top = cats[0];

  $("#app").innerHTML = `
  <div class="row top"><h1>💰 Nosso Controle</h1>
    <div class="row"><button class="g" id="pv">‹</button><b>${label(cur)}</b><button class="g" id="nx">›</button></div></div>

  <div class="card"><div class="g3">
    <div><div class="k">Entradas</div><div class="v in">${R(i)}</div></div>
    <div><div class="k">Gastos</div><div class="v out">${R(o)}</div></div>
    <div><div class="k">Sobrou</div><div class="v">${R(i - o)}</div></div></div></div>

  <div class="card"><h2>Novo lançamento</h2><div class="row">
    <select id="ty"><option value="out">Gasto</option><option value="in">Entrada</option></select>
    <input id="de" placeholder="Descrição">
    <input id="va" type="number" step="0.01" inputmode="decimal" placeholder="Valor">
    <select id="ca">${CATS.map(c => `<option>${c}</option>`).join("")}</select>
    <input id="da" type="date" value="${cur === today().slice(0, 7) ? today() : cur + "-01"}">
    <label class="row note"><input id="fx" type="checkbox" style="flex:0;min-width:0"> Fixo (repete todo mês)</label>
    <button id="ad">Adicionar</button></div></div>

  <div class="card"><h2>Onde estamos gastando mais</h2>
    ${top ? `<p class="note">Maior gasto: <b>${esc(top[0])}</b> (${Math.round(top[1] / o * 100)}% do total)</p>` : ""}
    ${bars(cats)}</div>

  <div class="card"><h2>Como fica em ${label(nx)} (previsão)</h2>
    <div class="g3">
      <div><div class="k">Entrada prevista</div><div class="v in">${R(p.inc)}</div></div>
      <div><div class="k">Gasto previsto</div><div class="v out">${R(p.fixOut + p.varOut)}</div></div>
      <div><div class="k">Deve sobrar</div><div class="v">${R(p.save)}</div></div></div>
    <p class="note">Fixos: ${R(p.fixOut)} + média dos variáveis (últimos 3 meses): ${R(p.varOut)}</p>
    ${bars(p.varList)}</div>

  <div class="card"><h2>Economia por mês</h2><div class="cols">
    ${sv.map((v, k) => `<div><span>${R(v).replace("R$ ", "")}</span>
      <b style="height:${Math.abs(v) / mx * 80}px;background:${v >= 0 ? "var(--in)" : "var(--out)"}"></b>${label(months[k])}</div>`).join("")}
  </div></div>

  <div class="card"><h2>Lançamentos de ${label(cur)}</h2>
    ${a.length ? [...a].sort((x, y) => y.date.localeCompare(x.date)).map(t => `<div class="li">
      <div>${esc(t.desc)} ${t.fixed ? "🔁" : ""}<br><small>${t.date.slice(8)}/${t.date.slice(5, 7)} · ${esc(t.cat)}</small></div>
      <div class="row"><b class="${t.type}">${t.type === "out" ? "-" : "+"}${R(t.value)}</b>
      <button data-d="${t.id}">✕</button></div></div>`).join("") : '<p class="note">Nada lançado neste mês.</p>'}</div>

  <div class="card"><h2>Backup</h2>
    <p class="note">Os dados ficam salvos neste navegador. Para levar para outro aparelho, exporte aqui e importe lá.</p>
    <div class="row"><button class="g" id="ex">Exportar</button>
    <button class="g" id="im">Importar</button>
    <button class="g" id="sair">Sair</button></div></div>`;

  $("#pv").onclick = () => { cur = shift(cur, -1); render(); };
  $("#nx").onclick = () => { cur = shift(cur, 1); render(); };
  $("#sair").onclick = () => { sessionStorage.removeItem("fin_ok"); render(); };

  $("#ad").onclick = () => {
    const v = parseFloat($("#va").value);
    if (!(v > 0) || !$("#da").value) return;
    tx.push({id: Date.now().toString(36), type: $("#ty").value, desc: $("#de").value.trim(),
      value: v, cat: $("#ca").value, date: $("#da").value, fixed: $("#fx").checked});
    save(); render();
  };
  document.querySelectorAll("[data-d]").forEach(b => b.onclick = () => {
    if (confirm("Apagar lançamento?")) { tx = tx.filter(t => t.id !== b.dataset.d); save(); render(); }
  });

  $("#ex").onclick = () => {
    const blob = new Blob([JSON.stringify(tx)], {type: "application/json"});
    const l = document.createElement("a");
    l.href = URL.createObjectURL(blob); l.download = "controle-financeiro.json"; l.click();
  };
  $("#im").onclick = () => {
    const f = document.createElement("input"); f.type = "file"; f.accept = ".json";
    f.onchange = async () => {
      try {
        const data = JSON.parse(await f.files[0].text());
        if (!Array.isArray(data)) throw 0;
        if (confirm("Isso substitui os dados deste aparelho. Continuar?")) { tx = data; save(); render(); }
      } catch { alert("Arquivo inválido."); }
    };
    f.click();
  };
}

render();
