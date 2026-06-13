import { el } from '@utils/dom.js';
import { showSuccess, showError } from '@utils/toast.js';
import { createTextField, createNumberField } from '@components/form-fields/form-fields.js';
import { getConfig, updateConfig } from '@services/orcamento-service.js';
import { setAno } from '@store/year-store.js';

/**
 * Pagina de Configuracao geral (#/configuracao): UASG, CODOM e o ano de
 * referencia padrao das telas. Substitui os dados que antes ficavam no exercicio.
 * @param {HTMLElement} container
 * @returns {Function} cleanup
 */
export async function renderConfiguracao(container) {
  let disposed = false;

  const uasg = createTextField({ label: 'UASG', maxLength: 10, helpText: 'Unidade Administrativa de Serviços Gerais (ex.: 160382)' });
  const codom = createTextField({ label: 'CODOM', maxLength: 10 });
  const anoRef = createNumberField({ label: 'Ano de referência', min: 2000, max: 2100, helpText: 'Ano padrão ao abrir o sistema' });

  const saveBtn = el('button', { className: 'btn btn--primary', type: 'submit', textContent: 'Salvar' });

  const form = el('form', { className: 'form-grid', style: { maxWidth: '480px' } }, [
    uasg.element,
    codom.element,
    anoRef.element,
    el('div', { className: 'page__actions' }, [saveBtn]),
  ]);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    saveBtn.disabled = true;
    try {
      const body = {
        uasg: uasg.getValue() || null,
        codom: codom.getValue() || null,
        ano_referencia: anoRef.getValue(),
      };
      const dados = await updateConfig(body);
      showSuccess('Configuração salva com sucesso');
      if (dados && dados.ano_referencia) setAno(dados.ano_referencia);
    } catch (err) {
      showError(err.message || 'Erro ao salvar configuração');
    } finally {
      saveBtn.disabled = false;
    }
  });

  const page = el('div', { className: 'page' }, [
    el('div', { className: 'page__header' }, [
      el('h1', { className: 'page__title', textContent: 'Configuração' }),
    ]),
    el('p', { textContent: 'Dados gerais do controle orçamentário (UASG, CODOM) e o ano de referência padrão das telas.' }),
    form,
  ]);
  container.appendChild(page);

  try {
    const cfg = await getConfig();
    if (disposed) return;
    uasg.setValue(cfg.uasg || '');
    codom.setValue(cfg.codom || '');
    anoRef.setValue(cfg.ano_referencia);
  } catch (err) {
    if (!disposed) showError(err.message || 'Erro ao carregar configuração');
  }

  return () => { disposed = true; };
}
