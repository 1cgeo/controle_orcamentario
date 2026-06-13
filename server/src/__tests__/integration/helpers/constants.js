'use strict'

// Constantes compartilhadas pela camada de integracao/E2E.
// O usuario admin de teste e semeado em dgeo.usuario (global_setup) e reconhecido
// pelo stub do servico de autenticacao (mesmo login/senha/uuid).

const TEST_ADMIN = {
  login: 'admin.teste',
  senha: 'senha-de-teste',
  uuid: '11111111-1111-1111-1111-111111111111',
  nome: 'Administrador de Teste',
  nome_guerra: 'Teste',
  tipo_posto_grad_id: 13 // Capitao
}

// Segundo usuario, conhecido pelo stub do servico de autenticacao mas NAO
// semeado em dgeo.usuario (so o admin e). Existe para exercitar a importacao
// real (POST /api/usuarios) e o filtro de /servico_autenticacao.
const SEGUNDO_USUARIO = {
  login: 'segundo.usuario',
  senha: 'outra-senha',
  uuid: '22222222-2222-2222-2222-222222222222',
  nome: 'Segundo Usuario de Teste',
  nome_guerra: 'Segundo',
  tipo_posto_grad_id: 12 // Primeiro Tenente
}

// Lista das tabelas do schema orcamento na ordem de truncamento (CASCADE cobre
// as FKs, mas a lista explicita documenta o universo de dados de cada teste).
const TABELAS_ORCAMENTO = [
  'orcamento.relatorio_rpcmtec',
  'orcamento.rpnp',
  'orcamento.recebimento_material',
  'orcamento.liquidacao',
  'orcamento.nota_empenho',
  'orcamento.nota_credito',
  'orcamento.pdr_item',
  'orcamento.pdr',
  'orcamento.licitacao',
  'orcamento.dfd_item',
  'orcamento.dfd',
  'orcamento.pca',
  'orcamento.meta_pit',
  'orcamento.exercicio'
]

module.exports = { TEST_ADMIN, SEGUNDO_USUARIO, TABELAS_ORCAMENTO }
