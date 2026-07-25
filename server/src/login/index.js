// Path: login\index.js
'use strict'

module.exports = {
  loginRoute: require('./login_route'),
  // verifyLogin e verifyAdmin continuam aqui enquanto as rotas nao migram para
  // verifyPerfil (fase 1). Depois disso, verifyAdmin passa a valer so para o
  // que e da plataforma (usuarios, configuracao) e verifyLogin sai.
  verifyLogin: require('./verify_login'),
  verifyAdmin: require('./verify_admin'),
  verifyPerfil: require('./verify_perfil')
}
