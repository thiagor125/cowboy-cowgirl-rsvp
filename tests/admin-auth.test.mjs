import assert from 'node:assert/strict';
import test from 'node:test';
import { ADMIN_ACCOUNT, isAdminLogin, isAuthorizedAdmin, adminAuthErrorMessage } from '../lib/admin-auth.ts';

test('permite o login do convite sem depender de maiúsculas ou espaços', () => {
  assert.equal(isAdminLogin(' LUCCA '), true);
});

test('recusa usuários diferentes e não usa o e-mail pessoal como login', () => {
  for (const login of ['', 'outro-cliente', 'thiagor402@gmail.com', 'lucca.example']) {
    assert.equal(isAdminLogin(login), false);
  }
  assert.equal(ADMIN_ACCOUNT.email.includes('thiagor402'), false);
});

test('exige o UID exato da conta provisionada mesmo que outra conta tenha o mesmo e-mail', () => {
  assert.equal(isAuthorizedAdmin({ uid: 'conta-lucca' }, 'conta-lucca'), true);
  assert.equal(isAuthorizedAdmin({ uid: 'outro-cliente' }, 'conta-lucca'), false);
  assert.equal(isAuthorizedAdmin(null, 'conta-lucca'), false);
});

test('recusa acesso quando o administrador ainda não foi configurado', () => {
  assert.equal(isAuthorizedAdmin({ uid: '' }, ''), false);
  assert.equal(isAuthorizedAdmin({ uid: 'qualquer-conta' }, ''), false);
});

test('não revela se a conta existe quando as credenciais estão erradas', () => {
  const expected = adminAuthErrorMessage('auth/invalid-credential');
  for (const code of ['auth/user-not-found', 'auth/wrong-password', 'auth/user-disabled']) {
    assert.equal(adminAuthErrorMessage(code), expected);
  }
});

test('orienta sobre indisponibilidade e excesso de tentativas', () => {
  assert.match(adminAuthErrorMessage('auth/too-many-requests'), /tentativas/);
  assert.match(adminAuthErrorMessage('auth/network-request-failed'), /conexão/);
  assert.match(adminAuthErrorMessage('auth/operation-not-allowed'), /habilitado/);
});
