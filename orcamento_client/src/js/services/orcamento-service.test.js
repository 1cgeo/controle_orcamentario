import { describe, test, expect, vi, beforeEach } from 'vitest';

// Mocka o api-client: cada wrapper do service deve chamar apiGet/Post/Put/Delete
// com o metodo HTTP e a URL corretos (incluindo a query string).
vi.mock('@services/api-client.js', () => ({
  apiGet: vi.fn(() => Promise.resolve(null)),
  apiPost: vi.fn(() => Promise.resolve(null)),
  apiPut: vi.fn(() => Promise.resolve(null)),
  apiDelete: vi.fn(() => Promise.resolve(null)),
}));

import { apiGet, apiPost, apiPut, apiDelete } from '@services/api-client.js';
import * as svc from '@services/orcamento-service.js';

beforeEach(() => vi.clearAllMocks());

describe('orcamento-service: GET com query string', () => {
  test('getMetas(ano) monta ?ano=', () => {
    svc.getMetas(2026);
    expect(apiGet).toHaveBeenCalledWith('/metas?ano=2026');
  });

  test('getMetas() sem ano nao adiciona query', () => {
    svc.getMetas();
    expect(apiGet).toHaveBeenCalledWith('/metas');
  });

  test('getNotasCredito filtra por ano e classificacao', () => {
    svc.getNotasCredito({ ano: 2026, classificacao_id: 1 });
    expect(apiGet).toHaveBeenCalledWith('/notas_credito?ano=2026&classificacao_id=1');
  });

  test('getSecao3 monta a query do relatorio', () => {
    svc.getSecao3({ ano: 2026, mes: 6, cumulativo: true });
    expect(apiGet).toHaveBeenCalledWith('/relatorio/secao3?ano=2026&mes=6&cumulativo=true');
  });

  test('getExercicioAtivo aponta para /exercicios/ativo', () => {
    svc.getExercicioAtivo();
    expect(apiGet).toHaveBeenCalledWith('/exercicios/ativo');
  });
});

describe('orcamento-service: mutacoes', () => {
  test('createExercicio faz POST com o corpo', () => {
    svc.createExercicio({ ano: 2026, ativo: false });
    expect(apiPost).toHaveBeenCalledWith('/exercicios', { ano: 2026, ativo: false });
  });

  test('updateExercicio faz PUT por ano', () => {
    svc.updateExercicio(2026, { ativo: true });
    expect(apiPut).toHaveBeenCalledWith('/exercicios/2026', { ativo: true });
  });

  test('deleteNotaCredito faz DELETE por id', () => {
    svc.deleteNotaCredito(7);
    expect(apiDelete).toHaveBeenCalledWith('/notas_credito/7');
  });

  test('importarUsuarios envia a lista de uuids', () => {
    svc.importarUsuarios(['a', 'b']);
    expect(apiPost).toHaveBeenCalledWith('/usuarios', { usuarios: ['a', 'b'] });
  });

  test('addPdrItem usa a rota aninhada', () => {
    svc.addPdrItem(3, { cod_nd: '339015' });
    expect(apiPost).toHaveBeenCalledWith('/pdr/3/itens', { cod_nd: '339015' });
  });
});
