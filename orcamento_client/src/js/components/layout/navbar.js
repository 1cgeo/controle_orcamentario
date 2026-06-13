import { el, svgIcon, ICONS } from '@utils/dom.js';
import { toggleTheme, getTheme } from '@utils/theme.js';
import { getUsername, logout } from '@store/auth-store.js';
import { clearCache } from '@services/cache.js';
import { getAnos } from '@services/orcamento-service.js';
import { getAno, setAno, onAnoChange } from '@store/year-store.js';
import { openModal } from '@components/modal/modal-base.js';
import { createNumberField } from '@components/form-fields/form-fields.js';

// Valor sentinela da opcao "adicionar ano" no seletor.
const ADD_ANO = '__add__';

/**
 * Create the top navbar (hamburger, title, year selector, theme toggle, username, logout).
 * @param {Object} options
 * @param {Function} options.onToggleSidebar
 * @returns {HTMLElement} - element with ._cleanup()
 */
export function createNavbar({ onToggleSidebar }) {
  let dropdownOpen = false;
  const username = getUsername();
  const initial = username ? username.charAt(0).toUpperCase() : '?';

  // Hamburger toggle
  const toggleBtn = el('button', {
    className: 'navbar__toggle',
    'aria-label': 'Alternar menu lateral',
    onClick: () => onToggleSidebar(),
  }, [el('span', { className: 'navbar__toggle-icon' })]);

  // Title
  const title = el('span', {
    className: 'navbar__title',
    textContent: 'Controle Orçamentário',
  });

  // Seletor de ano (contexto global de todas as telas). Lista os anos com dado
  // e o ano de contexto atual; "+ Outro ano…" permite passar a cadastrar num ano
  // ainda sem nenhum lancamento.
  let anosCache = [getAno()];

  const yearSelect = el('select', {
    className: 'navbar__year',
    'aria-label': 'Ano de referência',
    title: 'Ano de referência (define o ano em que você cadastra)',
    onChange: (e) => {
      if (e.target.value === ADD_ANO) {
        e.target.value = String(getAno()); // desfaz a selecao do item especial
        abrirAdicionarAno();
        return;
      }
      setAno(e.target.value);
    },
  });

  function renderYearOptions(anos) {
    if (anos) anosCache = anos;
    const atual = getAno();
    const set = new Set((anosCache || []).map(Number));
    set.add(atual);
    const lista = [...set].sort((a, b) => b - a);
    yearSelect.innerHTML = '';
    for (const a of lista) {
      yearSelect.appendChild(el('option', { value: String(a), textContent: String(a) }));
    }
    yearSelect.appendChild(el('option', { value: ADD_ANO, textContent: '+ Outro ano…' }));
    yearSelect.value = String(atual);
  }

  // Abre um dialog para escolher um ano novo e passar a cadastrar nele.
  function abrirAdicionarAno() {
    const anoField = createNumberField({
      label: 'Ano',
      min: 2000,
      max: 2100,
      value: getAno() + 1,
      helpText: 'Passa a cadastrar e exibir os dados deste ano.',
    });
    openModal({
      title: 'Trabalhar em outro ano',
      content: el('div', { className: 'form-grid' }, [anoField.element]),
      width: '420px',
      actions: [
        { label: 'Cancelar', variant: 'text', onClick: ({ close }) => close() },
        {
          label: 'Usar este ano',
          variant: 'primary',
          onClick: ({ close }) => {
            const ano = anoField.getValue();
            if (ano === null || ano < 2000 || ano > 2100) {
              anoField.setError('Informe um ano entre 2000 e 2100');
              return;
            }
            setAno(ano);
            close();
          },
        },
      ],
    });
  }

  renderYearOptions([getAno()]);
  getAnos().then(renderYearOptions).catch(() => {});
  // Ao trocar o ano de contexto, re-renderiza (inclui o ano recem-escolhido).
  const offAno = onAnoChange(() => renderYearOptions());

  // Theme toggle
  const themeBtn = el('button', {
    className: 'navbar__theme-toggle',
    'aria-label': 'Alternar tema',
    onClick: () => {
      const newTheme = toggleTheme();
      themeBtn.innerHTML = '';
      themeBtn.appendChild(svgIcon(newTheme === 'dark' ? ICONS.lightMode : ICONS.darkMode, 20));
    },
  }, [svgIcon(getTheme() === 'dark' ? ICONS.lightMode : ICONS.darkMode, 20)]);

  // User dropdown
  const dropdown = el('div', { className: 'navbar__dropdown hidden' }, [
    el('button', {
      className: 'navbar__dropdown-item navbar__dropdown-item--danger',
      textContent: 'Sair',
      onClick: () => {
        clearCache();
        logout();
      },
    }),
  ]);

  const avatar = el('div', { className: 'navbar__avatar', textContent: initial });
  const usernameEl = el('span', { className: 'navbar__username', textContent: username });

  const userBtn = el('div', {
    className: 'navbar__user',
    onClick: (e) => {
      e.stopPropagation();
      dropdownOpen = !dropdownOpen;
      dropdown.classList.toggle('hidden', !dropdownOpen);
    },
  }, [usernameEl, avatar, dropdown]);

  // Close dropdown on outside click
  const closeDropdown = (e) => {
    if (dropdownOpen && !userBtn.contains(e.target)) {
      dropdownOpen = false;
      dropdown.classList.add('hidden');
    }
  };
  document.addEventListener('click', closeDropdown);

  const navbar = el('nav', { className: 'navbar' }, [
    el('div', { className: 'navbar__left' }, [toggleBtn, title]),
    el('div', { className: 'navbar__right' }, [yearSelect, themeBtn, userBtn]),
  ]);

  navbar._cleanup = () => {
    document.removeEventListener('click', closeDropdown);
    offAno();
  };

  return navbar;
}
