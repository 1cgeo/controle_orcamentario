import { describe, test, expect, vi } from 'vitest';

// Smoke test da pagina de Notas de Credito. Mocka o service (lista + dialog).
vi.mock('@services/orcamento-service.js', () => ({
  getNotasCredito: vi.fn(() => Promise.resolve([])),
  deleteNotaCredito: vi.fn(() => Promise.resolve()),
  getExercicios: vi.fn(() => Promise.resolve([{ ano: 2026 }])),
  getClassificacaoNc: vi.fn(() => Promise.resolve([])),
  getNotaCredito: vi.fn(() => Promise.resolve({})),
  createNotaCredito: vi.fn(() => Promise.resolve({})),
  updateNotaCredito: vi.fn(() => Promise.resolve({})),
  getNaturezaDespesa: vi.fn(() => Promise.resolve([])),
  getPlanoInterno: vi.fn(() => Promise.resolve([])),
  getUg: vi.fn(() => Promise.resolve([])),
  getMetas: vi.fn(() => Promise.resolve([])),
}));

import { renderNotasCreditoList } from '@pages/notas-credito/list.js';
import { getNotasCredito } from '@services/orcamento-service.js';

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

describe('renderNotasCreditoList', () => {
  test('monta titulo e carrega a lista do service', async () => {
    const container = document.createElement('div');
    const cleanup = await renderNotasCreditoList(container, { params: {}, query: new URLSearchParams() });
    await flush();

    expect(getNotasCredito).toHaveBeenCalled();
    expect(container.querySelector('.page__title')).not.toBeNull();
    expect(container.querySelector('.data-table-wrapper')).not.toBeNull();

    if (typeof cleanup === 'function') cleanup();
  });
});
