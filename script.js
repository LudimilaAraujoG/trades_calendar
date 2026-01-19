 const SUPABASE_URL = 'https://exfwthwnllmvxkhfsqyw.supabase.co';
        const SUPABASE_KEY = 'sb_publishable_4nPsA41nlfn1qG8Ggrmzvw_NmTGrme5';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let dataSalva = [];
let dataSelecionada = null;

const selYear = document.getElementById('selectYear');
const selAtivo = document.getElementById('selectAtivo');

// Configuração dos Selects
for (let y = 2021; y <= new Date().getFullYear(); y++) {
    selYear.innerHTML += `<option value="${y}">${y}</option>`;
}
selYear.value = new Date().getFullYear();
selYear.onchange = renderizarAno;
selAtivo.onchange = renderizarAno;

async function carregarTudo() {
    document.getElementById('status').innerText = "Sincronizando...";
    const { data: ativos } = await _supabase.from('ativos_cadastrados').select('nome');
    selAtivo.innerHTML = "";
    if (ativos) ativos.forEach(a => selAtivo.innerHTML += `<option value="${a.nome}">${a.nome}</option>`);

    const { data: replays } = await _supabase.from('replays').select('*');
    dataSalva = replays || [];
    renderizarAno();
    document.getElementById('status').innerText = "Atualizado";
}

function renderizarAno() {
    atualizarEstatisticas(); // <--- Adicione esta linha aqui
    const container = document.getElementById('yearContainer');
    container.innerHTML = "";
    const ano = parseInt(selYear.value);
    const ativoFiltro = selAtivo.value;
    const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

    meses.forEach((nome, i) => {
        const card = document.createElement('div');
        card.className = 'month-card';
        card.innerHTML = `
            <div class="month-name">${nome}</div>
            <div class="days-header">
                <div>D</div><div>S</div><div>T</div><div>Q</div><div>Q</div><div>S</div><div>S</div>
            </div>
            <div class="days-grid" id="grid-${i}"></div>
        `;
        container.appendChild(card);

        const grid = document.getElementById(`grid-${i}`);
        const inicioSemana = new Date(ano, i, 1).getDay();
        const totalDias = new Date(ano, i + 1, 0).getDate();

        for (let e = 0; e < inicioSemana; e++) {
            grid.innerHTML += `<div class="day empty"></div>`;
        }

        for (let d = 1; d <= totalDias; d++) {
            const dataID = `${ano}-${(i + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
            const replay = dataSalva.find(r => r.data === dataID && r.ativo === ativoFiltro);
            
            const div = document.createElement('div');
            div.className = 'day';
            div.innerText = d;

         if (replay) {
    const v = parseFloat(replay.valor) || 0;
    div.classList.add(v > 0 ? 'gain' : v < 0 ? 'loss' : 'zero');

    // --- PC (mouse) ---
    div.addEventListener('mouseenter', (e) =>
        mostrarTooltip(e, dataID, v, replay.obs)
    );
    div.addEventListener('mousemove', moverTooltip);
    div.addEventListener('mouseleave', removerTooltip);

    // --- ANDROID (touch longo) ---
    let touchTimer = null;

    div.addEventListener('touchstart', (e) => {
        touchTimer = setTimeout(() => {
            mostrarTooltip(e.touches[0], dataID, v, replay.obs);
        }, 450); // toque longo
    });

    div.addEventListener('touchend', () => {
        clearTimeout(touchTimer);
        removerTooltip();
    });

    div.addEventListener('touchmove', () => {
        clearTimeout(touchTimer);
        removerTooltip();
    });
}

// Clique universal (PC + Android)
div.addEventListener('click', () => {
    removerTooltip();
    abrirModalReplay(dataID, replay);
});


            grid.appendChild(div);
        }
    });
}

// --- FUNÇÕES DO TOOLTIP ---
function mostrarTooltip(e, data, valor, obs) {
    removerTooltip();
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.id = 'temp-tooltip';
    
    const cor = valor > 0 ? '#00ff00' : valor < 0 ? '#ff5555' : '#aaa';
    const emoji = valor > 0 ? '🚀' : valor < 0 ? '📉' : '⚖️';

    tooltip.innerHTML = `
        <div class="tooltip-header">
            <span>📅 ${data.split('-').reverse().join('/')}</span>
            <span>${emoji}</span>
        </div>
        <strong>Valor:</strong> <span style="color:${cor}">R$ ${valor.toLocaleString('pt-BR')}</span><br>
        <strong>Observação:</strong> ${obs || 'Sem notas'}
    `;
    document.body.appendChild(tooltip);
    moverTooltip(e);
}

function moverTooltip(e) {
    const t = document.getElementById('temp-tooltip');
    if (t) {
        t.style.left = (e.pageX + 10) + 'px';
        t.style.top = (e.pageY + 10) + 'px';
    }
}

function removerTooltip() {
    const t = document.getElementById('temp-tooltip');
    if (t) t.remove();
}

// --- FUNÇÕES DE MODAL E SALVAMENTO ---
function abrirModalReplay(dataID, replay) {
    dataSelecionada = dataID;
    document.getElementById('modalTitle').innerText = dataID.split('-').reverse().join('/');
    document.getElementById('modalObs').value = replay ? replay.obs : "";
    document.getElementById('modalValor').value = replay ? replay.valor : "";
    document.getElementById('btnExcluir').style.display = replay ? "block" : "none";
    document.getElementById('modalReplay').style.display = 'flex';
}

function fecharModais() { 
    document.querySelectorAll('.modal').forEach(m => m.style.display = 'none'); 
}

async function confirmarSalvar() {
    const obs = document.getElementById('modalObs').value;
    const valorRaw = document.getElementById('modalValor').value;
    const ativo = selAtivo.value;

    let valorLimpo = String(valorRaw).replace(/\./g, '').replace(',', '.');
    let valorFinal = parseFloat(valorLimpo) || 0;

    const { error } = await _supabase.from('replays').upsert([
        { data: dataSelecionada, ativo: ativo, obs: obs, valor: valorFinal }
    ], { onConflict: 'data, ativo' });

    if (error) alert("Erro: " + error.message);
    else { fecharModais(); carregarTudo(); }
}

async function salvarNovoAtivo() {
    const nome = document.getElementById('nomeNovoAtivo').value.toUpperCase().trim();
    if (nome) {
        await _supabase.from('ativos_cadastrados').insert([{ nome: nome }]);
        fecharModais(); carregarTudo();
    }
}

async function confirmarExcluir() {
    if (confirm("Apagar?")) {
        await _supabase.from('replays').delete().match({ data: dataSelecionada, ativo: selAtivo.value });
        fecharModais(); carregarTudo();
    }
}

async function apagarAtivoAtual() {
    if (confirm(`Apagar ${selAtivo.value}?`)) {
        await _supabase.from('ativos_cadastrados').delete().match({ nome: selAtivo.value });
        carregarTudo();
    }
}

function atualizarEstatisticas() {
    const ativoFiltro = selAtivo.value;
    const anoSelecionado = selYear.value;

    // 1. Filtrar todos os replays desse ativo (Independente do ano)
    const todosDoAtivo = dataSalva.filter(r => r.ativo === ativoFiltro);
    
    // 2. Filtrar apenas os replays deste ativo E do ano selecionado
    const doAno = todosDoAtivo.filter(r => r.data.startsWith(anoSelecionado));

    // Atualizar labels e valores do ANO
    document.getElementById('labelAno').innerText = `Resumo de ${anoSelecionado}`;
    document.getElementById('anoTotal').innerText = doAno.length;
    document.getElementById('anoGains').innerText = doAno.filter(r => parseFloat(r.valor) > 0).length;
    document.getElementById('anoLoss').innerText = doAno.filter(r => parseFloat(r.valor) < 0).length;

    // Atualizar valores do TOTAL HISTÓRICO
    document.getElementById('totalGeral').innerText = todosDoAtivo.length;
    document.getElementById('totalGains').innerText = todosDoAtivo.filter(r => parseFloat(r.valor) > 0).length;
    document.getElementById('totalLoss').innerText = todosDoAtivo.filter(r => parseFloat(r.valor) < 0).length;
}

// Cor do input dinâmica
document.getElementById('modalValor').addEventListener('input', (e) => {
    e.target.style.color = e.target.value.includes('-') ? "#ff5555" : "#00ff00";
});

carregarTudo();