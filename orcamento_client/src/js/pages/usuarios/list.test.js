import { describe, test, expect, vi, beforeEach } from 'vitest';

// Smoke test da pagina de Usuarios. Mocka o service de usuarios.
vi.mock('@services/orcamento-service.js', () => ({
  getUsuarios: vi.fn(() => Promise.resolve([])),
  getUsuariosAuthServer: vi.fn(() => Promise.resolve([])),
  importarUsuarios: vi.fn(() => Promise.resolve({})),
  atualizarUsuario: vi.fn(() => Promise.resolve({})),
  sincronizarUsuarios: vi.fn(() => Promise.resolve({})),
  getModulos: vi.fn(() => Promise.resolve([
    { code: 1, nome: 'Controle Orçamentário', nome_abrev: 'orcamento' },
  ])),
  getTiposPerfil: vi.fn(() => Promise.resolve([
    { code: 1, nome: 'Consulta' },
    { code: 2, nome: 'Operador' },
    { code: 3, nome: 'Gerente' },
  ])),
}));

import { renderUsuariosList } from '@pages/usuarios/list.js';
import { getUsuarios, getTiposPerfil, atualizarUsuario } from '@services/orcamento-service.js';

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

const USUARIO = {
  uuid: 'u-1',
  login: 'sgt.silva',
  nome: 'Silva',
  nome_guerra: 'Silva',
  tipo_posto_grad: '3 Sgt',
  administrador: false,
  ativo: true,
  perfis: { orcamento: 2 },
};

beforeEach(() => {
  vi.clearAllMocks();
  getUsuarios.mockResolvedValue([]);
  getTiposPerfil.mockResolvedValue([
    { code: 1, nome: 'Consulta' },
    { code: 2, nome: 'Operador' },
    { code: 3, nome: 'Gerente' },
  ]);
});

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

  test('mostra o perfil pelo NOME do nivel, nao pelo codigo', async () => {
    getUsuarios.mockResolvedValue([USUARIO]);
    const container = document.createElement('div');
    const cleanup = await renderUsuariosList(container, { params: {}, query: new URLSearchParams() });
    await flush();
    await flush();

    expect(getTiposPerfil).toHaveBeenCalled();
    expect(container.textContent).toContain('Perfil no orçamento');
    expect(container.textContent).toContain('Operador');

    if (typeof cleanup === 'function') cleanup();
  });

  test('quem e administrador aparece com todos os modulos', async () => {
    getUsuarios.mockResolvedValue([{ ...USUARIO, administrador: true, perfis: {} }]);
    const container = document.createElement('div');
    const cleanup = await renderUsuariosList(container, { params: {}, query: new URLSearchParams() });
    await flush();
    await flush();

    expect(container.textContent).toContain('todos (administrador)');

    if (typeof cleanup === 'function') cleanup();
  });

  test('usuario sem perfil no modulo aparece como Sem acesso', async () => {
    getUsuarios.mockResolvedValue([{ ...USUARIO, perfis: {} }]);
    const container = document.createElement('div');
    const cleanup = await renderUsuariosList(container, { params: {}, query: new URLSearchParams() });
    await flush();
    await flush();

    expect(container.textContent).toContain('Sem acesso');
    // Renderizar a lista nao pode escrever nada sozinho
    expect(atualizarUsuario).not.toHaveBeenCalled();

    if (typeof cleanup === 'function') cleanup();
  });
});
