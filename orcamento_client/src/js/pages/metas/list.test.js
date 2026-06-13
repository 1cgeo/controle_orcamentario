import { describe, test, expect, vi } from 'vitest';

// Smoke test da pagina de Metas do PIT. Mocka o service (lista + dialog) e
// verifica que renderMetasList monta o titulo, a tabela e carrega as metas.
vi.mock('@services/orcamento-service.js', () => ({
  getMetas: vi.fn(() => Promise.resolve([])),
  getExercicios: vi.fn(() => Promise.resolve([{ ano: 2026 }])),
  deleteMeta: vi.fn(() => Promise.resolve()),
  createMeta: vi.fn(() => Promise.resolve({})),
  updateMeta: vi.fn(() => Promise.resolve({})),
}));

import { renderMetasList } from '@pages/metas/list.js';
import { getMetas, getExercicios } from '@services/orcamento-service.js';

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

describe('renderMetasList', () => {
  test('monta titulo e carrega a lista do service', async () => {
    const container = document.createElement('div');
    const cleanup = await renderMetasList(container, { params: {}, query: new URLSearchParams() });
    await flush();

    expect(getExercicios).toHaveBeenCalled();
    expect(getMetas).toHaveBeenCalled();
    expect(container.querySelector('.page__title')).not.toBeNull();
    expect(container.querySelector('.data-table-wrapper')).not.toBeNull();

    if (typeof cleanup === 'function') cleanup();
  });
});
