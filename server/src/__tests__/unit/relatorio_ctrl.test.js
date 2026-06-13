'use strict'

// Teste unitario do gerador da secao 3 do RPCMTec (banco mockado).
// Cobre: linha TOTAL na 3.1, recorte cumulativo/mensal e o Markdown com tabela
// vazia. NAO ha mais checagem de exercicio: gerarSecao3 vai direto as 7
// agregacoes (Promise.all), entao a 1a chamada db.conn.any e a tabela_31.

const { createMockDb } = require('../helpers/mockDb')

const mockDb = createMockDb()
jest.mock('../../database', () => ({ db: mockDb }))

const ctrl = require('../../relatorio/relatorio_ctrl')

beforeEach(() => mockDb.reset())

describe('relatorio_ctrl.gerarSecao3', () => {
  test('monta as 7 subtabelas e a linha de TOTAL na 3.1', async () => {
    // Ordem das chamadas db.conn.any no Promise.all: 31, 32(PDR), 33, 34, 35, 36, 37.
    // A 1a chamada any e a tabela_31; as demais ficam no default [] do mock.
    mockDb.conn.any.mockResolvedValueOnce([
      { cod_nd: '339015', nd_nome: 'Diarias', previsto: '100', recebido: '50', empenhado: '30', liquidado: '10' }
    ])

    const r = await ctrl.gerarSecao3({ ano: 2026, mes: 6, cumulativo: true })

    expect(r).toHaveProperty('tabela_31')
    expect(r).toHaveProperty('tabela_37')
    const total = r.tabela_31[r.tabela_31.length - 1]
    expect(total.cod_nd).toBe('TOTAL')
    expect(total.previsto).toBe(100)
    expect(total.recebido).toBe(50)
    expect(total.empenhado).toBe(30)
    expect(total.liquidado).toBe(10)
  })

  test('recorte cumulativo usa 01-01 do ano como inicio', async () => {
    const r = await ctrl.gerarSecao3({ ano: 2026, mes: 3, cumulativo: true })
    expect(r.inicio).toBe('2026-01-01')
    expect(r.cutoff).toBe('2026-03-31')
  })

  test('nao cumulativo usa o primeiro dia do mes como inicio', async () => {
    const r = await ctrl.gerarSecao3({ ano: 2026, mes: 2, cumulativo: false })
    expect(r.inicio).toBe('2026-02-01')
    expect(r.cutoff).toBe('2026-02-28') // 2026 nao e bissexto
  })
})

describe('relatorio_ctrl.gerarSecao3Markdown', () => {
  test('renderiza as 7 subsecoes e tabela vazia com linha de hifens', async () => {
    // todas as 7 tabelas vazias (default [])
    const { markdown } = await ctrl.gerarSecao3Markdown({ ano: 2026, mes: 6, cumulativo: true })
    for (const titulo of ['### 3.1', '### 3.2', '### 3.3', '### 3.4', '### 3.5', '### 3.6', '### 3.7']) {
      expect(markdown).toContain(titulo)
    }
    // 3.2 vazia: cabecalho + uma linha so de '-'
    expect(markdown).toContain('| - | - | - | - | - | - | - |')
  })
})
