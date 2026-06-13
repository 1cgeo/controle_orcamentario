import { describe, test, expect, vi } from 'vitest';

// Smoke test da pagina de Usuarios. Mocka o service de usuarios.
vi.mock('@services/orcamento-service.js', () => ({
  getUsuarios: vi.fn(() => Promise.resolve([])),
  getUsuariosAuthServer: vi.fn(() => Promise.resolve([])),
  importarUsuarios: vi.fn(() => Promise.resolve({})),
  atualizarUsuario: vi.fn(() => Promise.resolve({})),
  sincronizarUsuarios: vi.fn(() => Promise.resolve({})),
}));

import { renderUsuariosList } from '@pages/usuarios/list.js';
import { getUsuarios } from '@services/orcamento-service.js';

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

describe('renderUsuariosList', () => {
  test('monta titulo e carrega a lista do service', async () => {
    const container = document.createElement('div');
    const cleanup = await renderUsuariosList(container, { params: {}, query: new URLSearchParams() });
    await flush();

    expect(getUsuarios).toHaveBeenCalled();
    expect(container.querySelector('.page__title')).not.toBeNull();
    expect(container.querySelector('.data-table-wrapper')).not.toBeNull();

    if (typeof cleanup === 'function') cleanup();
  });
});
