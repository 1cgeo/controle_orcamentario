import { describe, test, expect, vi } from 'vitest';

// Smoke test de pagina: mocka o service e verifica que renderExerciciosList
// monta o titulo e a tabela com os dados carregados. Exemplo do padrao de
// teste de pagina (jsdom + service mockado).
vi.mock('@services/orcamento-service.js', () => ({
  getExercicios: vi.fn(() => Promise.resolve([
    { ano: 2026, uasg: '160382', codom: '048215', ativo: true },
    { ano: 2025, uasg: '160382', codom: '048215', ativo: false },
  ])),
  createExercicio: vi.fn(() => Promise.resolve({ ano: 2026 })),
  updateExercicio: vi.fn(() => Promise.resolve({ ano: 2026 })),
  deleteExercicio: vi.fn(() => Promise.resolve()),
}));

import { renderExerciciosList } from '@pages/exercicios/list.js';
import { getExercicios } from '@services/orcamento-service.js';

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

describe('renderExerciciosList', () => {
  test('monta titulo e carrega a lista do service', async () => {
    const container = document.createElement('div');
    const cleanup = await renderExerciciosList(container, { params: {}, query: new URLSearchParams() });
    await flush();

    expect(getExercicios).toHaveBeenCalled();
    const titulo = container.querySelector('.page__title');
    expect(titulo).not.toBeNull();
    expect(titulo.textContent.toLowerCase()).toContain('exerc');

    // A tabela deve renderizar (data-table-wrapper vem do componente compartilhado)
    expect(container.querySelector('.data-table-wrapper')).not.toBeNull();

    if (typeof cleanup === 'function') cleanup();
  });
});
