import { el, svgIcon, ICONS } from '@utils/dom.js';

/**
 * Estrutura do menu lateral do SCO: itens simples + grupos colapsaveis.
 * O id de cada item mapeia para o primeiro segmento da rota (hash).
 */
const MENU = [
  { id: 'dashboard', label: 'Dashboard', icon: ICONS.dashboard, path: '/dashboard' },
  { id: 'exercicios', label: 'Exercícios', icon: ICONS.schedule, path: '/exercicios' },
  { id: 'metas', label: 'Metas do PIT', icon: ICONS.category, path: '/metas' },
  {
    id: 'planejamento-group',
    label: 'Planejamento',
    icon: ICONS.assignment,
    children: [
      { id: 'pca', label: 'PCA', icon: ICONS.description, path: '/pca' },
      { id: 'dfd', label: 'DFD', icon: ICONS.description, path: '/dfd' },
    ],
  },
  {
    id: 'credito-group',
    label: 'Crédito',
    icon: ICONS.layers,
    children: [
      { id: 'pdr', label: 'PDR', icon: ICONS.dataUsage, path: '/pdr' },
      { id: 'notas_credito', label: 'Notas de Crédito', icon: ICONS.description, path: '/notas_credito' },
    ],
  },
  {
    id: 'execucao-group',
    label: 'Execução',
    icon: ICONS.localShipping,
    children: [
      { id: 'notas_empenho', label: 'Empenhos', icon: ICONS.assignment, path: '/notas_empenho' },
      { id: 'licitacoes', label: 'Licitações', icon: ICONS.storage, path: '/licitacoes' },
      { id: 'rpnp', label: 'RPNP', icon: ICONS.schedule, path: '/rpnp' },
    ],
  },
  { id: 'relatorio', label: 'RPCMTec', icon: ICONS.print, path: '/relatorio' },
  { id: 'usuarios', label: 'Usuários', icon: ICONS.people, path: '/usuarios' },
];

const KNOWN_IDS = [
  'dashboard', 'exercicios', 'metas', 'pca', 'dfd', 'pdr', 'notas_credito',
  'notas_empenho', 'licitacoes', 'rpnp', 'relatorio', 'usuarios',
];

/**
 * Cria o elemento da sidebar.
 * @param {Object} options
 * @param {boolean} [options.collapsed]
 */
export function createSidebar({ collapsed = false } = {}) {
  let isCollapsed = collapsed;
  let isMobileOpen = false;

  const nav = el('nav', { className: 'sidebar__nav', 'aria-label': 'Menu principal' });

  const sidebar = el('aside', {
    className: `sidebar${isCollapsed ? ' sidebar--collapsed' : ''}`,
  }, [nav]);

  const overlay = el('div', {
    className: 'sidebar-overlay',
    onClick: () => setMobileOpen(false),
  });

  const itemElements = {};
  const groupElements = [];

  function buildItem(item, isSubitem = false) {
    const icon = el('span', { className: 'sidebar__item-icon' }, [svgIcon(item.icon, isSubitem ? 20 : 24)]);
    const label = el('span', { className: 'sidebar__item-label', textContent: item.label });

    const menuItem = el('a', {
      className: `sidebar__item${isSubitem ? ' sidebar__subitem' : ''}`,
      href: `#${item.path}`,
      dataset: { id: item.id },
      onClick: () => setMobileOpen(false),
    }, [icon, label]);

    itemElements[item.id] = menuItem;
    return menuItem;
  }

  for (const item of MENU) {
    if (item.children) {
      const childIds = item.children.map(c => c.id);
      const itemsContainer = el('div', { className: 'sidebar__group-items' },
        item.children.map(child => buildItem(child, true))
      );

      const header = el('button', {
        className: 'sidebar__group-header',
        type: 'button',
        'aria-expanded': 'false',
        onClick: () => {
          const open = group.classList.toggle('sidebar__group--open');
          header.setAttribute('aria-expanded', String(open));
        },
      }, [
        el('span', { className: 'sidebar__item-icon' }, [svgIcon(item.icon, 24)]),
        el('span', { className: 'sidebar__item-label', textContent: item.label }),
        el('span', { className: 'sidebar__group-chevron' }, [svgIcon(ICONS.expandMore, 18)]),
      ]);

      const group = el('div', { className: 'sidebar__group' }, [header, itemsContainer]);
      groupElements.push({ group, header, childIds });
      nav.appendChild(group);
    } else {
      nav.appendChild(buildItem(item));
    }
  }

  function setActive(activeId) {
    for (const [id, itemEl] of Object.entries(itemElements)) {
      itemEl.classList.toggle('sidebar__item--active', id === activeId);
    }
    for (const { group, header, childIds } of groupElements) {
      const hasActiveChild = childIds.includes(activeId);
      header.classList.toggle('sidebar__group-header--active', hasActiveChild);
      if (hasActiveChild && !group.classList.contains('sidebar__group--open')) {
        group.classList.add('sidebar__group--open');
        header.setAttribute('aria-expanded', 'true');
      }
    }
  }

  function toggle() {
    isCollapsed = !isCollapsed;
    sidebar.classList.toggle('sidebar--collapsed', isCollapsed);
    return isCollapsed;
  }

  function setMobileOpen(open) {
    isMobileOpen = open;
    sidebar.classList.toggle('sidebar--mobile-open', isMobileOpen);
    overlay.classList.toggle('sidebar-overlay--visible', isMobileOpen);
  }

  function isCurrentlyCollapsed() {
    return isCollapsed;
  }

  return { sidebar, overlay, setActive, toggle, setMobileOpen, isCurrentlyCollapsed };
}

/**
 * Resolve o id do item da sidebar a partir de uma rota (ex.: '/dfd/3' -> 'dfd').
 * @param {string} path
 * @returns {string|null}
 */
export function activeIdFromPath(path) {
  const segment = String(path || '').split('?')[0].split('/').filter(Boolean)[0];
  if (!segment) return 'dashboard';
  return KNOWN_IDS.includes(segment) ? segment : null;
}
