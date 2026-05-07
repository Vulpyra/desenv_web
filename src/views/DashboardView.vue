<script setup>
import { onMounted } from "vue";

onMounted(() => {
  //  NAVEGAÇÃO E VISIBILIDADE
  const simBtn = document.getElementById("sim-btn");
  const toggleBtn = document.getElementById("toggle-visibility");
  let valoresOcultos = false;

  // Atualizado para o formato de rota do Vue/Vite (geralmente é só /simulado)
  if (simBtn)
    simBtn.addEventListener(
      "click",
      () => (window.location.href = "/simulado"),
    );

  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      valoresOcultos = !valoresOcultos;
      document.querySelectorAll(".hide-value").forEach((el) => {
        el.classList.toggle("value-hidden", valoresOcultos);
      });
      toggleBtn.classList.toggle("fa-eye", !valoresOcultos);
      toggleBtn.classList.toggle("fa-eye-slash", valoresOcultos);
    });
  }

  //  GRÁFICO ESTÁTICO (ROSCA)
  const rootStyles = getComputedStyle(document.documentElement);
  const colorA = rootStyles.getPropertyValue("--chart-a").trim();
  const colorB = rootStyles.getPropertyValue("--chart-b").trim();
  const bgColor = rootStyles.getPropertyValue("--bg-mid").trim();
  const textColor = rootStyles.getPropertyValue("--text-main").trim();

  const canvasRenda = document.getElementById("rendaChart");
  if (canvasRenda && typeof Chart !== "undefined") {
    new Chart(canvasRenda.getContext("2d"), {
      type: "doughnut",
      data: {
        labels: ["Não dedutível", "Dedutível"],
        datasets: [
          {
            data: [45, 55],
            backgroundColor: [colorA, colorB],
            borderWidth: 3,
            borderColor: bgColor,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "75%",
        plugins: { legend: { display: false } },
      },
    });
  }

  // SISTEMA DE MODAL COM MÁSCARA
  function mascaraMoeda(evento) {
    let input = evento.target;
    let valor = input.value.replace(/\D/g, "");
    if (valor === "") valor = "0";
    valor = (parseInt(valor, 10) / 100).toFixed(2);
    input.value =
      "R$ " +
      parseFloat(valor).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
  }

  function parseValorMoeda(valorStr) {
    if (!valorStr) return NaN;
    let apenasDigitos = valorStr.replace(/\D/g, "");
    if (apenasDigitos === "") return NaN;
    return parseInt(apenasDigitos, 10) / 100;
  }

  function abrirModal(titulo, campos) {
    return new Promise((resolve) => {
      const modal = document.getElementById("custom-modal");
      const titleEl = document.getElementById("modal-title");
      const bodyEl = document.getElementById("modal-body");
      const btnConfirm = document.getElementById("modal-confirm");
      const btnCancel = document.getElementById("modal-cancel");

      titleEl.innerText = titulo;
      bodyEl.innerHTML = "";
      const inputs = [];

      campos.forEach((campo) => {
        const input = document.createElement("input");
        input.type = "text";
        input.placeholder = campo.placeholder;
        input.className = "modal-input";

        if (campo.isCurrency) {
          input.addEventListener("input", mascaraMoeda);
          if (campo.value !== undefined && campo.value !== "") {
            input.value = (parseFloat(campo.value) * 100).toFixed(0);
            input.dispatchEvent(new Event("input"));
          }
        } else if (campo.value) {
          input.value = campo.value;
        }

        bodyEl.appendChild(input);
        inputs.push(input);
      });

      modal.classList.remove("hidden");
      if (inputs.length > 0) inputs[0].focus();

      const novoBtnConfirm = btnConfirm.cloneNode(true);
      const novoBtnCancel = btnCancel.cloneNode(true);
      btnConfirm.parentNode.replaceChild(novoBtnConfirm, btnConfirm);
      btnCancel.parentNode.replaceChild(novoBtnCancel, btnCancel);

      function fecharModal() {
        modal.classList.add("hidden");
      }

      novoBtnConfirm.addEventListener("click", () => {
        const valores = inputs.map((i) => i.value.trim());
        fecharModal();
        resolve(valores);
      });
      novoBtnCancel.addEventListener("click", () => {
        fecharModal();
        resolve(null);
      });
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
    const dadosSalvos = localStorage.getItem("dashboardData");
    if (dadosSalvos) {
      const dados = JSON.parse(dadosSalvos);
      patrimonioManual = dados.patrimonioManual || 0;
      rendas = dados.rendas || [];
      despesas = (dados.despesas || []).map((d) => ({
        ...d,
        isFixa: d.isFixa || false,
      }));
      metas = dados.metas || [];
      histLabels = dados.histLabels || [];
      histDados = dados.histDados || [];
      transacoes = dados.transacoes || [];
    }
  }

  function salvarDados() {
    const dados = {
      patrimonioManual,
      rendas,
      despesas,
      metas,
      histLabels,
      histDados,
      transacoes,
    };
    localStorage.setItem("dashboardData", JSON.stringify(dados));
  }

  const elPatrimonio = document.getElementById("card-patrimonio");
  const elRenda = document.getElementById("card-renda");
  const elDespesa = document.getElementById("card-despesa");

  function formatarMoeda(valor) {
    return "R$ " + valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
  }

  function getDataHoraAtual() {
    return new Date().toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
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
  document.getElementById("btn-clear-all")?.addEventListener("click", () => {
    if (
      confirm(
        "ATENÇÃO: Você está prestes a apagar todos os dados. Deseja continuar?",
      )
    ) {
      localStorage.removeItem("dashboardData");
      patrimonioManual = 0;
      rendas = [];
      despesas = [];
      metas = [];
      histLabels = [];
      histDados = [];
      transacoes = [];
      renderizarListaFixas();
      renderizarTransacoes();
      renderizarMetas();
      renderizarGraficoEvolucao();
      atualizarCards();
    }
  });

  //  1. TRANSAÇÕES RECENTES
  const listaTransacoesEl = document.getElementById("lista-transacoes");

  function registrarTransacao(tipo, nome, valor, refId) {
    transacoes.unshift({
      id: Date.now(),
      tipo,
      nome,
      valor,
      refId,
      data: getDataHoraAtual(),
    });
    if (transacoes.length > 50) transacoes.pop();
    renderizarTransacoes();
  }

  function renderizarTransacoes() {
    if (!listaTransacoesEl) return;
    listaTransacoesEl.innerHTML = "";

    if (transacoes.length === 0) {
      listaTransacoesEl.innerHTML =
        '<p style="color: var(--text-soft); font-size: 0.9rem; text-align: center; margin-top: 30px;">Nenhuma movimentação.</p>';
      return;
    }

    transacoes.forEach((t) => {
      const li = document.createElement("li");
      li.className = "transaction-item";
      const sinal = t.tipo === "renda" ? "+" : "-";
      const classeCor = t.tipo === "renda" ? "positive" : "negative";
      const classeOculta = valoresOcultos ? "value-hidden" : "";

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
    const tr = transacoes.find((x) => x.id === idTransacao);
    if (!tr) return;

    if (tr.refId) {
      if (tr.tipo === "renda") rendas = rendas.filter((r) => r.id !== tr.refId);
      else if (tr.tipo === "despesa")
        despesas = despesas.filter((d) => d.id !== tr.refId);
    }
    transacoes = transacoes.filter((x) => x.id !== idTransacao);

    renderizarListaFixas();
    renderizarTransacoes();
    atualizarCards();
  };

  document
    .getElementById("btn-clear-transactions")
    ?.addEventListener("click", () => {
      if (
        confirm(
          "Tem certeza que deseja limpar APENAS o histórico visual de transações?",
        )
      ) {
        transacoes = [];
        salvarDados();
        renderizarTransacoes();
      }
    });

  // 2. PATRIMÔNIO
  document
    .getElementById("btn-edit-patrimonio")
    ?.addEventListener("click", async () => {
      const resposta = await abrirModal("Editar Patrimônio", [
        {
          placeholder: "Novo valor do Patrimônio",
          value: patrimonioManual,
          isCurrency: true,
        },
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
    const resposta = await abrirModal("Adicionar Renda", [
      { placeholder: "Nome da origem (ex: Salário)" },
      { placeholder: "Valor da Renda", isCurrency: true },
    ]);
    if (resposta) {
      const [nome, valorStr] = resposta;
      if (!nome || !valorStr) return alert("Todos os campos são obrigatórios!");
      const valor = parseValorMoeda(valorStr);
      if (isNaN(valor) || valor === 0) return alert("Insira um valor válido!");

      const novoId = Date.now();
      rendas.push({
        id: novoId,
        nome,
        valor,
        icone: "fa-money-bill-wave",
        cor: "var(--accent-cyan)",
      });
      registrarTransacao("renda", nome, valor, novoId);
      renderizarListaFixas();
    }
  }

  async function acaoAdicionarDespesaFixa() {
    const resposta = await abrirModal("Nova Despesa Fixa", [
      { placeholder: "Nome da despesa (ex: Aluguel)" },
      { placeholder: "Valor da despesa", isCurrency: true },
    ]);
    if (resposta) {
      const [nome, valorStr] = resposta;
      if (!nome || !valorStr) return alert("Preencha o nome e o valor!");
      const v = parseValorMoeda(valorStr);
      if (!isNaN(v) && v > 0) {
        const novoId = Date.now();
        despesas.push({ id: novoId, nome: nome, valor: v, isFixa: true });
        registrarTransacao("despesa", nome, v, novoId);
        renderizarListaFixas();
      } else alert("Valor inválido!");
    }
  }

  document
    .getElementById("btn-add-renda-topo")
    ?.addEventListener("click", acaoAdicionarRenda);
  document
    .getElementById("btn-add-renda")
    ?.addEventListener("click", acaoAdicionarRenda);
  document
    .getElementById("btn-quick-receita")
    ?.addEventListener("click", acaoAdicionarRenda);
  document
    .getElementById("btn-add-despesa-fixa")
    ?.addEventListener("click", acaoAdicionarDespesaFixa);

  function renderizarListaFixas() {
    const lista = document.getElementById("lista-fixas");
    if (!lista) return;
    lista.innerHTML = "";

    rendas.forEach((r) => {
      const li = document.createElement("li");
      const classeOculta = valoresOcultos ? "value-hidden" : "";
      li.innerHTML = `
                <div><i class="fas ${r.icone}" style="color: ${r.cor};"></i> <span>${r.nome}</span></div>
                <div>
                    <span class="value hide-value ${classeOculta}">${formatarMoeda(r.valor)}</span>
                    <button class="btn-remove" onclick="removerRenda(${r.id})" title="Apagar Receita"><i class="fas fa-trash"></i></button>
                </div>
            `;
      lista.appendChild(li);
    });

    despesas
      .filter((d) => d.isFixa)
      .forEach((d) => {
        const li = document.createElement("li");
        const classeOculta = valoresOcultos ? "value-hidden" : "";
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
    rendas = rendas.filter((r) => r.id !== id);
    transacoes = transacoes.filter(
      (t) => !(t.tipo === "renda" && t.refId === id),
    );
    renderizarListaFixas();
    renderizarTransacoes();
  };

  window.removerDespesaFixa = (id) => {
    despesas = despesas.filter((d) => d.id !== id);
    transacoes = transacoes.filter(
      (t) => !(t.tipo === "despesa" && t.refId === id),
    );
    renderizarListaFixas();
    renderizarTransacoes();
  };

  //  4. DESPESAS AVULSAS E ZERAR DESPESAS
  async function acaoAdicionarDespesaAvulsa() {
    const resposta = await abrirModal("Despesa Avulsa", [
      { placeholder: "Motivo (ex: Uber, Lanche)" },
      { placeholder: "Valor da despesa", isCurrency: true },
    ]);
    if (resposta) {
      const [nome, valorStr] = resposta;
      if (!nome || !valorStr) return alert("Preencha o nome e o valor!");
      const v = parseValorMoeda(valorStr);
      if (!isNaN(v) && v > 0) {
        const novoId = Date.now();
        despesas.push({ id: novoId, nome: nome, valor: v, isFixa: false });
        registrarTransacao("despesa", nome, v, novoId);
        atualizarCards();
      } else alert("Valor inválido!");
    }
  }

  document
    .getElementById("btn-add-despesa-topo")
    ?.addEventListener("click", acaoAdicionarDespesaAvulsa);
  document
    .getElementById("btn-quick-despesa")
    ?.addEventListener("click", acaoAdicionarDespesaAvulsa);

  document
    .getElementById("btn-clear-despesas")
    ?.addEventListener("click", () => {
      if (
        confirm(
          "Tem certeza que deseja apagar TODAS as despesas (fixas e avulsas)? As receitas não serão afetadas.",
        )
      ) {
        despesas = [];
        transacoes = transacoes.filter((t) => t.tipo !== "despesa");
        renderizarListaFixas();
        renderizarTransacoes();
        atualizarCards();
      }
    });

  //  5. METAS FINANCEIRAS
  const listaMetasEl = document.getElementById("lista-metas");
  function renderizarMetas() {
    if (!listaMetasEl) return;
    listaMetasEl.innerHTML = "";
    if (metas.length === 0) {
      listaMetasEl.innerHTML =
        '<p style="color: var(--text-soft); font-size: 0.9rem; text-align: center;">Nenhuma meta cadastrada.</p>';
      return;
    }

    metas.forEach((meta) => {
      const porcentagem = Math.min((meta.atual / meta.alvo) * 100, 100).toFixed(
        1,
      );
      const div = document.createElement("div");
      div.className = "goal-item";
      const classeOculta = valoresOcultos ? "value-hidden" : "";
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

  document
    .getElementById("btn-add-meta")
    ?.addEventListener("click", async () => {
      const resposta = await abrirModal("Nova Meta", [
        { placeholder: "Nome da Meta (ex: Viagem)" },
        { placeholder: "Valor alvo/total", isCurrency: true },
        { placeholder: "Valor atual guardado", isCurrency: true },
      ]);

      if (resposta) {
        const [nome, alvoStr, atualStr] = resposta;
        if (!nome || !alvoStr || !atualStr)
          return alert("Preencha todos os campos!");
        const alvo = parseValorMoeda(alvoStr);
        const atual = parseValorMoeda(atualStr);

        if (isNaN(alvo) || isNaN(atual)) return alert("Valores inválidos!");

        metas.push({
          id: Date.now(),
          nome,
          atual,
          alvo,
          icone: "fa-bullseye",
          cor1: "var(--accent-sky)",
          cor2: "var(--button-b)",
        });
        renderizarMetas();
      }
    });

  window.removerMeta = (id) => {
    metas = metas.filter((m) => m.id !== id);
    renderizarMetas();
  };

  //  6. EVOLUÇÃO PATRIMONIAL
  let evolucaoChartInstance = null;
  function renderizarGraficoEvolucao() {
    const canvasEvolucao = document.getElementById("evolucaoChart");
    if (!canvasEvolucao || typeof Chart === "undefined") return;
    const ctx = canvasEvolucao.getContext("2d");
    if (evolucaoChartInstance) evolucaoChartInstance.destroy();
    if (histLabels.length === 0) return;

    const gradientFill = ctx.createLinearGradient(0, 0, 0, 300);
    gradientFill.addColorStop(0, "rgba(113, 194, 217, 0.4)");
    gradientFill.addColorStop(1, "rgba(113, 194, 217, 0.0)");

    evolucaoChartInstance = new Chart(ctx, {
      type: "line",
      data: {
        labels: histLabels,
        datasets: [
          {
            label: "Patrimônio",
            data: histDados,
            borderColor: colorB,
            backgroundColor: gradientFill,
            borderWidth: 3,
            pointBackgroundColor: bgColor,
            pointBorderColor: colorB,
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            fill: true,
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "rgba(10, 22, 52, 0.85)",
            titleColor: textColor,
            bodyColor: textColor,
            callbacks: {
              title: (context) => `Mês: ${context[0].label}`,
              label: (context) => " " + formatarMoeda(context.parsed.y),
            },
          },
        },
        scales: {
          y: {
            grid: { color: "rgba(170, 204, 238, 0.05)" },
            ticks: {
              color: "rgba(151, 171, 199, 0.7)",
              callback: function (v) {
                if (v >= 1000000) return v / 1000000 + "M";
                if (v >= 1000) return v / 1000 + "k";
                return v;
              },
            },
          },
          x: {
            grid: { display: false },
            ticks: { color: "rgba(151, 171, 199, 0.7)" },
          },
        },
      },
    });
    salvarDados();
  }

  document
    .getElementById("btn-add-mes")
    ?.addEventListener("click", async () => {
      const resposta = await abrirModal("Adicionar Evolução", [
        { placeholder: "Mês (ex: Abr)" },
        { placeholder: "Patrimônio no mês", isCurrency: true },
      ]);
      if (resposta) {
        const [mes, valorStr] = resposta;
        if (!mes || !valorStr) return alert("Preencha os campos!");
        const valor = parseValorMoeda(valorStr);
        if (isNaN(valor)) return alert("Valor inválido!");

        histLabels.push(mes);
        histDados.push(valor);
        renderizarGraficoEvolucao();
      }
    });

  document
    .getElementById("btn-clear-evolution")
    ?.addEventListener("click", () => {
      if (
        confirm(
          "Tem certeza que deseja limpar as linhas de Evolução Patrimonial?",
        )
      ) {
        histLabels = [];
        histDados = [];
        if (evolucaoChartInstance) {
          evolucaoChartInstance.destroy();
          evolucaoChartInstance = null;
        }
        salvarDados();
      }
    });

  // BOOT DO SISTEMA
  carregarDados();
  renderizarListaFixas();
  renderizarMetas();
  renderizarGraficoEvolucao();
  renderizarTransacoes();
  atualizarCards();
});
</script>

<template>
  <div class="bg-scene" aria-hidden="true">
    <span class="glow orb-a"></span>
    <span class="glow orb-b"></span>
    <span class="glow orb-c"></span>
    <span class="noise-layer"></span>
  </div>

  <div class="dashboard-shell">
    <span class="particle-stream" aria-hidden="true"></span>

    <div class="dashboard">
      <header class="top-bar">
        <div class="brand-mark" aria-label="Dashboard Financeiro">
          <span class="brand-text">Dashboard Financeiro</span>
        </div>
        <div class="top-icons">
          <i
            class="far fa-eye"
            id="toggle-visibility"
            title="Ocultar valores"
          ></i>
          <i class="far fa-user-circle"></i>
        </div>
      </header>

      <section class="stats-grid">
        <div class="stat-card">
          <div class="card-header-actions">
            <span class="label">Patrimônio</span>
            <button
              class="btn-icon-edit"
              id="btn-edit-patrimonio"
              title="Editar Patrimônio"
            >
              <i class="fas fa-pencil-alt"></i>
            </button>
          </div>
          <span class="value hide-value" id="card-patrimonio">R$ 0,00</span>
        </div>
        <div class="stat-card">
          <div class="card-header-actions">
            <span class="label">Renda Mensal</span>
            <button
              class="btn-icon-edit"
              id="btn-add-renda-topo"
              title="Adicionar Renda"
            >
              <i class="fas fa-plus"></i>
            </button>
          </div>
          <span class="value hide-value" id="card-renda">R$ 0,00</span>
        </div>
        <div class="stat-card">
          <div class="card-header-actions">
            <span class="label">Despesas Mensais</span>
            <div style="display: flex; gap: 4px">
              <button
                class="btn-icon-edit"
                id="btn-clear-despesas"
                title="Zerar Todas as Despesas"
                style="color: var(--danger-soft)"
              >
                <i class="fas fa-trash-alt"></i>
              </button>
              <button
                class="btn-icon-edit"
                id="btn-add-despesa-topo"
                title="Despesa Avulsa"
              >
                <i class="fas fa-plus"></i>
              </button>
            </div>
          </div>
          <span
            class="value hide-value"
            id="card-despesa"
            style="color: var(--danger-soft)"
            >R$ 0,00</span
          >
        </div>
        <div class="stat-card">
          <span class="label"
            >Renda declarada
            <span class="label-muted">(Limite Isenção)</span></span
          >
          <span class="value hide-value"
            >R$ 890,00 <span class="value-max">/ R$ 1.300,00</span></span
          >
          <div class="progress-container">
            <div class="progress-bar" style="width: 68%"></div>
          </div>
        </div>
      </section>

      <section class="main-content">
        <div class="glass-panel">
          <div
            class="chart-container"
            style="
              position: relative;
              height: 220px;
              width: 100%;
              margin: 0 auto;
            "
          >
            <canvas id="rendaChart"></canvas>
          </div>
          <div class="chart-labels">
            <div class="label-item left">
              <p>Não dedutível</p>
              <span>45%</span>
            </div>
            <div class="label-item right">
              <p>Dedutível</p>
              <span>55%</span>
            </div>
          </div>
        </div>

        <div class="glass-panel income-details">
          <div class="panel-header">
            <h3 class="panel-title">Receitas e Despesas Fixas</h3>
            <div style="display: flex; gap: 8px">
              <button
                class="btn-add"
                id="btn-add-renda"
                title="Adicionar Renda"
              >
                <i class="fas fa-plus"></i>
              </button>
              <button
                class="btn-add"
                id="btn-add-despesa-fixa"
                title="Adicionar Despesa Fixa"
                style="
                  color: var(--danger-soft);
                  border-color: rgba(255, 133, 153, 0.3);
                  background: rgba(255, 133, 153, 0.1);
                "
              >
                <i class="fas fa-minus"></i>
              </button>
            </div>
          </div>
          <ul class="detail-list" id="lista-fixas"></ul>
        </div>

        <div class="sidebar-actions">
          <div class="ai-suggestion-box">
            <div class="ai-header">
              <div class="icon-circle"><i class="fas fa-dollar-sign"></i></div>
              <h3>Sugestão da IA</h3>
            </div>
            <p>
              Invista R$ 500 em saúde e economize + R$ 1000 por mês de imposto.
            </p>
          </div>
          <div class="quick-actions">
            <button class="btn-outline" id="btn-quick-receita">
              <i class="fas fa-plus"></i> Receita
            </button>
            <button class="btn-outline" id="btn-quick-despesa">
              <i class="fas fa-plus"></i> Despesa Avulsa
            </button>
          </div>
          <button
            class="btn-main-action"
            id="sim-btn"
            style="margin-bottom: 12px"
          >
            Novo Simulado
          </button>
          <button
            class="btn-outline"
            id="btn-clear-all"
            style="
              width: 100%;
              color: var(--danger-soft);
              border-color: rgba(255, 133, 153, 0.3);
              background: rgba(255, 133, 153, 0.05);
            "
            title="Apagar todos os dados do sistema"
          >
            <i class="fas fa-power-off"></i> Zerar Todo o Sistema
          </button>
        </div>
      </section>

      <section class="bottom-content">
        <div class="glass-panel evolution-panel">
          <div class="panel-header">
            <h3 class="panel-title">Evolução Patrimonial</h3>
            <div style="display: flex; gap: 8px">
              <button class="btn-add" id="btn-add-mes" title="Adicionar Mês">
                <i class="fas fa-plus"></i>
              </button>
              <button
                class="btn-add"
                id="btn-clear-evolution"
                title="Limpar Gráfico"
                style="
                  color: var(--danger-soft);
                  border-color: rgba(255, 133, 153, 0.3);
                  background: rgba(255, 133, 153, 0.1);
                "
              >
                <i class="fas fa-trash-alt"></i>
              </button>
            </div>
          </div>
          <div
            class="chart-container"
            style="position: relative; height: 250px; width: 100%"
          >
            <canvas id="evolucaoChart"></canvas>
          </div>
        </div>

        <div class="glass-panel goals-panel">
          <div class="panel-header">
            <h3 class="panel-title">Metas Financeiras</h3>
            <button class="btn-add" id="btn-add-meta" title="Adicionar Meta">
              <i class="fas fa-plus"></i>
            </button>
          </div>
          <div
            id="lista-metas"
            style="display: flex; flex-direction: column; gap: 24px"
          ></div>
        </div>

        <div class="glass-panel transactions-panel">
          <div class="panel-header">
            <h3 class="panel-title">Transações Recentes</h3>
            <button
              class="btn-add"
              id="btn-clear-transactions"
              title="Limpar Histórico"
              style="
                color: var(--danger-soft);
                border-color: rgba(255, 133, 153, 0.3);
                background: rgba(255, 133, 153, 0.1);
              "
            >
              <i class="fas fa-broom"></i>
            </button>
          </div>
          <ul class="transaction-list" id="lista-transacoes"></ul>
        </div>
      </section>
    </div>
  </div>

  <div id="custom-modal" class="modal-overlay hidden">
    <div class="glass-panel modal-content">
      <h3 class="panel-title" id="modal-title">Título</h3>
      <div id="modal-body" class="modal-body"></div>
      <div class="modal-actions">
        <button
          id="modal-cancel"
          class="btn-outline"
          style="padding: 10px 20px"
        >
          Cancelar
        </button>
        <button
          id="modal-confirm"
          class="btn-main-action"
          style="padding: 10px 20px; font-size: 1rem; width: auto"
        >
          Confirmar
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
:root {
  --bg-deep: var(--lg-bg-deep);
  --bg-mid: var(--lg-bg-mid);
  --bg-end: var(--lg-bg-end);
  --glass-surface: var(--lg-glass-surface);
  --glass-soft: var(--lg-glass-soft);
  --glass-border: var(--lg-glass-border);
  --text-main: var(--lg-text-main);
  --text-soft: var(--lg-text-soft);
  --text-title: var(--lg-text-title);
  --accent-cyan: var(--lg-accent-cyan);
  --accent-sky: var(--lg-accent-sky);
  --accent-deep: var(--lg-accent-deep);
  --danger-soft: var(--lg-danger-soft);
  --chart-a: var(--lg-chart-a);
  --chart-b: var(--lg-chart-b);
  --button-a: var(--lg-button-a);
  --button-b: var(--lg-button-b);
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  font-family: "Plus Jakarta Sans", "Trebuchet MS", sans-serif;
}

body {
  background:
    radial-gradient(
      circle at 10% 15%,
      rgba(77, 131, 208, 0.17),
      transparent 32%
    ),
    radial-gradient(
      circle at 85% 20%,
      rgba(102, 183, 223, 0.12),
      transparent 36%
    ),
    linear-gradient(
      130deg,
      var(--bg-deep),
      var(--bg-mid) 48%,
      var(--bg-end) 100%
    );
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  overflow-y: auto;
  overflow-x: hidden;
  color: var(--text-main);
  padding: 24px;
}

/* Fundo Animado */
.bg-scene {
  position: fixed;
  inset: 0;
  pointer-events: none;
}
.glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(44px);
  opacity: 0.55;
  animation: drift 14s ease-in-out infinite;
}
.orb-a {
  width: 360px;
  height: 360px;
  top: -110px;
  right: 15%;
  background: rgba(116, 166, 223, 0.3);
}
.orb-b {
  width: 280px;
  height: 280px;
  bottom: 6%;
  left: 10%;
  background: rgba(95, 177, 205, 0.22);
  animation-delay: -5s;
}
.orb-c {
  width: 180px;
  height: 180px;
  top: 32%;
  right: 8%;
  background: rgba(118, 147, 211, 0.24);
  animation-delay: -2s;
}
.noise-layer {
  position: absolute;
  inset: 0;
  opacity: 0.06;
  background-image: radial-gradient(
    circle at center,
    #ffffff 0 1px,
    transparent 1px
  );
  background-size: 4px 4px;
}

/* Dashboard Base */
.dashboard-shell {
  position: relative;
  width: min(1400px, 100%);
  z-index: 1;
}

.dashboard {
  position: relative;
  background: linear-gradient(
    145deg,
    rgba(38, 67, 120, 0.31),
    rgba(10, 22, 52, 0.54)
  );
  border: 1px solid rgba(130, 185, 230, 0.3); /* Contorno leve */
  box-shadow:
    inset 0 1px 1px rgba(255, 255, 255, 0.22),
    inset 0 -20px 60px rgba(0, 0, 0, 0.24),
    0 22px 80px rgba(5, 10, 30, 0.7);
  backdrop-filter: blur(20px) saturate(135%);
  -webkit-backdrop-filter: blur(20px) saturate(135%);
  width: 100%;
  padding: 32px;
  border-radius: 26px;
  color: var(--text-main);
}

.top-bar {
  display: flex;
  justify-content: space-between;
  margin-bottom: 35px;
  font-size: 1.4rem;
  color: var(--accent-sky);
}
.top-icons {
  display: flex;
  gap: 18px;
}
#toggle-visibility {
  cursor: pointer;
}
.top-icons i {
  border: 1px solid rgba(130, 185, 230, 0.3);
  background: rgba(129, 178, 224, 0.08);
  border-radius: 12px;
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: 0.3s;
}
.top-icons i:hover {
  transform: translateY(-2px);
  border-color: rgba(204, 226, 246, 0.5);
  background: rgba(149, 194, 230, 0.14);
}

/* Grid de Status */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}
.stat-card {
  background: linear-gradient(
    145deg,
    rgba(105, 153, 215, 0.13),
    rgba(70, 119, 188, 0.1)
  );
  border: 1px solid rgba(130, 185, 230, 0.25);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.24),
    0 12px 40px rgba(1, 8, 24, 0.45);
  padding: 20px;
  border-radius: 22px;
  color: var(--text-title);
}
.stat-card .label {
  font-weight: 600;
  display: block;
  color: var(--text-soft);
}
.stat-card .value {
  font-size: 1.4rem;
  font-weight: 700;
  margin-top: 10px;
  display: block;
}
.value-hidden {
  filter: blur(7px);
  user-select: none;
}

.card-header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
}
.btn-icon-edit {
  background: transparent;
  border: none;
  color: var(--text-soft);
  cursor: pointer;
  font-size: 0.9rem;
  padding: 5px;
  transition: 0.2s;
}
.btn-icon-edit:hover {
  color: var(--accent-cyan);
  transform: scale(1.1);
}

/* Progresso Renda Isenção */
.label-muted {
  font-size: 0.75rem;
  color: var(--text-soft);
  font-weight: 400;
  margin-left: 4px;
}
.value-max {
  font-size: 1rem;
  color: var(--text-soft);
  font-weight: 500;
}
.progress-container {
  width: 100%;
  height: 8px;
  background: rgba(186, 219, 246, 0.1);
  border-radius: 6px;
  margin-top: 14px;
  overflow: hidden;
  border: 1px solid rgba(130, 185, 230, 0.2);
}
.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, var(--chart-a), var(--chart-b));
  border-radius: 6px;
  transition: 1s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 0 10px rgba(113, 194, 217, 0.4);
}

/* Painéis Glass (Reutilizável - Gráficos e Listas) */
.glass-panel {
  background: rgba(66, 108, 171, 0.08);
  border: 1px solid rgba(130, 185, 230, 0.25);
  border-radius: 26px;
  padding: 28px;
  display: flex;
  flex-direction: column;
  backdrop-filter: blur(10px);
}
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.panel-title {
  color: var(--text-title);
  font-size: 1.1rem;
  font-weight: 600;
}

.btn-add {
  background: rgba(113, 194, 217, 0.15);
  border: 1px solid rgba(113, 194, 217, 0.4);
  color: var(--accent-cyan);
  border-radius: 10px;
  width: 32px;
  height: 32px;
  cursor: pointer;
  transition: 0.25s;
  display: grid;
  place-items: center;
}
.btn-add:hover {
  background: rgba(113, 194, 217, 0.3);
  transform: scale(1.05);
  border-color: var(--accent-cyan);
}
.btn-remove {
  background: transparent;
  border: none;
  color: var(--danger-soft);
  cursor: pointer;
  opacity: 0.4;
  transition: 0.25s;
  padding: 5px;
  margin-left: 10px;
}
.btn-remove:hover {
  opacity: 1;
  transform: scale(1.1);
}

/* Grids do Meio e de Baixo */
.main-content {
  display: grid;
  grid-template-columns: 1fr 1.4fr 1fr;
  gap: 30px;
  align-items: stretch;
}
.bottom-content {
  display: grid;
  grid-template-columns: 1.8fr 1.1fr 1.1fr;
  gap: 30px;
  margin-top: 30px;
}

/* Listas (Renda e Metas) */
.detail-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 18px;
  flex-grow: 1;
  justify-content: center;
}
.detail-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(130, 185, 230, 0.15);
}
.detail-list li div {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--text-soft);
  font-size: 0.95rem;
  white-space: nowrap;
}
.detail-list li .value {
  color: var(--text-title);
  font-weight: 600;
}

.goal-item {
  display: flex;
  flex-direction: column;
}
.goal-header {
  display: flex;
  justify-content: space-between;
  font-size: 0.9rem;
  color: var(--text-soft);
  margin-bottom: 8px;
}
.goal-header span:last-child {
  color: var(--text-main);
  font-weight: 600;
}

/* Transações */
.transaction-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
  max-height: 250px;
  padding-right: 8px;
}
.transaction-list::-webkit-scrollbar {
  width: 6px;
}
.transaction-list::-webkit-scrollbar-thumb {
  background: rgba(113, 194, 217, 0.2);
  border-radius: 10px;
}
.transaction-list::-webkit-scrollbar-thumb:hover {
  background: rgba(113, 194, 217, 0.4);
}
.transaction-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px;
  background: rgba(10, 22, 52, 0.4);
  border: 1px solid rgba(130, 185, 230, 0.2);
  border-radius: 14px;
  transition: transform 0.2s;
}
.transaction-item:hover {
  transform: translateX(4px);
  background: rgba(10, 22, 52, 0.6);
  border-color: rgba(130, 185, 230, 0.4);
}
.transaction-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.transaction-title {
  color: var(--text-main);
  font-weight: 500;
  font-size: 0.95rem;
}
.transaction-date {
  color: var(--text-soft);
  font-size: 0.75rem;
}
.transaction-value {
  font-weight: 700;
  font-size: 1rem;
}
.transaction-value.positive {
  color: var(--accent-cyan);
}
.transaction-value.negative {
  color: var(--danger-soft);
}

/* IA e Botões */
.ai-suggestion-box {
  border: 1px solid rgba(130, 185, 230, 0.25);
  border-radius: 24px;
  background: linear-gradient(
    150deg,
    rgba(78, 130, 192, 0.17),
    rgba(49, 90, 151, 0.08)
  );
  padding: 25px;
  margin-bottom: 25px;
}
.ai-header {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 15px;
}
.ai-header h3 {
  color: var(--text-title);
  font-size: 1.08rem;
}
.icon-circle {
  border: 1px solid rgba(130, 185, 230, 0.3);
  background: rgba(97, 156, 209, 0.15);
  border-radius: 50%;
  width: 38px;
  height: 38px;
  display: flex;
  justify-content: center;
  align-items: center;
  color: var(--accent-cyan);
}
.quick-actions {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
}
.btn-outline {
  flex: 1;
  background: rgba(95, 145, 204, 0.08);
  border: 1px solid rgba(130, 185, 230, 0.3);
  color: var(--text-main);
  padding: 13px;
  border-radius: 15px;
  cursor: pointer;
  font-weight: 700;
  transition: 0.25s;
}
.btn-outline:hover {
  transform: translateY(-2px);
  background: rgba(111, 167, 221, 0.15);
  border-color: rgba(130, 185, 230, 0.5);
}
.btn-main-action {
  width: 100%;
  background: linear-gradient(135deg, var(--button-a), var(--button-b));
  color: #081f35;
  border: none;
  padding: 16px;
  border-radius: 18px;
  font-size: 1.28rem;
  font-weight: 800;
  cursor: pointer;
  transition: 0.25s;
}
.btn-main-action:hover {
  transform: translateY(-3px);
  box-shadow: 0 18px 36px rgba(80, 154, 219, 0.34);
}

/* Modal Customizado (Popups) */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(4, 11, 29, 0.7);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  z-index: 9999;
  display: flex;
  justify-content: center;
  align-items: center;
  opacity: 1;
  transition: opacity 0.3s ease;
}
.modal-overlay.hidden {
  display: none;
  opacity: 0;
}
.modal-content {
  width: 90%;
  max-width: 420px;
  padding: 30px;
  border: 1px solid rgba(130, 185, 230, 0.35);
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
  transform: translateY(0);
  animation: modalSlideIn 0.3s ease-out forwards;
}
@keyframes modalSlideIn {
  from {
    transform: translateY(20px) scale(0.95);
    opacity: 0;
  }
  to {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
}
.modal-body {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 25px;
}
.modal-input {
  background: rgba(10, 22, 52, 0.4);
  border: 1px solid rgba(130, 185, 230, 0.25);
  color: var(--text-main);
  padding: 14px;
  border-radius: 12px;
  font-size: 1rem;
  width: 100%;
  outline: none;
  transition: 0.2s;
}
.modal-input:focus {
  border-color: var(--accent-cyan);
  box-shadow: 0 0 0 3px rgba(113, 194, 217, 0.15);
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* Responsividade Aprimorada */

/* Desktop grande - até 1400px */
@media (max-width: 1400px) {
  .main-content {
    grid-template-columns: 1fr 1fr;
  }
  .sidebar-actions {
    grid-column: span 2;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    align-items: center;
  }
  .bottom-content {
    grid-template-columns: 1fr 1fr;
  }
  .transactions-panel {
    grid-column: span 2;
  }
}

/* Desktop médio/Tablet landscape - até 1200px */
@media (max-width: 1200px) {
  .dashboard-shell {
    width: 100%;
  }
  .dashboard {
    padding: 28px;
  }
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }
  .stat-card .value {
    font-size: 1.2rem;
  }
}

/* Tablet - até 992px */
@media (max-width: 992px) {
  body {
    padding: 16px;
  }
  .dashboard {
    padding: 24px;
    border-radius: 22px;
  }
  .main-content,
  .bottom-content,
  .sidebar-actions {
    grid-template-columns: 1fr;
    gap: 24px;
  }
  .transactions-panel,
  .sidebar-actions {
    grid-column: span 1;
  }
  .sidebar-actions {
    display: flex;
    flex-direction: column;
  }
  .ai-suggestion-box {
    padding: 20px;
    margin-bottom: 20px;
  }
  .glass-panel {
    padding: 22px;
  }
  .top-bar {
    font-size: 1.2rem;
    margin-bottom: 28px;
  }
  .chart-container {
    height: 200px !important;
  }
}

/* Tablet pequeno - até 850px */
@media (max-width: 850px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .bottom-content {
    grid-template-columns: 1fr;
  }
  .evolution-panel .chart-container {
    height: 220px !important;
  }
}

/* Mobile landscape - até 768px */
@media (max-width: 768px) {
  body {
    padding: 12px;
  }
  .dashboard {
    padding: 20px;
    border-radius: 20px;
  }
  .top-bar {
    flex-wrap: wrap;
    gap: 12px;
    font-size: 1.1rem;
    margin-bottom: 24px;
  }
  .brand-text {
    font-size: 1rem;
  }
  .top-icons {
    gap: 12px;
  }
  .top-icons i {
    width: 40px;
    height: 40px;
  }
  .stats-grid {
    grid-template-columns: 1fr;
    gap: 14px;
    margin-bottom: 24px;
  }
  .stat-card {
    padding: 16px;
    border-radius: 18px;
  }
  .stat-card .value {
    font-size: 1.3rem;
    margin-top: 8px;
  }
  .glass-panel {
    padding: 18px;
    border-radius: 20px;
  }
  .panel-title {
    font-size: 1rem;
  }
  .chart-container {
    height: 180px !important;
  }
  .detail-list {
    gap: 14px;
  }
  .detail-list li {
    padding-bottom: 10px;
    font-size: 0.9rem;
  }
  .transaction-list {
    max-height: 300px;
  }
  .transaction-item {
    padding: 12px;
    border-radius: 12px;
  }
  .modal-content {
    width: 95%;
    max-width: 380px;
    padding: 24px;
  }
  .modal-input {
    padding: 12px;
  }
  .btn-main-action {
    font-size: 1.1rem;
    padding: 14px;
  }
  .btn-outline {
    padding: 12px;
  }
  .quick-actions {
    gap: 12px;
  }
}

/* Mobile - até 576px */
@media (max-width: 576px) {
  body {
    padding: 8px;
  }
  .dashboard {
    padding: 16px;
    border-radius: 18px;
  }
  .top-bar {
    margin-bottom: 20px;
  }
  .brand-text {
    font-size: 0.95rem;
  }
  .top-icons i {
    width: 36px;
    height: 36px;
    font-size: 0.9rem;
  }
  .card-header-actions {
    flex-wrap: wrap;
    gap: 8px;
  }
  .progress-container {
    margin-top: 10px;
  }
  .chart-labels {
    flex-direction: column;
    gap: 12px;
    align-items: center;
    margin-top: 18px;
  }
  .label-item.left,
  .label-item.right {
    text-align: center;
  }
  .ai-header h3 {
    font-size: 1rem;
  }
  .goal-header {
    flex-direction: column;
    gap: 6px;
    align-items: flex-start;
  }
  .modal-actions {
    flex-direction: column;
  }
  .modal-actions button {
    width: 100%;
  }
}

/* Mobile pequeno - até 480px */
@media (max-width: 480px) {
  body {
    padding: 6px;
  }
  .dashboard {
    padding: 14px;
    border-radius: 16px;
  }
  .dashboard-shell {
    width: 100%;
  }
  .top-bar {
    font-size: 1rem;
    gap: 10px;
  }
  .brand-text {
    font-size: 0.85rem;
  }
  .stats-grid {
    gap: 12px;
  }
  .stat-card {
    padding: 14px;
    border-radius: 16px;
  }
  .stat-card .value {
    font-size: 1.15rem;
  }
  .label-muted {
    display: block;
    margin-left: 0;
    margin-top: 4px;
  }
  .glass-panel {
    padding: 16px;
    border-radius: 18px;
  }
  .glass-panel.income-details .panel-header {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }
  .chart-container {
    height: 160px !important;
  }
  .detail-list li {
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
    padding-bottom: 14px;
  }
  .detail-list li div:last-child {
    width: 100%;
    justify-content: space-between;
  }
  .transaction-item {
    flex-direction: column;
    gap: 10px;
    align-items: flex-start;
  }
  .transaction-item > div:last-child {
    width: 100%;
    justify-content: space-between;
  }
  .ai-suggestion-box {
    padding: 16px;
  }
  .ai-header {
    gap: 10px;
  }
  .icon-circle {
    width: 34px;
    height: 34px;
  }
  .quick-actions {
    flex-direction: column;
    gap: 10px;
    margin-bottom: 16px;
  }
  .btn-outline {
    padding: 12px;
    font-size: 0.9rem;
  }
  .btn-main-action {
    font-size: 1rem;
    padding: 14px;
    border-radius: 16px;
  }
  .btn-add {
    width: 28px;
    height: 28px;
  }
  .btn-remove {
    margin-left: 6px;
  }
  .modal-content {
    padding: 20px;
    border-radius: 20px;
  }
  .panel-header {
    margin-bottom: 16px;
  }
  .bottom-content {
    margin-top: 24px;
  }
}

/* Mobile extra pequeno - até 360px */
@media (max-width: 360px) {
  .dashboard {
    padding: 12px;
  }
  .top-bar {
    flex-direction: column;
    align-items: flex-start;
    gap: 14px;
  }
  .top-icons {
    align-self: flex-end;
  }
  .stat-card .value {
    font-size: 1.05rem;
  }
  .panel-title {
    font-size: 0.95rem;
  }
  .glass-panel {
    padding: 14px;
  }
  .chart-container {
    height: 140px !important;
  }
  .btn-main-action {
    font-size: 0.95rem;
    padding: 12px;
  }
}

/* Ajustes para altura da tela */
@media (max-height: 700px) {
  .transaction-list {
    max-height: 200px;
  }
}

/* Orientação paisagem em mobile */
@media (max-height: 500px) and (orientation: landscape) {
  body {
    padding: 10px;
  }
  .dashboard {
    padding: 18px;
  }
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .main-content {
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }
  .sidebar-actions {
    grid-column: span 2;
  }
}

/* Hover effects apenas em dispositivos que suportam */
@media (hover: hover) and (pointer: fine) {
  .transaction-item:hover {
    transform: translateX(4px);
  }
}

/* Reduzir motion para usuários que preferem */
@media (prefers-reduced-motion: reduce) {
  .glow,
  .particle-stream,
  .dashboard-shell::before,
  .dashboard-shell::after {
    animation: none;
  }
  .transaction-item,
  .btn-outline,
  .btn-main-action,
  .btn-add,
  .top-icons i {
    transition: none;
  }
}
</style>
