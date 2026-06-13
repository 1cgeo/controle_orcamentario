// Path: relatorio\relatorio_ctrl.js
'use strict'

const { Document, Packer, Paragraph, HeadingLevel, Table, TableRow, TableCell, WidthType, TextRun } = require('docx')

const { db } = require('../database')

const { AppError, httpCode } = require('../utils')

const controller = {}

// Codigo SQLSTATE do PostgreSQL para violacao de unicidade (UNIQUE).
// Usado para traduzir o erro cru do banco (constraint UNIQUE (ano, mes) da
// orcamento.relatorio_rpcmtec) numa mensagem amigavel de conflito (409).
const UNIQUE_VIOLATION = '23505'

// Reembrulha erros do banco da edicao mensal em AppError amigavel; demais sobem.
const tratarErroEdicao = err => {
  if (err && err.code === UNIQUE_VIOLATION) {
    throw new AppError(
      'Ja existe uma edicao do RPCMTec para este ano e mes',
      httpCode.Conflict,
      err
    )
  }
  throw err
}

// ---------------------------------------------------------------------------
// Datas de recorte (calculadas em JS e passadas como parametro; nunca por
// concatenacao no SQL). Tudo em ISO 'YYYY-MM-DD', comparado contra colunas DATE.
// ---------------------------------------------------------------------------

// Formata um ano/mes/dia (componentes numericos) como 'YYYY-MM-DD'. Usa os
// componentes diretamente, sem objeto Date, para evitar deslocamento de fuso.
const isoDate = (ano, mes, dia) => {
  const mm = String(mes).padStart(2, '0')
  const dd = String(dia).padStart(2, '0')
  return `${ano}-${mm}-${dd}`
}

// Ultimo dia do mes (ano, mes 1..12). new Date(ano, mes, 0) devolve o dia 0 do
// mes seguinte, isto e, o ultimo dia do mes pedido (trata anos bissextos).
const ultimoDiaDoMes = (ano, mes) => new Date(ano, mes, 0).getDate()

// Calcula :inicio e :cutoff a partir de ano, mes e cumulativo.
//   * cutoff = ultimo dia do mes informado.
//   * inicio = primeiro dia do ano (cumulativo) ou primeiro dia do mes.
const calcularRecorte = (ano, mes, cumulativo) => {
  const cutoff = isoDate(ano, mes, ultimoDiaDoMes(ano, mes))
  const inicio = cumulativo ? isoDate(ano, 1, 1) : isoDate(ano, mes, 1)
  return { inicio, cutoff }
}

// ---------------------------------------------------------------------------
// A) CRUD da edicao mensal orcamento.relatorio_rpcmtec
// ---------------------------------------------------------------------------

controller.listar = async (filtros = {}) => {
  return db.conn.any(
    `SELECT id, ano, mes, assinante, data_assinatura,
            data_cadastramento, usuario_cadastramento_uuid,
            data_modificacao, usuario_modificacao_uuid
     FROM orcamento.relatorio_rpcmtec
     WHERE ($<ano> IS NULL OR ano = $<ano>)
     ORDER BY ano DESC, mes DESC`,
    { ano: filtros.ano != null ? filtros.ano : null }
  )
}

controller.getPorId = async id => {
  const edicao = await db.conn.oneOrNone(
    `SELECT id, ano, mes, assinante, data_assinatura,
            data_cadastramento, usuario_cadastramento_uuid,
            data_modificacao, usuario_modificacao_uuid
     FROM orcamento.relatorio_rpcmtec
     WHERE id = $<id>`,
    { id }
  )

  if (!edicao) {
    throw new AppError('Edicao do RPCMTec nao encontrada', httpCode.NotFound)
  }

  return edicao
}

controller.criar = async (dados, usuarioUuid) => {
  return db.conn
    .one(
      `INSERT INTO orcamento.relatorio_rpcmtec
         (ano, mes, assinante, data_assinatura, usuario_cadastramento_uuid)
       VALUES ($<ano>, $<mes>, $<assinante>, $<dataAssinatura>, $<usuarioUuid>)
       RETURNING id`,
      {
        ano: dados.ano,
        mes: dados.mes,
        assinante: dados.assinante || null,
        dataAssinatura: dados.data_assinatura || null,
        usuarioUuid
      }
    )
    .catch(tratarErroEdicao)
}

controller.atualizar = async (id, dados, usuarioUuid) => {
  const existente = await db.conn.oneOrNone(
    'SELECT id FROM orcamento.relatorio_rpcmtec WHERE id = $<id>',
    { id }
  )
  if (!existente) {
    throw new AppError('Edicao do RPCMTec nao encontrada', httpCode.NotFound)
  }

  return db.conn
    .one(
      `UPDATE orcamento.relatorio_rpcmtec SET
         ano = $<ano>, mes = $<mes>, assinante = $<assinante>,
         data_assinatura = $<dataAssinatura>,
         data_modificacao = $<dataModificacao>,
         usuario_modificacao_uuid = $<usuarioUuid>
       WHERE id = $<id>
       RETURNING id`,
      {
        id,
        ano: dados.ano,
        mes: dados.mes,
        assinante: dados.assinante || null,
        dataAssinatura: dados.data_assinatura || null,
        dataModificacao: new Date(),
        usuarioUuid
      }
    )
    .catch(tratarErroEdicao)
}

controller.deletar = async id => {
  const existente = await db.conn.oneOrNone(
    'SELECT id FROM orcamento.relatorio_rpcmtec WHERE id = $<id>',
    { id }
  )
  if (!existente) {
    throw new AppError('Edicao do RPCMTec nao encontrada', httpCode.NotFound)
  }

  return db.conn.none(
    'DELETE FROM orcamento.relatorio_rpcmtec WHERE id = $<id>',
    { id }
  )
}

// ---------------------------------------------------------------------------
// B) Gerador da secao 3 (Execucao do PDR). Cada subtabela e um array de linhas.
// Os valores ja vem somados (cumulativos por padrao) ate o mes de corte.
// ---------------------------------------------------------------------------

// 3.1 Execucao por ND: uma linha para CADA natureza de despesa do dominio
// (ordenado por code), com previsto/recebido/empenhado/liquidado agregados, e
// uma linha de TOTAL ao final. Subqueries correlacionadas com COALESCE(...,0).
const gerarTabela31 = async (ano, inicio, cutoff, cumulativo) => {
  // As tres colunas de fluxo (recebido/empenhado/liquidado) usam o MESMO recorte
  // [inicio, cutoff] pela data do documento, para serem consistentes entre si e
  // nao vazarem de outros exercicios. Registros sem data sao contados no modo
  // cumulativo (visao do ano) e ignorados no mes isolado (sem mes atribuivel).
  const linhas = await db.conn.any(
    `SELECT
       nd.code AS cod_nd,
       nd.nome AS nd_nome,
       COALESCE((
         SELECT SUM(pi.valor_autorizado)
         FROM orcamento.pdr_item AS pi
         WHERE pi.ano = $<ano> AND pi.cod_nd = nd.code
       ), 0) AS previsto,
       COALESCE((
         SELECT SUM(nc.valor_nc)
         FROM orcamento.nota_credito AS nc
         WHERE nc.ano = $<ano>
           AND nc.classificacao_id = 1
           AND nc.cod_nd = nd.code
           AND ((nc.data_emissao >= $<inicio> AND nc.data_emissao <= $<cutoff>)
                OR ($<cumulativo> AND nc.data_emissao IS NULL))
       ), 0) AS recebido,
       COALESCE((
         SELECT SUM(ne.valor_empenhado - ne.valor_anulado)
         FROM orcamento.nota_empenho AS ne
         WHERE ne.cod_nd = nd.code
           AND ((ne.data_empenho >= $<inicio> AND ne.data_empenho <= $<cutoff>)
                OR ($<cumulativo> AND ne.data_empenho IS NULL))
       ), 0) AS empenhado,
       COALESCE((
         SELECT SUM(lq.valor_liquidado)
         FROM orcamento.liquidacao AS lq
         INNER JOIN orcamento.nota_empenho AS ne ON ne.id = lq.nota_empenho_id
         WHERE ne.cod_nd = nd.code
           AND ((lq.data >= $<inicio> AND lq.data <= $<cutoff>)
                OR ($<cumulativo> AND lq.data IS NULL))
       ), 0) AS liquidado
     FROM dominio.natureza_despesa AS nd
     ORDER BY nd.code`,
    { ano, inicio, cutoff, cumulativo }
  )

  // Linha de TOTAL: soma as quatro colunas numericas das linhas por ND.
  const total = linhas.reduce(
    (acc, l) => {
      acc.previsto += Number(l.previsto)
      acc.recebido += Number(l.recebido)
      acc.empenhado += Number(l.empenhado)
      acc.liquidado += Number(l.liquidado)
      return acc
    },
    { previsto: 0, recebido: 0, empenhado: 0, liquidado: 0 }
  )

  linhas.push({
    cod_nd: 'TOTAL',
    nd_nome: 'TOTAL',
    previsto: total.previsto,
    recebido: total.recebido,
    empenhado: total.empenhado,
    liquidado: total.liquidado
  })

  return linhas
}

// Subtabelas 3.2 (PDR) e 3.7 (Extra-PDR): mesma estrutura, mudando so a
// classificacao_id (1 = PDR, 2 = Extra-PDR). Recorte cumulativo em data_emissao
// (de :inicio a :cutoff). NE ligadas concatenadas via STRING_AGG; empenhado e
// liquidado somados a partir das NE da NC. Ordena por data_emissao.
const gerarCreditosRecebidos = async (ano, inicio, cutoff, classificacaoId, cumulativo) => {
  return db.conn.any(
    `SELECT
       nc.numero AS nc,
       (
         SELECT STRING_AGG(ne.numero, ', ' ORDER BY ne.numero)
         FROM orcamento.nota_empenho AS ne
         WHERE ne.nota_credito_id = nc.id
       ) AS ne,
       nc.cod_nd,
       nc.finalidade_historico AS finalidade,
       nc.valor_nc,
       COALESCE((
         SELECT SUM(ne.valor_empenhado - ne.valor_anulado)
         FROM orcamento.nota_empenho AS ne
         WHERE ne.nota_credito_id = nc.id
       ), 0) AS valor_empenhado,
       COALESCE((
         SELECT SUM(lq.valor_liquidado)
         FROM orcamento.liquidacao AS lq
         INNER JOIN orcamento.nota_empenho AS ne ON ne.id = lq.nota_empenho_id
         WHERE ne.nota_credito_id = nc.id
       ), 0) AS valor_liquidado
     FROM orcamento.nota_credito AS nc
     WHERE nc.ano = $<ano>
       AND nc.classificacao_id = $<classificacaoId>
       AND ((nc.data_emissao >= $<inicio> AND nc.data_emissao <= $<cutoff>)
            OR ($<cumulativo> AND nc.data_emissao IS NULL))
     ORDER BY nc.data_emissao`,
    { ano, inicio, cutoff, classificacaoId, cumulativo }
  )
}

// 3.3 RPNP: restos a pagar nao processados carregados para o ano.
// empenho = empenho_label, com fallback para o numero da NE via JOIN.
const gerarTabela33 = async ano => {
  return db.conn.any(
    `SELECT
       COALESCE(r.empenho_label, ne.numero) AS empenho,
       r.finalidade,
       r.valor_empenhado,
       r.valor_a_liquidar
     FROM orcamento.rpnp AS r
     LEFT JOIN orcamento.nota_empenho AS ne ON ne.id = r.nota_empenho_id
     WHERE r.ano = $<ano>
     ORDER BY r.id`,
    { ano }
  )
}

// 3.4 (GCALC DSG, tipo_id = 1) e 3.5 (licitacoes proprias, tipo_id = 2):
// mesma estrutura, mudando so o tipo_id.
const gerarLicitacoes = async (ano, tipoId) => {
  return db.conn.any(
    `SELECT
       l.objeto,
       l.fase_atual,
       l.valor_total_estimado,
       l.valor_final_homologado
     FROM orcamento.licitacao AS l
     WHERE l.ano = $<ano> AND l.tipo_id = $<tipoId>
     ORDER BY l.id`,
    { ano, tipoId }
  )
}

// 3.6 Recebimento de material: itens de material vinculados a NE do exercicio.
const gerarTabela36 = async ano => {
  return db.conn.any(
    `SELECT
       ne.numero AS empenho,
       rm.material,
       rm.prazo_entrega,
       rm.situacao
     FROM orcamento.recebimento_material AS rm
     INNER JOIN orcamento.nota_empenho AS ne ON ne.id = rm.nota_empenho_id
     WHERE ne.ano = $<ano>
     ORDER BY rm.id`,
    { ano }
  )
}

// Monta o objeto com as 7 subtabelas da secao 3 a partir do recorte calculado.
controller.gerarSecao3 = async ({ ano, mes, cumulativo }) => {
  const { inicio, cutoff } = calcularRecorte(ano, mes, cumulativo)

  const [
    tabela_31,
    tabela_32,
    tabela_33,
    tabela_34,
    tabela_35,
    tabela_36,
    tabela_37
  ] = await Promise.all([
    gerarTabela31(ano, inicio, cutoff, cumulativo),
    gerarCreditosRecebidos(ano, inicio, cutoff, 1, cumulativo),
    gerarTabela33(ano),
    gerarLicitacoes(ano, 1),
    gerarLicitacoes(ano, 2),
    gerarTabela36(ano),
    gerarCreditosRecebidos(ano, inicio, cutoff, 2, cumulativo)
  ])

  return {
    ano,
    mes,
    cumulativo,
    inicio,
    cutoff,
    tabela_31,
    tabela_32,
    tabela_33,
    tabela_34,
    tabela_35,
    tabela_36,
    tabela_37
  }
}

// ---------------------------------------------------------------------------
// C) Export Markdown: renderiza as 7 subtabelas na ordem 3.1 a 3.7.
// ---------------------------------------------------------------------------

// Formatador monetario brasileiro (R$ 1.234,56). Trata null/undefined como 0.
const formatadorBRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
})

const moeda = valor => formatadorBRL.format(Number(valor) || 0)

// Texto simples para celula nao monetaria; null/'' viram '-'.
const texto = valor => {
  if (valor == null || valor === '') {
    return '-'
  }
  return String(valor)
}

// Renderiza uma subtabela Markdown a partir de um titulo, dos cabecalhos das
// colunas e da lista de linhas ja formatadas (arrays de string por celula).
// Tabela vazia imprime o cabecalho e UMA linha so com '-' em cada celula.
const renderTabela = (titulo, headers, linhasFormatadas) => {
  const partes = []
  partes.push(`### ${titulo}`)
  partes.push('')
  partes.push(`| ${headers.join(' | ')} |`)
  partes.push(`| ${headers.map(() => '---').join(' | ')} |`)

  const corpo =
    linhasFormatadas.length > 0
      ? linhasFormatadas
      : [headers.map(() => '-')]

  corpo.forEach(celulas => {
    partes.push(`| ${celulas.join(' | ')} |`)
  })

  partes.push('')
  return partes.join('\n')
}

controller.gerarSecao3Markdown = async ({ ano, mes, cumulativo }) => {
  const dados = await controller.gerarSecao3({ ano, mes, cumulativo })

  const blocos = []

  blocos.push(
    renderTabela(
      '3.1 Execução por ND',
      ['Cod ND', 'Natureza de Despesa', 'Previsto', 'Recebido', 'Empenhado', 'Liquidado'],
      dados.tabela_31.map(l => [
        texto(l.cod_nd),
        texto(l.nd_nome),
        moeda(l.previsto),
        moeda(l.recebido),
        moeda(l.empenhado),
        moeda(l.liquidado)
      ])
    )
  )

  blocos.push(
    renderTabela(
      '3.2 Créditos recebidos (PDR)',
      ['NC', 'NE', 'Cod ND', 'Finalidade', 'Valor NC', 'Valor Empenhado', 'Valor Liquidado'],
      dados.tabela_32.map(l => [
        texto(l.nc),
        texto(l.ne),
        texto(l.cod_nd),
        texto(l.finalidade),
        moeda(l.valor_nc),
        moeda(l.valor_empenhado),
        moeda(l.valor_liquidado)
      ])
    )
  )

  blocos.push(
    renderTabela(
      '3.3 Restos a Pagar Não Processados (RPNP)',
      ['Empenho', 'Finalidade', 'Valor Empenhado', 'Valor a Liquidar'],
      dados.tabela_33.map(l => [
        texto(l.empenho),
        texto(l.finalidade),
        moeda(l.valor_empenhado),
        moeda(l.valor_a_liquidar)
      ])
    )
  )

  blocos.push(
    renderTabela(
      '3.4 Licitações GCALC DSG',
      ['Objeto', 'Fase Atual', 'Valor Total Estimado', 'Valor Final Homologado'],
      dados.tabela_34.map(l => [
        texto(l.objeto),
        texto(l.fase_atual),
        moeda(l.valor_total_estimado),
        moeda(l.valor_final_homologado)
      ])
    )
  )

  blocos.push(
    renderTabela(
      '3.5 Licitações próprias',
      ['Objeto', 'Fase Atual', 'Valor Total Estimado', 'Valor Final Homologado'],
      dados.tabela_35.map(l => [
        texto(l.objeto),
        texto(l.fase_atual),
        moeda(l.valor_total_estimado),
        moeda(l.valor_final_homologado)
      ])
    )
  )

  blocos.push(
    renderTabela(
      '3.6 Recebimento de material',
      ['Empenho', 'Material', 'Prazo de Entrega', 'Situação'],
      dados.tabela_36.map(l => [
        texto(l.empenho),
        texto(l.material),
        texto(l.prazo_entrega),
        texto(l.situacao)
      ])
    )
  )

  blocos.push(
    renderTabela(
      '3.7 Créditos recebidos (Extra-PDR)',
      ['NC', 'NE', 'Cod ND', 'Finalidade', 'Valor NC', 'Valor Empenhado', 'Valor Liquidado'],
      dados.tabela_37.map(l => [
        texto(l.nc),
        texto(l.ne),
        texto(l.cod_nd),
        texto(l.finalidade),
        moeda(l.valor_nc),
        moeda(l.valor_empenhado),
        moeda(l.valor_liquidado)
      ])
    )
  )

  return { markdown: blocos.join('\n') }
}

// ---------------------------------------------------------------------------
// D) Export DOCX: um documento Word com as 7 subtabelas, pronto para abrir no
// Google Docs (que importa .docx preservando as tabelas) e colar no RPCMTec.
// ---------------------------------------------------------------------------

const docxCelula = (valor, bold = false) => new TableCell({
  children: [new Paragraph({ children: [new TextRun({ text: texto(valor), bold })] })]
})

const docxTabela = (headers, linhas) => {
  const corpo = linhas.length > 0 ? linhas : [headers.map(() => '-')]
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ tableHeader: true, children: headers.map(h => docxCelula(h, true)) }),
      ...corpo.map(celulas => new TableRow({ children: celulas.map(c => docxCelula(c)) }))
    ]
  })
}

controller.gerarSecao3Docx = async ({ ano, mes, cumulativo }) => {
  const dados = await controller.gerarSecao3({ ano, mes, cumulativo })

  const children = [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: `RPCMTec - Seção 3 (Execução do PDR) - ${String(mes).padStart(2, '0')}/${ano}${cumulativo ? ' (cumulativo)' : ''}` })]
    })
  ]

  const bloco = (titulo, headers, linhas) => {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: titulo })] }))
    children.push(docxTabela(headers, linhas))
    children.push(new Paragraph({ text: '' }))
  }

  bloco('3.1 Execução por ND',
    ['Cod ND', 'Natureza de Despesa', 'Previsto', 'Recebido', 'Empenhado', 'Liquidado'],
    dados.tabela_31.map(l => [texto(l.cod_nd), texto(l.nd_nome), moeda(l.previsto), moeda(l.recebido), moeda(l.empenhado), moeda(l.liquidado)]))
  bloco('3.2 Créditos recebidos (PDR)',
    ['NC', 'NE', 'Cod ND', 'Finalidade', 'Valor NC', 'Valor Empenhado', 'Valor Liquidado'],
    dados.tabela_32.map(l => [texto(l.nc), texto(l.ne), texto(l.cod_nd), texto(l.finalidade), moeda(l.valor_nc), moeda(l.valor_empenhado), moeda(l.valor_liquidado)]))
  bloco('3.3 Restos a Pagar Não Processados (RPNP)',
    ['Empenho', 'Finalidade', 'Valor Empenhado', 'Valor a Liquidar'],
    dados.tabela_33.map(l => [texto(l.empenho), texto(l.finalidade), moeda(l.valor_empenhado), moeda(l.valor_a_liquidar)]))
  bloco('3.4 Licitações GCALC DSG',
    ['Objeto', 'Fase Atual', 'Valor Total Estimado', 'Valor Final Homologado'],
    dados.tabela_34.map(l => [texto(l.objeto), texto(l.fase_atual), moeda(l.valor_total_estimado), moeda(l.valor_final_homologado)]))
  bloco('3.5 Licitações próprias',
    ['Objeto', 'Fase Atual', 'Valor Total Estimado', 'Valor Final Homologado'],
    dados.tabela_35.map(l => [texto(l.objeto), texto(l.fase_atual), moeda(l.valor_total_estimado), moeda(l.valor_final_homologado)]))
  bloco('3.6 Recebimento de material',
    ['Empenho', 'Material', 'Prazo de Entrega', 'Situação'],
    dados.tabela_36.map(l => [texto(l.empenho), texto(l.material), texto(l.prazo_entrega), texto(l.situacao)]))
  bloco('3.7 Créditos recebidos (Extra-PDR)',
    ['NC', 'NE', 'Cod ND', 'Finalidade', 'Valor NC', 'Valor Empenhado', 'Valor Liquidado'],
    dados.tabela_37.map(l => [texto(l.nc), texto(l.ne), texto(l.cod_nd), texto(l.finalidade), moeda(l.valor_nc), moeda(l.valor_empenhado), moeda(l.valor_liquidado)]))

  const doc = new Document({ sections: [{ children }] })
  return Packer.toBuffer(doc)
}

module.exports = controller
