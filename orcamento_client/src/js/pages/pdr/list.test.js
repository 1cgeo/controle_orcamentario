import { describe, test, expect, vi } from 'vitest';

// Smoke test da pagina de PDR. O dialog importa exercicios/itens; mockamos as
// funcoes da lista (getPdrs, deletePdr) e do dialog.
vi.mock('@services/orcamento-service.js', () => ({
  getPdrs: vi.fn(() => Promise.resolve([])),
  deletePdr: vi.fn(() => Promise.resolve()),
  getPdr: vi.fn(() => Promise.resolve({ itens: [] })),
  createPdr: vi.fn(() => Promise.resolve({})),
  updatePdr: vi.fn(() => Promise.resolve({})),
  getExercicios: vi.fn(() => Promise.resolve([{ ano: 2026 }])),
  getNaturezaDespesa: vi.fn(() => Promise.resolve([])),
  getMetas: vi.fn(() => Promise.resolve([])),
}));

import { renderPdrList } from '@pages/pdr/list.js';
import { getPdrs } from '@services/orcamento-service.js';

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

describe('renderPdrList', () => {
  test('monta titulo e carrega a lista do service', async () => {
    const container = document.createElement('div');
    const cleanup = await renderPdrList(container, { params: {}, query: new URLSearchParams() });
    await flush();

    expect(getPdrs).toHaveBeenCalled();
    expect(container.querySelector('.page__title')).not.toBeNull();
    expect(container.querySelector('.data-table-wrapper')).not.toBeNull();

    if (typeof cleanup === 'function') cleanup();
  });
});
