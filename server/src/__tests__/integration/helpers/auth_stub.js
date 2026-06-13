'use strict'

// Stub do servico de autenticacao para os testes E2E. Implementa o contrato
// minimo que o SCO consome (mesmo envelope do servico real):
//   GET  /api                -> health "Serviço de autenticação operacional"
//   POST /api/login          -> 201 success quando o credencial do admin de teste bate
//   GET  /api/usuarios       -> lista (para importar/sincronizar)
//   GET  /api/usuarios/:uuid -> um usuario
// Assim o SCO valida senha e importa usuarios de verdade, sem depender do
// servico_autenticacao real no ar.

const express = require('express')

const { SEGUNDO_USUARIO } = require('./constants')

const VERSION = '1.0.0'

// Projeta um usuario (admin ou outro) no envelope publico do servico de auth.
function usuarioPublico (u) {
  return {
    uuid: u.uuid,
    login: u.login,
    nome: u.nome,
    nome_guerra: u.nome_guerra,
    tipo_posto_grad_id: u.tipo_posto_grad_id,
    tipo_posto_grad: 'Cap'
  }
}

function startAuthStub (port, admin) {
  const app = express()
  app.use(express.json())

  app.get('/api', (req, res) => {
    res.status(200).json({
      version: VERSION,
      success: true,
      message: 'Serviço de autenticação operacional',
      dados: { database_version: VERSION }
    })
  })

  app.post('/api/login', (req, res) => {
    const { usuario, senha, aplicacao } = req.body || {}
    const ok = usuario === admin.login && senha === admin.senha && aplicacao === 'orcamento_web'
    if (ok) {
      return res.status(201).json({
        version: VERSION,
        success: true,
        message: 'Usuário autenticado com sucesso',
        dados: { token: 'auth-stub-token', administrador: true, uuid: admin.uuid }
      })
    }
    return res.status(400).json({
      version: VERSION,
      success: false,
      message: 'Usuário ou senha inválida',
      dados: null,
      error: 'credencial invalida'
    })
  })

  // Universo do servico de auth: o admin (ja importado no global_setup) e um
  // segundo usuario ainda NAO importado (usado para testar a importacao real).
  const universo = [admin, SEGUNDO_USUARIO]

  app.get('/api/usuarios', (req, res) => {
    res.status(200).json({
      version: VERSION,
      success: true,
      message: 'ok',
      dados: universo.map(usuarioPublico)
    })
  })

  app.get('/api/usuarios/:uuid', (req, res) => {
    const u = universo.find(x => x.uuid === req.params.uuid) || admin
    res.status(200).json({ version: VERSION, success: true, message: 'ok', dados: usuarioPublico(u) })
  })

  return new Promise(resolve => {
    const server = app.listen(port, () => resolve(server))
  })
}

module.exports = { startAuthStub }
