'use strict'

// Gera um JWT valido (assinado com o JWT_SECRET do config_testing.env) para
// testes que exercitam os middlewares reais verifyLogin/verifyAdmin em vez de
// mocka-los. Nesses casos, mocke tambem db.conn.oneOrNone para a checagem de
// administrador do verifyAdmin (SELECT administrador FROM dgeo.usuario ...).

const jwt = require('jsonwebtoken')
const { JWT_SECRET } = require('../../config')

const TEST_UUID = '11111111-1111-1111-1111-111111111111'

function makeToken (payload = {}) {
  const data = { id: 1, uuid: TEST_UUID, administrador: true, ...payload }
  return jwt.sign(data, JWT_SECRET, { expiresIn: '1h' })
}

function authHeader (payload = {}) {
  return `Bearer ${makeToken(payload)}`
}

module.exports = { makeToken, authHeader, TEST_UUID }
