import { el } from '@utils/dom.js';
import { openModal } from '@components/modal/modal-base.js';
import {
  createSelectField,
  createNumberField,
  createTextField,
  createTextareaField,
} from '@components/form-fields/form-fields.js';
import { showSuccess, showError } from '@utils/toast.js';
import {
  getLicitacao,
  createLicitacao,
  updateLicitacao,
  getTipoLicitacao,
  getDfds,
} from '@services/orcamento-service.js';
import { getAno } from '@store/year-store.js';

/**
 * Abre o dialog de criar/editar Licitacao.
 * O tipo da licitacao decide a tabela do RPCMTec: tipo 1 (GCALC DSG) alimenta a
 * tabela 3.4 e tipo 2 (Própria) alimenta a tabela 3.5. O DFD vinculado e opcional
 * (label = numero do DFD).
 * @param {Object} options
 * @param {number|null} [options.licId] - id da licitacao existente para editar (null cria nova)
 * @param {Function} [options.onSaved] - chamado apos salvar com sucesso
 */
export async function openLicitacaoDialog({ licId = null, onSaved = null } = {}) {
  const isEdit = licId !== null && licId !== undefined;

  let tipos = [];
  let dfds = [];
  let lic = null;

  try {
    [tipos, dfds] = await Promise.all([
      getTipoLicitacao(),
      getDfds(getAno()),
    ]);
    if (isEdit) lic = await getLicitacao(licId);
  } catch (err) {
    showError(err.message || 'Erro ao carregar dados da licitação');
    return;
  }

  const tipoOptions = (tipos || []).map(t => ({ value: t.code, label: t.nome }));
  const dfdOptions = (dfds || []).map(d => ({ value: d.id, label: `${d.numero}` }));

  // ---- Campos ----
  const tipoField = createSelectField({
    label: 'Tipo',
    required: true,
    options: tipoOptions,
    value: lic?.tipo_id ?? undefined,
    helpText: '1 = GCALC DSG (tabela 3.4); 2 = Própria (tabela 3.5).',
  });
  const dfdField = createSelectField({
    label: 'DFD vinculado',
    options: dfdOptions,
    value: lic?.dfd_id ?? undefined,
  });
  const objetoField = createTextareaField({
    label: 'Objeto',
    required: true,
    value: lic?.objeto ?? '',
  });
  const faseAtualField = createTextareaField({
    label: 'Fase atual',
    value: lic?.fase_atual ?? '',
  });
  const valorEstimadoField = createNumberField({
    label: 'Valor total estimado',
    min: 0,
    step: 0.01,
    value: lic?.valor_total_estimado ?? undefined,
  });
  const valorHomologadoField = createNumberField({
    label: 'Valor final homologado',
    min: 0,
    step: 0.01,
    value: lic?.valor_final_homologado ?? undefined,
  });
  const omGestoraField = createTextField({
    label: 'OM gestora',
    maxLength: 100,
    value: lic?.om_gestora ?? '',
  });

  const content = el('div', { className: 'form-grid' }, [
    tipoField.element,
    dfdField.element,
    el('div', { className: 'form-grid__full' }, [objetoField.element]),
    el('div', { className: 'form-grid__full' }, [faseAtualField.element]),
    valorEstimadoField.element,
    valorHomologadoField.element,
    omGestoraField.element,
  ]);

  let saving = false;

  openModal({
    title: isEdit ? 'Editar licitação' : 'Nova licitação',
    content,
    width: '760px',
    actions: [
      { label: 'Cancelar', variant: 'text', onClick: ({ close }) => close() },
      {
        label: 'Salvar',
        variant: 'primary',
        onClick: async ({ close }) => {
          if (saving) return;

          tipoField.setError(null);
          objetoField.setError(null);

          const tipoId = tipoField.getValue();
          const objeto = objetoField.getValue();

          let valid = true;
          if (tipoId === null || tipoId === undefined) {
            tipoField.setError('Selecione o tipo');
            valid = false;
          }
          if (!objeto) {
            objetoField.setError('Informe o objeto da licitação');
            valid = false;
          }
          if (!valid) return;

          const body = {
            ano: isEdit ? lic.ano : getAno(),
            tipo_id: tipoId,
            dfd_id: dfdField.getValue(),
            objeto,
            fase_atual: faseAtualField.getValue() || null,
            valor_total_estimado: valorEstimadoField.getValue(),
            valor_final_homologado: valorHomologadoField.getValue(),
            om_gestora: omGestoraField.getValue() || null,
          };

          saving = true;
          try {
            if (isEdit) {
              await updateLicitacao(licId, body);
              showSuccess('Licitação atualizada com sucesso');
            } else {
              await createLicitacao(body);
              showSuccess('Licitação criada com sucesso');
            }
            close();
            if (onSaved) onSaved();
          } catch (err) {
            showError(err.message || 'Erro ao salvar licitação');
          } finally {
            saving = false;
          }
        },
      },
    ],
  });
}
