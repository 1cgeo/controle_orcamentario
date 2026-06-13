import { el, svgIcon, ICONS } from '@utils/dom.js';
import { formatCurrency } from '@utils/format.js';
import { showSuccess, showError } from '@utils/toast.js';
import { createDataTable } from '@components/data-table/data-table.js';
import { confirmDialog } from '@components/modal/confirm-dialog.js';
import { getPdrs, deletePdr } from '@services/orcamento-service.js';
import { openPdrDialog } from './pdr-dialog.js';

/**
 * Lista de PDRs (#/pdr). Ha um PDR por ano (Pedido de Descentralizacao de Recursos).
 * @param {HTMLElement} container
 * @param {{params:Object, query:URLSearchParams}} _ctx
 * @returns {Function} cleanup
 */
export async function renderPdrList(container, _ctx) {
  let disposed = false;

  const newBtn = el('button', {
    className: 'btn btn--primary',
    type: 'button',
    onClick: () => openPdrDialog({ onSaved: load }),
  }, [svgIcon(ICONS.add, 16), 'Novo PDR']);

  const table = createDataTable({
    columns: [
      { key: 'ano', label: 'Ano', sortable: true },
      {
        key: 'valor_autorizado',
        label: 'Valor autorizado',
        sortable: true,
        render: (row) => formatCurrency(row.valor_autorizado),
      },
      { key: 'revisao', label: 'Revisão', render: (row) => row.revisao || '-' },
      {
        key: 'total_itens',
        label: 'Itens',
        sortable: true,
        render: (row) => String(row.total_itens ?? 0),
      },
    ],
    rows: [],
    searchable: true,
    pageSize: 25,
    loading: true,
    emptyMessage: 'Nenhum PDR cadastrado',
    actions: [
      {
        icon: ICONS.edit,
        title: 'Editar',
        onClick: (row) => openPdrDialog({ pdrId: row.id, onSaved: load }),
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
      el('h1', { className: 'page__title', textContent: 'PDR' }),
      el('div', { className: 'page__actions' }, [newBtn]),
    ]),
    table.element,
  ]);
  container.appendChild(page);

  async function load() {
    table.update({ loading: true });
    try {
      const dados = await getPdrs();
      if (disposed) return;
      const rows = (dados || []).map(r => ({
        ...r,
        total_itens: Array.isArray(r.itens) ? r.itens.length : (r.total_itens ?? 0),
      }));
      table.update({ rows, loading: false });
    } catch (err) {
      if (disposed) return;
      table.update({ rows: [], loading: false });
      showError(err.message || 'Erro ao carregar PDRs');
    }
  }

  async function handleDelete(row) {
    const ok = await confirmDialog({
      title: 'Excluir PDR',
      message: `Tem certeza que deseja excluir o PDR do ano ${row.ano}? Esta ação não pode ser desfeita.`,
      confirmLabel: 'Excluir',
      danger: true,
    });
    if (!ok) return;
    try {
      await deletePdr(row.id);
      showSuccess('PDR excluído com sucesso');
      await load();
    } catch (err) {
      showError(err.message || 'Erro ao excluir PDR');
    }
  }

  await load();

  return () => {
    disposed = true;
    table._cleanup();
  };
}
