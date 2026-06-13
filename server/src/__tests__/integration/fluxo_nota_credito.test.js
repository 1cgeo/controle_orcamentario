'use strict'

// E2E real (PostgreSQL + auth stub): credito recebido (nota de credito).
//   * NC PDR (classificacao 1) com pdr_item_id casado ao item previsto.
//   * NC Extra-PDR (classificacao 2): pdr_item_id e ignorado (forcado a null).
//   * valor_nc = 0 -> 400 (schema: positive).
//   * DELETE com NE vinculada -> 409.
//   * NC de complementacao (nc_complementada_id self-FK) e DELETE da complementada -> 409.
//   * Robustez: corpo minimo (so obrigatorios) cria com sucesso.

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

// Semeia exercicio + meta + PDR (1 item), devolvendo os ids necessarios.
async function seedBase () {
  await post('/api/exercicios', { ano: 2026, uasg: '160382', codom: '048215', ativo: true })

  await post('/api/metas', { ano: 2026, numero_meta: 1, item: '1.1', descricao: 'Meta 1' })
  const metas = await get('/api/metas?ano=2026')
  const metaId = metas[0].id

  await post('/api/pdr', {
    ano: 2026,
    valor_autorizado: 100000,
    revisao: 'E1',
    itens: [
      { cod_nd: '339015', meta_pit_id: metaId, item_label: '1D', gnd: 3, valor_autorizado: 50000 }
    ]
  })
  const pdrs = await get('/api/pdr?ano=2026')
  const pdrFull = await get(`/api/pdr/${pdrs[0].id}`)
  const pdrItemId = pdrFull.itens[0].id

  return { metaId, pdrItemId }
}

describe('Nota de credito (E2E real)', () => {
  test('cria NC PDR com pdr_item_id casado', async () => {
    const { metaId, pdrItemId } = await seedBase()

    const { id } = await post('/api/notas_credito', {
      numero: '2026NC400134',
      ano: 2026,
      data_emissao: '2026-02-10',
      cod_nd: '339015',
      finalidade_historico: 'Diarias Meta 1',
      meta_pit_id: metaId,
      valor_nc: 30000,
      classificacao_id: 1,
      pdr_item_id: pdrItemId
    })

    const nc = await get(`/api/notas_credito/${id}`)
    expect(nc.classificacao_id).toBe(1)
    expect(nc.pdr_item_id).toBe(pdrItemId)
    expect(Number(nc.valor_nc)).toBe(30000)
  })

  test('cria NC Extra-PDR (classificacao 2): pdr_item_id e ignorado (null)', async () => {
    const { pdrItemId } = await seedBase()

    // Mesmo enviando pdr_item_id, o schema faz strip por ser classificacao 2.
    const { id } = await post('/api/notas_credito', {
      numero: '2026NC400200',
      ano: 2026,
      cod_nd: '339030',
      valor_nc: 12000,
      classificacao_id: 2,
      pdr_item_id: pdrItemId
    })

    const nc = await get(`/api/notas_credito/${id}`)
    expect(nc.classificacao_id).toBe(2)
    expect(nc.pdr_item_id).toBeNull()
  })

  test('corpo minimo (numero, ano, cod_nd, valor_nc, classificacao_id) cria sem 500', async () => {
    await post('/api/exercicios', { ano: 2026, uasg: '160382', codom: '048215', ativo: true })

    const { id } = await post('/api/notas_credito', {
      numero: '2026NC400999',
      ano: 2026,
      cod_nd: '339015',
      valor_nc: 1000,
      classificacao_id: 2
    })
    const nc = await get(`/api/notas_credito/${id}`)
    expect(nc.numero).toBe('2026NC400999')
    expect(nc.ptres).toBeNull()
    expect(nc.cod_pi).toBeNull()
  })

  test('valor_nc = 0 -> 400', async () => {
    await post('/api/exercicios', { ano: 2026, uasg: '160382', codom: '048215', ativo: true })

    const res = await e2e.agent().post('/api/notas_credito').set(auth()).send({
      numero: '2026NC400000',
      ano: 2026,
      cod_nd: '339015',
      valor_nc: 0,
      classificacao_id: 2
    })
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
  })

  test('DELETE de NC com NE vinculada -> 409', async () => {
    await post('/api/exercicios', { ano: 2026, uasg: '160382', codom: '048215', ativo: true })

    const nc = await post('/api/notas_credito', {
      numero: '2026NC400300', ano: 2026, cod_nd: '339015', valor_nc: 20000, classificacao_id: 2
    })
    await post('/api/notas_empenho', {
      numero: '2026NE000010', ano: 2026, nota_credito_id: nc.id,
      cod_nd: '339015', valor_empenhado: 10000, valor_anulado: 0
    })

    const res = await e2e.agent().delete(`/api/notas_credito/${nc.id}`).set(auth())
    expect(res.status).toBe(409)
    expect(res.body.message).toMatch(/empenho/i)
  })

  test('NC de complementacao (self-FK) e DELETE da complementada -> 409', async () => {
    await post('/api/exercicios', { ano: 2026, uasg: '160382', codom: '048215', ativo: true })

    const original = await post('/api/notas_credito', {
      numero: '2026NC400400', ano: 2026, cod_nd: '339015', valor_nc: 15000, classificacao_id: 2
    })

    const compl = await post('/api/notas_credito', {
      numero: '2026NC400401', ano: 2026, cod_nd: '339015', valor_nc: 5000, classificacao_id: 2,
      nc_complementada_id: original.id
    })

    const ncCompl = await get(`/api/notas_credito/${compl.id}`)
    expect(ncCompl.nc_complementada_id).toBe(original.id)

    // A complementada nao pode ser excluida enquanto houver NC que a referencia.
    const res = await e2e.agent().delete(`/api/notas_credito/${original.id}`).set(auth())
    expect(res.status).toBe(409)
    expect(res.body.message).toMatch(/complementada/i)
  })
})
