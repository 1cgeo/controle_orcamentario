import { el } from '@utils/dom.js';
import { openModal } from '@components/modal/modal-base.js';
import {
  createSelectField,
  createNumberField,
  createTextField,
  createTextareaField,
} from '@components/form-fields/form-fields.js';
import { showSuccess, showError } from '@utils/toast.js';
import { getExercicios, createMeta, updateMeta } from '@services/orcamento-service.js';

/**
 * Abre o dialog de criar/editar meta do PIT.
 * As opcoes de ano vem dos exercicios cadastrados (carregadas de forma assincrona).
 * @param {Object} options
 * @param {Object|null} [options.meta] - meta existente para editar (null cria nova)
 * @param {number|string|null} [options.anoSelecionado] - ano pre-selecionado (filtro da lista)
 * @param {Function} [options.onSaved] - chamado apos salvar com sucesso
 */
export function openMetaDialog({ meta = null, anoSelecionado = null, onSaved = null } = {}) {
  const isEdit = Boolean(meta);

  const anoField = createSelectField({
    label: 'Ano',
    required: true,
    options: [],
    value: meta?.ano ?? anoSelecionado ?? undefined,
  });
  const numeroMetaField = createNumberField({
    label: 'Número da meta',
    required: true,
    min: 1,
    step: 1,
    value: meta?.numero_meta ?? undefined,
  });
  const itemField = createTextField({
    label: 'Item',
    maxLength: 20,
    placeholder: 'Ex.: 1.1',
    value: meta?.item ?? '',
  });
  const descricaoField = createTextareaField({
    label: 'Descrição',
    value: meta?.descricao ?? '',
  });
  const solicitanteField = createTextField({
    label: 'Solicitante',
    maxLength: 200,
    value: meta?.solicitante ?? '',
  });

  const content = el('div', { className: 'form-grid' }, [
    anoField.element,
    numeroMetaField.element,
    itemField.element,
    solicitanteField.element,
    el('div', { className: 'form-grid__full' }, [descricaoField.element]),
  ]);

  // Carrega as opcoes de ano (exercicios) e mantem a selecao atual.
  (async () => {
    try {
      const exercicios = await getExercicios();
      anoField.setOptions(exercicios.map(ex => ({ value: ex.ano, label: String(ex.ano) })));
      const preselecionado = meta?.ano ?? anoSelecionado;
      if (preselecionado !== null && preselecionado !== undefined) {
        anoField.setValue(preselecionado);
      }
    } catch (err) {
      showError(err.message || 'Erro ao carregar exercícios');
    }
  })();

  let saving = false;

  openModal({
    title: isEdit ? 'Editar meta' : 'Nova meta',
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
          numeroMetaField.setError(null);

          const ano = anoField.getValue();
          const numeroMeta = numeroMetaField.getValue();

          let valid = true;
          if (ano === null) {
            anoField.setError('Selecione o ano');
            valid = false;
          }
          if (numeroMeta === null || numeroMeta <= 0) {
            numeroMetaField.setError('Informe o número da meta');
            valid = false;
          }
          if (!valid) return;

          const payload = {
            ano,
            numero_meta: numeroMeta,
            item: itemField.getValue() || null,
            descricao: descricaoField.getValue() || null,
            solicitante: solicitanteField.getValue() || null,
          };

          saving = true;
          try {
            if (isEdit) {
              await updateMeta(meta.id, payload);
              showSuccess('Meta atualizada com sucesso');
            } else {
              await createMeta(payload);
              showSuccess('Meta criada com sucesso');
            }
            close();
            if (onSaved) onSaved();
          } catch (err) {
            showError(err.message || 'Erro ao salvar meta');
          } finally {
            saving = false;
          }
        },
      },
    ],
  });
}
