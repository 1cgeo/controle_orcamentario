import { el } from '@utils/dom.js';
import { openModal } from '@components/modal/modal-base.js';
import {
  createTextField,
  createNumberField,
  createDateField,
  createSelectField,
  createTextareaField,
} from '@components/form-fields/form-fields.js';
import { showSuccess, showError } from '@utils/toast.js';
import {
  getNotaEmpenho,
  createNotaEmpenho,
  updateNotaEmpenho,
  getNotasCredito,
  getNaturezaDespesa,
  getPlanoInterno,
  getLicitacoes,
} from '@services/orcamento-service.js';
import { getAno } from '@store/year-store.js';

/**
 * Abre o dialog de criar/editar Nota de Empenho.
 * Os dominios ND e PI vem como {code, nome}; nos selects mapeamos value:code e
 * label `${code} - ${nome}` (ND) ou `${code} - ${nome}` (PI). O ano vem do
 * contexto global (navbar). NC e licitacao sao opcionais (label numero / objeto).
 * @param {Object} options
 * @param {number|null} [options.neId] - id da NE existente para editar (null cria nova)
 * @param {Function} [options.onSaved] - chamado apos salvar com sucesso
 */
export async function openNotaEmpenhoDialog({ neId = null, onSaved = null } = {}) {
  const isEdit = neId !== null && neId !== undefined;

  let notasCredito = [];
  let naturezas = [];
  let planos = [];
  let licitacoes = [];
  let ne = null;

  try {
    [notasCredito, naturezas, planos, licitacoes] = await Promise.all([
      getNotasCredito({ ano: getAno() }),
      getNaturezaDespesa(),
      getPlanoInterno(),
      getLicitacoes({ ano: getAno() }),
    ]);
    if (isEdit) ne = await getNotaEmpenho(neId);
  } catch (err) {
    showError(err.message || 'Erro ao carregar dados da nota de empenho');
    return;
  }

  const ncOptions = (notasCredito || []).map(nc => ({
    value: nc.id,
    label: nc.numero ?? `NC ${nc.id}`,
  }));
  const ndOptions = (naturezas || []).map(nd => ({
    value: nd.code,
    label: `${nd.code} - ${nd.nome}`,
  }));
  const piOptions = (planos || []).map(pi => ({
    value: pi.code,
    label: `${pi.code} - ${pi.nome}`,
  }));
  const licitacaoOptions = (licitacoes || []).map(lic => ({
    value: lic.id,
    label: lic.objeto ?? `Licitação ${lic.id}`,
  }));

  // ---- Campos ----
  const numeroField = createTextField({
    label: 'Número',
    required: true,
    maxLength: 30,
    placeholder: 'Ex.: 2025NE000110',
    value: ne?.numero ?? '',
  });
  const dataEmpenhoField = createDateField({
    label: 'Data do empenho',
    value: ne?.data_empenho ?? '',
  });
  const notaCreditoField = createSelectField({
    label: 'Nota de crédito',
    options: ncOptions,
    value: ne?.nota_credito_id ?? undefined,
  });
  const codNdField = createSelectField({
    label: 'Natureza de despesa',
    options: ndOptions,
    value: ne?.cod_nd ?? undefined,
  });
  const codPiField = createSelectField({
    label: 'Plano interno (PI)',
    options: piOptions,
    value: ne?.cod_pi ?? undefined,
  });
  const licitacaoField = createSelectField({
    label: 'Licitação',
    options: licitacaoOptions,
    value: ne?.licitacao_id ?? undefined,
  });
  const finalidadeField = createTextareaField({
    label: 'Finalidade',
    value: ne?.finalidade ?? '',
  });
  const valorEmpenhadoField = createNumberField({
    label: 'Valor empenhado',
    required: true,
    min: 0,
    step: 0.01,
    value: ne?.valor_empenhado ?? undefined,
  });
  const valorAnuladoField = createNumberField({
    label: 'Valor anulado',
    min: 0,
    step: 0.01,
    value: ne?.valor_anulado ?? 0,
    helpText: 'Valor anulado do empenho (padrão 0).',
  });

  const content = el('div', { className: 'form-grid' }, [
    numeroField.element,
    dataEmpenhoField.element,
    notaCreditoField.element,
    codNdField.element,
    codPiField.element,
    licitacaoField.element,
    el('div', { className: 'form-grid__full' }, [finalidadeField.element]),
    valorEmpenhadoField.element,
    valorAnuladoField.element,
  ]);

  let saving = false;

  openModal({
    title: isEdit ? 'Editar nota de empenho' : 'Nova nota de empenho',
    content,
    width: '760px',
    actions: [
      { label: 'Cancelar', variant: 'text', onClick: ({ close }) => close() },
      {
        label: 'Salvar',
        variant: 'primary',
        onClick: async ({ close }) => {
          if (saving) return;

          numeroField.setError(null);
          valorEmpenhadoField.setError(null);

          const numero = numeroField.getValue();
          const valorEmpenhado = valorEmpenhadoField.getValue();

          let valid = true;
          if (!numero) {
            numeroField.setError('Informe o número da NE');
            valid = false;
          }
          if (valorEmpenhado === null || valorEmpenhado <= 0) {
            valorEmpenhadoField.setError('Informe um valor maior que zero');
            valid = false;
          }
          if (!valid) return;

          const valorAnulado = valorAnuladoField.getValue();

          const body = {
            numero,
            ano: isEdit ? ne.ano : getAno(),
            data_empenho: dataEmpenhoField.getValue(),
            nota_credito_id: notaCreditoField.getValue(),
            cod_nd: codNdField.getValue(),
            cod_pi: codPiField.getValue(),
            licitacao_id: licitacaoField.getValue(),
            finalidade: finalidadeField.getValue() || null,
            valor_empenhado: valorEmpenhado,
            valor_anulado: valorAnulado === null ? 0 : valorAnulado,
          };

          saving = true;
          try {
            if (isEdit) {
              await updateNotaEmpenho(neId, body);
              showSuccess('Nota de empenho atualizada com sucesso');
            } else {
              await createNotaEmpenho(body);
              showSuccess('Nota de empenho criada com sucesso');
            }
            close();
            if (onSaved) onSaved();
          } catch (err) {
            showError(err.message || 'Erro ao salvar nota de empenho');
          } finally {
            saving = false;
          }
        },
      },
    ],
  });
}
