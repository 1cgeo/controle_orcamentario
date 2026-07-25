// Path: comandos\dominio.js
'use strict'

// `sco dominio <sub> [acao]` - as tabelas de dominio, que tem forma propria
// (/api/dominio/<sub> e /api/dominio/<sub>/<code>, chave por `code` e nao por id).
//
//   sco dominio                          lista quais dominios existem
//   sco dominio natureza_despesa         lista os codigos de um dominio
//   sco dominio ug criar --data '{...}'
//   sco dominio ug atualizar --code 160067 --data '{...}'
//   sco dominio ug deletar --code 160067 --confirmar 160067
//
// Sao os unicos GETs publicos da API (servem para popular selects do client
// web), entao a listagem funciona mesmo sem credencial.

const { obter } = require('../lib/recursos')
const saida = require('../lib/saida')
const http = require('../lib/http')
const argsLib = require('../lib/args')

function lerCorpo (flags) {
  if (flags['data-file']) {
    return JSON.parse(require('fs').readFileSync(flags['data-file'], 'utf8'))
  }
  if (flags.data && flags.data !== true) {
    try {
      return JSON.parse(flags.data)
    } catch (e) {
      throw new Error(`--data nao e JSON valido: ${e.message}`)
    }
  }
  return null
}

async function executar (args, cfg) {
  const recurso = obter('dominio')
  const sub = args._[1]
  const acao = args._[2] || 'listar'
  const flags = args.flags

  if (!sub) {
    return {
      texto: [
        'Dominios com leitura (GET publico):',
        ...recurso.subLeitura.map(s => '  ' + s),
        '',
        'Dominios com CRUD de admin:',
        ...recurso.subEscrita.map(s => '  ' + s),
        '',
        'Listar um: sco dominio natureza_despesa'
      ].join('\n')
    }
  }

  if (!recurso.subLeitura.includes(sub)) {
    throw new Error(
      `Dominio desconhecido: "${sub}". Disponiveis: ${recurso.subLeitura.join(', ')}.`
    )
  }

  const opcoesSaida = {
    formato: flags.json ? 'json' : (flags.formato || 'tsv'),
    campos: argsLib.lista(flags.campos),
    padrao: recurso.colunas
  }

  if (acao === 'listar') {
    // GET de dominio e publico: nao gasta login.
    const r = await http.requisitar(cfg, 'GET', `/dominio/${sub}`)
    const out = saida.lista(r.dados, opcoesSaida)
    return { texto: out.texto, avisos: out.avisos }
  }

  if (!recurso.subEscrita.includes(sub)) {
    throw new Error(
      `O dominio "${sub}" e somente leitura. Tem CRUD apenas: ${recurso.subEscrita.join(', ')}.`
    )
  }

  if (acao === 'criar') {
    const corpo = lerCorpo(flags)
    if (!corpo) throw new Error(`criar exige --data '{"code":"...","nome":"..."}'.`)
    if (flags['dry-run']) {
      return { texto: `[dry-run] POST /api/dominio/${sub}\n${JSON.stringify(corpo, null, 2)}` }
    }
    const r = await http.autenticada(cfg, 'POST', `/dominio/${sub}`, { corpo })
    return { texto: r.message || 'criado' }
  }

  if (acao === 'atualizar') {
    const code = argsLib.exigir(flags, 'code', `code do item de ${sub}`)
    const corpo = lerCorpo(flags)
    if (!corpo) throw new Error('atualizar exige --data com o objeto completo.')
    if (flags['dry-run']) {
      return { texto: `[dry-run] PUT /api/dominio/${sub}/${code}\n${JSON.stringify(corpo, null, 2)}` }
    }
    const r = await http.autenticada(cfg, 'PUT', `/dominio/${sub}/${encodeURIComponent(code)}`, { corpo })
    return { texto: r.message || 'atualizado' }
  }

  if (acao === 'deletar') {
    const code = argsLib.exigir(flags, 'code', `code do item de ${sub}`)
    if (flags.confirmar !== String(code)) {
      throw new Error(
        'Exclusao e irreversivel e nao foi confirmada.\n' +
        `  sco dominio ${sub} deletar --code ${code} --confirmar ${code}\n` +
        'Atencao: dominio costuma ser referenciado por FK; excluir um code em uso volta 400.'
      )
    }
    if (flags['dry-run']) {
      return { texto: `[dry-run] DELETE /api/dominio/${sub}/${code}` }
    }
    const r = await http.autenticada(cfg, 'DELETE', `/dominio/${sub}/${encodeURIComponent(code)}`)
    return { texto: r.message || 'excluido' }
  }

  throw new Error(`Acao desconhecida "${acao}". Use: listar, criar, atualizar, deletar.`)
}

module.exports = { executar, precisaServidor: true }
