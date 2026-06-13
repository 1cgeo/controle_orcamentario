import { describe, test, expect, vi, beforeEach } from 'vitest';

// Teste de COMPORTAMENTO do dialog de exercicio. Mocka o service e o toast,
// abre o dialog (que renderiza em document.body via openModal), preenche os
// inputs do form e clica em Salvar. Verifica que createExercicio/updateExercicio
// foram chamados com o payload correto e que showSuccess foi disparado. Tambem
// cobre a validacao local: salvar sem o ano (obrigatorio) NAO chama o service
// e mostra o erro no campo.

vi.mock('@services/orcamento-service.js', () => ({
  createExercicio: vi.fn(() => Promise.resolve({ ano: 2026 })),
  updateExercicio: vi.fn(() => Promise.resolve({ ano: 2026 })),
}));

vi.mock('@utils/toast.js', () => ({
  showSuccess: vi.fn(),
  showError: vi.fn(),
}));

import { openExercicioDialog } from './exercicio-dialog.js';
import { createExercicio, updateExercicio } from '@services/orcamento-service.js';
import { showSuccess, showError } from '@utils/toast.js';

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

// Helpers que enxergam o modal montado em document.body.
const getModal = () => document.body.querySelector('.modal');
const getInputs = () => Array.from(getModal().querySelectorAll('.form-field__input'));
const getCheckbox = () => getModal().querySelector('.form-field__checkbox');
const getSalvarBtn = () =>
  Array.from(getModal().querySelectorAll('.modal__footer .btn')).find(
    b => b.textContent.trim() === 'Salvar'
  );

// Seta o value de um input e dispara os eventos que o DOM real emitiria.
function setInput(input, value) {
  input.value = String(value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

beforeEach(() => {
  document.body.innerHTML = '';
  vi.clearAllMocks();
});

describe('openExercicioDialog: criacao', () => {
  test('preenche o form e Salvar chama createExercicio com o payload e showSuccess', async () => {
    openExercicioDialog();

    const inputs = getInputs();
    // ordem dos campos no form: [0] ano (number), [1] uasg, [2] codom
    setInput(inputs[0], 2027);
    setInput(inputs[1], '160500');
    setInput(inputs[2], '049999');

    // checkbox ativo: desmarca para validar que o booleano flui correto
    const ativo = getCheckbox();
    ativo.checked = false;
    ativo.dispatchEvent(new Event('change', { bubbles: true }));

    getSalvarBtn().click();
    await flush();

    expect(createExercicio).toHaveBeenCalledTimes(1);
    expect(createExercicio).toHaveBeenCalledWith({
      ano: 2027,
      uasg: '160500',
      codom: '049999',
      ativo: false,
    });
    expect(updateExercicio).not.toHaveBeenCalled();
    expect(showSuccess).toHaveBeenCalledTimes(1);
    // o modal fecha apos salvar com sucesso
    expect(getModal()).toBeNull();
  });

  test('campos vazios viram null no payload (uasg/codom)', async () => {
    openExercicioDialog();

    const inputs = getInputs();
    setInput(inputs[0], 2028);
    setInput(inputs[1], ''); // uasg vazio (default vem preenchido, limpamos)
    setInput(inputs[2], ''); // codom vazio

    getSalvarBtn().click();
    await flush();

    expect(createExercicio).toHaveBeenCalledWith({
      ano: 2028,
      uasg: null,
      codom: null,
      ativo: true, // default checked
    });
  });

  test('onSaved e chamado apos salvar com sucesso', async () => {
    const onSaved = vi.fn();
    openExercicioDialog({ onSaved });

    setInput(getInputs()[0], 2030);
    getSalvarBtn().click();
    await flush();

    expect(onSaved).toHaveBeenCalledTimes(1);
  });
});

describe('openExercicioDialog: validacao local', () => {
  test('Salvar sem ano NAO chama o service e mostra erro no campo', async () => {
    openExercicioDialog();

    // ano fica vazio; clica em Salvar
    getSalvarBtn().click();
    await flush();

    expect(createExercicio).not.toHaveBeenCalled();
    expect(showSuccess).not.toHaveBeenCalled();
    // o modal permanece aberto
    expect(getModal()).not.toBeNull();
    // erro visivel no primeiro campo (ano)
    const erro = getModal().querySelector('.form-field--error .form-field__error');
    expect(erro).not.toBeNull();
    expect(erro.textContent.length).toBeGreaterThan(0);
  });
});

describe('openExercicioDialog: edicao', () => {
  test('modo edicao chama updateExercicio por ano e mantem o ano fixo (PK)', async () => {
    openExercicioDialog({
      exercicio: { ano: 2025, uasg: '160382', codom: '048215', ativo: true },
    });

    const inputs = getInputs();
    // ano e a PK: input desabilitado no modo edicao
    expect(inputs[0].disabled).toBe(true);

    // altera uasg e ativo
    setInput(inputs[1], '160999');
    const ativo = getCheckbox();
    ativo.checked = false;
    ativo.dispatchEvent(new Event('change', { bubbles: true }));

    getSalvarBtn().click();
    await flush();

    expect(updateExercicio).toHaveBeenCalledTimes(1);
    expect(updateExercicio).toHaveBeenCalledWith(2025, {
      uasg: '160999',
      codom: '048215',
      ativo: false,
    });
    expect(createExercicio).not.toHaveBeenCalled();
    expect(showSuccess).toHaveBeenCalledTimes(1);
  });

  test('erro do service mostra showError e mantem o modal aberto', async () => {
    updateExercicio.mockRejectedValueOnce(new Error('Falha ao atualizar'));

    openExercicioDialog({
      exercicio: { ano: 2025, uasg: '160382', codom: '048215', ativo: true },
    });

    getSalvarBtn().click();
    await flush();

    expect(showError).toHaveBeenCalledWith('Falha ao atualizar');
    // o modal nao fecha quando o service falha
    expect(getModal()).not.toBeNull();
  });
});
