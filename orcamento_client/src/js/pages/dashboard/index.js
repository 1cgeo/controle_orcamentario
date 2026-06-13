import { el, svgIcon, ICONS } from '@utils/dom.js';
import { formatCurrency, monthName } from '@utils/format.js';
import { showError } from '@utils/toast.js';
import { createStatsCard } from '@components/stats-card.js';
import { createBarChart } from '@components/charts/bar-chart.js';
import { createDataTable } from '@components/data-table/data-table.js';
import { getExercicioAtivo, getSecao3 } from '@services/orcamento-service.js';

/**
 * Dashboard da execucao orcamentaria do exercicio ativo (#/).
 * Descobre o ano ativo, carrega a secao 3.1 (execucao por ND) cumulativa
 * ate o mes selecionado e mostra os totais em cards, a tabela completa e
 * um grafico comparando previsto x recebido x empenhado x liquidado por ND.
 * @param {HTMLElement} container
 * @param {{params:Object, query:URLSearchParams}} _ctx
 * @returns {Function} cleanup
 */
export async function renderDashboard(container, _ctx) {
  let disposed = false;
  let ano = null;
  let mes = new Date().getMonth() + 1; // 1-12

  // ---------------------------------------------------------------------------
  // Seletor de mes (recarrega a secao 3)
  // ---------------------------------------------------------------------------
  const mesSelect = el('select', {
    className: 'chart-card__select',
    'aria-label': 'Selecionar mês',
    onChange: (e) => {
      mes = parseInt(e.target.value, 10);
      load();
    },
  }, Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    return el('option', { value: String(m), textContent: monthName(m) });
  }));
  mesSelect.value = String(mes);

  // ---------------------------------------------------------------------------
  // Cards de totais (linha TOTAL da tabela 3.1)
  // ---------------------------------------------------------------------------
  const cardPrevisto = createStatsCard({
    title: 'Previsto', value: '-', icon: svgIcon(ICONS.assignment, 24), color: 'info', loading: true,
  });
  const cardRecebido = createStatsCard({
    title: 'Recebido', value: '-', icon: svgIcon(ICONS.download, 24), color: 'primary', loading: true,
  });
  const cardEmpenhado = createStatsCard({
    title: 'Empenhado', value: '-', icon: svgIcon(ICONS.description, 24), color: 'warning', loading: true,
  });
  const cardLiquidado = createStatsCard({
    title: 'Liquidado', value: '-', icon: svgIcon(ICONS.checkCircle, 24), color: 'success', loading: true,
  });

  const statsGrid = el('div', { className: 'stats-grid' }, [
    cardPrevisto, cardRecebido, cardEmpenhado, cardLiquidado,
  ]);

  // ---------------------------------------------------------------------------
  // Grafico de barras por ND
  // ---------------------------------------------------------------------------
  const execucaoChart = createBarChart({
    title: 'Execução por Natureza de Despesa',
    data: [],
    xKey: 'cod_nd',
    series: [
      { dataKey: 'previsto', label: 'Previsto' },
      { dataKey: 'recebido', label: 'Recebido' },
      { dataKey: 'empenhado', label: 'Empenhado' },
      { dataKey: 'liquidado', label: 'Liquidado' },
    ],
    loading: true,
  });

  // ---------------------------------------------------------------------------
  // Tabela 3.1 completa
  // ---------------------------------------------------------------------------
  const execucaoTable = createDataTable({
    columns: [
      { key: 'cod_nd', label: 'Cód. ND' },
      { key: 'nd_nome', label: 'Natureza de Despesa', render: (row) => row.nd_nome || '-' },
      { key: 'previsto', label: 'Previsto', render: (row) => formatCurrency(row.previsto) },
      { key: 'recebido', label: 'Recebido', render: (row) => formatCurrency(row.recebido) },
      { key: 'empenhado', label: 'Empenhado', render: (row) => formatCurrency(row.empenhado) },
      { key: 'liquidado', label: 'Liquidado', render: (row) => formatCurrency(row.liquidado) },
    ],
    rows: [],
    pageSize: 25,
    loading: true,
    emptyMessage: 'Sem dados de execução para o mês selecionado',
  });

  // ---------------------------------------------------------------------------
  // Aviso de "nenhum exercício ativo"
  // ---------------------------------------------------------------------------
  const avisoEl = el('div', {
    className: 'empty-state hidden',
    textContent: 'Nenhum exercício ativo. Cadastre um em Exercícios.',
  });

  const conteudo = el('div', {}, [
    statsGrid,
    el('div', { className: 'dashboard-section' }, [
      el('div', { className: 'dashboard-section__header' }, [
        el('h2', { className: 'dashboard-section__title', textContent: 'Execução por Natureza de Despesa (3.1)' }),
      ]),
      execucaoChart,
      execucaoTable.element,
    ]),
  ]);

  const page = el('div', { className: 'dashboard' }, [
    el('div', { className: 'dashboard-section__header' }, [
      el('h1', { className: 'dashboard__title', textContent: 'Execução Orçamentária' }),
      el('div', { className: 'dashboard-section__controls' }, [
        el('span', { textContent: 'Mês:' }),
        mesSelect,
      ]),
    ]),
    avisoEl,
    conteudo,
  ]);
  container.appendChild(page);

  /** Localiza a linha TOTAL (ou agrega como fallback) da tabela 3.1. */
  function getTotalRow(rows) {
    const total = rows.find(r => String(r.cod_nd).toUpperCase() === 'TOTAL'
      || String(r.nd_nome).toUpperCase() === 'TOTAL');
    if (total) return total;
    return rows.reduce((acc, r) => ({
      previsto: acc.previsto + Number(r.previsto || 0),
      recebido: acc.recebido + Number(r.recebido || 0),
      empenhado: acc.empenhado + Number(r.empenhado || 0),
      liquidado: acc.liquidado + Number(r.liquidado || 0),
    }), { previsto: 0, recebido: 0, empenhado: 0, liquidado: 0 });
  }

  function setCardsLoading() {
    cardPrevisto.update({ loading: true });
    cardRecebido.update({ loading: true });
    cardEmpenhado.update({ loading: true });
    cardLiquidado.update({ loading: true });
  }

  async function load() {
    if (ano === null) return;
    setCardsLoading();
    execucaoChart.update({ loading: true });
    execucaoTable.update({ loading: true });

    try {
      const secao3 = await getSecao3({ ano, mes, cumulativo: true });
      if (disposed) return;

      const rows = (secao3 && secao3.tabela_31) || [];

      const total = getTotalRow(rows);
      cardPrevisto.update({ value: formatCurrency(total.previsto), loading: false });
      cardRecebido.update({ value: formatCurrency(total.recebido), loading: false });
      cardEmpenhado.update({ value: formatCurrency(total.empenhado), loading: false });
      cardLiquidado.update({ value: formatCurrency(total.liquidado), loading: false });

      // O grafico ignora a linha TOTAL (so as NDs).
      const ndRows = rows.filter(r => String(r.cod_nd).toUpperCase() !== 'TOTAL'
        && String(r.nd_nome).toUpperCase() !== 'TOTAL');
      execucaoChart.update({
        data: ndRows.map(r => ({
          cod_nd: r.cod_nd,
          previsto: Number(r.previsto || 0),
          recebido: Number(r.recebido || 0),
          empenhado: Number(r.empenhado || 0),
          liquidado: Number(r.liquidado || 0),
        })),
        loading: false,
      });

      execucaoTable.update({ rows, loading: false });
    } catch (err) {
      if (disposed) return;
      cardPrevisto.update({ value: '-', loading: false });
      cardRecebido.update({ value: '-', loading: false });
      cardEmpenhado.update({ value: '-', loading: false });
      cardLiquidado.update({ value: '-', loading: false });
      execucaoChart.update({ data: [], loading: false });
      execucaoTable.update({ rows: [], loading: false });
      showError(err.message || 'Erro ao carregar a execução orçamentária');
    }
  }

  // Descobre o exercicio ativo. Pode lancar (404) ou devolver null.
  try {
    const ativo = await getExercicioAtivo();
    if (disposed) return () => { disposed = true; };
    if (ativo && ativo.ano) {
      ano = ativo.ano;
      await load();
    } else {
      avisoEl.classList.remove('hidden');
      conteudo.classList.add('hidden');
    }
  } catch (_err) {
    if (!disposed) {
      avisoEl.classList.remove('hidden');
      conteudo.classList.add('hidden');
    }
  }

  return () => {
    disposed = true;
    execucaoChart._cleanup();
    execucaoTable._cleanup();
  };
}
