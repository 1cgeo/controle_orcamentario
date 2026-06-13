import { el, svgIcon, ICONS } from '@utils/dom.js';
import { formatCurrency } from '@utils/format.js';
import { showSuccess, showError } from '@utils/toast.js';
import { createDataTable } from '@components/data-table/data-table.js';
import { createSelectField } from '@components/form-fields/form-fields.js';
import { confirmDialog } from '@components/modal/confirm-dialog.js';
import {
  getRpnps,
  deleteRpnp,
  getExercicios,
} from '@services/orcamento-service.js';
import { openRpnpDialog } from './rpnp-dialog.js';

// O RPNP (Restos a Pagar Não Processados) alimenta a tabela 3.3 do RPCMTec.
const COMPRIMENTO_TRUNCAR = 80;

function truncar(texto) {
  if (!texto) return '-';
  return texto.length > COMPRIMENTO_TRUNCAR ? `${texto.slice(0, COMPRIMENTO_TRUNCAR)}…` : texto;
}

/**
 * Lista de RPNP (#/rpnp). Restos a pagar não processados; alimenta a tabela 3.3.
 * Filtro no topo: ano de exercício.
 * @param {HTMLElement} container
 * @param {{params:Object, query:URLSearchParams}} _ctx
 * @returns {Function} cleanup
 */
export async function renderRpnpList(container, _ctx) {
  let disposed = false;
  let filtroAno = null;

  const newBtn = el('button', {
    className: 'btn btn--primary',
    type: 'button',
    onClick: () => openRpnpDialog({ onSaved: load }),
  }, [svgIcon(ICONS.add, 16), 'Novo RPNP']);

  // ---- Filtro ----
  const anoFilter = createSelectField({
    label: 'Ano de exercício',
    options: [],
    placeholder: 'Todos os anos',
    onChange: (ano) => {
      filtroAno = ano;
      load();
    },
  });

  const table = createDataTable({
    columns: [
      {
        key: 'empenho',
        label: 'Empenho',
        render: (row) => row.empenho_label || row.nota_empenho_numero || '-',
      },
      {
        key: 'finalidade',
        label: 'Finalidade',
        className: 'truncate',
        render: (row) => truncar(row.finalidade),
      },
      {
        key: 'valor_empenhado',
        label: 'Empenhado',
        sortable: true,
        render: (row) => formatCurrency(row.valor_empenhado),
      },
      {
        key: 'valor_a_liquidar',
        label: 'A liquidar',
        sortable: true,
        render: (row) => formatCurrency(row.valor_a_liquidar),
      },
    ],
    rows: [],
    searchable: true,
    pageSize: 25,
    loading: true,
    emptyMessage: 'Nenhum RPNP cadastrado',
    actions: [
      {
        icon: ICONS.edit,
        title: 'Editar',
        onClick: (row) => openRpnpDialog({ rpnpId: row.id, onSaved: load }),
      },
      {
        icon: ICONS.delete,
        title: 'Excluir',
        variant: 'danger',
        onClick: (row) => handleDelete(row),
      },
    ],
  });

  const page = el('div', { className: 'page' }, [
    el('div', { className: 'page__header' }, [
      el('h1', { className: 'page__title', textContent: 'RPNP' }),
      el('div', { className: 'page__actions' }, [newBtn]),
    ]),
    el('div', {
      className: 'page__filters',
      style: { display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '16px' },
    }, [
      anoFilter.element,
    ]),
    table.element,
  ]);
  container.appendChild(page);

  async function loadFilterOptions() {
    try {
      const exercicios = await getExercicios();
      if (disposed) return;
      anoFilter.setOptions((exercicios || []).map(ex => ({ value: ex.ano, label: String(ex.ano) })));
    } catch (err) {
      if (disposed) return;
      showError(err.message || 'Erro ao carregar filtros');
    }
  }

  async function load() {
    table.update({ loading: true });
    try {
      const dados = await getRpnps(filtroAno ?? undefined);
      if (disposed) return;
      table.update({ rows: dados || [], loading: false });
    } catch (err) {
      if (disposed) return;
      table.update({ rows: [], loading: false });
      showError(err.message || 'Erro ao carregar RPNP');
    }
  }

  async function handleDelete(row) {
    const ok = await confirmDialog({
      title: 'Excluir RPNP',
      message: `Tem certeza que deseja excluir o RPNP ${row.empenho_label || row.nota_empenho_numero || ''}? Esta ação não pode ser desfeita.`,
      confirmLabel: 'Excluir',
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteRpnp(row.id);
      showSuccess('RPNP excluído com sucesso');
      await load();
    } catch (err) {
      showError(err.message || 'Erro ao excluir RPNP');
    }
  }

  await loadFilterOptions();
  await load();

  return () => {
    disposed = true;
    table._cleanup();
  };
}
