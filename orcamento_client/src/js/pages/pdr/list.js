import { el, clearChildren, svgIcon, ICONS } from '@utils/dom.js';
import { formatCurrency, formatDate } from '@utils/format.js';
import { showSuccess, showError } from '@utils/toast.js';
import { confirmDialog } from '@components/modal/confirm-dialog.js';
import { getAno, onAnoChange } from '@store/year-store.js';
import { getPdrs, deletePdr } from '@services/orcamento-service.js';
import { openPdrDialog } from './pdr-dialog.js';

/**
 * Tela do PDR (#/pdr). Ha no maximo um PDR por ano (Pedido de Descentralizacao
 * de Recursos), sempre no ano de contexto global. Sem PDR no ano, mostra um
 * aviso e o botao de criar; com PDR, mostra um resumo com editar/excluir.
 * Recarrega ao trocar o ano de contexto.
 * @param {HTMLElement} container
 * @param {{params:Object, query:URLSearchParams}} _ctx
 * @returns {Function} cleanup
 */
export async function renderPdrList(container, _ctx) {
  let disposed = false;

  const title = el('h1', { className: 'page__title', textContent: 'PDR' });
  const body = el('div', { className: 'pdr-page__body' });

  const page = el('div', { className: 'page' }, [
    el('div', { className: 'page__header' }, [title]),
    body,
  ]);
  container.appendChild(page);

  function renderLoading() {
    clearChildren(body);
    body.appendChild(el('p', {
      className: 'pdr-page__loading',
      textContent: 'Carregando...',
      style: { color: 'var(--text-secondary)' },
    }));
  }

  function renderEmpty(ano) {
    clearChildren(body);
    const aviso = el('div', {
      className: 'pdr-empty',
      style: {
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-md, 8px)',
        padding: 'var(--space-lg, 24px)',
        textAlign: 'center',
      },
    }, [
      el('p', {
        textContent: `Nenhum PDR cadastrado para o ano ${ano}.`,
        style: { margin: '0 0 var(--space-md, 16px)', color: 'var(--text-secondary)' },
      }),
      el('button', {
        className: 'btn btn--primary',
        type: 'button',
        onClick: () => openPdrDialog({ onSaved: load }),
      }, [svgIcon(ICONS.add, 16), `Criar PDR do ano ${ano}`]),
    ]);
    body.appendChild(aviso);
  }

  function summaryItem(label, value) {
    return el('div', { className: 'pdr-summary__item' }, [
      el('div', {
        className: 'pdr-summary__label',
        textContent: label,
        style: { fontSize: 'var(--font-size-xs, 0.75rem)', color: 'var(--text-secondary)' },
      }),
      el('div', {
        className: 'pdr-summary__value',
        textContent: value,
        style: { fontWeight: '600' },
      }),
    ]);
  }

  function renderSummary(pdr) {
    clearChildren(body);
    const totalItens = Array.isArray(pdr.itens) ? pdr.itens.length : (pdr.total_itens ?? 0);

    const card = el('div', {
      className: 'pdr-summary',
      style: {
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-md, 8px)',
        padding: 'var(--space-lg, 24px)',
      },
    }, [
      el('div', {
        className: 'pdr-summary__grid',
        style: {
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 'var(--space-md, 16px)',
        },
      }, [
        summaryItem('Ano', String(pdr.ano)),
        summaryItem('Valor autorizado', formatCurrency(pdr.valor_autorizado)),
        summaryItem('Revisão', pdr.revisao || '-'),
        summaryItem('Data de assinatura', formatDate(pdr.data_assinatura)),
        summaryItem('Itens', String(totalItens)),
      ]),
      el('div', {
        className: 'pdr-summary__actions',
        style: {
          display: 'flex',
          gap: 'var(--space-sm, 8px)',
          marginTop: 'var(--space-lg, 24px)',
        },
      }, [
        el('button', {
          className: 'btn btn--primary',
          type: 'button',
          onClick: () => openPdrDialog({ pdrId: pdr.id, onSaved: load }),
        }, [svgIcon(ICONS.edit, 16), 'Editar']),
        el('button', {
          className: 'btn btn--danger',
          type: 'button',
          onClick: () => handleDelete(pdr),
        }, [svgIcon(ICONS.delete, 16), 'Excluir']),
      ]),
    ]);
    body.appendChild(card);
  }

  async function load() {
    const ano = getAno();
    title.textContent = `PDR ${ano}`;
    renderLoading();
    try {
      const dados = await getPdrs(ano);
      if (disposed) return;
      const pdr = Array.isArray(dados) ? dados[0] : dados;
      if (pdr) {
        renderSummary(pdr);
      } else {
        renderEmpty(ano);
      }
    } catch (err) {
      if (disposed) return;
      clearChildren(body);
      body.appendChild(el('p', {
        textContent: 'Erro ao carregar o PDR.',
        style: { color: 'var(--color-error, #d32f2f)' },
      }));
      showError(err.message || 'Erro ao carregar o PDR');
    }
  }

  async function handleDelete(pdr) {
    const ok = await confirmDialog({
      title: 'Excluir PDR',
      message: `Tem certeza que deseja excluir o PDR do ano ${pdr.ano}? Esta ação não pode ser desfeita.`,
      confirmLabel: 'Excluir',
      danger: true,
    });
    if (!ok) return;
    try {
      await deletePdr(pdr.id);
      showSuccess('PDR excluído com sucesso');
      await load();
    } catch (err) {
      showError(err.message || 'Erro ao excluir PDR');
    }
  }

  const offAno = onAnoChange(() => { if (!disposed) load(); });

  await load();

  return () => {
    disposed = true;
    offAno();
  };
}
