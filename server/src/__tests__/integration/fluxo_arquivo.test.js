'use strict'

// E2E real (PostgreSQL + auth stub + disco): anexos de arquivos.
//   * NC: upload de PDF, substituicao (single), download, rejeicao de tipo,
//     exclusao e cascade (excluir a NC remove o anexo).
//   * DFD: upload de PDF (single).
//   * PDR: varios arquivos por ano (PDF + CSV).
//   * Validacao do vinculo: exatamente um entre nota_credito_id/dfd_id/pdr_ano.

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

// Anexa um buffer como arquivo "arquivo" a um vinculo (via query). Devolve a
// resposta crua do supertest (status + body) para o teste inspecionar.
function upload (query, buffer, filename) {
  return e2e
    .agent()
    .post('/api/arquivo')
    .query(query)
    .set(auth())
    .attach('arquivo', buffer, filename)
}

const PDF = Buffer.from('%PDF-1.4\n1 0 obj test pdf\n%%EOF')
const CSV = Buffer.from('item,valor\n1D,50000\n')

async function criarNc () {
  const { id } = await post('/api/notas_credito', {
    numero: '2026NC400001',
    ano: 2026,
    cod_nd: '339030',
    valor_nc: 1000,
    classificacao_id: 2
  })
  return id
}

describe('NC: anexo unico (PDF)', () => {
  test('upload, listagem e download', async () => {
    const ncId = await criarNc()

    const res = await upload({ nota_credito_id: ncId }, PDF, 'extrato.pdf')
    expect(res.status).toBe(201)
    expect(res.body.dados).toHaveLength(1)
    expect(res.body.dados[0].nome_original).toBe('extrato.pdf')
    expect(res.body.dados[0].extensao).toBe('pdf')

    const lista = await get(`/api/arquivo?nota_credito_id=${ncId}`)
    expect(lista).toHaveLength(1)

    const arquivoId = lista[0].id
    const download = await e2e
      .agent()
      .get(`/api/arquivo/${arquivoId}/download`)
      .set(auth())
    expect(download.status).toBe(200)
    expect(download.headers['content-type']).toMatch(/pdf/)
    expect(download.headers['content-disposition']).toMatch(/extrato\.pdf/)
  })

  test('nome com acento e preservado (UTF-8)', async () => {
    const ncId = await criarNc()
    const res = await upload({ nota_credito_id: ncId }, PDF, 'relatório de execução.pdf')
    expect(res.status).toBe(201)
    expect(res.body.dados[0].nome_original).toBe('relatório de execução.pdf')
  })

  test('a listagem de NC expoe arquivo_id e arquivo_nome', async () => {
    const ncId = await criarNc()
    await upload({ nota_credito_id: ncId }, PDF, 'extrato.pdf')

    const lista = await get('/api/notas_credito?ano=2026')
    const nc = lista.find(x => x.id === ncId)
    expect(nc.arquivo_id).not.toBeNull()
    expect(nc.arquivo_nome).toBe('extrato.pdf')
  })

  test('reenviar substitui o anexo anterior (continua 1)', async () => {
    const ncId = await criarNc()
    await upload({ nota_credito_id: ncId }, PDF, 'primeiro.pdf')
    const segundo = await upload({ nota_credito_id: ncId }, PDF, 'segundo.pdf')

    expect(segundo.status).toBe(201)
    const lista = await get(`/api/arquivo?nota_credito_id=${ncId}`)
    expect(lista).toHaveLength(1)
    expect(lista[0].nome_original).toBe('segundo.pdf')
  })

  test('rejeita tipo nao permitido (XLSX numa NC)', async () => {
    const ncId = await criarNc()
    const res = await upload({ nota_credito_id: ncId }, CSV, 'planilha.xlsx')
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    const lista = await get(`/api/arquivo?nota_credito_id=${ncId}`)
    expect(lista).toHaveLength(0)
  })

  test('NC inexistente: 404', async () => {
    const res = await upload({ nota_credito_id: 999999 }, PDF, 'x.pdf')
    expect(res.status).toBe(404)
  })

  test('excluir o anexo remove da listagem', async () => {
    const ncId = await criarNc()
    const up = await upload({ nota_credito_id: ncId }, PDF, 'extrato.pdf')
    const arquivoId = up.body.dados[0].id

    const del = await e2e.agent().delete(`/api/arquivo/${arquivoId}`).set(auth())
    expect(del.status).toBe(200)
    const lista = await get(`/api/arquivo?nota_credito_id=${ncId}`)
    expect(lista).toHaveLength(0)
  })

  test('excluir a NC remove o anexo (cascade)', async () => {
    const ncId = await criarNc()
    await upload({ nota_credito_id: ncId }, PDF, 'extrato.pdf')

    const del = await e2e
      .agent()
      .delete(`/api/notas_credito/${ncId}`)
      .set(auth())
    expect(del.status).toBe(200)

    // A linha de anexo some junto com a NC (FK ON DELETE CASCADE).
    const lista = await get(`/api/arquivo?nota_credito_id=${ncId}`)
    expect(lista).toHaveLength(0)
  })
})

describe('DFD: anexo unico (PDF)', () => {
  test('upload de PDF', async () => {
    const { id: dfdId } = await post('/api/dfd', {
      numero: 'DFD-01',
      ano: 2026,
      itens: []
    })
    const res = await upload({ dfd_id: dfdId }, PDF, 'dfd.pdf')
    expect(res.status).toBe(201)
    const lista = await get(`/api/arquivo?dfd_id=${dfdId}`)
    expect(lista).toHaveLength(1)
  })
})

describe('PDR: varios arquivos por ano', () => {
  test('aceita PDF e planilha (CSV) e lista os dois', async () => {
    const p1 = await upload({ pdr_ano: 2026 }, PDF, 'pdr.pdf')
    const p2 = await upload({ pdr_ano: 2026 }, CSV, 'pdr.csv')
    expect(p1.status).toBe(201)
    expect(p2.status).toBe(201)

    const lista = await get('/api/arquivo?pdr_ano=2026')
    expect(lista).toHaveLength(2)
    expect(lista.map(a => a.nome_original).sort()).toEqual(['pdr.csv', 'pdr.pdf'])
  })
})

describe('Validacao do vinculo', () => {
  test('sem vinculo: 400', async () => {
    const res = await upload({}, PDF, 'x.pdf')
    expect(res.status).toBe(400)
  })

  test('dois vinculos: 400', async () => {
    const res = await upload({ nota_credito_id: 1, pdr_ano: 2026 }, PDF, 'x.pdf')
    expect(res.status).toBe(400)
  })
})
