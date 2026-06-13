import { el } from '@utils/dom.js';
import { openModal } from '@components/modal/modal-base.js';
import {
  createNumberField,
  createTextField,
  createCheckboxField,
} from '@components/form-fields/form-fields.js';
import { showSuccess, showError } from '@utils/toast.js';
import { createExercicio, updateExercicio } from '@services/orcamento-service.js';

/**
 * Abre o dialog de criar/editar exercicio.
 * A PK do exercicio e o ano, entao no modo edicao o campo ano fica desabilitado.
 * @param {Object} options
 * @param {Object|null} [options.exercicio] - exercicio existente para editar (null cria novo)
 * @param {Function} [options.onSaved] - chamado apos salvar com sucesso
 */
export function openExercicioDialog({ exercicio = null, onSaved = null } = {}) {
  const isEdit = Boolean(exercicio);

  const anoField = createNumberField({
    label: 'Ano',
    required: true,
    min: 2000,
    step: 1,
    placeholder: 'Ex.: 2026',
    value: exercicio?.ano ?? undefined,
  });
  // createNumberField nao expoe a flag disabled; no modo edicao o ano e a PK,
  // entao desabilitamos o input diretamente (nao pode mudar).
  if (isEdit) anoField.input.disabled = true;

  const uasgField = createTextField({
    label: 'UASG',
    maxLength: 20,
    value: exercicio?.uasg ?? '160382',
  });
  const codomField = createTextField({
    label: 'CODOM',
    maxLength: 20,
    value: exercicio?.codom ?? '',
  });
  const ativoField = createCheckboxField({
    label: 'Exercício ativo',
    checked: exercicio ? Boolean(exercicio.ativo) : true,
  });

  const content = el('div', { className: 'form-grid' }, [
    anoField.element,
    uasgField.element,
    codomField.element,
    el('div', { className: 'form-grid__full' }, [ativoField.element]),
  ]);

  let saving = false;

  openModal({
    title: isEdit ? 'Editar exercício' : 'Novo exercício',
    content,
    width: '560px',
    actions: [
      { label: 'Cancelar', variant: 'text', onClick: ({ close }) => close() },
      {
        label: 'Salvar',
        variant: 'primary',
        onClick: async ({ close }) => {
          if (saving) return;

          anoField.setError(null);

          const ano = anoField.getValue();
          if (!isEdit && (ano === null || ano <= 0)) {
            anoField.setError('Informe o ano do exercício');
            return;
          }

          const uasg = uasgField.getValue() || null;
          const codom = codomField.getValue() || null;
          const ativo = ativoField.getValue();

          saving = true;
          try {
            if (isEdit) {
              await updateExercicio(exercicio.ano, { uasg, codom, ativo });
              showSuccess('Exercício atualizado com sucesso');
            } else {
              await createExercicio({ ano, uasg, codom, ativo });
              showSuccess('Exercício criado com sucesso');
            }
            close();
            if (onSaved) onSaved();
          } catch (err) {
            showError(err.message || 'Erro ao salvar exercício');
          } finally {
            saving = false;
          }
        },
      },
    ],
  });
}
