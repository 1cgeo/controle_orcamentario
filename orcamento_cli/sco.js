#!/usr/bin/env node
// Path: sco.js
'use strict'

// sco - interface de linha de comando do SCO, desenhada para AGENTES.
//
// O orcamento_client serve humanos; este CLI serve agentes. Sao dois clientes da
// mesma API, com ergonomias diferentes de proposito: a tela otimiza clique e
// descoberta visual, o CLI otimiza contexto e encadeamento.
//
// Tres principios, e o codigo os segue:
//   1. Nada de contrato copiado. Campos, tipos e filtros saem do Joi vivo do
//      server/ em tempo de execucao. Nao ha arquivo gerado para apodrecer.
//   2. Saida compacta por padrao. O consumidor tem janela finita: --json existe
//      para encadear, mas nao e o default.
//   3. O guardrail mora na interface. Confirmacao de acao irreversivel e
//      validacao local ficam aqui, nao na skill que chama: skill e de um cliente
//      so, a interface serve todos.

const argsLib = require('./lib/args')
const { resolver } = require('./lib/config')
const { RECURSOS, listarChaves } = require('./lib/recursos')

const AJUDA = `sco - CLI do Sistema de Controle Orcamentario (SCO), para agentes

CONTRATO (nao gasta rede, leia isto antes de montar um corpo)
  sco schema                      lista os recursos
  sco schema nc                   campos, tipos, obrigatorios e regras da NC

DIA A DIA
  sco saldo                       quanto falta empenhar e liquidar (total do PDR)
  sco saldo --nd 339040           o mesmo, de uma natureza de despesa
  sco saldo --extra               a faixa Extra-PDR
  sco secao3 --mes 7              a Secao 3 do RPCMTec em markdown
  sco secao3 --mes 7 --docx       a mesma Secao 3 em DOCX (cola no Google Docs)

RECURSOS  (${listarChaves().join(', ')})
  sco <recurso> listar [--ano 2026] [--campos a,b] [--formato tsv|tabela|json]
  sco <recurso> obter --id 42
  sco <recurso> criar --data '{...}'            [--dry-run]
  sco <recurso> lancar --data '{...}' --anexo nota.pdf     (cria e anexa de uma vez)
  sco <recurso> atualizar --id 42 --data '{...}'
  sco <recurso> deletar --id 42 --confirmar 42
  sco <recurso> anexar --id 42 --file nota.pdf
  sco dominio natureza_despesa                  (GET de dominio e publico)

SESSAO
  sco status                      o SCO esta no ar? ha token em cache?
  sco login                       autentica uma vez e guarda o token (~1h)
  sco logout                      descarta o token em cache

AMBIENTE  (catalogo em env-guia.md; nunca ponha senha na linha de comando)
  ORCAMENTO_SERVER   URL do backend, ex.: http://IP:3016
  ORCAMENTO_USER     login de admin        ORCAMENTO_SENHA   senha
  ORCAMENTO_TOKEN    JWT pronto (dispensa login)

FLAGS GLOBAIS
  --json          saida crua e completa (para encadear)
  --formato       tsv (padrao) | tabela | json
  --campos a,b    recorta colunas na listagem
  --dry-run       monta e mostra a requisicao, nao envia
  --server URL    sobrepoe ORCAMENTO_SERVER
  --insecure      aceita HTTPS com certificado self-signed
  --sem-cache     nao le nem grava o token em cache

O SCO e admin-only: fora /api, /api/login e os GET de /api/dominio, tudo exige
administrador.`

const ROTEADOR = {
  schema: './comandos/schema',
  saldo: './comandos/relatorio',
  secao3: './comandos/relatorio',
  dominio: './comandos/dominio',
  login: './comandos/sessao',
  logout: './comandos/sessao',
  status: './comandos/sessao'
}

async function principal () {
  const args = argsLib.parse(process.argv.slice(2))
  const comando = args._[0]

  if (!comando || args.flags.ajuda || args.flags.help) {
    process.stdout.write(AJUDA + '\n')
    return 0
  }

  let modulo = ROTEADOR[comando]
  if (!modulo && RECURSOS[comando]) modulo = './comandos/crud'

  if (!modulo) {
    process.stderr.write(
      `Comando desconhecido: "${comando}".\n` +
      `Comandos: ${Object.keys(ROTEADOR).join(', ')}.\n` +
      `Recursos: ${listarChaves().join(', ')}.\n` +
      'Use sco --ajuda para o mapa completo.\n'
    )
    return 1
  }

  const cmd = require(modulo)
  // Comandos que so leem o schema local (sco schema) nao exigem servidor nem
  // credencial: o contrato e conhecimento estatico do repo. Com --dry-run,
  // idem: valida contra o Joi e mostra a requisicao, sem tocar a rede.
  const cfg = cmd.precisaServidor
    ? resolver(args.flags, !args.flags['dry-run'])
    : null

  const resultado = await cmd.executar(args, cfg)

  // Avisos vao para stderr: nao poluem o stdout que o agente pode estar
  // encadeando (--json), mas continuam visiveis.
  for (const aviso of resultado.avisos || []) {
    process.stderr.write('[aviso] ' + aviso + '\n')
  }
  if (resultado.texto) process.stdout.write(resultado.texto + '\n')
  return 0
}

principal()
  .then(codigo => { process.exitCode = codigo })
  .catch(err => {
    // Erro ja formatado (validacao local com o contrato junto) sai limpo; o
    // resto sai com o prefixo, sem stack: stack em CLI de agente e ruido.
    for (const aviso of err.avisos || []) {
      process.stderr.write('[aviso] ' + aviso + '\n')
    }
    process.stderr.write(
      (err.jaFormatado ? err.message : '[erro] ' + err.message) + '\n'
    )
    process.exitCode = 1
  })
