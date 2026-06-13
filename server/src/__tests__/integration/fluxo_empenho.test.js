'use strict'

// E2E real (PostgreSQL + auth stub): execucao (nota de empenho, liquidacao,
// recebimento de material).
//   * criar NE; liquidacao OK.
//   * liquidacao que excede (valor_empenhado - valor_anulado) -> 400 com mensagem de excesso.
//   * duas liquidacoes parciais somam ate o limite (ok).
//   * DELETE NE com liquidacao -> 409.
//   * recebimento de material (criar / GET).
//   * Robustez: NE com corpo minimo (so obrigatorios) cria sem 500.

const e2e = require('./helpers/e2e')

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

// Semeia exercicio + NC, devolvendo o id da NC para vincular as NE.
async function seedNC () {
  await post('/api/exercicios', { ano: 2026, uasg: '160382', codom: '048215', ativo: true })
  const nc = await post('/api/notas_credito', {
    numero: '2026NC400500', ano: 2026, cod_nd: '339015', valor_nc: 50000, classificacao_id: 2
  })
  return nc.id
}

// Cria uma NE com valor_empenhado/valor_anulado dados e devolve seu id.
async function criaNE (ncId, valorEmpenhado, valorAnulado = 0) {
  const ne = await post('/api/notas_empenho', {
    numero: '2026NE000020', ano: 2026, data_empenho: '2026-03-05',
    nota_credito_id: ncId, cod_nd: '339015', finalidade: 'Empenho',
    valor_empenhado: valorEmpenhado, valor_anulado: valorAnulado
  })
  return ne.id
}

describe('Nota de empenho e liquidacao (E2E real)', () => {
  test('cria NE e uma liquidacao dentro do disponivel (ok)', async () => {
    const ncId = await seedNC()
    const neId = await criaNE(ncId, 20000)

    await post('/api/liquidacoes', { nota_empenho_id: neId, valor_liquidado: 8000, data: '2026-03-20' })

    const ne = await get(`/api/notas_empenho/${neId}`)
    expect(Number(ne.total_liquidado)).toBe(8000)
    expect(Number(ne.saldo_a_liquidar)).toBe(12000)
    expect(ne.liquidacoes).toHaveLength(1)
  })

  test('NE com corpo minimo (numero, ano, valor_empenhado) cria sem 500', async () => {
    await post('/api/exercicios', { ano: 2026, uasg: '160382', codom: '048215', ativo: true })
    const ne = await post('/api/notas_empenho', { numero: '2026NE000030', ano: 2026, valor_empenhado: 5000 })

    const full = await get(`/api/notas_empenho/${ne.id}`)
    expect(full.numero).toBe('2026NE000030')
    expect(Number(full.valor_anulado)).toBe(0)
    expect(full.nota_credito_id).toBeNull()
  })

  test('liquidacao que excede valor_empenhado - valor_anulado -> 400 com mensagem de excesso', async () => {
    const ncId = await seedNC()
    // disponivel = 20000 - 5000 = 15000
    const neId = await criaNE(ncId, 20000, 5000)

    const res = await e2e.agent().post('/api/liquidacoes').set(auth()).send({
      nota_empenho_id: neId, valor_liquidado: 15001, data: '2026-04-01'
    })
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(res.body.message).toMatch(/excede/i)
  })

  test('duas liquidacoes parciais somam ate o disponivel (ok); a que ultrapassa -> 400', async () => {
    const ncId = await seedNC()
    const neId = await criaNE(ncId, 10000)

    await post('/api/liquidacoes', { nota_empenho_id: neId, valor_liquidado: 6000, data: '2026-03-10' })
    await post('/api/liquidacoes', { nota_empenho_id: neId, valor_liquidado: 4000, data: '2026-03-15' })

    const ne = await get(`/api/notas_empenho/${neId}`)
    expect(Number(ne.total_liquidado)).toBe(10000)
    expect(Number(ne.saldo_a_liquidar)).toBe(0)

    // Uma terceira (qualquer valor positivo) ja excede o disponivel.
    const res = await e2e.agent().post('/api/liquidacoes').set(auth()).send({
      nota_empenho_id: neId, valor_liquidado: 1, data: '2026-03-20'
    })
    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/excede/i)
  })

  test('DELETE de NE com liquidacao vinculada -> 409', async () => {
    const ncId = await seedNC()
    const neId = await criaNE(ncId, 10000)
    await post('/api/liquidacoes', { nota_empenho_id: neId, valor_liquidado: 5000, data: '2026-03-10' })

    const res = await e2e.agent().delete(`/api/notas_empenho/${neId}`).set(auth())
    expect(res.status).toBe(409)
    expect(res.body.message).toMatch(/liquida/i)
  })
})

describe('Recebimento de material (E2E real)', () => {
  test('cria recebimento vinculado a NE e o re-consulta', async () => {
    const ncId = await seedNC()
    const neId = await criaNE(ncId, 30000)

    const { id } = await post('/api/recebimentos', {
      nota_empenho_id: neId,
      material: 'Plotter A0',
      prazo_entrega: '30 dias',
      situacao: 'Aguardando'
    })

    const rm = await get(`/api/recebimentos/${id}`)
    expect(rm.material).toBe('Plotter A0')
    expect(rm.nota_empenho_id).toBe(neId)
    expect(rm.nota_empenho_numero).toBe('2026NE000020')
  })

  test('recebimento com corpo minimo (nota_empenho_id, material) cria sem 500', async () => {
    const ncId = await seedNC()
    const neId = await criaNE(ncId, 30000)

    const { id } = await post('/api/recebimentos', { nota_empenho_id: neId, material: 'Toner' })
    const rm = await get(`/api/recebimentos/${id}`)
    expect(rm.material).toBe('Toner')
    expect(rm.prazo_entrega).toBeNull()
  })

  test('DELETE de NE com recebimento vinculado -> 409', async () => {
    const ncId = await seedNC()
    const neId = await criaNE(ncId, 30000)
    await post('/api/recebimentos', { nota_empenho_id: neId, material: 'GPS' })

    const res = await e2e.agent().delete(`/api/notas_empenho/${neId}`).set(auth())
    expect(res.status).toBe(409)
    expect(res.body.message).toMatch(/recebimento/i)
  })
})
