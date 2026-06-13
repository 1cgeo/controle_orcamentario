import { describe, test, expect, vi, beforeEach } from 'vitest';

// Smoke test do dashboard. Controlamos por teste o retorno de getExercicioAtivo
// (com exercicio / sem exercicio) via mockResolvedValueOnce.
vi.mock('@services/orcamento-service.js', () => ({
  getExercicioAtivo: vi.fn(() => Promise.resolve({ ano: 2026 })),
  getSecao3: vi.fn(() => Promise.resolve({
    tabela_31: [
      { cod_nd: 'TOTAL', nd_nome: 'TOTAL', previsto: 100, recebido: 50, empenhado: 40, liquidado: 30 },
    ],
  })),
}));

import { renderDashboard } from '@pages/dashboard/index.js';
import { getExercicioAtivo, getSecao3 } from '@services/orcamento-service.js';

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

describe('renderDashboard', () => {
  beforeEach(() => {
    getExercicioAtivo.mockResolvedValue({ ano: 2026 });
    getSecao3.mockResolvedValue({
      tabela_31: [
        { cod_nd: 'TOTAL', nd_nome: 'TOTAL', previsto: 100, recebido: 50, empenhado: 40, liquidado: 30 },
      ],
    });
  });

  test('com exercicio ativo monta o dashboard e carrega a secao 3', async () => {
    const container = document.createElement('div');
    const cleanup = await renderDashboard(container, { params: {}, query: new URLSearchParams() });
    await flush();

    expect(getExercicioAtivo).toHaveBeenCalled();
    expect(getSecao3).toHaveBeenCalled();
    expect(container.querySelector('.dashboard__title')).not.toBeNull();

    if (typeof cleanup === 'function') cleanup();
  });

  test('sem exercicio ativo mostra o aviso', async () => {
    getExercicioAtivo.mockResolvedValueOnce(null);

    const container = document.createElement('div');
    const cleanup = await renderDashboard(container, { params: {}, query: new URLSearchParams() });
    await flush();

    expect(getExercicioAtivo).toHaveBeenCalled();
    const aviso = container.querySelector('.empty-state');
    expect(aviso).not.toBeNull();
    expect(aviso.classList.contains('hidden')).toBe(false);
    expect(aviso.textContent.toLowerCase()).toContain('nenhum exerc');

    if (typeof cleanup === 'function') cleanup();
  });
});
