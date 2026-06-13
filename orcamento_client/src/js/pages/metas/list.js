import { el, svgIcon, ICONS } from '@utils/dom.js';
import { showSuccess, showError } from '@utils/toast.js';
import { createDataTable } from '@components/data-table/data-table.js';
import { confirmDialog } from '@components/modal/confirm-dialog.js';
import { createSelectField } from '@components/form-fields/form-fields.js';
import { getMetas, getExercicios, deleteMeta } from '@services/orcamento-service.js';
import { openMetaDialog } from './meta-dialog.js';

/**
 * Lista de metas do PIT (#/metas), com filtro por ano (exercicio).
 * @param {HTMLElement} container
 * @param {{params:Object, query:URLSearchParams}} _ctx
 * @returns {Function} cleanup
 */
export async function renderMetasList(container, _ctx) {
  let disposed = false;
  let anoFiltro = null;

  const anoFilterField = createSelectField({
    label: 'Ano',
    options: [],
    placeholder: 'Todos os anos',
    onChange: (value) => {
      anoFiltro = value;
      load();
    },
  });

  const newBtn = el('button', {
    className: 'btn btn--primary',
    type: 'button',
    onClick: () => openMetaDialog({ anoSelecionado: anoFiltro, onSaved: load }),
  }, [svgIcon(ICONS.add, 16), 'Nova meta']);

  const table = createDataTable({
    columns: [
      { key: 'ano', label: 'Ano', sortable: true },
      { key: 'numero_meta', label: 'Número', sortable: true },
      { key: 'item', label: 'Item', render: (row) => row.item || '-' },
      { key: 'descricao', label: 'Descrição', render: (row) => row.descricao || '-' },
      { key: 'solicitante', label: 'Solicitante', render: (row) => row.solicitante || '-' },
    ],
    rows: [],
    searchable: true,
    pageSize: 25,
    loading: true,
    emptyMessage: 'Nenhuma meta cadastrada',
    actions: [
      {
        icon: ICONS.edit,
        title: 'Editar',
        onClick: (row) => openMetaDialog({ meta: row, anoSelecionado: anoFiltro, onSaved: load }),
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
      el('h1', { className: 'page__title', textContent: 'Metas do PIT' }),
      el('div', { className: 'page__actions' }, [newBtn]),
    ]),
    el('div', { className: 'page__filters' }, [anoFilterField.element]),
    table.element,
  ]);
  container.appendChild(page);

  async function loadExercicios() {
    try {
      const exercicios = await getExercicios();
      if (disposed) return;
      anoFilterField.setOptions(exercicios.map(ex => ({ value: ex.ano, label: String(ex.ano) })));
    } catch (err) {
      if (disposed) return;
      showError(err.message || 'Erro ao carregar exercícios');
    }
  }

  async function load() {
    table.update({ loading: true });
    try {
      const dados = await getMetas(anoFiltro);
      if (disposed) return;
      table.update({ rows: dados, loading: false });
    } catch (err) {
      if (disposed) return;
      table.update({ rows: [], loading: false });
      showError(err.message || 'Erro ao carregar metas');
    }
  }

  async function handleDelete(row) {
    const ok = await confirmDialog({
      title: 'Excluir meta',
      message: `Tem certeza que deseja excluir a meta ${row.numero_meta} (${row.ano})? Esta ação não pode ser desfeita.`,
      confirmLabel: 'Excluir',
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteMeta(row.id);
      showSuccess('Meta excluída com sucesso');
      await load();
    } catch (err) {
      showError(err.message || 'Erro ao excluir meta');
    }
  }

  await loadExercicios();
  await load();

  return () => {
    disposed = true;
    table._cleanup();
  };
}
