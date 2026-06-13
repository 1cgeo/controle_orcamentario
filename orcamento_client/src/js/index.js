import '@css/style.css';
import { initTheme } from '@utils/theme.js';
import { isAuthenticated } from '@store/auth-store.js';
import Router, { adminLoader } from './router.js';
import { createMainLayout } from '@components/layout/main-layout.js';
import { renderLogin } from '@pages/login.js';
import { renderUnauthorized } from '@pages/unauthorized.js';
import { renderNotFound } from '@pages/not-found.js';
import { renderDashboard } from '@pages/dashboard/index.js';
import { renderConfiguracao } from '@pages/configuracao/index.js';
import { renderMetasList } from '@pages/metas/list.js';
import { renderDfdList } from '@pages/dfd/list.js';
import { renderPdrList } from '@pages/pdr/list.js';
import { renderNotasCreditoList } from '@pages/notas-credito/list.js';
import { renderNotasEmpenhoList } from '@pages/notas-empenho/list.js';
import { renderNotaEmpenhoDetails } from '@pages/notas-empenho/details.js';
import { renderLicitacoesList } from '@pages/licitacoes/list.js';
import { renderRpnpList } from '@pages/rpnp/list.js';
import { renderRelatorio } from '@pages/relatorio/index.js';
import { renderUsuariosList } from '@pages/usuarios/list.js';

// Inicializa o tema (claro/escuro via data-theme, persistido em orcamento-theme-mode)
initTheme();

const app = document.getElementById('app');

let mainLayout = null;

function getContentArea() {
  if (!mainLayout) {
    mainLayout = createMainLayout();
    app.innerHTML = '';
    app.appendChild(mainLayout.layout);
  }
  return mainLayout.contentArea;
}

function clearLayout() {
  if (mainLayout) {
    mainLayout.cleanup();
    mainLayout = null;
  }
  app.innerHTML = '';
}

function withLayout(renderFn) {
  return async (_container, ctx) => {
    const contentArea = getContentArea();
    contentArea.innerHTML = '';
    return await renderFn(contentArea, ctx);
  };
}

function standalone(renderFn) {
  return async (_container, ctx) => {
    clearLayout();
    return await renderFn(app, ctx);
  };
}

const router = new Router(app);

router.add('/login', standalone(renderLogin), {
  guard: () => (isAuthenticated() ? '/dashboard' : true),
});

router.add('/dashboard', withLayout(renderDashboard), { guard: adminLoader });
router.add('/configuracao', withLayout(renderConfiguracao), { guard: adminLoader });
router.add('/metas', withLayout(renderMetasList), { guard: adminLoader });
router.add('/dfd', withLayout(renderDfdList), { guard: adminLoader });
router.add('/pdr', withLayout(renderPdrList), { guard: adminLoader });
router.add('/notas_credito', withLayout(renderNotasCreditoList), { guard: adminLoader });
router.add('/notas_empenho', withLayout(renderNotasEmpenhoList), { guard: adminLoader });
router.add('/notas_empenho/:id', withLayout(renderNotaEmpenhoDetails), { guard: adminLoader });
router.add('/licitacoes', withLayout(renderLicitacoesList), { guard: adminLoader });
router.add('/rpnp', withLayout(renderRpnpList), { guard: adminLoader });
router.add('/relatorio', withLayout(renderRelatorio), { guard: adminLoader });
router.add('/usuarios', withLayout(renderUsuariosList), { guard: adminLoader });

function errorPage(renderFn) {
  return async (_container, ctx) => {
    if (isAuthenticated()) {
      const contentArea = getContentArea();
      contentArea.innerHTML = '';
      return await renderFn(contentArea, ctx);
    }
    clearLayout();
    return await renderFn(app, ctx);
  };
}

router.add('/unauthorized', errorPage(renderUnauthorized));
router.add('/404', errorPage(renderNotFound));

router.start();
