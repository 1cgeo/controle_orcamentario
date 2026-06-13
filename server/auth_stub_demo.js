'use strict'

// Servico de autenticacao STUB para a demonstracao local do SCO. Cumpre o
// contrato que o SCO consome (health, login, usuarios), reconhecendo os usuarios
// semeados pelo seed_demo.js. NAO e o servico_autenticacao real: existe so para
// a demo rodar sem depender dele no ar.
// Uso: node auth_stub_demo.js   (sobe na porta 9099)

const express = require('express')

const PORT = process.env.AUTH_STUB_PORT || 9099
const VERSION = '1.0.0'

// Usuarios reconhecidos. Os mesmos uuids sao semeados em dgeo.usuario (seed_demo).
const USERS = [
  {
    login: 'chefe.dgeo',
    senha: 'sco2026',
    uuid: '0a000000-0000-4000-8000-000000000001',
    nome: 'Chefe da Divisao de Geoinformacao',
    nome_guerra: 'Chefe DGEO',
    tipo_posto_grad_id: 14,
    tipo_posto_grad: 'Maj'
  },
  {
    login: 'claude',
    senha: 'claude',
    uuid: '0a000000-0000-4000-8000-000000000002',
    nome: 'Claude',
    nome_guerra: 'Claude',
    tipo_posto_grad_id: 1,
    tipo_posto_grad: 'Civ'
  }
]

const publico = u => ({
  uuid: u.uuid, login: u.login, nome: u.nome, nome_guerra: u.nome_guerra,
  tipo_posto_grad_id: u.tipo_posto_grad_id, tipo_posto_grad: u.tipo_posto_grad
})

const app = express()
app.use(express.json())

app.get('/api', (req, res) => {
  res.status(200).json({ version: VERSION, success: true, message: 'Serviço de autenticação operacional', dados: { database_version: VERSION } })
})

app.post('/api/login', (req, res) => {
  const { usuario, senha, aplicacao } = req.body || {}
  const u = USERS.find(x => x.login === usuario && x.senha === senha)
  if (u && aplicacao === 'orcamento_web') {
    return res.status(201).json({ version: VERSION, success: true, message: 'Usuário autenticado com sucesso', dados: { token: 'auth-stub-token', administrador: true, uuid: u.uuid } })
  }
  return res.status(400).json({ version: VERSION, success: false, message: 'Usuário ou senha inválida', dados: null, error: 'credencial invalida' })
})

app.get('/api/usuarios', (req, res) => {
  res.status(200).json({ version: VERSION, success: true, message: 'ok', dados: USERS.map(publico) })
})

app.get('/api/usuarios/:uuid', (req, res) => {
  const u = USERS.find(x => x.uuid === req.params.uuid) || USERS[0]
  res.status(200).json({ version: VERSION, success: true, message: 'ok', dados: publico(u) })
})

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Auth stub (demo) ouvindo em http://localhost:${PORT} - usuarios: ${USERS.map(u => u.login + '/' + u.senha).join(', ')}`)
})
