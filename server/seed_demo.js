'use strict'

// Seed de demonstracao do SCO. Cria (do zero) o banco sco_demo no PostgreSQL
// local, aplica o schema er/*.sql e popula com os dados REAIS do ciclo 2026 da
// DGEO (PDR, NCs, PCA/DFDs, metas do PIT) mais execucao mock (empenhos,
// liquidacoes, licitacoes, RPNP, recebimentos) para o relatorio ficar completo.
// Uso: node seed_demo.js   (precisa do PostgreSQL local postgres/postgres)

const fs = require('fs')
const path = require('path')
const pgPromise = require('pg-promise')

const CONN = {
  host: process.env.DB_SERVER || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
}
const DB_NAME = process.env.DB_NAME || 'sco_demo'
const ADMIN = {
  login: 'chefe.dgeo',
  uuid: '0a000000-0000-4000-8000-000000000001',
  nome: 'Chefe da Divisao de Geoinformacao',
  nome_guerra: 'Chefe DGEO',
  tipo_posto_grad_id: 14 // Major
}

const pgp = pgPromise()
const er = f => fs.readFileSync(path.join(__dirname, '..', 'er', f), 'utf8')

// ND -> item_label do PDR (para ligar a NC ao pdr_item quando e PDR/3.2)
const ND_LABEL = { 339015: '1D', 339033: '1E', 339039: '1F', 339030: '1G', 339139: '1H', 449040: '1Isoft', 449052: '1Iequip' }

const METAS = [
  { numero: 1, item: '1', descricao: 'Producao de Geoinformacao (COTER/DECEx)' },
  { numero: 2, item: '2', descricao: 'Acordos Internacionais (MGCP, Bloco W058N06)' },
  { numero: 3, item: '3', descricao: 'EBGeo (Arandu 2026 e Estadio Beira-Rio)' },
  { numero: 4, item: '4', descricao: 'Impressao de produtos' },
  { numero: 5, item: '5', descricao: 'Capacitacao em Geoinformacao' },
  { numero: 6, item: '6', descricao: 'Programa Memoria do Servico Geografico' },
  { numero: 7, item: '7', descricao: 'Gestao de TI (GTISG/DSG)' }
]

const PDR_ITENS = [
  { label: '1D', nd: '339015', meta: 1, gnd: 3, sol: 94830, aut: 94830, desc: 'Producao de Geoinformacao (diarias)' },
  { label: '1E', nd: '339033', meta: 1, gnd: 3, sol: 0, aut: 0, desc: 'Producao de Geoinformacao (passagens)' },
  { label: '1F', nd: '339039', meta: 1, gnd: 3, sol: 50000, aut: 50000, desc: 'Servicos de terceiros (frota, ART, manutencao)' },
  { label: '1G', nd: '339030', meta: 4, gnd: 3, sol: 114000, aut: 114000, desc: 'Materiais de consumo e insumos de impressao' },
  { label: '1H', nd: '339139', meta: null, gnd: 3, sol: 2200, aut: 2000, desc: 'Publicacoes oficiais' },
  { label: '1Isoft', nd: '449040', meta: 3, gnd: 4, sol: 183670, aut: 169000, desc: 'Softwares tecnicos (DJI Terra, Metashape)' },
  { label: '1Iequip', nd: '449052', meta: null, gnd: 4, sol: 224500, aut: 139300, desc: 'Equipamentos diversos, tecnicos e de TIC' }
]

const DFDS = [
  { numero: '000001', rotulo: 'Impressao', objeto: 'Insumos de impressao (cartuchos e papeis)', valor: 152000, prioridade: 2, consta: true, item: { tipo: 1, desc: 'Cartuchos e papeis para plotter', qtd: 1, vu: 152000, vt: 152000 } },
  { numero: '000002', rotulo: 'TIC', objeto: 'Equipamentos de TIC (storage, desktops, switches)', valor: 187800, prioridade: 1, consta: true, item: { tipo: 1, desc: 'Storage NAS, desktops e switches', qtd: 1, vu: 187800, vt: 187800 } },
  { numero: '000003', rotulo: 'Campo', objeto: 'Apoio a operacoes de campo (Prime)', valor: 200000, prioridade: 1, consta: true, item: { tipo: 2, desc: 'Servico de apoio a campo', qtd: 1, vu: 200000, vt: 200000 } },
  { numero: '000004', rotulo: 'Drone', objeto: 'Drone DJI Matrice 350 RTK', valor: 175000, prioridade: 1, consta: true, item: { tipo: 1, desc: 'Drone DJI Matrice 350 RTK', qtd: 1, vu: 175000, vt: 175000 } },
  { numero: '000005', rotulo: 'Material', objeto: 'Material diversos', valor: 64800, prioridade: 2, consta: true, item: { tipo: 1, desc: 'Materiais diversos de consumo', qtd: 1, vu: 64800, vt: 64800 } },
  { numero: '000006', rotulo: 'Capacitacao', objeto: 'Capacitacao / MBA', valor: 19000, prioridade: 3, consta: true, item: { tipo: 2, desc: 'Curso MBA', qtd: 1, vu: 19000, vt: 19000 } },
  { numero: '000007', rotulo: 'Correios', objeto: 'Servico de correios', valor: 7000, prioridade: 2, consta: true, item: { tipo: 2, desc: 'Transporte de produtos (correios)', qtd: 1, vu: 7000, vt: 7000 } },
  { numero: '000135', rotulo: 'IA', objeto: 'Licencas de IA (Claude IA Pro)', valor: 15000, prioridade: 1, consta: false, item: { tipo: 2, desc: 'Licenca de IA generativa', qtd: 1, vu: 15000, vt: 15000 } }
]

// classificacao: 1 = PDR (3.2), 2 = Extra-PDR (3.7)
const NCS = [
  // --- PDR (3.2) ---
  { n: '2026NC400134', d: '2026-02-03', nd: '339015', meta: 1, v: 20710.00, c: 1, fin: 'Diarias, producao de geoinformacao, campo Santiago/RS. Meta 1, PIT 2026.' },
  { n: '2026NC400135', d: '2026-02-03', nd: '339039', meta: 1, v: 864.00, c: 1, fin: 'Gestao de frota, manutencao de viaturas, Santiago/RS.' },
  { n: '2026NC400136', d: '2026-02-03', nd: '339039', meta: 1, v: 1800.00, c: 1, fin: 'Gestao de frota, combustivel, Santiago/RS.' },
  { n: '2026NC400137', d: '2026-02-03', nd: '339030', meta: 1, v: 1728.00, c: 1, fin: 'Gestao de frota, pecas de viatura, Santiago/RS.' },
  { n: '2026NC400412', d: '2026-03-03', nd: '339039', meta: 4, v: 2000.00, c: 1, fin: 'Servico de transporte (correios) de produtos de geoinformacao.' },
  { n: '2026NC400695', d: '2026-04-13', nd: '339015', meta: 1, v: 16350.00, c: 1, fin: 'Diarias, campo Faxinal do Soturno/RS e CIBSB/RS.', ro: '2026RO000696' },
  { n: '2026NC400698', d: '2026-04-13', nd: '339030', meta: 1, v: 3456.00, c: 1, fin: 'Gestao de frota, pecas de viatura, missao de producao.', ro: '2026RO000699' },
  { n: '2026NC400702', d: '2026-04-13', nd: '339039', meta: 1, v: 1728.00, c: 1, fin: 'Gestao de frota, manutencao de viaturas, missao de producao.', ro: '2026RO000703' },
  { n: '2026NC400703', d: '2026-04-13', nd: '339039', meta: 1, v: 3600.00, c: 1, fin: 'Gestao de frota, combustivel, missao de producao.', ro: '2026RO000704' },
  { n: '2026NC400706', d: '2026-04-13', nd: '449040', meta: 1, v: 128434.00, c: 1, fin: 'Licenca de software (DJI Terra e DJI Modify).', ro: '2026RO000707' },
  { n: '2026NC400940', d: '2026-04-30', nd: '449052', meta: null, v: 6349.10, c: 1, fin: 'Ar-condicionado, 2 un. de 18 mil BTU, sala de servidores.', ro: '2026RO000939' },
  { n: '2026NC401248', d: '2026-05-26', nd: '449052', meta: null, v: 6349.10, c: 1, fin: 'Ar-condicionado, 1 un. de 30 mil BTU (empenho 5.392,08, 957,02 a devolver).', ro: '2026RO001240' },
  { n: '2026NC401276', d: '2026-05-26', nd: '339039', meta: 1, v: 1050.00, c: 1, fin: 'Servico de manutencao preventiva de drones.', ro: '2026RO001267' },
  { n: '2026NC401277', d: '2026-05-26', nd: '339039', meta: 4, v: 3000.00, c: 1, fin: 'Correios, transporte de produtos analogicos.', ro: '2026RO001268' },
  // --- Extra-PDR (3.7) ---
  { n: '2026NC400406', d: '2026-03-03', nd: '339015', meta: null, v: 1062.50, c: 2, fin: 'Diarias, Chefia do 1 CGEO, passagem de Direcao da DSG, Brasilia/DF.' },
  { n: '2026NC400410', d: '2026-03-03', nd: '339033', meta: null, v: 2500.00, c: 2, fin: 'Passagens, Chefia do 1 CGEO, Direcao da DSG, Brasilia/DF.' },
  { n: '2026NC400418', d: '2026-03-04', nd: '339015', meta: null, v: 307.50, c: 2, fin: 'Complementacao da NC400406, diarias da Chefia, Brasilia/DF.', ro: '2026RO000414', compl: '2026NC400406' },
  { n: '2026NC400500', d: '2026-03-11', nd: '339015', meta: null, v: 510.00, c: 2, fin: '2a complementacao da NC400406, Brasilia/DF.', compl: '2026NC400406' },
  { n: '2026NC400923', d: '2026-04-30', nd: '339015', meta: null, v: 4397.50, c: 2, fin: 'Diarias, 2 militares, Reuniao de Chefe DGEO, Brasilia/DF.', ro: '2026RO000921' },
  { n: '2026NC400924', d: '2026-04-30', nd: '339033', meta: null, v: 5000.00, c: 2, fin: 'Passagens, 2 militares, Reuniao de Chefe DGEO, Brasilia/DF.', ro: '2026RO000922' },
  { n: '2026NC400930', d: '2026-04-30', nd: '339015', meta: null, v: 1370.00, c: 2, fin: 'Diarias, oficial superior, MundoGEO Connect, Sao Paulo/SP.', ro: '2026RO000930' },
  { n: '2026NC400937', d: '2026-04-30', nd: '339033', meta: null, v: 2000.00, c: 2, fin: 'Passagens, MundoGEO Connect, Sao Paulo/SP.', ro: '2026RO000932' },
  { n: '2026NC000758', d: '2026-05-28', nd: '339015', meta: null, v: 9303.00, c: 2, fin: 'Passagens e diarias, Curso de Operador SARP SISFRON (UG 160507/EME).', ro: '2026RO000758', ug: '160507', ptres: '232171', pi: null }
]

const NES = [
  { n: '2026NE000045', d: '2026-02-13', nc: '2026NC400134', nd: '339015', emp: 20710.00, anu: 0, fin: 'Empenho de diarias, campo Santiago.' },
  { n: '2026NE000048', d: '2026-02-13', nc: '2026NC400137', nd: '339030', emp: 1728.00, anu: 0, fin: 'Empenho de pecas de viatura, Santiago.' },
  { n: '2026NE000049', d: '2026-02-13', nc: '2026NC400135', nd: '339039', emp: 864.00, anu: 0, fin: 'Empenho de manutencao de viatura, Santiago.' },
  { n: '2026NE000050', d: '2026-02-13', nc: '2026NC400136', nd: '339039', emp: 1800.00, anu: 0, fin: 'Empenho de combustivel, Santiago.' },
  { n: '2026NE000110', d: '2026-04-24', nc: '2026NC400706', nd: '449040', emp: 128434.00, anu: 0, fin: 'Empenho de licenca DJI Terra e Modify.', lic: 'Software DJI Terra e Metashape' },
  { n: '2026NE000120', d: '2026-04-24', nc: '2026NC400695', nd: '339015', emp: 16350.00, anu: 0, fin: 'Empenho de diarias, campo Faxinal do Soturno.' },
  { n: '2026NE000140', d: '2026-05-02', nc: '2026NC400940', nd: '449052', emp: 6349.10, anu: 0, fin: 'Empenho de ar-condicionado 18 mil BTU.' },
  { n: '2026NE000155', d: '2026-05-28', nc: '2026NC401248', nd: '449052', emp: 6349.10, anu: 957.02, fin: 'Empenho de ar-condicionado 30 mil BTU (devolucao de 957,02).' }
]

const LIQS = [
  { ne: '2026NE000045', v: 20710.00, d: '2026-03-10', ns: '2026NS000210' },
  { ne: '2026NE000048', v: 1728.00, d: '2026-03-15', ns: '2026NS000231' },
  { ne: '2026NE000110', v: 128434.00, d: '2026-05-20', ns: '2026NS000520' },
  { ne: '2026NE000120', v: 16350.00, d: '2026-05-25', ns: '2026NS000540' },
  { ne: '2026NE000140', v: 6349.10, d: '2026-05-30', ns: '2026NS000560' }
]

const LICITS = [
  { tipo: 1, objeto: 'Drone DJI Matrice 350 RTK (adesao a ata SRP)', fase: 'Aguardando adesao a ata', est: 175000, hom: null, om: '4 CGEO' },
  { tipo: 1, objeto: 'Storage NAS para a DGEO', fase: 'Em processo de adesao', est: 81000, hom: null, om: '4 CGEO' },
  { tipo: 2, objeto: 'Software DJI Terra e Metashape', fase: 'Homologado', est: 183670, hom: 169000, om: null },
  { tipo: 2, objeto: 'Insumos de impressao (cartuchos e papeis)', fase: 'Documentacao na SALC', est: 80000, hom: null, om: null },
  { tipo: 2, objeto: 'Camera Insta360 X5', fase: 'Na SALC', est: 12000, hom: null, om: null }
]

const RECEB = [
  { ne: '2026NE000110', mat: 'Licenca DJI Terra + DJI Modify', prazo: 'Imediato', sit: 'Licenca ativada' },
  { ne: '2026NE000140', mat: '2 splits de 18.000 BTU', prazo: '30 dias', sit: 'Material recebido' },
  { ne: '2026NE000155', mat: '1 split de 30.000 BTU', prazo: 'Previsao 19JUN26', sit: 'Empenho emitido, aguardando entrega' }
]

const RPNPS = [
  { label: '2024NE000113 (imagens)', fin: 'Imagens de satelite (GCALC DSG)', emp: 100000.00, aliq: 100000.00 },
  { label: '2025NE000228 (frota)', fin: 'Saldo de frota do exercicio 2025', emp: 65996.85, aliq: 65996.85 }
]

async function main () {
  // 1) recria o banco
  const maint = pgp({ ...CONN, database: 'postgres' })
  await maint.none(
    'SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $<db> AND pid <> pg_backend_pid()',
    { db: DB_NAME }
  )
  await maint.none('DROP DATABASE IF EXISTS $1:name', [DB_NAME])
  await maint.none('CREATE DATABASE $1:name', [DB_NAME])
  await maint.$pool.end()

  // 2) aplica o schema
  const db = pgp({ ...CONN, database: DB_NAME })
  await db.none(er('versao.sql'))
  await db.none(er('dominio.sql'))
  await db.none(er('dgeo.sql'))
  await db.none(er('orcamento.sql'))

  // 3) usuarios (admin chefe.dgeo + claude). Os uuids batem com o auth_stub_demo.
  await db.none(
    `INSERT INTO dgeo.usuario (login, nome, nome_guerra, tipo_posto_grad_id, administrador, ativo, uuid)
     VALUES ($<login>, $<nome>, $<nome_guerra>, $<tipo_posto_grad_id>, TRUE, TRUE, $<uuid>)`,
    ADMIN
  )
  await db.none(
    `INSERT INTO dgeo.usuario (login, nome, nome_guerra, tipo_posto_grad_id, administrador, ativo, uuid)
     VALUES ('claude', 'Claude', 'Claude', 1, TRUE, TRUE, '0a000000-0000-4000-8000-000000000002')`
  )

  const A = ADMIN.uuid

  // 4) dados, em transacao
  await db.tx(async t => {
    // Configuracao geral (UASG, CODOM, ano de referencia). A linha id=1 ja foi
    // criada no schema; aqui so ajustamos o ano de referencia para 2026.
    await t.none(
      'UPDATE orcamento.configuracao SET uasg = $1, codom = $2, ano_referencia = 2026, data_modificacao = now(), usuario_modificacao_uuid = $3 WHERE id = 1',
      ['160382', '048215', A]
    )

    const metaId = {}
    for (const m of METAS) {
      const r = await t.one(
        'INSERT INTO orcamento.meta_pit (ano, numero_meta, item, descricao, usuario_cadastramento_uuid) VALUES (2026, $1, $2, $3, $4) RETURNING id',
        [m.numero, m.item, m.descricao, A]
      )
      metaId[m.numero] = r.id
    }

    const pdr = await t.one(
      `INSERT INTO orcamento.pdr (ano, valor_solicitado, valor_autorizado, gnd3_autorizado, gnd4_autorizado, acao_orcamentaria, plano_orcamentario, data_assinatura, revisao, usuario_cadastramento_uuid)
       VALUES (2026, 773121, 569300.66, 260830, 308470.66, '20XE', '000F', '2026-02-12', 'E1', $1) RETURNING id`,
      [A]
    )
    const pdrItemId = {}
    for (const it of PDR_ITENS) {
      const r = await t.one(
        `INSERT INTO orcamento.pdr_item (pdr_id, cod_nd, meta_pit_id, item_label, descricao, gnd, valor_solicitado, valor_autorizado, usuario_cadastramento_uuid)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
        [pdr.id, it.nd, it.meta ? metaId[it.meta] : null, it.label, it.desc, it.gnd, it.sol, it.aut, A]
      )
      pdrItemId[it.label] = r.id
    }

    // DFDs do ano (o "PCA do ano" e o conjunto deles; nao ha mais entidade PCA)
    for (const d of DFDS) {
      const dfd = await t.one(
        `INSERT INTO orcamento.dfd (numero, ano, rotulo, objeto, grau_prioridade_id, consta_pca, valor_estimado, usuario_cadastramento_uuid)
         VALUES ($1, 2026, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [d.numero, d.rotulo, d.objeto, d.prioridade, d.consta, d.valor, A]
      )
      await t.none(
        `INSERT INTO orcamento.dfd_item (dfd_id, tipo_item_id, descricao, quantidade, valor_unitario, valor_total, usuario_cadastramento_uuid)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [dfd.id, d.item.tipo, d.item.desc, d.item.qtd, d.item.vu, d.item.vt, A]
      )
    }

    const ncId = {}
    for (const nc of NCS) {
      const pdrItem = nc.c === 1 ? pdrItemId[ND_LABEL[nc.nd]] : null
      const r = await t.one(
        `INSERT INTO orcamento.nota_credito
           (numero, ano, data_emissao, cod_nd, ptres, fonte, cod_pi, ug_emitente, finalidade_historico,
            meta_pit_id, valor_nc, doc_ro, classificacao_id, pdr_item_id, nc_complementada_id, usuario_cadastramento_uuid)
         VALUES ($<n>, 2026, $<d>, $<nd>, $<ptres>, '1000000000', $<pi>, $<ug>, $<fin>,
            $<meta>, $<v>, $<ro>, $<c>, $<pdrItem>, $<compl>, $<A>) RETURNING id`,
        {
          n: nc.n, d: nc.d, nd: nc.nd, ptres: nc.ptres || '232039', pi: nc.pi !== undefined ? nc.pi : 'K4CAIFGPRCA',
          ug: nc.ug || '160089', fin: nc.fin, meta: nc.meta ? metaId[nc.meta] : null, v: nc.v,
          ro: nc.ro || null, c: nc.c, pdrItem, compl: nc.compl ? ncId[nc.compl] : null, A
        }
      )
      ncId[nc.n] = r.id
    }

    const licId = {}
    for (const l of LICITS) {
      const r = await t.one(
        `INSERT INTO orcamento.licitacao (ano, tipo_id, objeto, fase_atual, valor_total_estimado, valor_final_homologado, om_gestora, usuario_cadastramento_uuid)
         VALUES (2026, $1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [l.tipo, l.objeto, l.fase, l.est, l.hom, l.om, A]
      )
      licId[l.objeto] = r.id
    }

    const neId = {}
    for (const ne of NES) {
      const r = await t.one(
        `INSERT INTO orcamento.nota_empenho (numero, ano, data_empenho, nota_credito_id, cod_nd, cod_pi, licitacao_id, finalidade, valor_empenhado, valor_anulado, usuario_cadastramento_uuid)
         VALUES ($1, 2026, $2, $3, $4, 'K4CAIFGPRCA', $5, $6, $7, $8, $9) RETURNING id`,
        [ne.n, ne.d, ncId[ne.nc], ne.nd, ne.lic ? licId[ne.lic] : null, ne.fin, ne.emp, ne.anu, A]
      )
      neId[ne.n] = r.id
    }

    for (const lq of LIQS) {
      await t.none(
        'INSERT INTO orcamento.liquidacao (nota_empenho_id, valor_liquidado, data, documento_ns, usuario_cadastramento_uuid) VALUES ($1, $2, $3, $4, $5)',
        [neId[lq.ne], lq.v, lq.d, lq.ns, A]
      )
    }

    for (const rm of RECEB) {
      await t.none(
        'INSERT INTO orcamento.recebimento_material (nota_empenho_id, material, prazo_entrega, situacao, usuario_cadastramento_uuid) VALUES ($1, $2, $3, $4, $5)',
        [neId[rm.ne], rm.mat, rm.prazo, rm.sit, A]
      )
    }

    for (const r of RPNPS) {
      await t.none(
        'INSERT INTO orcamento.rpnp (ano, empenho_label, finalidade, valor_empenhado, valor_a_liquidar, usuario_cadastramento_uuid) VALUES (2026, $1, $2, $3, $4, $5)',
        [r.label, r.fin, r.emp, r.aliq, A]
      )
    }

    // edicao mensal do RPCMTec (maio/2026)
    await t.none(
      'INSERT INTO orcamento.relatorio_rpcmtec (ano, mes, assinante, data_assinatura, usuario_cadastramento_uuid) VALUES (2026, 5, $1, $2, $3)',
      ['FELIPE DE CARVALHO DINIZ, Major, Chefe da DGEO', '2026-06-02', A]
    )
  })

  await db.$pool.end()
  await pgp.end()
  // eslint-disable-next-line no-console
  console.log(`Banco ${DB_NAME} criado e populado (ano 2026): configuracao, ${METAS.length} metas, PDR (7 itens), ${DFDS.length} DFDs, ${NCS.length} NCs, ${NES.length} NEs, ${LIQS.length} liquidacoes, ${LICITS.length} licitacoes, ${RPNPS.length} RPNP. Login: ${ADMIN.login}`)
}

main().catch(e => {
  // eslint-disable-next-line no-console
  console.error('Falha no seed:', e.message || e)
  process.exit(1)
})
