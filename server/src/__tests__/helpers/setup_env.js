'use strict'

// Garante NODE_ENV=test antes de qualquer require de config.js (que escolhe
// config_testing.env quando NODE_ENV === 'test'). O script npm ja seta via
// cross-env; este setup e a rede de seguranca para execucoes diretas do jest.
process.env.NODE_ENV = 'test'
