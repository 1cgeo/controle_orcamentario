'use strict'

// Seed de demonstracao do SCO. Cria (do zero) o banco sco_demo no PostgreSQL
// local, aplica o schema er/*.sql e popula DOIS anos: 2026 (dados reais da DGEO,
// PDR/NCs/DFDs/metas) e 2025 (conjunto menor), para exercitar a troca de ano.
// Inclui uma NC com mais de uma ND (passagem + diaria): como o par numero/ND e
// unico, a mesma NC e cadastrada uma vez por ND (escolhe-se olhando "numero - ND").
// Execucao mock (empenhos, liquidacoes, licitacoes, RPNP, recebimentos) para o
// relatorio ficar completo.
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
  nome: 'Chefe da Divisão de Geoinformação',
  nome_guerra: 'Chefe DGEO',
  tipo_posto_grad_id: 14 // Major
}

const pgp = pgPromise()
const er = f => fs.readFileSync(path.join(__dirname, '..', 'er', f), 'utf8')

// ND -> item_label do PDR (para ligar a NC ao pdr_item quando e PDR/3.2)
const ND_LABEL = { 339015: '1D', 339033: '1E', 339039: '1F', 339030: '1G', 339139: '1H', 449040: '1Isoft', 449052: '1Iequip' }

// ---------------------------------------------------------------------------
// Dados de 2026 (reais)
// ---------------------------------------------------------------------------
const DS2026 = {
  metas: [
    { numero: 1, item: '1', descricao: 'Produção de Geoinformação (COTER/DECEx)' },
    { numero: 2, item: '2', descricao: 'Acordos Internacionais (MGCP, Bloco W058N06)' },
    { numero: 3, item: '3', descricao: 'EBGeo (Arandu 2026 e Estádio Beira-Rio)' },
    { numero: 4, item: '4', descricao: 'Impressão de produtos' },
    { numero: 5, item: '5', descricao: 'Capacitação em Geoinformação' },
    { numero: 6, item: '6', descricao: 'Programa Memória do Serviço Geográfico' },
    { numero: 7, item: '7', descricao: 'Gestão de TI (GTISG/DSG)' }
  ],
  pdrItens: [
    { label: '1D', nd: '339015', meta: 1, gnd: 3, sol: 94830, aut: 94830, desc: 'Produção de Geoinformação (diárias)' },
    { label: '1E', nd: '339033', meta: 1, gnd: 3, sol: 0, aut: 0, desc: 'Produção de Geoinformação (passagens)' },
    { label: '1F', nd: '339039', meta: 1, gnd: 3, sol: 50000, aut: 50000, desc: 'Serviços de terceiros (frota, ART, manutenção)' },
    { label: '1G', nd: '339030', meta: 4, gnd: 3, sol: 114000, aut: 114000, desc: 'Materiais de consumo e insumos de impressão' },
    { label: '1H', nd: '339139', meta: null, gnd: 3, sol: 2200, aut: 2000, desc: 'Publicações oficiais' },
    { label: '1Isoft', nd: '449040', meta: 3, gnd: 4, sol: 183670, aut: 169000, desc: 'Softwares técnicos (DJI Terra, Metashape)' },
    { label: '1Iequip', nd: '449052', meta: null, gnd: 4, sol: 224500, aut: 139300, desc: 'Equipamentos diversos, técnicos e de TIC' }
  ],
  dfds: [
    { numero: '000001', rotulo: 'Impressão', objeto: 'Insumos de impressão (cartuchos e papéis)', valor: 152000, prioridade: 2, consta: true, item: { tipo: 1, desc: 'Cartuchos e papéis para plotter', qtd: 1, vu: 152000, vt: 152000 } },
    { numero: '000002', rotulo: 'TIC', objeto: 'Equipamentos de TIC (storage, desktops, switches)', valor: 187800, prioridade: 1, consta: true, item: { tipo: 1, desc: 'Storage NAS, desktops e switches', qtd: 1, vu: 187800, vt: 187800 } },
    { numero: '000003', rotulo: 'Campo', objeto: 'Apoio a operações de campo (Prime)', valor: 200000, prioridade: 1, consta: true, item: { tipo: 2, desc: 'Serviço de apoio a campo', qtd: 1, vu: 200000, vt: 200000 } },
    { numero: '000004', rotulo: 'Drone', objeto: 'Drone DJI Matrice 350 RTK', valor: 175000, prioridade: 1, consta: true, item: { tipo: 1, desc: 'Drone DJI Matrice 350 RTK', qtd: 1, vu: 175000, vt: 175000 } },
    { numero: '000005', rotulo: 'Material', objeto: 'Materiais diversos', valor: 64800, prioridade: 2, consta: true, item: { tipo: 1, desc: 'Materiais diversos de consumo', qtd: 1, vu: 64800, vt: 64800 } },
    { numero: '000006', rotulo: 'Capacitação', objeto: 'Capacitação / MBA', valor: 19000, prioridade: 3, consta: true, item: { tipo: 2, desc: 'Curso MBA', qtd: 1, vu: 19000, vt: 19000 } },
    { numero: '000007', rotulo: 'Correios', objeto: 'Serviço de correios', valor: 7000, prioridade: 2, consta: true, item: { tipo: 2, desc: 'Transporte de produtos (correios)', qtd: 1, vu: 7000, vt: 7000 } },
    { numero: '000135', rotulo: 'IA', objeto: 'Licenças de IA (Claude IA Pro)', valor: 15000, prioridade: 1, consta: false, item: { tipo: 2, desc: 'Licença de IA generativa', qtd: 1, vu: 15000, vt: 15000 } }
  ],
  // classificacao: 1 = PDR (3.2), 2 = Extra-PDR (3.7)
  ncs: [
    // --- PDR (3.2) ---
    { n: '2026NC400134', d: '2026-02-03', nd: '339015', meta: 1, v: 20710.00, c: 1, fin: 'Diárias, produção de geoinformação, campo Santiago/RS. Meta 1, PIT 2026.' },
    { n: '2026NC400135', d: '2026-02-03', nd: '339039', meta: 1, v: 864.00, c: 1, fin: 'Gestão de frota, manutenção de viaturas, Santiago/RS.' },
    { n: '2026NC400136', d: '2026-02-03', nd: '339039', meta: 1, v: 1800.00, c: 1, fin: 'Gestão de frota, combustível, Santiago/RS.' },
    { n: '2026NC400137', d: '2026-02-03', nd: '339030', meta: 1, v: 1728.00, c: 1, fin: 'Gestão de frota, peças de viatura, Santiago/RS.' },
    { n: '2026NC400412', d: '2026-03-03', nd: '339039', meta: 4, v: 2000.00, c: 1, fin: 'Serviço de transporte (correios) de produtos de geoinformação.' },
    { n: '2026NC400695', d: '2026-04-13', nd: '339015', meta: 1, v: 16350.00, c: 1, fin: 'Diárias, campo Faxinal do Soturno/RS e CIBSB/RS.', ro: '2026RO000696' },
    { n: '2026NC400698', d: '2026-04-13', nd: '339030', meta: 1, v: 3456.00, c: 1, fin: 'Gestão de frota, peças de viatura, missão de produção.', ro: '2026RO000699' },
    { n: '2026NC400702', d: '2026-04-13', nd: '339039', meta: 1, v: 1728.00, c: 1, fin: 'Gestão de frota, manutenção de viaturas, missão de produção.', ro: '2026RO000703' },
    { n: '2026NC400703', d: '2026-04-13', nd: '339039', meta: 1, v: 3600.00, c: 1, fin: 'Gestão de frota, combustível, missão de produção.', ro: '2026RO000704' },
    { n: '2026NC400706', d: '2026-04-13', nd: '449040', meta: 1, v: 128434.00, c: 1, fin: 'Licença de software (DJI Terra e DJI Modify).', ro: '2026RO000707' },
    { n: '2026NC400940', d: '2026-04-30', nd: '449052', meta: null, v: 6349.10, c: 1, fin: 'Ar-condicionado, 2 un. de 18 mil BTU, sala de servidores.', ro: '2026RO000939' },
    { n: '2026NC401248', d: '2026-05-26', nd: '449052', meta: null, v: 6349.10, c: 1, fin: 'Ar-condicionado, 1 un. de 30 mil BTU (empenho 5.392,08, 957,02 a devolver).', ro: '2026RO001240' },
    { n: '2026NC401276', d: '2026-05-26', nd: '339039', meta: 1, v: 1050.00, c: 1, fin: 'Serviço de manutenção preventiva de drones.', ro: '2026RO001267' },
    { n: '2026NC401277', d: '2026-05-26', nd: '339039', meta: 4, v: 3000.00, c: 1, fin: 'Correios, transporte de produtos analógicos.', ro: '2026RO001268' },
    // --- Extra-PDR (3.7) ---
    { n: '2026NC400406', d: '2026-03-03', nd: '339015', meta: null, v: 1062.50, c: 2, fin: 'Diárias, Chefia do 1 CGEO, passagem de Direção da DSG, Brasília/DF.' },
    { n: '2026NC400410', d: '2026-03-03', nd: '339033', meta: null, v: 2500.00, c: 2, fin: 'Passagens, Chefia do 1 CGEO, Direção da DSG, Brasília/DF.' },
    { n: '2026NC400418', d: '2026-03-04', nd: '339015', meta: null, v: 307.50, c: 2, fin: 'Complementação da NC400406, diárias da Chefia, Brasília/DF.', ro: '2026RO000414', compl: '2026NC400406' },
    { n: '2026NC400500', d: '2026-03-11', nd: '339015', meta: null, v: 510.00, c: 2, fin: '2a complementação da NC400406, Brasília/DF.', compl: '2026NC400406' },
    { n: '2026NC400923', d: '2026-04-30', nd: '339015', meta: null, v: 4397.50, c: 2, fin: 'Diárias, 2 militares, Reunião de Chefe DGEO, Brasília/DF.', ro: '2026RO000921' },
    { n: '2026NC400924', d: '2026-04-30', nd: '339033', meta: null, v: 5000.00, c: 2, fin: 'Passagens, 2 militares, Reunião de Chefe DGEO, Brasília/DF.', ro: '2026RO000922' },
    { n: '2026NC400930', d: '2026-04-30', nd: '339015', meta: null, v: 1370.00, c: 2, fin: 'Diárias, oficial superior, MundoGEO Connect, São Paulo/SP.', ro: '2026RO000930' },
    { n: '2026NC400937', d: '2026-04-30', nd: '339033', meta: null, v: 2000.00, c: 2, fin: 'Passagens, MundoGEO Connect, São Paulo/SP.', ro: '2026RO000932' },
    { n: '2026NC000758', d: '2026-05-28', nd: '339015', meta: null, v: 9303.00, c: 2, fin: 'Passagens e diárias, Curso de Operador SARP SISFRON (UG 160507/EME).', ro: '2026RO000758', ug: '160507', ptres: '232171', pi: null },
    // --- NC com duas NDs (passagem + diaria): mesmo numero, uma linha por ND ---
    { n: '2026NC401350', d: '2026-05-29', nd: '339015', meta: null, v: 1800.00, c: 2, fin: 'Diárias, viagem de coordenação técnica, Brasília/DF.' },
    { n: '2026NC401350', d: '2026-05-29', nd: '339033', meta: null, v: 2600.00, c: 2, fin: 'Passagens, viagem de coordenação técnica, Brasília/DF.' }
  ],
  nes: [
    { n: '2026NE000045', d: '2026-02-13', nc: '2026NC400134', emp: 20710.00, anu: 0, fin: 'Empenho de diárias, campo Santiago.' },
    { n: '2026NE000048', d: '2026-02-13', nc: '2026NC400137', emp: 1728.00, anu: 0, fin: 'Empenho de peças de viatura, Santiago.' },
    { n: '2026NE000049', d: '2026-02-13', nc: '2026NC400135', emp: 864.00, anu: 0, fin: 'Empenho de manutenção de viatura, Santiago.' },
    { n: '2026NE000050', d: '2026-02-13', nc: '2026NC400136', emp: 1800.00, anu: 0, fin: 'Empenho de combustível, Santiago.' },
    { n: '2026NE000110', d: '2026-04-24', nc: '2026NC400706', emp: 128434.00, anu: 0, fin: 'Empenho de licença DJI Terra e Modify.' },
    { n: '2026NE000120', d: '2026-04-24', nc: '2026NC400695', emp: 16350.00, anu: 0, fin: 'Empenho de diárias, campo Faxinal do Soturno.' },
    { n: '2026NE000140', d: '2026-05-02', nc: '2026NC400940', emp: 6349.10, anu: 0, fin: 'Empenho de ar-condicionado 18 mil BTU.' },
    { n: '2026NE000155', d: '2026-05-28', nc: '2026NC401248', emp: 6349.10, anu: 957.02, fin: 'Empenho de ar-condicionado 30 mil BTU (devolução de 957,02).' }
  ],
  liqs: [
    { ne: '2026NE000045', v: 20710.00, d: '2026-03-10', ns: '2026NS000210' },
    { ne: '2026NE000048', v: 1728.00, d: '2026-03-15', ns: '2026NS000231' },
    { ne: '2026NE000110', v: 128434.00, d: '2026-05-20', ns: '2026NS000520' },
    { ne: '2026NE000120', v: 16350.00, d: '2026-05-25', ns: '2026NS000540' },
    { ne: '2026NE000140', v: 6349.10, d: '2026-05-30', ns: '2026NS000560' }
  ],
  // OM gestora so se aplica a Participante (tipo 3); em GCALC DSG/Própria e a propria OM (null).
  licits: [
    { tipo: 1, objeto: 'Drone DJI Matrice 350 RTK (adesão a ata SRP)', fase: 'Aguardando adesão a ata', est: 175000, hom: null, om: null },
    { tipo: 1, objeto: 'Storage NAS para a DGEO', fase: 'Em processo de adesão', est: 81000, hom: null, om: null },
    { tipo: 2, objeto: 'Software DJI Terra e Metashape', fase: 'Homologado', est: 183670, hom: 169000, om: null },
    { tipo: 2, objeto: 'Insumos de impressão (cartuchos e papéis)', fase: 'Documentação na SALC', est: 80000, hom: null, om: null },
    { tipo: 3, objeto: 'Imagens de satélite (pregão conduzido pela DSG)', fase: 'Em andamento na DSG', est: 120000, hom: null, om: 'DSG' }
  ],
  receb: [
    { ne: '2026NE000110', mat: 'Licença DJI Terra + DJI Modify', prazo: 'Imediato', sit: 'Licença ativada' },
    { ne: '2026NE000140', mat: '2 splits de 18.000 BTU', prazo: '30 dias', sit: 'Material recebido' },
    { ne: '2026NE000155', mat: '1 split de 30.000 BTU', prazo: 'Previsão 19JUN26', sit: 'Empenho emitido, aguardando entrega' }
  ],
  rpnps: [
    { label: '2024NE000113 (imagens)', fin: 'Imagens de satélite (GCALC DSG)', emp: 100000.00, aliq: 100000.00 },
    { label: '2025NE000228 (frota)', fin: 'Saldo de frota do exercício 2025', emp: 65996.85, aliq: 65996.85 }
  ]
}

// ---------------------------------------------------------------------------
// Dados de 2025 (conjunto menor, para exercitar a troca de ano)
// ---------------------------------------------------------------------------
const DS2025 = {
  metas: [
    { numero: 1, item: '1', descricao: 'Produção de Geoinformação (COTER/DECEx)' },
    { numero: 2, item: '2', descricao: 'Impressão de produtos' },
    { numero: 3, item: '3', descricao: 'Gestão de TI' }
  ],
  pdrItens: [
    { label: '1D', nd: '339015', meta: 1, gnd: 3, sol: 80000, aut: 80000, desc: 'Produção de Geoinformação (diárias)' },
    { label: '1F', nd: '339039', meta: 1, gnd: 3, sol: 40000, aut: 40000, desc: 'Serviços de terceiros (frota)' },
    { label: '1G', nd: '339030', meta: 2, gnd: 3, sol: 90000, aut: 90000, desc: 'Materiais de consumo e impressão' },
    { label: '1Iequip', nd: '449052', meta: 3, gnd: 4, sol: 120000, aut: 110000, desc: 'Equipamentos de TIC' }
  ],
  dfds: [
    { numero: '000001', rotulo: 'Impressão', objeto: 'Insumos de impressão 2025', valor: 90000, prioridade: 2, consta: true, item: { tipo: 1, desc: 'Cartuchos e papéis', qtd: 1, vu: 90000, vt: 90000 } },
    { numero: '000002', rotulo: 'TIC', objeto: 'Equipamentos de TIC 2025', valor: 120000, prioridade: 1, consta: true, item: { tipo: 1, desc: 'Desktops e switches', qtd: 1, vu: 120000, vt: 120000 } }
  ],
  ncs: [
    { n: '2025NC400100', d: '2025-02-10', nd: '339015', meta: 1, v: 18000.00, c: 1, fin: 'Diárias, produção de geoinformação, campo 2025.' },
    { n: '2025NC400150', d: '2025-03-12', nd: '339039', meta: 1, v: 5000.00, c: 1, fin: 'Gestão de frota, manutenção de viaturas, 2025.' },
    { n: '2025NC400300', d: '2025-04-20', nd: '339030', meta: 2, v: 60000.00, c: 1, fin: 'Materiais de impressão, 2025.' },
    { n: '2025NC400800', d: '2025-08-05', nd: '449052', meta: 3, v: 95000.00, c: 1, fin: 'Equipamentos de TIC, 2025.' },
    { n: '2025NC400410', d: '2025-05-02', nd: '339015', meta: null, v: 3000.00, c: 2, fin: 'Diárias, reunião em Brasília/DF, 2025.' }
  ],
  nes: [
    { n: '2025NE000050', d: '2025-02-20', nc: '2025NC400100', emp: 18000.00, anu: 0, fin: 'Empenho de diárias 2025.' },
    { n: '2025NE000120', d: '2025-04-25', nc: '2025NC400300', emp: 60000.00, anu: 0, fin: 'Empenho de materiais de impressão 2025.' },
    { n: '2025NE000200', d: '2025-08-15', nc: '2025NC400800', emp: 95000.00, anu: 0, fin: 'Empenho de equipamentos de TIC 2025.' }
  ],
  liqs: [
    { ne: '2025NE000050', v: 18000.00, d: '2025-03-10', ns: '2025NS000050' },
    { ne: '2025NE000120', v: 60000.00, d: '2025-05-20', ns: '2025NS000120' }
  ],
  licits: [
    { tipo: 2, objeto: 'Equipamentos de TIC 2025', fase: 'Homologado', est: 120000, hom: 110000, om: null },
    { tipo: 1, objeto: 'Imagens de satélite (GCALC DSG) 2025', fase: 'Concluído', est: 100000, hom: 100000, om: null }
  ],
  receb: [
    { ne: '2025NE000200', mat: 'Desktops e switches', prazo: '30 dias', sit: 'Material recebido' }
  ],
  rpnps: [
    { label: '2024NE000113 (imagens)', fin: 'Imagens de satélite (GCALC DSG)', emp: 50000.00, aliq: 50000.00 }
  ]
}

// Insere todos os dados de um ano. A NC pode repetir numero (uma linha por ND);
// o pdr_item e ligado pela ND quando a NC e PDR (classificacao 1).
async function seedAno (t, ano, ds, A) {
  const metaId = {}
  for (const m of ds.metas) {
    const r = await t.one(
      'INSERT INTO orcamento.meta_pit (ano, numero_meta, item, descricao, usuario_cadastramento_uuid) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [ano, m.numero, m.item, m.descricao, A]
    )
    metaId[m.numero] = r.id
  }

  const pdrItemId = {}
  for (const it of ds.pdrItens) {
    const r = await t.one(
      `INSERT INTO orcamento.pdr_item (ano, cod_nd, meta_pit_id, item_label, descricao, gnd, valor_solicitado, valor_autorizado, usuario_cadastramento_uuid)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [ano, it.nd, it.meta ? metaId[it.meta] : null, it.label, it.desc, it.gnd, it.sol, it.aut, A]
    )
    pdrItemId[it.label] = r.id
  }

  for (const d of ds.dfds) {
    const dfd = await t.one(
      `INSERT INTO orcamento.dfd (numero, ano, rotulo, objeto, grau_prioridade_id, consta_pca, valor_estimado, usuario_cadastramento_uuid)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [d.numero, ano, d.rotulo, d.objeto, d.prioridade, d.consta, d.valor, A]
    )
    await t.none(
      `INSERT INTO orcamento.dfd_item (dfd_id, tipo_item_id, descricao, quantidade, valor_unitario, valor_total, usuario_cadastramento_uuid)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [dfd.id, d.item.tipo, d.item.desc, d.item.qtd, d.item.vu, d.item.vt, A]
    )
  }

  const ncId = {}
  for (const nc of ds.ncs) {
    const pdrItem = nc.c === 1 ? pdrItemId[ND_LABEL[nc.nd]] : null
    const r = await t.one(
      `INSERT INTO orcamento.nota_credito
         (numero, ano, data_emissao, cod_nd, ptres, fonte, cod_pi, ug_emitente, finalidade_historico,
          meta_pit_id, valor_nc, doc_ro, classificacao_id, pdr_item_id, nc_complementada_id, usuario_cadastramento_uuid)
       VALUES ($<n>, $<ano>, $<d>, $<nd>, $<ptres>, '1000000000', $<pi>, $<ug>, $<fin>,
          $<meta>, $<v>, $<ro>, $<c>, $<pdrItem>, $<compl>, $<A>) RETURNING id`,
      {
        n: nc.n, ano, d: nc.d, nd: nc.nd, ptres: nc.ptres || '232039', pi: nc.pi !== undefined ? nc.pi : 'K4CAIFGPRCA',
        ug: nc.ug || '160089', fin: nc.fin, meta: nc.meta ? metaId[nc.meta] : null, v: nc.v,
        ro: nc.ro || null, c: nc.c, pdrItem, compl: nc.compl ? ncId[nc.compl] : null, A
      }
    )
    // chave numero+ND (o numero pode repetir entre NDs diferentes)
    ncId[`${nc.n}|${nc.nd}`] = r.id
    if (ncId[nc.n] === undefined) ncId[nc.n] = r.id
  }

  for (const l of ds.licits) {
    await t.none(
      `INSERT INTO orcamento.licitacao (ano, tipo_id, objeto, fase_atual, valor_total_estimado, valor_final_homologado, om_gestora, usuario_cadastramento_uuid)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [ano, l.tipo, l.objeto, l.fase, l.est, l.hom, l.om, A]
    )
  }

  const neId = {}
  for (const ne of ds.nes) {
    // A NE empenha contra uma NC (obrigatoria); ND, PI e GND sao herdados da NC.
    const ncRef = ne.ncNd ? ncId[`${ne.nc}|${ne.ncNd}`] : ncId[ne.nc]
    const r = await t.one(
      `INSERT INTO orcamento.nota_empenho (numero, ano, data_empenho, nota_credito_id, finalidade, valor_empenhado, valor_anulado, usuario_cadastramento_uuid)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [ne.n, ano, ne.d, ncRef, ne.fin, ne.emp, ne.anu, A]
    )
    neId[ne.n] = r.id
  }

  for (const lq of ds.liqs) {
    await t.none(
      'INSERT INTO orcamento.liquidacao (nota_empenho_id, valor_liquidado, data, documento_ns, usuario_cadastramento_uuid) VALUES ($1, $2, $3, $4, $5)',
      [neId[lq.ne], lq.v, lq.d, lq.ns, A]
    )
  }

  for (const rm of ds.receb) {
    await t.none(
      'INSERT INTO orcamento.recebimento_material (nota_empenho_id, material, prazo_entrega, situacao, usuario_cadastramento_uuid) VALUES ($1, $2, $3, $4, $5)',
      [neId[rm.ne], rm.mat, rm.prazo, rm.sit, A]
    )
  }

  for (const r of ds.rpnps) {
    await t.none(
      'INSERT INTO orcamento.rpnp (ano, empenho_label, finalidade, valor_empenhado, valor_a_liquidar, usuario_cadastramento_uuid) VALUES ($1, $2, $3, $4, $5, $6)',
      [ano, r.label, r.fin, r.emp, r.aliq, A]
    )
  }
}

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

  // 4) dados, em transacao (2025 e 2026)
  await db.tx(async t => {
    // Configuracao geral (UASG, CODOM, ano de referencia = ano atual de trabalho).
    await t.none(
      'UPDATE orcamento.configuracao SET uasg = $1, codom = $2, ano_referencia = 2026, data_modificacao = now(), usuario_modificacao_uuid = $3 WHERE id = 1',
      ['160382', '048215', A]
    )

    await seedAno(t, 2025, DS2025, A)
    await seedAno(t, 2026, DS2026, A)

    // Edicao mensal do RPCMTec por ano (assinatura do mes).
    await t.none(
      'INSERT INTO orcamento.relatorio_rpcmtec (ano, mes, assinante, data_assinatura, usuario_cadastramento_uuid) VALUES (2026, 5, $1, $2, $3)',
      ['FELIPE DE CARVALHO DINIZ, Major, Chefe da DGEO', '2026-06-02', A]
    )
    await t.none(
      'INSERT INTO orcamento.relatorio_rpcmtec (ano, mes, assinante, data_assinatura, usuario_cadastramento_uuid) VALUES (2025, 12, $1, $2, $3)',
      ['FELIPE DE CARVALHO DINIZ, Major, Chefe da DGEO', '2026-01-15', A]
    )
  })

  await db.$pool.end()
  await pgp.end()
  // eslint-disable-next-line no-console
  console.log(`Banco ${DB_NAME} criado e populado. 2026: ${DS2026.metas.length} metas, ${DS2026.pdrItens.length} itens PDR, ${DS2026.dfds.length} DFDs, ${DS2026.ncs.length} NCs (inclui 1 NC com 2 NDs), ${DS2026.nes.length} NEs, ${DS2026.licits.length} licitacoes. 2025: ${DS2025.metas.length} metas, ${DS2025.ncs.length} NCs, ${DS2025.nes.length} NEs. Login: ${ADMIN.login} / claude.`)
}

main().catch(e => {
  // eslint-disable-next-line no-console
  console.error('Falha no seed:', e.message || e)
  process.exit(1)
})
