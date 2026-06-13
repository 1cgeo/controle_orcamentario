import { el, svgIcon, ICONS } from '@utils/dom.js';
import { showSuccess, showError } from '@utils/toast.js';
import { createDataTable } from '@components/data-table/data-table.js';
import { openModal } from '@components/modal/modal-base.js';
import { confirmDialog } from '@components/modal/confirm-dialog.js';
import {
  getUsuarios,
  getUsuariosAuthServer,
  importarUsuarios,
  atualizarUsuario,
  sincronizarUsuarios,
} from '@services/orcamento-service.js';

/** Nome de exibicao do usuario (prefere nome, depois nome_guerra, depois login). */
function nomeExibicao(u) {
  return u.nome || u.nome_guerra || u.login || '-';
}

/**
 * Lista de usuarios do SCO (#/usuarios). Importa do servico de autenticacao,
 * sincroniza, e alterna os flags administrador/ativo por linha.
 * @param {HTMLElement} container
 * @param {{params:Object, query:URLSearchParams}} _ctx
 * @returns {Function} cleanup
 */
export async function renderUsuariosList(container, _ctx) {
  let disposed = false;

  // ---------------------------------------------------------------------------
  // Botoes do topo
  // ---------------------------------------------------------------------------
  const importarBtn = el('button', {
    className: 'btn btn--primary',
    type: 'button',
    onClick: () => abrirImportar(),
  }, [svgIcon(ICONS.add, 16), 'Importar do serviço de autenticação']);

  const sincronizarBtn = el('button', {
    className: 'btn btn--secondary',
    type: 'button',
    onClick: () => handleSincronizar(),
  }, [svgIcon(ICONS.swapHoriz, 16), 'Sincronizar']);

  // ---------------------------------------------------------------------------
  // Tabela
  // ---------------------------------------------------------------------------
  const table = createDataTable({
    columns: [
      { key: 'nome', label: 'Nome', sortable: true, render: (row) => nomeExibicao(row) },
      { key: 'login', label: 'Login', sortable: true, render: (row) => row.login || '-' },
      { key: 'tipo_posto_grad', label: 'Posto/Grad', render: (row) => row.tipo_posto_grad || '-' },
      { key: 'administrador', label: 'Administrador', render: (row) => (row.administrador ? 'Sim' : 'Não') },
      { key: 'ativo', label: 'Ativo', render: (row) => (row.ativo ? 'Sim' : 'Não') },
    ],
    rows: [],
    searchable: true,
    pageSize: 25,
    loading: true,
    emptyMessage: 'Nenhum usuário cadastrado',
    actions: [
      {
        icon: ICONS.lock,
        title: 'Alternar administrador',
        onClick: (row) => toggleAdmin(row),
      },
      {
        icon: ICONS.swapHoriz,
        title: 'Alternar ativo',
        onClick: (row) => toggleAtivo(row),
      },
    ],
  });

  const page = el('div', { className: 'page' }, [
    el('div', { className: 'page__header' }, [
      el('h1', { className: 'page__title', textContent: 'Usuários' }),
      el('div', { className: 'page__actions' }, [importarBtn, sincronizarBtn]),
    ]),
    table.element,
  ]);
  container.appendChild(page);

  // ---------------------------------------------------------------------------
  // Carga
  // ---------------------------------------------------------------------------
  async function load() {
    table.update({ loading: true });
    try {
      const dados = await getUsuarios();
      if (disposed) return;
      table.update({ rows: dados || [], loading: false });
    } catch (err) {
      if (disposed) return;
      table.update({ rows: [], loading: false });
      showError(err.message || 'Erro ao carregar usuários');
    }
  }

  // ---------------------------------------------------------------------------
  // Alternar flags (administrador / ativo) com confirmacao
  // ---------------------------------------------------------------------------
  async function toggleAdmin(row) {
    const novoAdmin = !row.administrador;
    const ok = await confirmDialog({
      title: 'Alterar administrador',
      message: `Deseja ${novoAdmin ? 'conceder' : 'remover'} o privilégio de administrador de ${nomeExibicao(row)}?`,
      confirmLabel: 'Confirmar',
    });
    if (!ok) return;
    try {
      await atualizarUsuario(row.uuid, { administrador: novoAdmin, ativo: row.ativo });
      showSuccess('Usuário atualizado com sucesso');
      await load();
    } catch (err) {
      showError(err.message || 'Erro ao atualizar usuário');
    }
  }

  async function toggleAtivo(row) {
    const novoAtivo = !row.ativo;
    const ok = await confirmDialog({
      title: novoAtivo ? 'Ativar usuário' : 'Desativar usuário',
      message: `Deseja ${novoAtivo ? 'ativar' : 'desativar'} o usuário ${nomeExibicao(row)}?`,
      confirmLabel: 'Confirmar',
      danger: !novoAtivo,
    });
    if (!ok) return;
    try {
      await atualizarUsuario(row.uuid, { administrador: row.administrador, ativo: novoAtivo });
      showSuccess('Usuário atualizado com sucesso');
      await load();
    } catch (err) {
      showError(err.message || 'Erro ao atualizar usuário');
    }
  }

  // ---------------------------------------------------------------------------
  // Sincronizar
  // ---------------------------------------------------------------------------
  async function handleSincronizar() {
    sincronizarBtn.disabled = true;
    try {
      await sincronizarUsuarios();
      if (disposed) return;
      showSuccess('Usuários sincronizados com sucesso');
      await load();
    } catch (err) {
      if (disposed) return;
      showError(err.message || 'Erro ao sincronizar usuários');
    } finally {
      sincronizarBtn.disabled = false;
    }
  }

  // ---------------------------------------------------------------------------
  // Importar do servico de autenticacao (modal com checkboxes)
  // ---------------------------------------------------------------------------
  async function abrirImportar() {
    importarBtn.disabled = true;
    let disponiveis = [];
    try {
      disponiveis = await getUsuariosAuthServer();
    } catch (err) {
      showError(err.message || 'Erro ao consultar o serviço de autenticação');
      importarBtn.disabled = false;
      return;
    }
    importarBtn.disabled = false;
    if (disposed) return;

    if (!disponiveis || !disponiveis.length) {
      showError('Nenhum usuário disponível para importação.');
      return;
    }

    const checkboxes = disponiveis.map((u) => {
      const input = el('input', {
        className: 'form-field__checkbox',
        type: 'checkbox',
        value: u.uuid,
      });
      return {
        input,
        element: el('label', { className: 'form-field form-field--checkbox' }, [
          input,
          el('span', { className: 'form-field__label', textContent: `${u.login || '-'}, ${nomeExibicao(u)}` }),
        ]),
      };
    });

    const content = el('div', { className: 'form-grid' },
      checkboxes.map(c => c.element));

    openModal({
      title: 'Importar usuários',
      content,
      width: '560px',
      actions: [
        { label: 'Cancelar', variant: 'text', onClick: ({ close }) => close() },
        {
          label: 'Importar',
          variant: 'primary',
          onClick: async ({ close }) => {
            const uuids = checkboxes.filter(c => c.input.checked).map(c => c.input.value);
            if (!uuids.length) {
              showError('Selecione ao menos um usuário.');
              return;
            }
            try {
              await importarUsuarios(uuids);
              showSuccess('Usuários importados com sucesso');
              close();
              await load();
            } catch (err) {
              showError(err.message || 'Erro ao importar usuários');
            }
          },
        },
      ],
    });
  }

  await load();

  return () => {
    disposed = true;
    table._cleanup();
  };
}
