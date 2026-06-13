import { el, svgIcon, ICONS } from '@utils/dom.js';
import { showSuccess, showError } from '@utils/toast.js';
import { createDataTable } from '@components/data-table/data-table.js';
import { confirmDialog } from '@components/modal/confirm-dialog.js';
import { getExercicios, deleteExercicio } from '@services/orcamento-service.js';
import { openExercicioDialog } from './exercicio-dialog.js';

/**
 * Lista de exercicios (#/exercicios). A PK do exercicio e o ano.
 * @param {HTMLElement} container
 * @param {{params:Object, query:URLSearchParams}} _ctx
 * @returns {Function} cleanup
 */
export async function renderExerciciosList(container, _ctx) {
  let disposed = false;

  const newBtn = el('button', {
    className: 'btn btn--primary',
    type: 'button',
    onClick: () => openExercicioDialog({ onSaved: load }),
  }, [svgIcon(ICONS.add, 16), 'Novo exercício']);

  const table = createDataTable({
    columns: [
      { key: 'ano', label: 'Ano', sortable: true },
      { key: 'uasg', label: 'UASG', render: (row) => row.uasg || '-' },
      { key: 'codom', label: 'CODOM', render: (row) => row.codom || '-' },
      { key: 'ativo', label: 'Ativo', render: (row) => (row.ativo ? 'Sim' : 'Não') },
    ],
    rows: [],
    searchable: true,
    pageSize: 25,
    loading: true,
    emptyMessage: 'Nenhum exercício cadastrado',
    actions: [
      {
        icon: ICONS.edit,
        title: 'Editar',
        onClick: (row) => openExercicioDialog({ exercicio: row, onSaved: load }),
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
      el('h1', { className: 'page__title', textContent: 'Exercícios' }),
      el('div', { className: 'page__actions' }, [newBtn]),
    ]),
    table.element,
  ]);
  container.appendChild(page);

  async function load() {
    table.update({ loading: true });
    try {
      const dados = await getExercicios();
      if (disposed) return;
      table.update({ rows: dados, loading: false });
    } catch (err) {
      if (disposed) return;
      table.update({ rows: [], loading: false });
      showError(err.message || 'Erro ao carregar exercícios');
    }
  }

  async function handleDelete(row) {
    const ok = await confirmDialog({
      title: 'Excluir exercício',
      message: `Tem certeza que deseja excluir o exercício ${row.ano}? Esta ação não pode ser desfeita.`,
      confirmLabel: 'Excluir',
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteExercicio(row.ano);
      showSuccess('Exercício excluído com sucesso');
      await load();
    } catch (err) {
      showError(err.message || 'Erro ao excluir exercício');
    }
  }

  await load();

  return () => {
    disposed = true;
    table._cleanup();
  };
}
