'use strict'

// E2E real (PostgreSQL + auth stub): gestao de usuarios (admin-only).
//   * GET /api/usuarios lista o admin semeado.
//   * /servico_autenticacao lista usuarios do auth ainda nao importados (o segundo).
//   * importacao real (POST /api/usuarios) traz o segundo usuario para dgeo.usuario;
//     depois disso /servico_autenticacao fica vazio.
//   * toggle de admin/ativo do segundo usuario (PUT /:uuid).
//   * trava do ultimo admin: rebaixar o unico admin ativo -> 400.
//
// Atencao: truncate() so limpa orcamento.*; dgeo.usuario persiste entre testes.
// Por isso removemos o segundo usuario (se importado) antes de cada teste.

const e2e = require('./helpers/e2e')
const { SEGUNDO_USUARIO } = require('./helpers/constants')

let token

beforeAll(async () => {
  await e2e.setup()
  token = await e2e.login()
})

afterAll(async () => {
  await e2e.teardown()
})

beforeEach(async () => {
  await e2e.truncate()
  // Garante estado limpo do segundo usuario (nao semeado pelo global_setup).
  await e2e.db.conn.none('DELETE FROM dgeo.usuario WHERE uuid = $<uuid>', {
    uuid: SEGUNDO_USUARIO.uuid
  })
})

const auth = () => e2e.authHeader(token)

async function post (url, body) {
  const res = await e2e.agent().post(url).set(auth()).send(body)
  if (res.status >= 400) {
    throw new Error(`POST ${url} -> ${res.status}: ${JSON.stringify(res.body)}`)
  }
  return res.body.dados
}
async function get (url) {
  const res = await e2e.agent().get(url).set(auth())
  if (res.status >= 400) {
    throw new Error(`GET ${url} -> ${res.status}: ${JSON.stringify(res.body)}`)
  }
  return res.body.dados
}

describe('Gestao de usuarios (E2E real)', () => {
  test('GET /api/usuarios lista o admin semeado', async () => {
    const usuarios = await get('/api/usuarios')
    const admin = usuarios.find(u => u.uuid === e2e.TEST_ADMIN.uuid)
    expect(admin).toBeDefined()
    expect(admin.administrador).toBe(true)
    expect(admin.ativo).toBe(true)
    expect(admin.login).toBe(e2e.TEST_ADMIN.login)
  })

  test('/servico_autenticacao lista o segundo usuario (ainda nao importado)', async () => {
    const disponiveis = await get('/api/usuarios/servico_autenticacao')
    const segundo = disponiveis.find(u => u.uuid === SEGUNDO_USUARIO.uuid)
    expect(segundo).toBeDefined()
    // o admin (ja importado) NAO deve aparecer
    expect(disponiveis.find(u => u.uuid === e2e.TEST_ADMIN.uuid)).toBeUndefined()
  })

  test('importacao real: POST /api/usuarios traz o segundo; depois /servico_autenticacao fica vazio', async () => {
    await post('/api/usuarios', { usuarios: [SEGUNDO_USUARIO.uuid] })

    const usuarios = await get('/api/usuarios')
    const segundo = usuarios.find(u => u.uuid === SEGUNDO_USUARIO.uuid)
    expect(segundo).toBeDefined()
    // importado como nao-admin e ativo (defaults do ColumnSet)
    expect(segundo.administrador).toBe(false)
    expect(segundo.ativo).toBe(true)

    // agora que o segundo foi importado, nao sobra ninguem para importar
    const disponiveis = await get('/api/usuarios/servico_autenticacao')
    expect(disponiveis).toHaveLength(0)
  })

  test('toggle de admin/ativo do segundo usuario (PUT /:uuid)', async () => {
    await post('/api/usuarios', { usuarios: [SEGUNDO_USUARIO.uuid] })

    // promove a admin
    await e2e.agent()
      .put(`/api/usuarios/${SEGUNDO_USUARIO.uuid}`)
      .set(auth())
      .send({ administrador: true, ativo: true })
      .expect(200)

    let usuarios = await get('/api/usuarios')
    let segundo = usuarios.find(u => u.uuid === SEGUNDO_USUARIO.uuid)
    expect(segundo.administrador).toBe(true)

    // desativa (ha outro admin ativo, o TEST_ADMIN, entao e permitido)
    await e2e.agent()
      .put(`/api/usuarios/${SEGUNDO_USUARIO.uuid}`)
      .set(auth())
      .send({ administrador: false, ativo: false })
      .expect(200)

    usuarios = await get('/api/usuarios')
    segundo = usuarios.find(u => u.uuid === SEGUNDO_USUARIO.uuid)
    expect(segundo.administrador).toBe(false)
    expect(segundo.ativo).toBe(false)
  })

  test('trava do ultimo admin: rebaixar o unico admin ativo -> 400', async () => {
    // Sem importar o segundo, o TEST_ADMIN e o unico admin ativo do sistema.
    const res = await e2e.agent()
      .put(`/api/usuarios/${e2e.TEST_ADMIN.uuid}`)
      .set(auth())
      .send({ administrador: false, ativo: true })
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(res.body.message).toMatch(/administrador/i)

    // o admin continua admin e ativo apos a tentativa bloqueada
    const usuarios = await get('/api/usuarios')
    const admin = usuarios.find(u => u.uuid === e2e.TEST_ADMIN.uuid)
    expect(admin.administrador).toBe(true)
    expect(admin.ativo).toBe(true)
  })
})
