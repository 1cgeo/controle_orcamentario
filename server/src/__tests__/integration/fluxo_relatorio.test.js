'use strict'

// E2E: autenticacao real (JWT do SCO via stub de auth) + admin-only + a cadeia
// orcamentaria completa contra o PostgreSQL real, validando os numeros da secao
// 3 do RPCMTec. Encontra bugs de SQL/agregacao/recorte que o banco mockado nao
// pega.

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

// Helpers que falham alto se a chamada nao for sucesso (facilita achar bug).
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

// Semeia a cadeia do ano 2026: meta, PDR (previsto), NC (recebido), NE
// (empenhado), liquidacao (liquidado). Datas em meses distintos para exercitar o
// recorte cumulativo. Tudo se amarra no ANO (nao ha mais exercicio).
async function seedCadeia () {
  await post('/api/metas', { ano: 2026, numero_meta: 1, item: '1.1', descricao: 'Meta 1' })
  const metas = await get('/api/metas?ano=2026')
  const metaId = metas[0].id

  await post('/api/pdr', {
    ano: 2026,
    valor_solicitado: 60000,
    valor_autorizado: 100000,
    revisao: 'E1',
    itens: [
      { cod_nd: '339015', meta_pit_id: metaId, item_label: '1D', gnd: 3, valor_solicitado: 50000, valor_autorizado: 50000 }
    ]
  })
  const pdrs = await get('/api/pdr?ano=2026')
  const pdrFull = await get(`/api/pdr/${pdrs[0].id}`)
  const pdrItemId = pdrFull.itens[0].id

  await post('/api/notas_credito', {
    numero: '2026NC400134',
    ano: 2026,
    data_emissao: '2026-02-10',
    cod_nd: '339015',
    ptres: '232039',
    cod_pi: 'K4CAIFGDIAR',
    ug_emitente: '160089',
    finalidade_historico: 'Diarias Meta 1 PIT 2026',
    meta_pit_id: metaId,
    valor_nc: 30000,
    classificacao_id: 1,
    pdr_item_id: pdrItemId
  })
  const ncs = await get('/api/notas_credito?ano=2026')
  const ncId = ncs[0].id

  await post('/api/notas_empenho', {
    numero: '2026NE000010',
    ano: 2026,
    data_empenho: '2026-03-05',
    nota_credito_id: ncId,
    cod_nd: '339015',
    finalidade: 'Empenho diarias',
    valor_empenhado: 20000,
    valor_anulado: 0
  })
  const nes = await get('/api/notas_empenho?ano=2026')
  const neId = nes[0].id

  await post('/api/liquidacoes', { nota_empenho_id: neId, valor_liquidado: 8000, data: '2026-03-20' })

  return { metaId, pdrItemId, ncId, neId }
}

describe('Autenticacao e admin-only (E2E real)', () => {
  test('rota protegida sem token devolve 401', async () => {
    const res = await e2e.agent().get('/api/metas')
    expect(res.status).toBe(401)
  })

  test('login com cliente invalido devolve 400', async () => {
    const res = await e2e.agent().post('/api/login').send({ usuario: e2e.TEST_ADMIN.login, senha: e2e.TEST_ADMIN.senha, cliente: 'sca_web' })
    expect(res.status).toBe(400)
  })

  test('rota protegida com token admin devolve 200', async () => {
    const res = await e2e.agent().get('/api/metas').set(auth())
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })
})

describe('Cadeia orcamentaria -> RPCMTec secao 3 (E2E real)', () => {
  test('3.1 reflete previsto/recebido/empenhado/liquidado da cadeia', async () => {
    await seedCadeia()
    const sec = await get('/api/relatorio/secao3?ano=2026&mes=6&cumulativo=true')

    const nd = sec.tabela_31.find(r => r.cod_nd === '339015')
    expect(nd).toBeDefined()
    expect(Number(nd.previsto)).toBe(50000)
    expect(Number(nd.recebido)).toBe(30000)
    expect(Number(nd.empenhado)).toBe(20000)
    expect(Number(nd.liquidado)).toBe(8000)

    const total = sec.tabela_31.find(r => r.cod_nd === 'TOTAL')
    expect(Number(total.previsto)).toBe(50000)
    expect(Number(total.recebido)).toBe(30000)
    expect(Number(total.empenhado)).toBe(20000)
    expect(Number(total.liquidado)).toBe(8000)
  })

  test('3.2 lista a NC do PDR com a NE agregada e os valores executados', async () => {
    await seedCadeia()
    const sec = await get('/api/relatorio/secao3?ano=2026&mes=6&cumulativo=true')

    expect(sec.tabela_32).toHaveLength(1)
    const linha = sec.tabela_32[0]
    expect(linha.nc).toBe('2026NC400134')
    expect(linha.ne).toContain('2026NE000010')
    expect(Number(linha.valor_nc)).toBe(30000)
    expect(Number(linha.valor_empenhado)).toBe(20000)
    expect(Number(linha.valor_liquidado)).toBe(8000)
    // NC e PDR (classificacao 1), entao 3.7 (Extra-PDR) fica vazia
    expect(sec.tabela_37).toHaveLength(0)
  })

  test('recorte cumulativo: NC de fevereiro nao aparece no relatorio de janeiro', async () => {
    await seedCadeia() // NC em 2026-02-10
    const jan = await get('/api/relatorio/secao3?ano=2026&mes=1&cumulativo=true')
    const ndJan = jan.tabela_31.find(r => r.cod_nd === '339015')
    expect(Number(ndJan.recebido)).toBe(0) // ainda nao recebido em janeiro
    expect(jan.tabela_32).toHaveLength(0)

    const fev = await get('/api/relatorio/secao3?ano=2026&mes=2&cumulativo=true')
    const ndFev = fev.tabela_31.find(r => r.cod_nd === '339015')
    expect(Number(ndFev.recebido)).toBe(30000) // recebido aparece em fevereiro
  })

  test('liquidado da 3.1 nao vaza de outro ano (escopo por ano)', async () => {
    // Cadeia 2026 com liquidacao em marco/2026
    await seedCadeia()
    // Dados do ano anterior (2025) com uma liquidacao em dezembro/2025 na mesma
    // ND. Sem exercicio: tudo se amarra direto no ano.
    await post('/api/notas_credito', {
      numero: '2025NC000999', ano: 2025, data_emissao: '2025-12-01', cod_nd: '339015',
      finalidade_historico: 'NC 2025', valor_nc: 5000, classificacao_id: 2
    })
    const ncs2025 = await get('/api/notas_credito?ano=2025')
    const nc2025 = ncs2025.find(n => n.numero === '2025NC000999')
    await post('/api/notas_empenho', {
      numero: '2025NE000999', ano: 2025, data_empenho: '2025-12-05', nota_credito_id: nc2025.id,
      cod_nd: '339015', valor_empenhado: 5000, valor_anulado: 0
    })
    const nes2025 = await get('/api/notas_empenho?ano=2025')
    const ne2025 = nes2025.find(n => n.numero === '2025NE000999')
    await post('/api/liquidacoes', { nota_empenho_id: ne2025.id, valor_liquidado: 5000, data: '2025-12-20' })

    // Relatorio de 2026 NAO deve somar o liquidado/empenhado de 2025
    const sec = await get('/api/relatorio/secao3?ano=2026&mes=6&cumulativo=true')
    const nd = sec.tabela_31.find(r => r.cod_nd === '339015')
    expect(Number(nd.empenhado)).toBe(20000) // so o de 2026
    expect(Number(nd.liquidado)).toBe(8000) // so o de 2026, nao 8000+5000
  })
})
