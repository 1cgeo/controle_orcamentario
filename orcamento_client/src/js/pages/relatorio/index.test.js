import { describe, test, expect, vi } from 'vitest';

// Smoke test do gerador da Secao 3 do RPCMTec. Mocka o service: a carga inicial
// popula os anos (getExercicios) e as edicoes mensais (getRelatorios); o botao
// "Gerar" chama getSecao3 e "Copiar Markdown" chama getSecao3Markdown.
vi.mock('@services/orcamento-service.js', () => ({
  getExercicios: vi.fn(() => Promise.resolve([{ ano: 2026 }])),
  getSecao3: vi.fn(() => Promise.resolve({
    tabela_31: [
      { cod_nd: '339030', nd_nome: 'Material', previsto: 100, recebido: 50, empenhado: 40, liquidado: 30 },
      { cod_nd: 'TOTAL', nd_nome: 'TOTAL', previsto: 100, recebido: 50, empenhado: 40, liquidado: 30 },
    ],
    tabela_32: [],
    tabela_33: [],
    tabela_34: [],
    tabela_35: [],
    tabela_36: [],
    tabela_37: [],
  })),
  getSecao3Markdown: vi.fn(() => Promise.resolve({ markdown: '# Secao 3' })),
  getRelatorios: vi.fn(() => Promise.resolve([])),
  createRelatorio: vi.fn(() => Promise.resolve({})),
}));

import { renderRelatorio } from '@pages/relatorio/index.js';
import { getExercicios, getSecao3 } from '@services/orcamento-service.js';

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

describe('renderRelatorio', () => {
  test('monta a pagina com titulo e botao Gerar', async () => {
    const container = document.createElement('div');
    const cleanup = await renderRelatorio(container, { params: {}, query: new URLSearchParams() });
    await flush();

    expect(getExercicios).toHaveBeenCalled();
    expect(container.querySelector('.page__title')).not.toBeNull();

    const botoes = Array.from(container.querySelectorAll('button'));
    const gerar = botoes.find(b => b.textContent.includes('Gerar'));
    expect(gerar).toBeTruthy();

    if (typeof cleanup === 'function') cleanup();
  });

  test('clique em Gerar chama getSecao3', async () => {
    const container = document.createElement('div');
    const cleanup = await renderRelatorio(container, { params: {}, query: new URLSearchParams() });
    await flush();

    const botoes = Array.from(container.querySelectorAll('button'));
    const gerar = botoes.find(b => b.textContent.includes('Gerar'));
    gerar.click();
    await flush();

    expect(getSecao3).toHaveBeenCalled();

    if (typeof cleanup === 'function') cleanup();
  });
});
