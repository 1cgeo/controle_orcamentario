import { el, svgIcon, ICONS } from '@utils/dom.js';
import { formatCurrency, monthName } from '@utils/format.js';
import { showSuccess, showError } from '@utils/toast.js';
import { createDataTable } from '@components/data-table/data-table.js';
import {
  getSecao3,
  getSecao3Markdown,
  getRelatorios,
  createRelatorio,
} from '@services/orcamento-service.js';
import { getAno, onAnoChange } from '@store/year-store.js';

/**
 * Definicao das 7 subtabelas da secao 3 do RPCMTec. Cada entrada descreve o
 * titulo do bloco, a chave do payload e as colunas (com as monetarias ja
 * formatadas com formatCurrency).
 */
const cur = (key) => (row) => formatCurrency(row[key]);
const txt = (key) => (row) => row[key] ?? '-';

const SUBTABELAS = [
  {
    titulo: '3.1 Execução por ND',
    chave: 'tabela_31',
    emptyMessage: 'Sem execução por ND',
    columns: [
      { key: 'cod_nd', label: 'Cód. ND', render: txt('cod_nd') },
      { key: 'nd_nome', label: 'Natureza de Despesa', render: txt('nd_nome') },
      { key: 'previsto', label: 'Previsto', render: cur('previsto') },
      { key: 'recebido', label: 'Recebido', render: cur('recebido') },
      { key: 'empenhado', label: 'Empenhado', render: cur('empenhado') },
      { key: 'liquidado', label: 'Liquidado', render: cur('liquidado') },
    ],
  },
  {
    titulo: '3.2 Créditos recebidos (PDR)',
    chave: 'tabela_32',
    emptyMessage: 'Sem créditos recebidos',
    columns: [
      { key: 'nc', label: 'NC', render: txt('nc') },
      { key: 'ne', label: 'NE', render: txt('ne') },
      { key: 'cod_nd', label: 'Cód. ND', render: txt('cod_nd') },
      { key: 'finalidade', label: 'Finalidade', render: txt('finalidade') },
      { key: 'valor_nc', label: 'Valor NC', render: cur('valor_nc') },
      { key: 'valor_empenhado', label: 'Empenhado', render: cur('valor_empenhado') },
      { key: 'valor_liquidado', label: 'Liquidado', render: cur('valor_liquidado') },
    ],
  },
  {
    titulo: '3.3 RPNP',
    chave: 'tabela_33',
    emptyMessage: 'Sem RPNP',
    columns: [
      { key: 'empenho', label: 'Empenho', render: txt('empenho') },
      { key: 'finalidade', label: 'Finalidade', render: txt('finalidade') },
      { key: 'valor_empenhado', label: 'Empenhado', render: cur('valor_empenhado') },
      { key: 'valor_a_liquidar', label: 'A Liquidar', render: cur('valor_a_liquidar') },
    ],
  },
  {
    titulo: '3.4 GCALC DSG',
    chave: 'tabela_34',
    emptyMessage: 'Sem itens GCALC DSG',
    columns: [
      { key: 'objeto', label: 'Objeto', render: txt('objeto') },
      { key: 'fase_atual', label: 'Fase Atual', render: txt('fase_atual') },
      { key: 'valor_total_estimado', label: 'Valor Estimado', render: cur('valor_total_estimado') },
      { key: 'valor_final_homologado', label: 'Valor Homologado', render: cur('valor_final_homologado') },
    ],
  },
  {
    titulo: '3.5 Licitações próprias',
    chave: 'tabela_35',
    emptyMessage: 'Sem licitações próprias',
    columns: [
      { key: 'objeto', label: 'Objeto', render: txt('objeto') },
      { key: 'fase_atual', label: 'Fase Atual', render: txt('fase_atual') },
      { key: 'valor_total_estimado', label: 'Valor Estimado', render: cur('valor_total_estimado') },
      { key: 'valor_final_homologado', label: 'Valor Homologado', render: cur('valor_final_homologado') },
    ],
  },
  {
    titulo: '3.6 Recebimento de material',
    chave: 'tabela_36',
    emptyMessage: 'Sem recebimentos de material',
    columns: [
      { key: 'empenho', label: 'Empenho', render: txt('empenho') },
      { key: 'material', label: 'Material', render: txt('material') },
      { key: 'prazo_entrega', label: 'Prazo de Entrega', render: txt('prazo_entrega') },
      { key: 'situacao', label: 'Situação', render: txt('situacao') },
    ],
  },
  {
    titulo: '3.7 Extra-PDR',
    chave: 'tabela_37',
    emptyMessage: 'Sem itens Extra-PDR',
    columns: [
      { key: 'nc', label: 'NC', render: txt('nc') },
      { key: 'ne', label: 'NE', render: txt('ne') },
      { key: 'cod_nd', label: 'Cód. ND', render: txt('cod_nd') },
      { key: 'finalidade', label: 'Finalidade', render: txt('finalidade') },
      { key: 'valor_nc', label: 'Valor NC', render: cur('valor_nc') },
      { key: 'valor_empenhado', label: 'Empenhado', render: cur('valor_empenhado') },
      { key: 'valor_liquidado', label: 'Liquidado', render: cur('valor_liquidado') },
    ],
  },
];

/**
 * Gerador da secao 3 do RPCMTec (#/relatorio).
 * O ano vem do contexto global (@store/year-store). Ao abrir, gera
 * automaticamente o relatorio do mes corrente (cumulativo); o usuario pode
 * trocar o mes/cumulativo e clicar "Gerar". Mostra as 7 subtabelas, exporta o
 * markdown e oferece um pequeno bloco de gestao das edicoes mensais.
 * @param {HTMLElement} container
 * @param {{params:Object, query:URLSearchParams}} _ctx
 * @returns {Function} cleanup
 */
export async function renderRelatorio(container, _ctx) {
  let disposed = false;
  const tables = {}; // chave -> instancia createDataTable

  // ---------------------------------------------------------------------------
  // Controles do topo (o ano vem do contexto global)
  // ---------------------------------------------------------------------------
  const mesSelect = el('select', {
    className: 'chart-card__select',
    id: 'relatorio-mes',
    'aria-label': 'Selecionar mês',
  }, Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    return el('option', { value: String(m), textContent: monthName(m) });
  }));
  mesSelect.value = String(new Date().getMonth() + 1);

  const cumulativoInput = el('input', {
    className: 'form-field__checkbox',
    type: 'checkbox',
    id: 'relatorio-cumulativo',
  });
  cumulativoInput.checked = true;

  const gerarBtn = el('button', {
    className: 'btn btn--primary',
    type: 'button',
    onClick: () => gerar(),
  }, [svgIcon(ICONS.description, 16), 'Gerar']);

  const copiarBtn = el('button', {
    className: 'btn btn--secondary',
    type: 'button',
    onClick: () => copiarMarkdown(),
  }, [svgIcon(ICONS.description, 16), 'Copiar Markdown']);
  copiarBtn.disabled = true;

  const controles = el('div', { className: 'page__filters' }, [
    el('div', { className: 'form-field' }, [
      el('label', { className: 'form-field__label', for: 'relatorio-mes', textContent: 'Mês' }),
      mesSelect,
    ]),
    el('div', { className: 'form-field form-field--checkbox' }, [
      cumulativoInput,
      el('label', { className: 'form-field__label', for: 'relatorio-cumulativo', textContent: 'Cumulativo' }),
    ]),
    el('div', { className: 'page__actions' }, [gerarBtn, copiarBtn]),
  ]);

  // ---------------------------------------------------------------------------
  // Blocos das subtabelas
  // ---------------------------------------------------------------------------
  const blocos = SUBTABELAS.map(def => {
    const table = createDataTable({
      columns: def.columns,
      rows: [],
      pageSize: 25,
      emptyMessage: def.emptyMessage,
    });
    tables[def.chave] = table;
    return el('div', { className: 'dashboard-section' }, [
      el('div', { className: 'dashboard-section__header' }, [
        el('h2', { className: 'dashboard-section__title', textContent: def.titulo }),
      ]),
      table.element,
    ]);
  });

  // ---------------------------------------------------------------------------
  // Area do markdown (fallback de copia manual)
  // ---------------------------------------------------------------------------
  const markdownArea = el('textarea', {
    className: 'form-field__textarea',
    rows: '16',
    readonly: 'readonly',
    'aria-label': 'Markdown da seção 3',
    placeholder: 'O markdown gerado aparece aqui.',
  });

  const markdownBloco = el('div', { className: 'dashboard-section' }, [
    el('div', { className: 'dashboard-section__header' }, [
      el('h2', { className: 'dashboard-section__title', textContent: 'Markdown da Seção 3' }),
    ]),
    markdownArea,
  ]);

  // ---------------------------------------------------------------------------
  // Bloco de gestao das edicoes mensais (lista + criar)
  // ---------------------------------------------------------------------------
  const edicoesTable = createDataTable({
    columns: [
      { key: 'ano', label: 'Ano' },
      { key: 'mes', label: 'Mês', render: (row) => monthName(row.mes) },
      { key: 'assinante', label: 'Assinante', render: (row) => row.assinante || '-' },
      { key: 'data_assinatura', label: 'Data de Assinatura', render: (row) => row.data_assinatura || '-' },
    ],
    rows: [],
    pageSize: 10,
    loading: true,
    emptyMessage: 'Nenhuma edição mensal cadastrada',
  });

  const novaEdicaoBtn = el('button', {
    className: 'btn btn--secondary btn--sm',
    type: 'button',
    onClick: () => criarEdicaoMensal(),
  }, [svgIcon(ICONS.add, 14), 'Registrar edição do mês selecionado']);

  const edicoesBloco = el('div', { className: 'dashboard-section' }, [
    el('div', { className: 'dashboard-section__header' }, [
      el('h2', { className: 'dashboard-section__title', textContent: 'Edições Mensais' }),
      el('div', { className: 'page__actions' }, [novaEdicaoBtn]),
    ]),
    edicoesTable.element,
  ]);

  // ---------------------------------------------------------------------------
  // Montagem da pagina
  // ---------------------------------------------------------------------------
  const page = el('div', { className: 'page' }, [
    el('div', { className: 'page__header' }, [
      el('h1', { className: 'page__title', textContent: 'Seção 3 do RPCMTec' }),
    ]),
    controles,
    ...blocos,
    markdownBloco,
    edicoesBloco,
  ]);
  container.appendChild(page);

  // ---------------------------------------------------------------------------
  // Logica
  // ---------------------------------------------------------------------------
  function getParams() {
    return {
      ano: getAno(),
      mes: parseInt(mesSelect.value, 10),
      cumulativo: cumulativoInput.checked,
    };
  }

  async function gerar() {
    for (const def of SUBTABELAS) tables[def.chave].update({ loading: true });

    gerarBtn.disabled = true;
    try {
      const secao3 = await getSecao3(getParams());
      if (disposed) return;
      for (const def of SUBTABELAS) {
        const rows = (secao3 && secao3[def.chave]) || [];
        tables[def.chave].update({ rows, loading: false });
      }
      copiarBtn.disabled = false;
    } catch (err) {
      if (disposed) return;
      for (const def of SUBTABELAS) tables[def.chave].update({ rows: [], loading: false });
      showError(err.message || 'Erro ao gerar a seção 3');
    } finally {
      gerarBtn.disabled = false;
    }
  }

  async function copiarMarkdown() {
    copiarBtn.disabled = true;
    try {
      const resp = await getSecao3Markdown(getParams());
      if (disposed) return;
      const markdown = (resp && resp.markdown) || '';
      markdownArea.value = markdown;
      try {
        await navigator.clipboard.writeText(markdown);
        showSuccess('Markdown copiado');
      } catch (_clipErr) {
        // Fallback: o textarea ja mostra o markdown para copia manual.
        markdownArea.focus();
        markdownArea.select();
        showSuccess('Markdown gerado. Use Ctrl+C para copiar.');
      }
    } catch (err) {
      if (disposed) return;
      showError(err.message || 'Erro ao gerar o markdown');
    } finally {
      copiarBtn.disabled = false;
    }
  }

  async function carregarEdicoes() {
    edicoesTable.update({ loading: true });
    try {
      const dados = await getRelatorios();
      if (disposed) return;
      edicoesTable.update({ rows: dados || [], loading: false });
    } catch (err) {
      if (disposed) return;
      edicoesTable.update({ rows: [], loading: false });
      showError(err.message || 'Erro ao carregar as edições mensais');
    }
  }

  async function criarEdicaoMensal() {
    const { ano, mes } = getParams();
    novaEdicaoBtn.disabled = true;
    try {
      await createRelatorio({
        ano,
        mes,
        assinante: null,
        data_assinatura: null,
      });
      if (disposed) return;
      showSuccess('Edição mensal registrada');
      await carregarEdicoes();
    } catch (err) {
      if (disposed) return;
      showError(err.message || 'Erro ao registrar a edição mensal');
    } finally {
      novaEdicaoBtn.disabled = false;
    }
  }

  // ---------------------------------------------------------------------------
  // Carga inicial: gera o relatorio do ano de contexto (mes corrente,
  // cumulativo) e carrega as edicoes mensais. A troca de ano regenera.
  // ---------------------------------------------------------------------------
  const offAno = onAnoChange(() => { gerar(); });

  await gerar();
  await carregarEdicoes();

  return () => {
    disposed = true;
    offAno();
    for (const def of SUBTABELAS) tables[def.chave]._cleanup();
    edicoesTable._cleanup();
  };
}
