'use strict'

// Config do Jest para a camada de INTEGRACAO/E2E (banco PostgreSQL real + stub
// do servico de autenticacao). Requer um PostgreSQL local acessivel pelos
// parametros de server/config_testing.env. global_setup cria o banco e aplica o
// schema; global_teardown o dropa. Rode com: npm run test:integration
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/integration/**/*.test.js'],
  setupFiles: ['<rootDir>/src/__tests__/helpers/setup_env.js'],
  globalSetup: '<rootDir>/src/__tests__/integration/global_setup.js',
  globalTeardown: '<rootDir>/src/__tests__/integration/global_teardown.js',
  testTimeout: 30000,
  // Integracao usa banco compartilhado: roda em serie (sem paralelismo de suites).
  maxWorkers: 1
}
