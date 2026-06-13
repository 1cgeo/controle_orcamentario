// Path: dominio\dominio_ctrl.js
'use strict'

const { db } = require('../database')

const controller = {}

controller.getTipoPostoGrad = async () => {
  return db.conn.any('SELECT code, nome, nome_abrev FROM dominio.tipo_posto_grad ORDER BY code')
}

controller.getNaturezaDespesa = async () => {
  return db.conn.any('SELECT code, nome, gnd, grupo FROM dominio.natureza_despesa ORDER BY code')
}

controller.getPlanoInterno = async () => {
  return db.conn.any('SELECT code, nome, alinea FROM dominio.plano_interno ORDER BY code')
}

controller.getUg = async () => {
  return db.conn.any('SELECT code, nome FROM dominio.ug ORDER BY code')
}

controller.getTipoLicitacao = async () => {
  return db.conn.any('SELECT code, nome FROM dominio.tipo_licitacao ORDER BY code')
}

controller.getClassificacaoNc = async () => {
  return db.conn.any('SELECT code, nome FROM dominio.classificacao_nc ORDER BY code')
}

controller.getTipoItemDfd = async () => {
  return db.conn.any('SELECT code, nome FROM dominio.tipo_item_dfd ORDER BY code')
}

controller.getGrauPrioridade = async () => {
  return db.conn.any('SELECT code, nome FROM dominio.grau_prioridade ORDER BY code')
}

module.exports = controller
