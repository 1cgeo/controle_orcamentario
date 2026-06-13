import { el } from '@utils/dom.js';
import { openModal } from '@components/modal/modal-base.js';
import {
  createSelectField,
  createTextField,
  createNumberField,
  createTextareaField,
} from '@components/form-fields/form-fields.js';
import { showSuccess, showError } from '@utils/toast.js';
import * as svc from '@services/orcamento-service.js';

/**
 * Abre o dialog de criar/editar PCA.
 * @param {Object} options
 * @param {Object|null} [options.pca] - PCA existente para editar (null cria novo)
 * @param {Array<{ano:number}>} [options.exercicios] - exercicios para o select de ano
 * @param {Function} [options.onSaved] - chamado apos salvar com sucesso
 */
export function openPcaDialog({ pca = null, exercicios = [], onSaved = null } = {}) {
  const isEdit = Boolean(pca);

  const anoField = createSelectField({
    label: 'Ano',
    required: true,
    options: exercicios.map((e) => ({ value: e.ano, label: String(e.ano) })),
    value: pca ? pca.ano : undefined,
  });
  const uasgField = createTextField({
    label: 'UASG',
    maxLength: 20,
    value: pca?.uasg ?? '160382',
  });
  const valorField = createNumberField({
    label: 'Valor total estimado',
    min: 0,
    step: 0.01,
    value: pca?.valor_total_estimado ?? undefined,
  });
  const observacaoField = createTextareaField({
    label: 'Observação',
    value: pca?.observacao ?? '',
  });

  const content = el('div', { className: 'form-grid' }, [
    anoField.element,
    uasgField.element,
    valorField.element,
    el('div', { className: 'form-grid__full' }, [observacaoField.element]),
  ]);

  let saving = false;

  openModal({
    title: isEdit ? 'Editar PCA' : 'Novo PCA',
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
          if (ano === null) {
            anoField.setError('Selecione o ano do PCA');
            return;
          }

          const body = {
            ano,
            uasg: uasgField.getValue() || null,
            valor_total_estimado: valorField.getValue(),
            observacao: observacaoField.getValue() || null,
          };

          saving = true;
          try {
            if (isEdit) {
              await svc.updatePca(pca.id, body);
              showSuccess('PCA atualizado com sucesso');
            } else {
              await svc.createPca(body);
              showSuccess('PCA criado com sucesso');
            }
            close();
            if (onSaved) onSaved();
          } catch (err) {
            showError(err.message || 'Erro ao salvar PCA');
          } finally {
            saving = false;
          }
        },
      },
    ],
  });
}
