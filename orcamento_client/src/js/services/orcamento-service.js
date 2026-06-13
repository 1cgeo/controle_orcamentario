import { apiGet, apiPost, apiPut, apiDelete, apiDownload } from './api-client.js';

/**
 * Camada de servico do SCO: uma funcao por endpoint do backend.
 * Todas devolvem o payload `dados` (o api-client ja desembrulha o envelope).
 */

function qs(params = {}) {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') search.append(k, v);
  }
  const s = search.toString();
  return s ? `?${s}` : '';
}

// ---- Dominios (selects; GET sem autenticacao) ----
export const getNaturezaDespesa = () => apiGet('/dominio/natureza_despesa');
export const getPlanoInterno = () => apiGet('/dominio/plano_interno');
export const getUg = () => apiGet('/dominio/ug');
export const getTipoLicitacao = () => apiGet('/dominio/tipo_licitacao');
export const getClassificacaoNc = () => apiGet('/dominio/classificacao_nc');
export const getTipoItemDfd = () => apiGet('/dominio/tipo_item_dfd');
export const getGrauPrioridade = () => apiGet('/dominio/grau_prioridade');
export const getTipoPostoGrad = () => apiGet('/dominio/tipo_posto_grad');

// ---- Dominios editaveis (CRUD admin, geridos pela Configuracao) ----
export const createNaturezaDespesa = (body) => apiPost('/dominio/natureza_despesa', body);
export const updateNaturezaDespesa = (code, body) => apiPut(`/dominio/natureza_despesa/${encodeURIComponent(code)}`, body);
export const deleteNaturezaDespesa = (code) => apiDelete(`/dominio/natureza_despesa/${encodeURIComponent(code)}`);

export const createPlanoInterno = (body) => apiPost('/dominio/plano_interno', body);
export const updatePlanoInterno = (code, body) => apiPut(`/dominio/plano_interno/${encodeURIComponent(code)}`, body);
export const deletePlanoInterno = (code) => apiDelete(`/dominio/plano_interno/${encodeURIComponent(code)}`);

export const createUg = (body) => apiPost('/dominio/ug', body);
export const updateUg = (code, body) => apiPut(`/dominio/ug/${encodeURIComponent(code)}`, body);
export const deleteUg = (code) => apiDelete(`/dominio/ug/${encodeURIComponent(code)}`);

// ---- Configuracao geral e anos ----
export const getConfig = () => apiGet('/configuracao');
export const updateConfig = (body) => apiPut('/configuracao', body);
export const getAnos = () => apiGet('/configuracao/anos');

// ---- Meta do PIT ----
export const getMetas = (ano) => apiGet(`/metas${qs({ ano })}`);
export const getMeta = (id) => apiGet(`/metas/${id}`);
export const createMeta = (body) => apiPost('/metas', body);
export const updateMeta = (id, body) => apiPut(`/metas/${id}`, body);
export const deleteMeta = (id) => apiDelete(`/metas/${id}`);

// ---- DFD (o "PCA do ano" e o conjunto de DFDs do ano) ----
export const getDfds = (ano) => apiGet(`/dfd${qs({ ano })}`);
export const getDfd = (id) => apiGet(`/dfd/${id}`);
export const createDfd = (body) => apiPost('/dfd', body);
export const updateDfd = (id, body) => apiPut(`/dfd/${id}`, body);
export const deleteDfd = (id) => apiDelete(`/dfd/${id}`);

// ---- PDR (itens; o PDR e o conjunto dos itens do ano) ----
export const getPdrItens = (ano) => apiGet(`/pdr${qs({ ano })}`);
export const getPdrItem = (id) => apiGet(`/pdr/${id}`);
export const createPdrItem = (body) => apiPost('/pdr', body);
export const updatePdrItem = (id, body) => apiPut(`/pdr/${id}`, body);
export const deletePdrItem = (id) => apiDelete(`/pdr/${id}`);

// ---- Nota de Credito ----
export const getNotasCredito = (params = {}) => apiGet(`/notas_credito${qs(params)}`);
export const getNotaCredito = (id) => apiGet(`/notas_credito/${id}`);
export const createNotaCredito = (body) => apiPost('/notas_credito', body);
export const updateNotaCredito = (id, body) => apiPut(`/notas_credito/${id}`, body);
export const deleteNotaCredito = (id) => apiDelete(`/notas_credito/${id}`);

// ---- Nota de Empenho ----
export const getNotasEmpenho = (params = {}) => apiGet(`/notas_empenho${qs(params)}`);
export const getNotaEmpenho = (id) => apiGet(`/notas_empenho/${id}`);
export const createNotaEmpenho = (body) => apiPost('/notas_empenho', body);
export const updateNotaEmpenho = (id, body) => apiPut(`/notas_empenho/${id}`, body);
export const deleteNotaEmpenho = (id) => apiDelete(`/notas_empenho/${id}`);

// ---- Liquidacao ----
export const getLiquidacoes = (notaEmpenhoId) => apiGet(`/liquidacoes${qs({ nota_empenho_id: notaEmpenhoId })}`);
export const createLiquidacao = (body) => apiPost('/liquidacoes', body);
export const updateLiquidacao = (id, body) => apiPut(`/liquidacoes/${id}`, body);
export const deleteLiquidacao = (id) => apiDelete(`/liquidacoes/${id}`);

// ---- Recebimento de material ----
export const getRecebimentos = (notaEmpenhoId) => apiGet(`/recebimentos${qs({ nota_empenho_id: notaEmpenhoId })}`);
export const createRecebimento = (body) => apiPost('/recebimentos', body);
export const updateRecebimento = (id, body) => apiPut(`/recebimentos/${id}`, body);
export const deleteRecebimento = (id) => apiDelete(`/recebimentos/${id}`);

// ---- Licitacao ----
export const getLicitacoes = (params = {}) => apiGet(`/licitacoes${qs(params)}`);
export const getLicitacao = (id) => apiGet(`/licitacoes/${id}`);
export const createLicitacao = (body) => apiPost('/licitacoes', body);
export const updateLicitacao = (id, body) => apiPut(`/licitacoes/${id}`, body);
export const deleteLicitacao = (id) => apiDelete(`/licitacoes/${id}`);

// ---- RPNP ----
export const getRpnps = (ano) => apiGet(`/rpnp${qs({ ano })}`);
export const getRpnp = (id) => apiGet(`/rpnp/${id}`);
export const createRpnp = (body) => apiPost('/rpnp', body);
export const updateRpnp = (id, body) => apiPut(`/rpnp/${id}`, body);
export const deleteRpnp = (id) => apiDelete(`/rpnp/${id}`);

// ---- Relatorio (RPCMTec secao 3) ----
export const getRelatorios = () => apiGet('/relatorio');
export const getRelatorio = (id) => apiGet(`/relatorio/${id}`);
export const createRelatorio = (body) => apiPost('/relatorio', body);
export const updateRelatorio = (id, body) => apiPut(`/relatorio/${id}`, body);
export const deleteRelatorio = (id) => apiDelete(`/relatorio/${id}`);
export const getSecao3 = (params = {}) => apiGet(`/relatorio/secao3${qs(params)}`);
export const downloadSecao3Docx = (params = {}) => apiDownload(`/relatorio/secao3/docx${qs(params)}`, `RPCMTec-secao3-${params.ano || ''}-${params.mes || ''}.docx`);

// ---- Usuarios ----
export const getUsuarios = () => apiGet('/usuarios');
export const getUsuariosAuthServer = () => apiGet('/usuarios/servico_autenticacao');
export const importarUsuarios = (uuids) => apiPost('/usuarios', { usuarios: uuids });
export const atualizarUsuario = (uuid, body) => apiPut(`/usuarios/${uuid}`, body);
export const sincronizarUsuarios = () => apiPut('/usuarios/sincronizar', {});
