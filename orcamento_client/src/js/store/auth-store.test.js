import { describe, test, expect } from 'vitest';
import {
  saveAuth, getToken, getUsername, getUserUuid,
  isAuthenticated, isAdmin, clearAuth
} from './auth-store.js';

describe('auth-store', () => {
  test('saveAuth guarda token, papel e sessao valida', () => {
    saveAuth({ token: 'jwt-abc', administrador: true, uuid: 'u-1' }, 'fulano');
    expect(getToken()).toBe('jwt-abc');
    expect(getUsername()).toBe('fulano');
    expect(getUserUuid()).toBe('u-1');
    expect(isAuthenticated()).toBe(true);
    expect(isAdmin()).toBe(true);
  });

  test('usuario comum nao e admin', () => {
    saveAuth({ token: 'jwt-xyz', administrador: false, uuid: 'u-2' }, 'beltrano');
    expect(isAdmin()).toBe(false);
    expect(isAuthenticated()).toBe(true);
  });

  test('sessao expirada nao autentica', () => {
    saveAuth({ token: 't', administrador: true, uuid: 'u' }, 'x');
    // Forca expiracao no passado
    localStorage.setItem('@orcamento-Token-Expiry', new Date(Date.now() - 1000).toISOString());
    expect(isAuthenticated()).toBe(false);
  });

  test('clearAuth limpa tudo', () => {
    saveAuth({ token: 't', administrador: true, uuid: 'u' }, 'x');
    clearAuth();
    expect(getToken()).toBeNull();
    expect(isAuthenticated()).toBe(false);
  });

  test('usa o prefixo namespaced @orcamento-', () => {
    saveAuth({ token: 'tk', administrador: false, uuid: 'u' }, 'x');
    expect(localStorage.getItem('@orcamento-Token')).toBe('tk');
  });
});
