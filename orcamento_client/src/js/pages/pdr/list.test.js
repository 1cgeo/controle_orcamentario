import { describe, test, expect, vi, beforeEach } from 'vitest';

// Smoke test da tela de PDR. Ha no maximo 1 PDR por ano (contexto global):
// sem PDR mostra o aviso e o botao de criar; com PDR mostra o resumo.
vi.mock('@services/orcamento-service.js', () => ({
  getPdrs: vi.fn(() => Promise.resolve([])),
  deletePdr: vi.fn(() => Promise.resolve()),
  getPdr: vi.fn(() => Promise.resolve({ itens: [] })),
  createPdr: vi.fn(() => Promise.resolve({})),
  updatePdr: vi.fn(() => Promise.resolve({})),
  getNaturezaDespesa: vi.fn(() => Promise.resolve([])),
  getMetas: vi.fn(() => Promise.resolve([])),
}));

vi.mock('@store/year-store.js', () => ({
  getAno: vi.fn(() => 2026),
  onAnoChange: vi.fn(() => () => {}),
}));

import { renderPdrList } from '@pages/pdr/list.js';
import { getPdrs } from '@services/orcamento-service.js';
import { getAno } from '@store/year-store.js';

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

describe('renderPdrList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAno.mockReturnValue(2026);
  });

  test('sem PDR do ano, mostra aviso e botao de criar', async () => {
    getPdrs.mockResolvedValueOnce([]);
    const container = document.createElement('div');
    const cleanup = await renderPdrList(container, { params: {}, query: new URLSearchParams() });
    await flush();

    expect(getPdrs).toHaveBeenCalledWith(2026);
    expect(container.querySelector('.page__title')).not.toBeNull();
    const empty = container.querySelector('.pdr-empty');
    expect(empty).not.toBeNull();
    expect(empty.textContent).toContain('Criar PDR do ano 2026');

    if (typeof cleanup === 'function') cleanup();
  });

  test('com PDR do ano, mostra o resumo com editar e excluir', async () => {
    getPdrs.mockResolvedValueOnce([
      { id: 7, ano: 2026, valor_autorizado: 1000, revisao: 'E1', itens: [{}, {}] },
    ]);
    const container = document.createElement('div');
    const cleanup = await renderPdrList(container, { params: {}, query: new URLSearchParams() });
    await flush();

    const summary = container.querySelector('.pdr-summary');
    expect(summary).not.toBeNull();
    expect(summary.textContent).toContain('Editar');
    expect(summary.textContent).toContain('Excluir');

    if (typeof cleanup === 'function') cleanup();
  });
});
