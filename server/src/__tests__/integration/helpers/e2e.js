'use strict'

// Helper E2E: sobe o stub de autenticacao (porta de AUTH_SERVER), conecta o app
// real ao banco de teste (sco_test, ja criado pelo global_setup) e expoe:
//   setup()/teardown()  -> ciclo de vida (beforeAll/afterAll)
//   login()             -> faz POST /api/login real e devolve o JWT do SCO
//   agent()             -> supertest sobre o app REAL (req HTTP de verdade)
//   authHeader(token)   -> { Authorization: 'Bearer <token>' }
//   truncate()          -> limpa as tabelas orcamento.* entre testes
// Nada e mockado: rotas, validacao, JWT, controllers e SQL sao os reais.

const request = require('supertest')

const { db } = require('../../../database')
const { AUTH_SERVER } = require('../../../config')
const app = require('../../../server/app')
const { startAuthStub } = require('./auth_stub')
const { TEST_ADMIN, TABELAS_ORCAMENTO } = require('./constants')

let authServer = null

// Extrai a porta de AUTH_SERVER (ex.: http://localhost:9999 -> 9999).
function portaDoAuthServer () {
  const m = /:(\d+)/.exec(AUTH_SERVER)
  return m ? Number(m[1]) : 9999
}

async function setup () {
  authServer = await startAuthStub(portaDoAuthServer(), TEST_ADMIN)
  await db.createConn()
}

async function teardown () {
  if (authServer) {
    await new Promise(resolve => authServer.close(() => resolve()))
    authServer = null
  }
  await db.pgp.end()
}

// Compativel com os fluxos existentes: devolve so o token do admin.
async function login () {
  const dados = await loginComo(TEST_ADMIN)
  return dados.token
}

// Login real de qualquer usuario conhecido pelo stub (o admin ou o segundo).
// Devolve o corpo inteiro, nao so o token, porque o de perfil precisa conferir
// os `perfis` que o login passou a informar por modulo.
async function loginComo (usuario) {
  const res = await request(app)
    .post('/api/login')
    .send({ usuario: usuario.login, senha: usuario.senha, cliente: 'c_orcamentario' })
  if (res.status !== 201 || !res.body.dados || !res.body.dados.token) {
    throw new Error(`login E2E falhou: status ${res.status} body ${JSON.stringify(res.body)}`)
  }
  return res.body.dados
}

function agent () {
  return request(app)
}

function authHeader (token) {
  return { Authorization: `Bearer ${token}` }
}

async function truncate () {
  await db.conn.none(`TRUNCATE ${TABELAS_ORCAMENTO.join(', ')} RESTART IDENTITY CASCADE`)
}

module.exports = { setup, teardown, login, loginComo, agent, authHeader, truncate, app, db, TEST_ADMIN }
