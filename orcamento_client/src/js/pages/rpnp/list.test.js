import { describe, test, expect, vi } from 'vitest';

// Smoke test da pagina de RPNP. Mocka o service (lista + dialog).
vi.mock('@services/orcamento-service.js', () => ({
  getRpnps: vi.fn(() => Promise.resolve([])),
  deleteRpnp: vi.fn(() => Promise.resolve()),
  getExercicios: vi.fn(() => Promise.resolve([{ ano: 2026 }])),
  getRpnp: vi.fn(() => Promise.resolve({})),
  createRpnp: vi.fn(() => Promise.resolve({})),
  updateRpnp: vi.fn(() => Promise.resolve({})),
  getNotasEmpenho: vi.fn(() => Promise.resolve([])),
}));

import { renderRpnpList } from '@pages/rpnp/list.js';
import { getRpnps } from '@services/orcamento-service.js';

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

describe('renderRpnpList', () => {
  test('monta titulo e carrega a lista do service', async () => {
    const container = document.createElement('div');
    const cleanup = await renderRpnpList(container, { params: {}, query: new URLSearchParams() });
    await flush();

    expect(getRpnps).toHaveBeenCalled();
    expect(container.querySelector('.page__title')).not.toBeNull();
    expect(container.querySelector('.data-table-wrapper')).not.toBeNull();

    if (typeof cleanup === 'function') cleanup();
  });
});
