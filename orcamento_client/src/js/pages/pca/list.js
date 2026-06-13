import { el, svgIcon, ICONS } from '@utils/dom.js';
import { formatCurrency } from '@utils/format.js';
import { showSuccess, showError } from '@utils/toast.js';
import { createDataTable } from '@components/data-table/data-table.js';
import { confirmDialog } from '@components/modal/confirm-dialog.js';
import * as svc from '@services/orcamento-service.js';
import { openPcaDialog } from './pca-dialog.js';

/**
 * Lista de PCA (#/pca). Plano de Contratacoes Anual por exercicio e UASG.
 * @param {HTMLElement} container
 * @param {{params:Object, query:URLSearchParams}} _ctx
 * @returns {Function} cleanup
 */
export async function renderPcaList(container, _ctx) {
  let disposed = false;
  let exercicios = [];

  const newBtn = el('button', {
    className: 'btn btn--primary',
    type: 'button',
    onClick: () => openPcaDialog({ exercicios, onSaved: load }),
  }, [svgIcon(ICONS.add, 16), 'Novo PCA']);

  const table = createDataTable({
    columns: [
      { key: 'ano', label: 'Ano', sortable: true },
      { key: 'uasg', label: 'UASG', render: (row) => row.uasg || '-' },
      {
        key: 'valor_total_estimado',
        label: 'Valor total estimado',
        sortable: true,
        render: (row) => formatCurrency(row.valor_total_estimado),
      },
      {
        key: 'observacao',
        label: 'Observação',
        render: (row) => row.observacao || '-',
      },
    ],
    rows: [],
    searchable: true,
    pageSize: 25,
    loading: true,
    emptyMessage: 'Nenhum PCA cadastrado',
    actions: [
      {
        icon: ICONS.edit,
        title: 'Editar',
        onClick: (row) => openPcaDialog({ pca: row, exercicios, onSaved: load }),
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
      el('h1', { className: 'page__title', textContent: 'PCA' }),
      el('div', { className: 'page__actions' }, [newBtn]),
    ]),
    table.element,
  ]);
  container.appendChild(page);

  async function load() {
    table.update({ loading: true });
    try {
      const [pcas, anos] = await Promise.all([
        svc.getPcas(),
        svc.getExercicios(),
      ]);
      if (disposed) return;
      exercicios = anos;
      table.update({ rows: pcas, loading: false });
    } catch (err) {
      if (disposed) return;
      table.update({ rows: [], loading: false });
      showError(err.message || 'Erro ao carregar PCA');
    }
  }

  async function handleDelete(row) {
    const ok = await confirmDialog({
      title: 'Excluir PCA',
      message: `Tem certeza que deseja excluir o PCA do ano ${row.ano}? Esta ação não pode ser desfeita.`,
      confirmLabel: 'Excluir',
      danger: true,
    });
    if (!ok) return;
    try {
      await svc.deletePca(row.id);
      showSuccess('PCA excluído com sucesso');
      await load();
    } catch (err) {
      showError(err.message || 'Erro ao excluir PCA');
    }
  }

  await load();

  return () => {
    disposed = true;
    table._cleanup();
  };
}
