'use strict'

// E2E real (PostgreSQL + auth stub): licitacoes (3.4 GCALC DSG / 3.5 propria) e
// RPNP (3.3 restos a pagar nao processados).
//   * licitacao tipo 1 -> tabela 3.4; tipo 2 -> tabela 3.5 do relatorio.
//   * DELETE de licitacao com NE vinculada -> 409.
//   * RPNP com empenho_label aparece na 3.3.
//   * RPNP sem nota_empenho_id nem empenho_label -> 400.
//   * Robustez: licitacao/RPNP com corpo minimo cria sem 500.

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

async function seedExercicio () {
  await post('/api/exercicios', { ano: 2026, uasg: '160382', codom: '048215', ativo: true })
}

describe('Licitacao (E2E real)', () => {
  test('licitacao tipo 1 aparece na 3.4 e tipo 2 na 3.5 do relatorio', async () => {
    await seedExercicio()

    await post('/api/licitacoes', {
      ano: 2026, tipo_id: 1, objeto: 'Restituicao GCALC DSG',
      fase_atual: 'Homologada', valor_total_estimado: 80000, valor_final_homologado: 75000
    })
    await post('/api/licitacoes', {
      ano: 2026, tipo_id: 2, objeto: 'Pregao proprio 01/2026',
      fase_atual: 'Em andamento', valor_total_estimado: 40000
    })

    const sec = await get('/api/relatorio/secao3?ano=2026&mes=12&cumulativo=true')

    expect(sec.tabela_34).toHaveLength(1)
    expect(sec.tabela_34[0].objeto).toBe('Restituicao GCALC DSG')
    expect(Number(sec.tabela_34[0].valor_final_homologado)).toBe(75000)

    expect(sec.tabela_35).toHaveLength(1)
    expect(sec.tabela_35[0].objeto).toBe('Pregao proprio 01/2026')
  })

  test('licitacao com corpo minimo (ano, tipo_id, objeto) cria sem 500', async () => {
    await seedExercicio()
    const { id } = await post('/api/licitacoes', { ano: 2026, tipo_id: 2, objeto: 'Obj minimo' })
    const lic = await get(`/api/licitacoes/${id}`)
    expect(lic.objeto).toBe('Obj minimo')
    expect(lic.fase_atual).toBeNull()
    expect(lic.dfd_id).toBeNull()
  })

  test('DELETE de licitacao com NE vinculada -> 409', async () => {
    await seedExercicio()
    const lic = await post('/api/licitacoes', { ano: 2026, tipo_id: 2, objeto: 'Pregao' })
    await post('/api/notas_empenho', {
      numero: '2026NE000050', ano: 2026, cod_nd: '339030',
      licitacao_id: lic.id, valor_empenhado: 10000
    })

    const res = await e2e.agent().delete(`/api/licitacoes/${lic.id}`).set(auth())
    expect(res.status).toBe(409)
    expect(res.body.message).toMatch(/empenho/i)
  })
})

describe('RPNP (E2E real)', () => {
  test('RPNP com empenho_label aparece na tabela 3.3', async () => {
    await seedExercicio()

    await post('/api/rpnp', {
      ano_exercicio: 2026,
      empenho_label: '2023NE000261 (PI K1PDMGCDEGE - DCT)',
      finalidade: 'Servico contratado em 2023',
      valor_empenhado: 25000,
      valor_a_liquidar: 10000
    })

    const sec = await get('/api/relatorio/secao3?ano=2026&mes=12&cumulativo=true')
    expect(sec.tabela_33).toHaveLength(1)
    expect(sec.tabela_33[0].empenho).toBe('2023NE000261 (PI K1PDMGCDEGE - DCT)')
    expect(Number(sec.tabela_33[0].valor_a_liquidar)).toBe(10000)
  })

  test('RPNP com nota_empenho_id usa o numero da NE como fallback na 3.3', async () => {
    await seedExercicio()
    const ne = await post('/api/notas_empenho', {
      numero: '2026NE000060', ano: 2026, cod_nd: '339030', valor_empenhado: 12000
    })

    await post('/api/rpnp', {
      ano_exercicio: 2026,
      nota_empenho_id: ne.id,
      finalidade: 'Resto a pagar',
      valor_empenhado: 12000,
      valor_a_liquidar: 12000
    })

    const sec = await get('/api/relatorio/secao3?ano=2026&mes=12&cumulativo=true')
    expect(sec.tabela_33).toHaveLength(1)
    expect(sec.tabela_33[0].empenho).toBe('2026NE000060')
  })

  test('RPNP sem nota_empenho_id nem empenho_label -> 400', async () => {
    await seedExercicio()

    const res = await e2e.agent().post('/api/rpnp').set(auth()).send({
      ano_exercicio: 2026,
      finalidade: 'Sem identificacao',
      valor_empenhado: 5000
    })
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
  })
})
