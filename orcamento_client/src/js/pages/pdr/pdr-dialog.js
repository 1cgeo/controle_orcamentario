import { el, svgIcon, ICONS } from '@utils/dom.js';
import { openModal } from '@components/modal/modal-base.js';
import {
  createSelectField,
  createTextField,
  createNumberField,
  createDateField,
} from '@components/form-fields/form-fields.js';
import { showSuccess, showError } from '@utils/toast.js';
import { formatCurrency } from '@utils/format.js';
import { getAno } from '@store/year-store.js';
import {
  getPdr,
  createPdr,
  updatePdr,
  getNaturezaDespesa,
  getMetas,
} from '@services/orcamento-service.js';

/**
 * Abre o dialog de criar/editar PDR (Pedido de Descentralizacao de Recursos).
 * Ha no maximo um PDR por ano. O dialog tem os campos do cabecalho mais uma
 * GRADE de itens editavel inline (cada linha um item; ND, meta, rotulo, GND,
 * valores e observacao), com adicionar/remover linhas e total do autorizado.
 * O ano e sempre o ano de contexto global (no create) ou o ano do registro (edit).
 *
 * @param {Object} options
 * @param {number|null} [options.pdrId] - id do PDR existente para editar (null cria novo)
 * @param {Function} [options.onSaved] - chamado apos salvar com sucesso
 */
export async function openPdrDialog({ pdrId = null, onSaved = null } = {}) {
  const isEdit = pdrId !== null && pdrId !== undefined;

  let naturezas = [];
  let metas = [];
  let pdr = null;

  try {
    naturezas = await getNaturezaDespesa();
    if (isEdit) pdr = await getPdr(pdrId);
    // No create o ano e o contexto global; no edit, o ano do registro.
    const anoMetas = isEdit ? (pdr?.ano ?? getAno()) : getAno();
    metas = await getMetas(anoMetas);
  } catch (err) {
    showError(err.message || 'Erro ao carregar dados do PDR');
    return;
  }

  // O ano efetivo do PDR (nao editavel: contexto global ou ano do registro).
  const anoPdr = isEdit ? (pdr?.ano ?? getAno()) : getAno();

  const ndOptions = (naturezas || []).map(nd => ({
    value: nd.code,
    label: `${nd.code} - ${nd.nome}`,
  }));

  const metaOptions = (metas || []).map(m => {
    const partes = [];
    if (m.numero_meta !== null && m.numero_meta !== undefined) partes.push(`Meta ${m.numero_meta}`);
    if (m.item) partes.push(m.item);
    const prefixo = partes.join(' - ');
    const label = m.descricao
      ? (prefixo ? `${prefixo}: ${m.descricao}` : m.descricao)
      : (prefixo || `Meta ${m.id}`);
    return { value: m.id, label };
  });

  // ---- Campos do cabecalho ----
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

  // ---- Grade de itens (editavel inline) ----
  // Cada linha guarda seus campos num objeto `entry`; o array `itemRows` e o
  // estado. Ao digitar em qualquer valor autorizado, o total do rodape e
  // recalculado. Linhas totalmente vazias sao ignoradas no salvar.
  const itemRows = [];

  const tbody = el('tbody');
  const totalCell = el('td', {
    className: 'pdr-grid__total-value',
    colSpan: 2,
    textContent: formatCurrency(0),
    style: { textAlign: 'right', fontWeight: '600' },
  });

  function recalcTotal() {
    let total = 0;
    for (const entry of itemRows) {
      const v = entry.valorAutField.getValue();
      if (typeof v === 'number' && !isNaN(v)) total += v;
    }
    totalCell.textContent = formatCurrency(total);
  }

  function cellInput(field) {
    // Esconde o label dos form-fields dentro da celula (a coluna ja rotula).
    field.element.style.margin = '0';
    return el('td', { style: { padding: '4px 6px', verticalAlign: 'top' } }, [field.element]);
  }

  function buildItemRow(item = null) {
    const codNdField = createSelectField({
      options: ndOptions,
      placeholder: 'ND...',
      value: item?.cod_nd ?? undefined,
    });
    const metaField = createSelectField({
      options: metaOptions,
      placeholder: 'Meta...',
      value: item?.meta_pit_id ?? undefined,
    });
    const itemLabelField = createTextField({
      maxLength: 10,
      placeholder: 'Ex.: 1D',
      value: item?.item_label ?? '',
    });
    const gndField = createNumberField({
      min: 0,
      step: 1,
      placeholder: '3 ou 4',
      value: item?.gnd ?? undefined,
    });
    const valorSolField = createNumberField({
      min: 0,
      step: 0.01,
      placeholder: '0,00',
      value: item?.valor_solicitado ?? undefined,
    });
    const valorAutField = createNumberField({
      min: 0,
      step: 0.01,
      placeholder: '0,00',
      value: item?.valor_autorizado ?? undefined,
    });
    const obsField = createTextField({
      placeholder: 'Observação',
      value: item?.observacao ?? '',
    });

    // Recalcula o total ao digitar no autorizado.
    valorAutField.input.addEventListener('input', recalcTotal);

    const removeBtn = el('button', {
      className: 'btn btn--text btn--sm',
      type: 'button',
      title: 'Remover item',
      'aria-label': 'Remover item',
      onClick: () => removeItemRow(entry),
    }, [svgIcon(ICONS.delete, 16)]);

    const rowEl = el('tr', {}, [
      cellInput(codNdField),
      cellInput(metaField),
      cellInput(itemLabelField),
      cellInput(gndField),
      cellInput(valorSolField),
      cellInput(valorAutField),
      cellInput(obsField),
      el('td', { style: { padding: '4px 6px', textAlign: 'center', verticalAlign: 'top' } }, [removeBtn]),
    ]);

    const entry = {
      rowEl,
      codNdField,
      valorAutField,
      isEmpty: () => {
        const dados = entry.getValue();
        return (
          (dados.cod_nd === null || dados.cod_nd === undefined) &&
          (dados.meta_pit_id === null || dados.meta_pit_id === undefined) &&
          !dados.item_label &&
          (dados.gnd === null || dados.gnd === undefined) &&
          (dados.valor_solicitado === null || dados.valor_solicitado === undefined) &&
          (dados.valor_autorizado === null || dados.valor_autorizado === undefined) &&
          !dados.observacao
        );
      },
      getValue: () => ({
        cod_nd: codNdField.getValue(),
        meta_pit_id: metaField.getValue(),
        item_label: itemLabelField.getValue() || null,
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
    tbody.appendChild(entry.rowEl);
    recalcTotal();
  }

  function removeItemRow(entry) {
    const idx = itemRows.indexOf(entry);
    if (idx >= 0) {
      itemRows.splice(idx, 1);
      entry.rowEl.remove();
      recalcTotal();
    }
  }

  function th(label, opts = {}) {
    return el('th', {
      textContent: label,
      style: {
        textAlign: opts.align || 'left',
        padding: '6px',
        fontSize: 'var(--font-size-xs, 0.75rem)',
        color: 'var(--text-secondary)',
        fontWeight: '600',
        whiteSpace: 'nowrap',
        ...(opts.width ? { width: opts.width } : {}),
      },
    });
  }

  const grade = el('table', {
    className: 'pdr-grid',
    style: { width: '100%', borderCollapse: 'collapse' },
  }, [
    el('thead', {}, [
      el('tr', {}, [
        th('ND', { width: '18%' }),
        th('Meta do PIT', { width: '20%' }),
        th('Rótulo', { width: '8%' }),
        th('GND', { width: '8%' }),
        th('Solicitado', { width: '12%' }),
        th('Autorizado', { width: '12%' }),
        th('Obs.'),
        th('', { width: '40px', align: 'center' }),
      ]),
    ]),
    tbody,
    el('tfoot', {}, [
      el('tr', {}, [
        el('td', {
          colSpan: 5,
          textContent: 'Total autorizado',
          style: { textAlign: 'right', padding: '8px 6px', fontWeight: '600' },
        }),
        totalCell,
        el('td', { colSpan: 2 }),
      ]),
    ]),
  ]);

  // Popula itens existentes (modo edicao).
  if (isEdit && Array.isArray(pdr?.itens)) {
    for (const item of pdr.itens) addItemRow(item);
  }
  recalcTotal();

  const addItemBtn = el('button', {
    className: 'btn btn--secondary',
    type: 'button',
    onClick: () => addItemRow(),
  }, [svgIcon(ICONS.add, 16), 'Adicionar item']);

  const content = el('div', {}, [
    el('div', { className: 'form-grid' }, [
      el('div', { className: 'form-grid__full' }, [
        el('p', {
          className: 'pdr-dialog__ano',
          textContent: `Ano do PDR: ${anoPdr}`,
          style: { margin: '0', color: 'var(--text-secondary)' },
        }),
      ]),
      revisaoField.element,
      dataAssinaturaField.element,
      valorSolicitadoField.element,
      valorAutorizadoField.element,
      gnd3Field.element,
      gnd4Field.element,
      acaoField.element,
      planoField.element,
    ]),
    el('div', { style: { marginTop: 'var(--space-md, 16px)' } }, [
      el('h3', {
        className: 'form-section__title',
        textContent: 'Itens do PDR',
        style: { margin: '0 0 8px' },
      }),
      el('div', {
        style: {
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md, 8px)',
          overflowX: 'auto',
        },
      }, [grade]),
      el('div', { style: { marginTop: 'var(--space-sm, 8px)' } }, [addItemBtn]),
    ]),
  ]);

  let saving = false;

  openModal({
    title: isEdit ? `Editar PDR ${anoPdr}` : `Novo PDR ${anoPdr}`,
    content,
    width: '920px',
    actions: [
      { label: 'Cancelar', variant: 'text', onClick: ({ close }) => close() },
      {
        label: 'Salvar',
        variant: 'primary',
        onClick: async ({ close }) => {
          if (saving) return;

          let valid = true;
          const itens = [];
          for (const entry of itemRows) {
            entry.setCodNdError(null);
            if (entry.isEmpty()) continue; // ignora linhas totalmente vazias
            const dados = entry.getValue();
            if (dados.cod_nd === null || dados.cod_nd === undefined) {
              entry.setCodNdError('Selecione a ND');
              valid = false;
            }
            itens.push(dados);
          }

          if (!valid) {
            showError('Corrija os itens destacados antes de salvar');
            return;
          }

          const body = {
            ano: anoPdr,
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
