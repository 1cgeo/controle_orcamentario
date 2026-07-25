'use strict'

// E2E real (PostgreSQL + auth stub) do controle de acesso por perfil.
// Prova, com login de verdade e as rotas reais, que:
//   * sem perfil no modulo, nem a leitura passa;
//   * consulta le e nao escreve;
//   * operador escreve e nao apaga;
//   * gerente apaga;
//   * mudar o perfil no banco vale na requisicao SEGUINTE, sem novo login;
//   * administrador passa em tudo sem ter linha de perfil nenhuma.

const e2e = require('./helpers/e2e')
const { SEGUNDO_USUARIO } = require('./helpers/constants')

const MODULO_ORCAMENTO = 1
const NIVEL = { consulta: 1, operador: 2, gerente: 3 }

let tokenAdmin
let tokenUsuario
let usuarioId

beforeAll(async () => {
  await e2e.setup()
  tokenAdmin = await e2e.login()

  // Usuario nao-administrador, importado do auth como a producao faz
  const { id } = await e2e.db.conn.one(
    `INSERT INTO dgeo.usuario (login, nome, nome_guerra, tipo_posto_grad_id, administrador, ativo, uuid)
     VALUES ($<login>, $<nome>, $<nome_guerra>, $<tipo_posto_grad_id>, FALSE, TRUE, $<uuid>)
     RETURNING id`,
    SEGUNDO_USUARIO
  )
  usuarioId = id

  const dados = await e2e.loginComo(SEGUNDO_USUARIO)
  tokenUsuario = dados.token
  expect(dados.administrador).toBe(false)
  // Ainda sem perfil: o login informa o mapa vazio
  expect(dados.perfis).toEqual({})
})

afterAll(async () => {
  // Devolve o banco ao estado que as outras suites esperam (o fluxo_usuario
  // testa justamente a IMPORTACAO deste usuario, que nao pode ja existir).
  await e2e.db.conn.none('DELETE FROM dgeo.usuario_perfil WHERE usuario_id = $<usuarioId>', { usuarioId })
  await e2e.db.conn.none('DELETE FROM dgeo.usuario WHERE id = $<usuarioId>', { usuarioId })
  await e2e.teardown()
})

beforeEach(async () => {
  await e2e.truncate()
})

async function definePerfil (nivel) {
  await e2e.db.conn.none(
    `INSERT INTO dgeo.usuario_perfil (usuario_id, modulo_id, perfil_id)
     VALUES ($<usuarioId>, $<modulo>, $<perfil>)
     ON CONFLICT (usuario_id, modulo_id) DO UPDATE SET perfil_id = EXCLUDED.perfil_id`,
    { usuarioId, modulo: MODULO_ORCAMENTO, perfil: NIVEL[nivel] }
  )
}

async function removePerfil () {
  await e2e.db.conn.none('DELETE FROM dgeo.usuario_perfil WHERE usuario_id = $<usuarioId>', { usuarioId })
}

const comoUsuario = () => e2e.authHeader(tokenUsuario)
const comoAdmin = () => e2e.authHeader(tokenAdmin)

const NC = {
  numero: '2026NC400999',
  ano: 2026,
  cod_nd: '339030',
  valor_nc: 15000,
  classificacao_id: 2
}

describe('Perfil por modulo (E2E real)', () => {
  test('sem perfil no modulo, nem a leitura passa', async () => {
    await removePerfil()
    const res = await e2e.agent().get('/api/notas_credito').set(comoUsuario())
    expect(res.status).toBe(403)
  })

  test('consulta le, mas nao escreve', async () => {
    await definePerfil('consulta')

    const leitura = await e2e.agent().get('/api/notas_credito').set(comoUsuario())
    expect(leitura.status).toBe(200)

    const escrita = await e2e.agent().post('/api/notas_credito').set(comoUsuario()).send(NC)
    expect(escrita.status).toBe(403)
    expect(escrita.body.message).toMatch(/perfil operador/i)
  })

  test('operador escreve, mas nao apaga', async () => {
    await definePerfil('operador')

    const criacao = await e2e.agent().post('/api/notas_credito').set(comoUsuario()).send(NC)
    expect(criacao.status).toBe(201)
    const id = criacao.body.dados.id

    const exclusao = await e2e.agent().delete(`/api/notas_credito/${id}`).set(comoUsuario())
    expect(exclusao.status).toBe(403)
    expect(exclusao.body.message).toMatch(/perfil gerente/i)

    // e o registro continua la
    const depois = await e2e.agent().get(`/api/notas_credito/${id}`).set(comoUsuario())
    expect(depois.status).toBe(200)
  })

  test('gerente apaga', async () => {
    await definePerfil('gerente')

    const criacao = await e2e.agent().post('/api/notas_credito').set(comoUsuario()).send(NC)
    expect(criacao.status).toBe(201)

    const exclusao = await e2e.agent()
      .delete(`/api/notas_credito/${criacao.body.dados.id}`)
      .set(comoUsuario())
    expect(exclusao.status).toBe(200)
  })

  test('rebaixar o perfil vale na requisicao seguinte, com o MESMO token', async () => {
    await definePerfil('operador')
    const antes = await e2e.agent().post('/api/notas_credito').set(comoUsuario()).send(NC)
    expect(antes.status).toBe(201)

    await definePerfil('consulta')

    const depois = await e2e.agent()
      .post('/api/notas_credito')
      .set(comoUsuario())
      .send({ ...NC, numero: '2026NC401000' })
    expect(depois.status).toBe(403)
  })

  test('usuario desativado perde acesso na hora, sem esperar o token expirar', async () => {
    await definePerfil('gerente')
    await e2e.db.conn.none('UPDATE dgeo.usuario SET ativo = FALSE WHERE id = $<usuarioId>', { usuarioId })

    const res = await e2e.agent().get('/api/notas_credito').set(comoUsuario())
    expect(res.status).toBe(403)
    expect(res.body.message).toMatch(/inativo/i)

    await e2e.db.conn.none('UPDATE dgeo.usuario SET ativo = TRUE WHERE id = $<usuarioId>', { usuarioId })
  })

  test('administrador passa em tudo sem ter perfil de modulo', async () => {
    const perfis = await e2e.db.conn.any(
      `SELECT up.id FROM dgeo.usuario_perfil AS up
       INNER JOIN dgeo.usuario AS u ON u.id = up.usuario_id
       WHERE u.administrador IS TRUE`
    )
    expect(perfis).toHaveLength(0)

    const criacao = await e2e.agent().post('/api/notas_credito').set(comoAdmin()).send(NC)
    expect(criacao.status).toBe(201)
    const exclusao = await e2e.agent()
      .delete(`/api/notas_credito/${criacao.body.dados.id}`)
      .set(comoAdmin())
    expect(exclusao.status).toBe(200)
  })

  test('o login informa o perfil por modulo', async () => {
    await definePerfil('operador')
    const dados = await e2e.loginComo(SEGUNDO_USUARIO)
    expect(dados.perfis).toEqual({ orcamento: NIVEL.operador })
  })
})

// A tela de usuarios: e por ela que o chefe libera o sistema para a tropa.
describe('Concessao de perfil pela API de usuarios (E2E real)', () => {
  const comoAdmin = () => e2e.authHeader(tokenAdmin)

  test('GET /api/usuarios devolve o perfil por modulo', async () => {
    await removePerfil()
    await e2e.agent()
      .put(`/api/usuarios/${SEGUNDO_USUARIO.uuid}`)
      .set(comoAdmin())
      .send({ administrador: false, ativo: true, perfis: { orcamento: NIVEL.gerente } })

    const res = await e2e.agent().get('/api/usuarios').set(comoAdmin())
    expect(res.status).toBe(200)
    const alvo = res.body.dados.find(u => u.uuid === SEGUNDO_USUARIO.uuid)
    expect(alvo.perfis).toEqual({ orcamento: NIVEL.gerente })
  })

  test('conceder perfil libera a escrita na requisicao seguinte, sem novo login', async () => {
    await removePerfil()
    const antes = await e2e.agent().post('/api/notas_credito').set(comoUsuario()).send(NC)
    expect(antes.status).toBe(403)

    const concessao = await e2e.agent()
      .put(`/api/usuarios/${SEGUNDO_USUARIO.uuid}`)
      .set(comoAdmin())
      .send({ administrador: false, ativo: true, perfis: { orcamento: NIVEL.operador } })
    expect(concessao.status).toBe(200)

    const depois = await e2e.agent().post('/api/notas_credito').set(comoUsuario()).send(NC)
    expect(depois.status).toBe(201)
  })

  test('perfil nulo REMOVE o acesso, e o GET para de listar o modulo', async () => {
    await definePerfil('operador')
    const revogacao = await e2e.agent()
      .put(`/api/usuarios/${SEGUNDO_USUARIO.uuid}`)
      .set(comoAdmin())
      .send({ administrador: false, ativo: true, perfis: { orcamento: null } })
    expect(revogacao.status).toBe(200)

    const leitura = await e2e.agent().get('/api/notas_credito').set(comoUsuario())
    expect(leitura.status).toBe(403)

    const lista = await e2e.agent().get('/api/usuarios').set(comoAdmin())
    const alvo = lista.body.dados.find(u => u.uuid === SEGUNDO_USUARIO.uuid)
    expect(alvo.perfis.orcamento).toBeUndefined()
  })

  test('nivel invalido e modulo desconhecido sao recusados', async () => {
    const nivelInvalido = await e2e.agent()
      .put(`/api/usuarios/${SEGUNDO_USUARIO.uuid}`)
      .set(comoAdmin())
      .send({ administrador: false, ativo: true, perfis: { orcamento: 7 } })
    expect(nivelInvalido.status).toBe(400)

    const moduloInvalido = await e2e.agent()
      .put(`/api/usuarios/${SEGUNDO_USUARIO.uuid}`)
      .set(comoAdmin())
      .send({ administrador: false, ativo: true, perfis: { acervo: 2 } })
    expect(moduloInvalido.status).toBe(400)
  })

  test('os dominios alimentam a tela sem ela decorar codigo', async () => {
    const modulos = await e2e.agent().get('/api/usuarios/dominio/modulo').set(comoAdmin())
    expect(modulos.status).toBe(200)
    expect(modulos.body.dados.map(m => m.nome_abrev)).toEqual(['orcamento'])

    const perfis = await e2e.agent().get('/api/usuarios/dominio/tipo_perfil').set(comoAdmin())
    expect(perfis.status).toBe(200)
    expect(perfis.body.dados.map(p => p.nome)).toEqual(['Consulta', 'Operador', 'Gerente'])
  })
})
