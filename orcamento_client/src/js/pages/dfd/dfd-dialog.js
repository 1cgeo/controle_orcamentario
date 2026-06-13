import { el, svgIcon, ICONS } from '@utils/dom.js';
import { openModal } from '@components/modal/modal-base.js';
import {
  createTextField,
  createSelectField,
  createNumberField,
  createDateField,
  createTextareaField,
  createCheckboxField,
} from '@components/form-fields/form-fields.js';
import { showSuccess, showError } from '@utils/toast.js';
import * as svc from '@services/orcamento-service.js';

/** String vazia vira null (campos opcionais da API). */
function orNull(value) {
  return value === '' || value === undefined ? null : value;
}

/**
 * Cria uma linha de item do DFD (sub-formulario dinamico).
 * Retorna o elemento, um getValue() e um setError() para a descricao.
 * @param {Object} options
 * @param {Array<{code:number, nome:string}>} options.tipoItem
 * @param {Object|null} [options.item] - item existente para pre-preencher
 * @param {Function} options.onRemove - chamado quando o botao remover e clicado
 */
function createItemRow({ tipoItem = [], item = null, onRemove }) {
  const tipoField = createSelectField({
    label: 'Tipo do item',
    required: true,
    options: tipoItem.map((t) => ({ value: t.code, label: t.nome })),
    value: item ? item.tipo_item_id : undefined,
  });
  const codField = createTextField({
    label: 'CATMAT/CATSER',
    value: item?.cod_catmat_catser ?? '',
    maxLength: 50,
  });
  const descricaoField = createTextField({
    label: 'Descrição',
    required: true,
    value: item?.descricao ?? '',
  });
  const quantidadeField = createNumberField({
    label: 'Quantidade',
    min: 0,
    step: 0.01,
    value: item?.quantidade ?? undefined,
  });
  const valorUnitarioField = createNumberField({
    label: 'Valor unitário',
    min: 0,
    step: 0.01,
    value: item?.valor_unitario ?? undefined,
  });
  const valorTotalField = createNumberField({
    label: 'Valor total',
    min: 0,
    step: 0.01,
    value: item?.valor_total ?? undefined,
  });

  const removeBtn = el('button', {
    className: 'data-table__action-btn data-table__action-btn--danger',
    type: 'button',
    title: 'Remover item',
    'aria-label': 'Remover item',
    onClick: () => onRemove(),
  }, [svgIcon(ICONS.delete, 18)]);

  const element = el('div', { className: 'dfd-item-row' }, [
    el('div', { className: 'dfd-item-row__header' }, [
      el('strong', { textContent: 'Item' }),
      removeBtn,
    ]),
    el('div', { className: 'form-grid' }, [
      tipoField.element,
      codField.element,
      el('div', { className: 'form-grid__full' }, [descricaoField.element]),
      quantidadeField.element,
      valorUnitarioField.element,
      valorTotalField.element,
    ]),
  ]);

  function validate() {
    let ok = true;
    tipoField.setError(null);
    descricaoField.setError(null);
    if (tipoField.getValue() === null) {
      tipoField.setError('Selecione o tipo do item');
      ok = false;
    }
    if (!descricaoField.getValue()) {
      descricaoField.setError('Informe a descrição do item');
      ok = false;
    }
    return ok;
  }

  function getValue() {
    return {
      tipo_item_id: tipoField.getValue(),
      cod_catmat_catser: orNull(codField.getValue()),
      descricao: descricaoField.getValue(),
      quantidade: quantidadeField.getValue(),
      valor_unitario: valorUnitarioField.getValue(),
      valor_total: valorTotalField.getValue(),
    };
  }

  return { element, validate, getValue };
}

/**
 * Abre o dialog de criar/editar DFD, incluindo a lista dinamica de itens.
 * @param {Object} options
 * @param {Object|null} [options.dfd] - DFD existente (ja com itens) para editar
 * @param {Object} options.dominios - { exercicios, pcas, grauPrioridade, tipoItem }
 * @param {Function} [options.onSaved] - chamado apos salvar com sucesso
 */
export function openDfdDialog({ dfd = null, dominios = {}, onSaved = null } = {}) {
  const isEdit = Boolean(dfd);
  const {
    exercicios = [],
    pcas = [],
    grauPrioridade = [],
    tipoItem = [],
  } = dominios;

  const numeroField = createTextField({
    label: 'Número',
    required: true,
    value: dfd?.numero ?? '',
    maxLength: 50,
  });
  const anoField = createSelectField({
    label: 'Ano',
    required: true,
    options: exercicios.map((e) => ({ value: e.ano, label: String(e.ano) })),
    value: dfd ? dfd.ano : undefined,
  });
  const rotuloField = createTextField({
    label: 'Rótulo',
    value: dfd?.rotulo ?? '',
    maxLength: 255,
  });
  const objetoField = createTextareaField({
    label: 'Objeto',
    value: dfd?.objeto ?? '',
  });
  const justificativaField = createTextareaField({
    label: 'Justificativa',
    value: dfd?.justificativa ?? '',
  });
  const areaField = createTextField({
    label: 'Área requisitante',
    value: dfd?.area_requisitante ?? '',
    maxLength: 255,
  });
  const grauField = createSelectField({
    label: 'Grau de prioridade',
    options: grauPrioridade.map((g) => ({ value: g.code, label: g.nome })),
    value: dfd ? dfd.grau_prioridade_id : undefined,
  });
  const dataPrevistaField = createDateField({
    label: 'Data prevista de conclusão',
    value: dfd?.data_prevista_conclusao ?? '',
  });
  const cpfField = createTextField({
    label: 'CPF do responsável',
    value: dfd?.responsavel_cpf ?? '',
    maxLength: 14,
  });
  const vinculoField = createTextField({
    label: 'Vínculo com plano de gestão',
    value: dfd?.vinculo_plano_gestao ?? '',
    maxLength: 255,
  });
  const constaPcaField = createCheckboxField({
    label: 'Consta no PCA',
    checked: dfd ? Boolean(dfd.consta_pca) : true,
  });
  const pcaField = createSelectField({
    label: 'PCA vinculado',
    options: pcas.map((p) => ({
      value: p.id,
      label: `${p.ano} - ${p.uasg || 'sem UASG'}`,
    })),
    value: dfd ? dfd.pca_id : undefined,
  });

  // ---- Lista dinamica de itens ----
  const itemRows = [];
  const itensContainer = el('div', { className: 'dfd-itens' });

  function addItem(item = null) {
    const row = createItemRow({
      tipoItem,
      item,
      onRemove: () => {
        const idx = itemRows.indexOf(row);
        if (idx >= 0) itemRows.splice(idx, 1);
        row.element.remove();
      },
    });
    itemRows.push(row);
    itensContainer.appendChild(row.element);
  }

  const addItemBtn = el('button', {
    className: 'btn btn--secondary',
    type: 'button',
    onClick: () => addItem(),
  }, [svgIcon(ICONS.add, 16), 'Adicionar item']);

  // Pre-preenche os itens no modo edicao.
  if (isEdit && Array.isArray(dfd.itens)) {
    for (const item of dfd.itens) addItem(item);
  }

  const content = el('div', {}, [
    el('div', { className: 'form-grid' }, [
      numeroField.element,
      anoField.element,
      rotuloField.element,
      areaField.element,
      el('div', { className: 'form-grid__full' }, [objetoField.element]),
      el('div', { className: 'form-grid__full' }, [justificativaField.element]),
      grauField.element,
      dataPrevistaField.element,
      cpfField.element,
      vinculoField.element,
      pcaField.element,
      el('div', { className: 'form-grid__full' }, [constaPcaField.element]),
    ]),
    el('div', { className: 'dfd-itens-section' }, [
      el('div', { className: 'dfd-itens-section__header' }, [
        el('h3', { textContent: 'Itens do DFD' }),
        addItemBtn,
      ]),
      itensContainer,
    ]),
  ]);

  let saving = false;

  openModal({
    title: isEdit ? 'Editar DFD' : 'Novo DFD',
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
          anoField.setError(null);

          let valid = true;
          if (!numeroField.getValue()) {
            numeroField.setError('Informe o número do DFD');
            valid = false;
          }
          if (anoField.getValue() === null) {
            anoField.setError('Selecione o ano do DFD');
            valid = false;
          }
          for (const row of itemRows) {
            if (!row.validate()) valid = false;
          }
          if (!valid) return;

          const body = {
            numero: numeroField.getValue(),
            ano: anoField.getValue(),
            rotulo: orNull(rotuloField.getValue()),
            objeto: orNull(objetoField.getValue()),
            justificativa: orNull(justificativaField.getValue()),
            area_requisitante: orNull(areaField.getValue()),
            grau_prioridade_id: grauField.getValue(),
            data_prevista_conclusao: dataPrevistaField.getValue(),
            responsavel_cpf: orNull(cpfField.getValue()),
            vinculo_plano_gestao: orNull(vinculoField.getValue()),
            consta_pca: constaPcaField.getValue(),
            pca_id: pcaField.getValue(),
            itens: itemRows.map((row) => row.getValue()),
          };

          saving = true;
          try {
            if (isEdit) {
              await svc.updateDfd(dfd.id, body);
              showSuccess('DFD atualizado com sucesso');
            } else {
              await svc.createDfd(body);
              showSuccess('DFD criado com sucesso');
            }
            close();
            if (onSaved) onSaved();
          } catch (err) {
            showError(err.message || 'Erro ao salvar DFD');
          } finally {
            saving = false;
          }
        },
      },
    ],
  });
}
