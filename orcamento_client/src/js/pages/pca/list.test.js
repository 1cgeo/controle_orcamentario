import { describe, test, expect, vi } from 'vitest';

// Smoke test da pagina de PCA. A lista usa `import * as svc`; mockamos as
// funcoes do load (getPcas, getExercicios) e do dialog (create/update/delete).
vi.mock('@services/orcamento-service.js', () => ({
  getPcas: vi.fn(() => Promise.resolve([])),
  getExercicios: vi.fn(() => Promise.resolve([{ ano: 2026 }])),
  deletePca: vi.fn(() => Promise.resolve()),
  createPca: vi.fn(() => Promise.resolve({})),
  updatePca: vi.fn(() => Promise.resolve({})),
}));

import { renderPcaList } from '@pages/pca/list.js';
import { getPcas } from '@services/orcamento-service.js';

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

describe('renderPcaList', () => {
  test('monta titulo e carrega a lista do service', async () => {
    const container = document.createElement('div');
    const cleanup = await renderPcaList(container, { params: {}, query: new URLSearchParams() });
    await flush();

    expect(getPcas).toHaveBeenCalled();
    expect(container.querySelector('.page__title')).not.toBeNull();
    expect(container.querySelector('.data-table-wrapper')).not.toBeNull();

    if (typeof cleanup === 'function') cleanup();
  });
});
