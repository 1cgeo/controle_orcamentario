'use strict'

// Configuracao do Jest para o backend do SCO.
// Os testes mockam o banco (server/src/__tests__/helpers/mockDb.js), entao nao
// e preciso um PostgreSQL no ar. NODE_ENV=test faz o config.js carregar
// server/config_testing.env (valores fake de localhost).
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  // A camada de integracao (banco real) tem config propria (jest.integration.config.js);
  // o `npm test` rapido (banco mockado) a ignora.
  testPathIgnorePatterns: ['/node_modules/', '/__tests__/integration/'],
  setupFiles: ['<rootDir>/src/__tests__/helpers/setup_env.js'],
  clearMocks: true,
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/__tests__/**',
    '!src/index.js',
    '!src/main.js'
  ]
}
