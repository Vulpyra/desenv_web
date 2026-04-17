document.addEventListener('DOMContentLoaded', () => {
    //  NAVEGAÇÃO E VISIBILIDADE 
    const simBtn = document.getElementById('sim-btn');
    const toggleBtn = document.getElementById('toggle-visibility');
    let valoresOcultos = false;

    if (simBtn) simBtn.addEventListener('click', () => window.location.href = 'src/pages/simulado/simulado.html');

    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            valoresOcultos = !valoresOcultos;
            document.querySelectorAll('.hide-value').forEach(el => {
                el.classList.toggle('value-hidden', valoresOcultos);
            });
            toggleBtn.classList.toggle('fa-eye', !valoresOcultos);
            toggleBtn.classList.toggle('fa-eye-slash', valoresOcultos);
        });
    }

    //  GRÁFICO ESTÁTICO (ROSCA) 
    const rootStyles = getComputedStyle(document.documentElement);
    const colorA = rootStyles.getPropertyValue('--chart-a').trim();
    const colorB = rootStyles.getPropertyValue('--chart-b').trim();
    const bgColor = rootStyles.getPropertyValue('--bg-mid').trim();
    const textColor = rootStyles.getPropertyValue('--text-main').trim();

    const canvasRenda = document.getElementById('rendaChart');
    if (canvasRenda) {
        new Chart(canvasRenda.getContext('2d'), {
            type: 'doughnut',
            data: { labels: ['Não dedutível', 'Dedutível'], datasets: [{ data: [45, 55], backgroundColor: [colorA, colorB], borderWidth: 3, borderColor: bgColor }] },
            options: { responsive: true, maintainAspectRatio: false, cutout: '75%', plugins: { legend: { display: false } } }
        });
    }

    
    // SISTEMA DE MODAL COM MÁSCARA
    
    function mascaraMoeda(evento) {
        let input = evento.target;
        let valor = input.value.replace(/\D/g, ''); 
        if (valor === '') valor = '0';
        valor = (parseInt(valor, 10) / 100).toFixed(2); 
        input.value = 'R$ ' + parseFloat(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function parseValorMoeda(valorStr) {
        if (!valorStr) return NaN;
        let apenasDigitos = valorStr.replace(/\D/g, '');
        if (apenasDigitos === '') return NaN;
        return parseInt(apenasDigitos, 10) / 100;
    }

    function abrirModal(titulo, campos) {
        return new Promise((resolve) => {
            const modal = document.getElementById('custom-modal');
            const titleEl = document.getElementById('modal-title');
            const bodyEl = document.getElementById('modal-body');
            const btnConfirm = document.getElementById('modal-confirm');
            const btnCancel = document.getElementById('modal-cancel');

            titleEl.innerText = titulo;
            bodyEl.innerHTML = '';
            const inputs = [];

            campos.forEach(campo => {
                const input = document.createElement('input');
                input.type = 'text'; 
                input.placeholder = campo.placeholder;
                input.className = 'modal-input';
                
                if (campo.isCurrency) {
                    input.addEventListener('input', mascaraMoeda);
                    if (campo.value !== undefined && campo.value !== '') {
                        input.value = (parseFloat(campo.value) * 100).toFixed(0);
                        input.dispatchEvent(new Event('input')); 
                    }
                } else if (campo.value) { input.value = campo.value; }

                bodyEl.appendChild(input);
                inputs.push(input);
            });

            modal.classList.remove('hidden');
            if(inputs.length > 0) inputs[0].focus();

            const novoBtnConfirm = btnConfirm.cloneNode(true);
            const novoBtnCancel = btnCancel.cloneNode(true);
            btnConfirm.parentNode.replaceChild(novoBtnConfirm, btnConfirm);
            btnCancel.parentNode.replaceChild(novoBtnCancel, btnCancel);

            function fecharModal() { modal.classList.add('hidden'); }

            novoBtnConfirm.addEventListener('click', () => {
                const valores = inputs.map(i => i.value.trim());
                fecharModal(); resolve(valores);
            });
            novoBtnCancel.addEventListener('click', () => { fecharModal(); resolve(null); });
        });
    }

    
    // ESTADO GLOBAL E BANCO DE DADOS LOCAL
   
    let patrimonioManual = 0;
    let rendas = [];
    let despesas = [];
    let metas = [];
    let histLabels = [];
    let histDados = [];
    let transacoes = []; 

    function carregarDados() {
        const dadosSalvos = localStorage.getItem('dashboardData');
        if (dadosSalvos) {
            const dados = JSON.parse(dadosSalvos);
            patrimonioManual = dados.patrimonioManual || 0;
            rendas = dados.rendas || [];
            despesas = (dados.despesas || []).map(d => ({...d, isFixa: d.isFixa || false}));
            metas = dados.metas || [];
            histLabels = dados.histLabels || [];
            histDados = dados.histDados || [];
            transacoes = dados.transacoes || [];
        }
    }

    function salvarDados() {
        const dados = { patrimonioManual, rendas, despesas, metas, histLabels, histDados, transacoes };
        localStorage.setItem('dashboardData', JSON.stringify(dados));
    }

    const elPatrimonio = document.getElementById('card-patrimonio');
    const elRenda = document.getElementById('card-renda');
    const elDespesa = document.getElementById('card-despesa');

    function formatarMoeda(valor) {
        return 'R$ ' + valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    }

    function getDataHoraAtual() {
        return new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    }

    function atualizarCards() {
        const totalRenda = rendas.reduce((soma, r) => soma + r.valor, 0);
        const totalDespesa = despesas.reduce((soma, d) => soma + d.valor, 0);
        elPatrimonio.innerText = formatarMoeda(patrimonioManual);
        elRenda.innerText = formatarMoeda(totalRenda);
        elDespesa.innerText = formatarMoeda(totalDespesa);
        salvarDados(); 
    }

    //  BOTÃO DE ZERAR TUDO (SISTEMA COMPLETO) 
    document.getElementById('btn-clear-all')?.addEventListener('click', () => {
        if(confirm('ATENÇÃO: Você está prestes a apagar todos os dados. Deseja continuar?')) {
            localStorage.removeItem('dashboardData');
            patrimonioManual = 0;
            rendas = []; despesas = []; metas = []; histLabels = []; histDados = []; transacoes = [];
            renderizarListaFixas(); renderizarTransacoes(); renderizarMetas(); renderizarGraficoEvolucao(); atualizarCards();
        }
    });

    //  1. TRANSAÇÕES RECENTES 
    const listaTransacoesEl = document.getElementById('lista-transacoes');
    
    function registrarTransacao(tipo, nome, valor, refId) {
        transacoes.unshift({ id: Date.now(), tipo, nome, valor, refId, data: getDataHoraAtual() });
        if (transacoes.length > 50) transacoes.pop(); 
        renderizarTransacoes();
    }

    function renderizarTransacoes() {
        if(!listaTransacoesEl) return;
        listaTransacoesEl.innerHTML = '';
        
        if(transacoes.length === 0) {
            listaTransacoesEl.innerHTML = '<p style="color: var(--text-soft); font-size: 0.9rem; text-align: center; margin-top: 30px;">Nenhuma movimentação.</p>';
            return;
        }

        transacoes.forEach(t => {
            const li = document.createElement('li');
            li.className = 'transaction-item';
            const sinal = t.tipo === 'renda' ? '+' : '-';
            const classeCor = t.tipo === 'renda' ? 'positive' : 'negative';
            const classeOculta = valoresOcultos ? 'value-hidden' : '';

            li.innerHTML = `
                <div class="transaction-info">
                    <span class="transaction-title">${t.nome}</span>
                    <span class="transaction-date">${t.data}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 12px;">
                    <span class="transaction-value ${classeCor} hide-value ${classeOculta}">
                        ${sinal} ${formatarMoeda(t.valor)}
                    </span>
                    <button class="btn-remove" onclick="removerTransacao(${t.id})" style="padding: 2px;" title="Apagar e Estornar">
                        <i class="fas fa-trash" style="font-size: 0.85rem;"></i>
                    </button>
                </div>
            `;
            listaTransacoesEl.appendChild(li);
        });
    }

    window.removerTransacao = (idTransacao) => {
        const tr = transacoes.find(x => x.id === idTransacao);
        if(!tr) return;
        
        if (tr.refId) {
            if(tr.tipo === 'renda') rendas = rendas.filter(r => r.id !== tr.refId);
            else if (tr.tipo === 'despesa') despesas = despesas.filter(d => d.id !== tr.refId);
        }
        transacoes = transacoes.filter(x => x.id !== idTransacao);
        
        renderizarListaFixas(); renderizarTransacoes(); atualizarCards();
    };

    document.getElementById('btn-clear-transactions')?.addEventListener('click', () => {
        if(confirm('Tem certeza que deseja limpar APENAS o histórico visual de transações?')) {
            transacoes = []; salvarDados(); renderizarTransacoes();
        }
    });

    // 2. PATRIMÔNIO 
    document.getElementById('btn-edit-patrimonio')?.addEventListener('click', async () => {
        const resposta = await abrirModal('Editar Patrimônio', [
            { placeholder: 'Novo valor do Patrimônio', value: patrimonioManual, isCurrency: true }
        ]);
        if (resposta && resposta[0]) {
            const num = parseValorMoeda(resposta[0]);
            if (!isNaN(num)) {
                patrimonioManual = num;
                atualizarCards();
            }
        }
    });

    // 3. RENDAS E DESPESAS FIXAS 
    async function acaoAdicionarRenda() {
        const resposta = await abrirModal('Adicionar Renda', [
            { placeholder: 'Nome da origem (ex: Salário)' },
            { placeholder: 'Valor da Renda', isCurrency: true }
        ]);
        if (resposta) {
            const [nome, valorStr] = resposta;
            if (!nome || !valorStr) return alert('Todos os campos são obrigatórios!');
            const valor = parseValorMoeda(valorStr);
            if (isNaN(valor) || valor === 0) return alert('Insira um valor válido!');

            const novoId = Date.now();
            rendas.push({ id: novoId, nome, valor, icone: 'fa-money-bill-wave', cor: 'var(--accent-cyan)' });
            registrarTransacao('renda', nome, valor, novoId); 
            renderizarListaFixas();
        }
    }

    async function acaoAdicionarDespesaFixa() {
        const resposta = await abrirModal('Nova Despesa Fixa', [
            { placeholder: 'Nome da despesa (ex: Aluguel)' },
            { placeholder: 'Valor da despesa', isCurrency: true }
        ]);
        if (resposta) {
            const [nome, valorStr] = resposta;
            if (!nome || !valorStr) return alert('Preencha o nome e o valor!');
            const v = parseValorMoeda(valorStr);
            if (!isNaN(v) && v > 0) {
                const novoId = Date.now();
                despesas.push({ id: novoId, nome: nome, valor: v, isFixa: true });
                registrarTransacao('despesa', nome, v, novoId); 
                renderizarListaFixas();
            } else alert('Valor inválido!');
        }
    }

    document.getElementById('btn-add-renda-topo')?.addEventListener('click', acaoAdicionarRenda);
    document.getElementById('btn-add-renda')?.addEventListener('click', acaoAdicionarRenda);
    document.getElementById('btn-quick-receita')?.addEventListener('click', acaoAdicionarRenda);
    document.getElementById('btn-add-despesa-fixa')?.addEventListener('click', acaoAdicionarDespesaFixa);

    function renderizarListaFixas() {
        const lista = document.getElementById('lista-fixas');
        if(!lista) return;
        lista.innerHTML = '';
        
        rendas.forEach(r => {
            const li = document.createElement('li');
            const classeOculta = valoresOcultos ? 'value-hidden' : '';
            li.innerHTML = `
                <div><i class="fas ${r.icone}" style="color: ${r.cor};"></i> <span>${r.nome}</span></div>
                <div>
                    <span class="value hide-value ${classeOculta}">${formatarMoeda(r.valor)}</span>
                    <button class="btn-remove" onclick="removerRenda(${r.id})" title="Apagar Receita"><i class="fas fa-trash"></i></button>
                </div>
            `;
            lista.appendChild(li);
        });

        despesas.filter(d => d.isFixa).forEach(d => {
            const li = document.createElement('li');
            const classeOculta = valoresOcultos ? 'value-hidden' : '';
            li.innerHTML = `
                <div><i class="fas fa-file-invoice-dollar" style="color: var(--danger-soft);"></i> <span>${d.nome}</span></div>
                <div>
                    <span class="value hide-value ${classeOculta}" style="color: var(--danger-soft);">- ${formatarMoeda(d.valor)}</span>
                    <button class="btn-remove" onclick="removerDespesaFixa(${d.id})" title="Apagar Despesa Fixa"><i class="fas fa-trash"></i></button>
                </div>
            `;
            lista.appendChild(li);
        });

        atualizarCards();
    }

    window.removerRenda = (id) => { 
        rendas = rendas.filter(r => r.id !== id); 
        transacoes = transacoes.filter(t => !(t.tipo === 'renda' && t.refId === id));
        renderizarListaFixas(); renderizarTransacoes();
    };

    window.removerDespesaFixa = (id) => { 
        despesas = despesas.filter(d => d.id !== id); 
        transacoes = transacoes.filter(t => !(t.tipo === 'despesa' && t.refId === id));
        renderizarListaFixas(); renderizarTransacoes();
    };

    //  4. DESPESAS AVULSAS E ZERAR DESPESAS 
    async function acaoAdicionarDespesaAvulsa() {
        const resposta = await abrirModal('Despesa Avulsa', [
            { placeholder: 'Motivo (ex: Uber, Lanche)' },
            { placeholder: 'Valor da despesa', isCurrency: true }
        ]);
        if (resposta) {
            const [nome, valorStr] = resposta;
            if (!nome || !valorStr) return alert('Preencha o nome e o valor!');
            const v = parseValorMoeda(valorStr);
            if (!isNaN(v) && v > 0) {
                const novoId = Date.now();
                despesas.push({ id: novoId, nome: nome, valor: v, isFixa: false });
                registrarTransacao('despesa', nome, v, novoId); 
                atualizarCards();
            } else alert('Valor inválido!');
        }
    }

    document.getElementById('btn-add-despesa-topo')?.addEventListener('click', acaoAdicionarDespesaAvulsa);
    document.getElementById('btn-quick-despesa')?.addEventListener('click', acaoAdicionarDespesaAvulsa);

    // NOVO: ZERAR SOMENTE AS DESPESAS
    document.getElementById('btn-clear-despesas')?.addEventListener('click', () => {
        if(confirm('Tem certeza que deseja apagar TODAS as despesas (fixas e avulsas)? As receitas não serão afetadas.')) {
            despesas = [];
            transacoes = transacoes.filter(t => t.tipo !== 'despesa'); // Limpa histórico associado às despesas
            renderizarListaFixas();
            renderizarTransacoes();
            atualizarCards();
        }
    });

    //  5. METAS FINANCEIRAS 
    const listaMetasEl = document.getElementById('lista-metas');
    function renderizarMetas() {
        if(!listaMetasEl) return;
        listaMetasEl.innerHTML = '';
        if (metas.length === 0) {
            listaMetasEl.innerHTML = '<p style="color: var(--text-soft); font-size: 0.9rem; text-align: center;">Nenhuma meta cadastrada.</p>';
            return;
        }

        metas.forEach(meta => {
            const porcentagem = Math.min((meta.atual / meta.alvo) * 100, 100).toFixed(1);
            const div = document.createElement('div');
            div.className = 'goal-item';
            const classeOculta = valoresOcultos ? 'value-hidden' : '';
            div.innerHTML = `
                <div class="goal-header">
                    <span><i class="fas ${meta.icone}" style="margin-right: 8px;"></i>${meta.nome}</span>
                    <div>
                        <span class="hide-value ${classeOculta}">R$ ${meta.atual} / R$ ${meta.alvo}</span>
                        <button class="btn-remove" onclick="removerMeta(${meta.id})" style="margin-left: 5px;"><i class="fas fa-times"></i></button>
                    </div>
                </div>
                <div class="progress-container">
                    <div class="progress-bar" style="width: ${porcentagem}%; background: linear-gradient(90deg, ${meta.cor1}, ${meta.cor2});"></div>
                </div>
            `;
            listaMetasEl.appendChild(div);
        });
        salvarDados();
    }

    document.getElementById('btn-add-meta')?.addEventListener('click', async () => {
        const resposta = await abrirModal('Nova Meta', [
            { placeholder: 'Nome da Meta (ex: Viagem)' },
            { placeholder: 'Valor alvo/total', isCurrency: true },
            { placeholder: 'Valor atual guardado', isCurrency: true }
        ]);

        if(resposta) {
            const [nome, alvoStr, atualStr] = resposta;
            if(!nome || !alvoStr || !atualStr) return alert('Preencha todos os campos!');
            const alvo = parseValorMoeda(alvoStr);
            const atual = parseValorMoeda(atualStr);

            if (isNaN(alvo) || isNaN(atual)) return alert('Valores inválidos!');

            metas.push({ id: Date.now(), nome, atual, alvo, icone: 'fa-bullseye', cor1: 'var(--accent-sky)', cor2: 'var(--button-b)' });
            renderizarMetas();
        }
    });

    window.removerMeta = (id) => { metas = metas.filter(m => m.id !== id); renderizarMetas(); };

    //  6. EVOLUÇÃO PATRIMONIAL 
    let evolucaoChartInstance = null;
    function renderizarGraficoEvolucao() {
        const canvasEvolucao = document.getElementById('evolucaoChart');
        if (!canvasEvolucao) return;
        const ctx = canvasEvolucao.getContext('2d');
        if (evolucaoChartInstance) evolucaoChartInstance.destroy();
        if (histLabels.length === 0) return;

        const gradientFill = ctx.createLinearGradient(0, 0, 0, 300);
        gradientFill.addColorStop(0, 'rgba(113, 194, 217, 0.4)');
        gradientFill.addColorStop(1, 'rgba(113, 194, 217, 0.0)');

        evolucaoChartInstance = new Chart(ctx, {
            type: 'line',
            data: { labels: histLabels, datasets: [{ label: 'Patrimônio', data: histDados, borderColor: colorB, backgroundColor: gradientFill, borderWidth: 3, pointBackgroundColor: bgColor, pointBorderColor: colorB, pointBorderWidth: 2, pointRadius: 4, pointHoverRadius: 6, fill: true, tension: 0.4 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(10, 22, 52, 0.85)', titleColor: textColor, bodyColor: textColor, callbacks: { title: (context) => `Mês: ${context[0].label}`, label: (context) => ' ' + formatarMoeda(context.parsed.y) } } }, scales: { y: { grid: { color: 'rgba(170, 204, 238, 0.05)' }, ticks: { color: 'rgba(151, 171, 199, 0.7)', callback: function(v) { if (v >= 1000000) return (v / 1000000) + 'M'; if (v >= 1000) return (v / 1000) + 'k'; return v; } } }, x: { grid: { display: false }, ticks: { color: 'rgba(151, 171, 199, 0.7)' } } } }
        });
        salvarDados();
    }

    document.getElementById('btn-add-mes')?.addEventListener('click', async () => {
        const resposta = await abrirModal('Adicionar Evolução', [
            { placeholder: 'Mês (ex: Abr)' },
            { placeholder: 'Patrimônio no mês', isCurrency: true }
        ]);
        if (resposta) {
            const [mes, valorStr] = resposta;
            if(!mes || !valorStr) return alert('Preencha os campos!');
            const valor = parseValorMoeda(valorStr);
            if (isNaN(valor)) return alert('Valor inválido!');
            
            histLabels.push(mes);
            histDados.push(valor);
            renderizarGraficoEvolucao();
        }
    });

    document.getElementById('btn-clear-evolution')?.addEventListener('click', () => {
        if(confirm('Tem certeza que deseja limpar as linhas de Evolução Patrimonial?')) {
            histLabels = []; histDados = [];
            if(evolucaoChartInstance) { evolucaoChartInstance.destroy(); evolucaoChartInstance = null; }
            salvarDados();
        }
    });

    //  BOOT DO SISTEMA 
    carregarDados(); 
    renderizarListaFixas();
    renderizarMetas();
    renderizarGraficoEvolucao();
    renderizarTransacoes();
    atualizarCards();
});
