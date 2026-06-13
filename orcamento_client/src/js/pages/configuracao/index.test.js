import { describe, test, expect, vi } from 'vitest';

// Smoke test da pagina de Configuracao geral (UASG, CODOM, ano de referencia).
// Mocka o service: getConfig devolve os dados atuais e updateConfig salva.
vi.mock('@services/orcamento-service.js', () => ({
  getConfig: vi.fn(() => Promise.resolve({ uasg: '160382', codom: '12345', ano_referencia: 2026 })),
  updateConfig: vi.fn(() => Promise.resolve({ uasg: '160382', codom: '12345', ano_referencia: 2026 })),
}));

import { renderConfiguracao } from '@pages/configuracao/index.js';
import { getConfig } from '@services/orcamento-service.js';

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

describe('renderConfiguracao', () => {
  test('monta o titulo Configuracao e carrega os valores do service', async () => {
    const container = document.createElement('div');
    const cleanup = await renderConfiguracao(container);
    await flush();

    expect(getConfig).toHaveBeenCalled();

    const titulo = container.querySelector('.page__title');
    expect(titulo).not.toBeNull();
    expect(titulo.textContent).toContain('Configura');

    // Os valores carregados pelo getConfig caem nos inputs do formulario.
    const inputs = Array.from(container.querySelectorAll('input'));
    const valores = inputs.map(i => i.value);
    expect(valores).toContain('160382');
    expect(valores).toContain('12345');
    expect(valores).toContain('2026');

    if (typeof cleanup === 'function') cleanup();
  });
});
