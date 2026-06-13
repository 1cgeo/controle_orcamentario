import { el, svgIcon, ICONS } from '@utils/dom.js';
import { openModal } from '@components/modal/modal-base.js';
import {
  createSelectField,
  createTextField,
  createNumberField,
  createDateField,
} from '@components/form-fields/form-fields.js';
import { showSuccess, showError } from '@utils/toast.js';
import {
  getPdr,
  createPdr,
  updatePdr,
  getExercicios,
  getNaturezaDespesa,
  getMetas,
} from '@services/orcamento-service.js';

/**
 * Abre o dialog de criar/editar PDR (Pedido de Descentralizacao de Recursos).
 * Ha um PDR por ano. O dialog tem os campos do cabecalho mais um sub-formulario
 * dinamico de itens (adicionar/remover linhas).
 * @param {Object} options
 * @param {number|null} [options.pdrId] - id do PDR existente para editar (null cria novo)
 * @param {Function} [options.onSaved] - chamado apos salvar com sucesso
 */
export async function openPdrDialog({ pdrId = null, onSaved = null } = {}) {
  const isEdit = pdrId !== null && pdrId !== undefined;

  let exercicios = [];
  let naturezas = [];
  let metas = [];
  let pdr = null;

  try {
    [exercicios, naturezas] = await Promise.all([
      getExercicios(),
      getNaturezaDespesa(),
    ]);
    if (isEdit) pdr = await getPdr(pdrId);
  } catch (err) {
    showError(err.message || 'Erro ao carregar dados do PDR');
    return;
  }

  const anoInicial = pdr?.ano ?? null;
  if (anoInicial !== null && anoInicial !== undefined) {
    try {
      metas = await getMetas(anoInicial);
    } catch {
      metas = [];
    }
  }

  const ndOptions = (naturezas || []).map(nd => ({
    value: nd.codigo ?? nd.code ?? nd.cod_nd ?? nd.id,
    label: `${nd.codigo ?? nd.code ?? nd.cod_nd ?? nd.id} - ${nd.nome ?? nd.descricao ?? ''}`,
  }));

  function metaOptions() {
    return (metas || []).map(m => ({
      value: m.id,
      label: m.titulo ?? m.descricao ?? m.nome ?? `Meta ${m.id}`,
    }));
  }

  const exercicioOptions = (exercicios || []).map(ex => ({
    value: ex.ano,
    label: String(ex.ano),
  }));

  // ---- Campos do cabecalho ----
  const anoField = createSelectField({
    label: 'Ano',
    required: true,
    options: exercicioOptions,
    value: pdr?.ano ?? undefined,
    onChange: (ano) => reloadMetas(ano),
  });
  const valorSolicitadoField = createNumberField({
    label: 'Valor solicitado',
    min: 0,
    step: 0.01,
    value: pdr?.valor_solicitado ?? undefined,
  });
  const valorAutorizadoField = createNumberField({
    label: 'Valor autorizado',
    min: 0,
    step: 0.01,
    value: pdr?.valor_autorizado ?? undefined,
  });
  const gnd3Field = createNumberField({
    label: 'GND3 autorizado',
    min: 0,
    step: 0.01,
    value: pdr?.gnd3_autorizado ?? undefined,
  });
  const gnd4Field = createNumberField({
    label: 'GND4 autorizado',
    min: 0,
    step: 0.01,
    value: pdr?.gnd4_autorizado ?? undefined,
  });
  const acaoField = createTextField({
    label: 'Ação orçamentária',
    maxLength: 20,
    placeholder: 'Ex.: 20XE',
    value: pdr?.acao_orcamentaria ?? '',
  });
  const planoField = createTextField({
    label: 'Plano orçamentário',
    maxLength: 20,
    placeholder: 'Ex.: 000F',
    value: pdr?.plano_orcamentario ?? '',
  });
  const dataAssinaturaField = createDateField({
    label: 'Data de assinatura',
    value: pdr?.data_assinatura ?? '',
  });
  const revisaoField = createTextField({
    label: 'Revisão',
    maxLength: 20,
    placeholder: 'Ex.: E1',
    value: pdr?.revisao ?? '',
  });

  // ---- Sub-formulario de itens ----
  const itensContainer = el('div', { className: 'form-grid__full' });
  const itemRows = [];

  function buildItemRow(item = null) {
    const codNdField = createSelectField({
      label: 'ND',
      required: true,
      options: ndOptions,
      value: item?.cod_nd ?? undefined,
    });
    const metaField = createSelectField({
      label: 'Meta do PIT',
      options: metaOptions(),
      value: item?.meta_pit_id ?? undefined,
    });
    const itemLabelField = createTextField({
      label: 'Item',
      maxLength: 20,
      placeholder: 'Ex.: 1D',
      value: item?.item_label ?? '',
    });
    const descricaoField = createTextField({
      label: 'Descrição',
      value: item?.descricao ?? '',
    });
    const gndField = createNumberField({
      label: 'GND',
      min: 0,
      step: 1,
      placeholder: '3 ou 4',
      value: item?.gnd ?? undefined,
    });
    const valorSolField = createNumberField({
      label: 'Valor solicitado',
      min: 0,
      step: 0.01,
      value: item?.valor_solicitado ?? undefined,
    });
    const valorAutField = createNumberField({
      label: 'Valor autorizado',
      min: 0,
      step: 0.01,
      value: item?.valor_autorizado ?? undefined,
    });
    const obsField = createTextField({
      label: 'Observação',
      value: item?.observacao ?? '',
    });

    const removeBtn = el('button', {
      className: 'btn btn--text',
      type: 'button',
      title: 'Remover item',
      onClick: () => removeItemRow(entry),
    }, [svgIcon(ICONS.delete, 16), 'Remover item']);

    const rowEl = el('div', {
      className: 'form-grid',
      style: {
        border: '1px solid var(--border-color, #d0d0d0)',
        borderRadius: '6px',
        padding: '12px',
        marginBottom: '12px',
      },
    }, [
      codNdField.element,
      metaField.element,
      itemLabelField.element,
      gndField.element,
      el('div', { className: 'form-grid__full' }, [descricaoField.element]),
      valorSolField.element,
      valorAutField.element,
      el('div', { className: 'form-grid__full' }, [obsField.element]),
      el('div', { className: 'form-grid__full' }, [removeBtn]),
    ]);

    const entry = {
      rowEl,
      metaField,
      getValue: () => ({
        cod_nd: codNdField.getValue(),
        meta_pit_id: metaField.getValue(),
        item_label: itemLabelField.getValue() || null,
        descricao: descricaoField.getValue() || null,
        gnd: gndField.getValue(),
        valor_solicitado: valorSolField.getValue(),
        valor_autorizado: valorAutField.getValue(),
        observacao: obsField.getValue() || null,
      }),
      setCodNdError: (msg) => codNdField.setError(msg),
    };
    return entry;
  }

  function addItemRow(item = null) {
    const entry = buildItemRow(item);
    itemRows.push(entry);
    itensContainer.appendChild(entry.rowEl);
  }

  function removeItemRow(entry) {
    const idx = itemRows.indexOf(entry);
    if (idx >= 0) {
      itemRows.splice(idx, 1);
      entry.rowEl.remove();
    }
  }

  // Ao mudar o ano, recarrega as metas e atualiza os selects de meta dos itens.
  async function reloadMetas(ano) {
    try {
      metas = ano ? await getMetas(ano) : [];
    } catch {
      metas = [];
    }
    for (const entry of itemRows) {
      entry.metaField.setOptions(metaOptions());
    }
  }

  // Popula itens existentes (modo edicao).
  if (isEdit && Array.isArray(pdr?.itens)) {
    for (const item of pdr.itens) addItemRow(item);
  }

  const addItemBtn = el('button', {
    className: 'btn btn--secondary',
    type: 'button',
    onClick: () => addItemRow(),
  }, [svgIcon(ICONS.add, 16), 'Adicionar item']);

  const content = el('div', { className: 'form-grid' }, [
    anoField.element,
    revisaoField.element,
    valorSolicitadoField.element,
    valorAutorizadoField.element,
    gnd3Field.element,
    gnd4Field.element,
    acaoField.element,
    planoField.element,
    dataAssinaturaField.element,
    el('div', { className: 'form-grid__full' }, [
      el('h3', { className: 'form-section__title', textContent: 'Itens do PDR' }),
    ]),
    itensContainer,
    el('div', { className: 'form-grid__full' }, [addItemBtn]),
  ]);

  let saving = false;

  openModal({
    title: isEdit ? 'Editar PDR' : 'Novo PDR',
    content,
    width: '820px',
    actions: [
      { label: 'Cancelar', variant: 'text', onClick: ({ close }) => close() },
      {
        label: 'Salvar',
        variant: 'primary',
        onClick: async ({ close }) => {
          if (saving) return;

          anoField.setError(null);

          const ano = anoField.getValue();
          let valid = true;
          if (ano === null || ano === undefined) {
            anoField.setError('Selecione o ano do PDR');
            valid = false;
          }

          const itens = [];
          for (const entry of itemRows) {
            entry.setCodNdError(null);
            const dados = entry.getValue();
            if (dados.cod_nd === null || dados.cod_nd === undefined) {
              entry.setCodNdError('Selecione a natureza de despesa');
              valid = false;
            }
            itens.push(dados);
          }

          if (!valid) return;

          const body = {
            ano,
            valor_solicitado: valorSolicitadoField.getValue(),
            valor_autorizado: valorAutorizadoField.getValue(),
            gnd3_autorizado: gnd3Field.getValue(),
            gnd4_autorizado: gnd4Field.getValue(),
            acao_orcamentaria: acaoField.getValue() || null,
            plano_orcamentario: planoField.getValue() || null,
            data_assinatura: dataAssinaturaField.getValue(),
            revisao: revisaoField.getValue() || null,
            itens,
          };

          saving = true;
          try {
            if (isEdit) {
              await updatePdr(pdrId, body);
              showSuccess('PDR atualizado com sucesso');
            } else {
              await createPdr(body);
              showSuccess('PDR criado com sucesso');
            }
            close();
            if (onSaved) onSaved();
          } catch (err) {
            showError(err.message || 'Erro ao salvar PDR');
          } finally {
            saving = false;
          }
        },
      },
    ],
  });
}
