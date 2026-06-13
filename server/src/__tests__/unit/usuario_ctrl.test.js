'use strict'

// Teste unitario do controller de usuario (banco mockado).
// Cobre: getUsuarios (lista), a trava do ultimo admin em atualizaUsuario e
// criaListaUsuarios (filtra a partir do servidor de autenticacao).

const { createMockDb } = require('../helpers/mockDb')

const mockDb = createMockDb()
jest.mock('../../database', () => ({
  db: mockDb,
  databaseVersion: { nome: '1.0.0', load: jest.fn() }
}))

// criaListaUsuarios/getUsuariosAuthServer importam getUsuariosAuth do auth.
jest.mock('../../authentication', () => ({
  getUsuariosAuth: jest.fn()
}))

const { getUsuariosAuth } = require('../../authentication')
const ctrl = require('../../usuario/usuario_ctrl')
const httpCode = require('../../utils/http_code')

describe('usuario_ctrl', () => {
  beforeEach(() => mockDb.reset())

  test('getUsuarios lista os usuarios (mock any)', async () => {
    mockDb.conn.any.mockResolvedValueOnce([
      { uuid: 'u-1', login: 'a' },
      { uuid: 'u-2', login: 'b' }
    ])
    const r = await ctrl.getUsuarios()
    expect(r).toHaveLength(2)
    expect(mockDb.conn.any).toHaveBeenCalledTimes(1)
  })

  // Trava do ultimo admin: alvo e admin+ativo e nao restam outros admins ativos.
  // Ordem dentro da tx (quando !administrador || !ativo): t.one (count outros
  // admins via verificaUltimoAdmin) -> t.oneOrNone (alvo).
  test('atualizaUsuario bloqueia 400 ao desativar o ultimo admin', async () => {
    mockDb.conn.one.mockResolvedValueOnce({ n: '0' }) // nenhum outro admin ativo
    mockDb.conn.oneOrNone.mockResolvedValueOnce({ administrador: true, ativo: true }) // alvo

    await expect(
      ctrl.atualizaUsuario('u-1', false, true)
    ).rejects.toMatchObject({ statusCode: httpCode.BadRequest })

    // nao chegou a atualizar
    expect(mockDb.conn.result).not.toHaveBeenCalled()
  })

  test('atualizaUsuario permite quando ha outro admin ativo', async () => {
    mockDb.conn.one.mockResolvedValueOnce({ n: '2' }) // ha outros admins
    mockDb.conn.oneOrNone.mockResolvedValueOnce({ administrador: true, ativo: true })
    mockDb.conn.result.mockResolvedValueOnce({ rowCount: 1 })

    await ctrl.atualizaUsuario('u-1', false, true)

    expect(mockDb.conn.result).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE dgeo.usuario'),
      expect.objectContaining({ uuid: 'u-1', administrador: false, ativo: true })
    )
  })

  test('atualizaUsuario promovendo a admin+ativo pula a checagem do ultimo admin', async () => {
    // administrador=true e ativo=true -> nao entra no if, vai direto ao update.
    mockDb.conn.result.mockResolvedValueOnce({ rowCount: 1 })
    await ctrl.atualizaUsuario('u-1', true, true)
    expect(mockDb.conn.one).not.toHaveBeenCalled()
    expect(mockDb.conn.oneOrNone).not.toHaveBeenCalled()
    expect(mockDb.conn.result).toHaveBeenCalledTimes(1)
  })

  test('criaListaUsuarios filtra do auth e insere os novos', async () => {
    getUsuariosAuth.mockResolvedValueOnce([
      { uuid: 'u-1', login: 'a', nome: 'A', nome_guerra: 'AA', tipo_posto_grad_id: 1 },
      { uuid: 'u-2', login: 'b', nome: 'B', nome_guerra: 'BB', tipo_posto_grad_id: 2 }
    ])
    mockDb.conn.any.mockResolvedValueOnce([]) // nenhum ja importado
    mockDb.conn.none.mockResolvedValueOnce(undefined) // insert

    await ctrl.criaListaUsuarios(['u-1'])

    expect(getUsuariosAuth).toHaveBeenCalledTimes(1)
    expect(mockDb.conn.none).toHaveBeenCalledTimes(1)
  })

  test('criaListaUsuarios falha 400 quando nenhum uuid esta no auth', async () => {
    getUsuariosAuth.mockResolvedValueOnce([{ uuid: 'u-1' }])
    await expect(
      ctrl.criaListaUsuarios(['inexistente'])
    ).rejects.toMatchObject({ statusCode: httpCode.BadRequest })
  })

  test('criaListaUsuarios falha 400 quando o usuario ja foi importado', async () => {
    getUsuariosAuth.mockResolvedValueOnce([
      { uuid: 'u-1', login: 'a', nome: 'A', nome_guerra: 'AA', tipo_posto_grad_id: 1 }
    ])
    mockDb.conn.any.mockResolvedValueOnce([{ uuid: 'u-1' }]) // ja importado
    await expect(
      ctrl.criaListaUsuarios(['u-1'])
    ).rejects.toMatchObject({ statusCode: httpCode.BadRequest })
    expect(mockDb.conn.none).not.toHaveBeenCalled()
  })
})
