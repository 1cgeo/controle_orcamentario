// Path: lib\config.js
'use strict'

const path = require('path')
const os = require('os')

// A aplicacao registrada na tabela dgeo.aplicacao do servico de autenticacao.
// Em producao (desde 2026-06-26) e 'c_orcamentario'. O valor antigo
// 'orcamento_web' era a instancia local de junho de 2026 e NAO autentica
// contra o auth de producao. Este e o unico lugar do CLI que sabe disso.
const CLIENTE_AUTH = 'c_orcamentario'

// Onde o token fica em cache entre invocacoes. Fora do repo e fora do vault:
// e credencial, nunca versionada. Um arquivo por servidor, para nao misturar
// o token da instancia local com o de producao.
function caminhoSessao (server) {
  const dir = path.join(os.homedir(), '.sco')
  const chave = String(server)
    .replace(/^https?:\/\//, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
  return { dir, arquivo: path.join(dir, `sessao-${chave}.json`) }
}

/**
 * Resolve a configuracao a partir das flags e do ambiente, nesta ordem:
 * flag explicita > variavel de ambiente. Nunca de arquivo versionado.
 *
 * Chaves de ambiente (catalogo em env-guia.md do vault):
 *   ORCAMENTO_SERVER  URL do backend, ex.: http://IP:3016
 *   ORCAMENTO_USER    login de admin
 *   ORCAMENTO_SENHA   senha (preferir esta a passar --senha na linha de comando)
 *   ORCAMENTO_TOKEN   JWT pronto (pula o login)
 */
function resolver (flags, exigirServidor = true) {
  const server = flags.server || process.env.ORCAMENTO_SERVER

  // Com --dry-run nada sai da maquina: a validacao local contra o Joi roda sem
  // servidor, sem credencial e sem rede. Exigir URL ai seria pedir configuracao
  // para uma operacao offline, e tirar do agente o jeito mais barato de conferir
  // um corpo antes de tentar de verdade.
  if (!server && exigirServidor) {
    throw new Error(
      'Informe --server ou a variavel de ambiente ORCAMENTO_SERVER (ex.: http://IP:3016).'
    )
  }

  return {
    server: server ? String(server).replace(/\/+$/, '') : null,
    usuario: flags.user || process.env.ORCAMENTO_USER || null,
    senha: flags.senha || process.env.ORCAMENTO_SENHA || null,
    token: flags.token || process.env.ORCAMENTO_TOKEN || null,
    insecure: flags.insecure === true,
    semCache: flags['sem-cache'] === true,
    cliente: CLIENTE_AUTH
  }
}

module.exports = { resolver, caminhoSessao, CLIENTE_AUTH }
