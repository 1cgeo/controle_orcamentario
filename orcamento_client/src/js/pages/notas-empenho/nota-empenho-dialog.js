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
} from '@services/orcamento-service.js';
import { getAno } from '@store/year-store.js';

/**
 * Abre o dialog de criar/editar Nota de Empenho.
 * A NE empenha contra uma NC (obrigatoria); a ND, o PI e o GND sao HERDADOS da
 * NC, entao a NE nao tem esses campos nem licitacao. Ao escolher a NC, mostramos
 * a ND herdada (so leitura). O ano vem do contexto global (navbar).
 * @param {Object} options
 * @param {number|null} [options.neId] - id da NE existente para editar (null cria nova)
 * @param {Function} [options.onSaved] - chamado apos salvar com sucesso
 */
export async function openNotaEmpenhoDialog({ neId = null, onSaved = null } = {}) {
  const isEdit = neId !== null && neId !== undefined;

  let notasCredito = [];
  let ne = null;

  try {
    notasCredito = await getNotasCredito({ ano: getAno() });
    if (isEdit) ne = await getNotaEmpenho(neId);
  } catch (err) {
    showError(err.message || 'Erro ao carregar dados da nota de empenho');
    return;
  }

  // Mapa id -> NC para resolver a ND herdada ao trocar a selecao.
  const ncPorId = new Map((notasCredito || []).map(nc => [String(nc.id), nc]));

  // Label no formato "numero - ND" para distinguir NCs de mesmo numero com NDs
  // diferentes (o par NC/ND e unico).
  const ncOptions = (notasCredito || []).map(nc => ({
    value: nc.id,
    label: nc.cod_nd ? `${nc.numero ?? `NC ${nc.id}`} - ${nc.cod_nd}${nc.nd_nome ? ` (${nc.nd_nome})` : ''}` : (nc.numero ?? `NC ${nc.id}`),
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

  // Linha so-leitura com a ND herdada da NC selecionada.
  const ndHerdada = el('div', {
    className: 'form-field__help',
    style: { margin: '0' },
  });
  function atualizaNdHerdada(ncId) {
    const nc = ncPorId.get(String(ncId));
    if (nc && nc.cod_nd) {
      ndHerdada.textContent = `ND herdada da NC: ${nc.cod_nd}${nc.nd_nome ? ` - ${nc.nd_nome}` : ''}`;
    } else {
      ndHerdada.textContent = 'A ND, o PI e o GND vêm da NC selecionada.';
    }
  }

  const notaCreditoField = createSelectField({
    label: 'Nota de crédito',
    required: true,
    options: ncOptions,
    value: ne?.nota_credito_id ?? undefined,
    onChange: (v) => atualizaNdHerdada(v),
  });
  atualizaNdHerdada(ne?.nota_credito_id);

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
    el('div', { className: 'form-grid__full' }, [notaCreditoField.element]),
    el('div', { className: 'form-grid__full' }, [ndHerdada]),
    el('div', { className: 'form-grid__full' }, [finalidadeField.element]),
    valorEmpenhadoField.element,
    valorAnuladoField.element,
  ]);

  let saving = false;

  openModal({
    title: isEdit ? `Editar nota de empenho (${ne.ano})` : `Nova nota de empenho (${getAno()})`,
    content,
    width: '640px',
    actions: [
      { label: 'Cancelar', variant: 'text', onClick: ({ close }) => close() },
      {
        label: 'Salvar',
        variant: 'primary',
        onClick: async ({ close }) => {
          if (saving) return;

          numeroField.setError(null);
          notaCreditoField.setError(null);
          valorEmpenhadoField.setError(null);

          const numero = numeroField.getValue();
          const notaCreditoId = notaCreditoField.getValue();
          const valorEmpenhado = valorEmpenhadoField.getValue();

          let valid = true;
          if (!numero) {
            numeroField.setError('Informe o número da NE');
            valid = false;
          }
          if (notaCreditoId === null || notaCreditoId === undefined) {
            notaCreditoField.setError('Selecione a nota de crédito');
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
            nota_credito_id: notaCreditoId,
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
