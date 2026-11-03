import assert from 'node:assert/strict';
import test from 'node:test';
import { isAdminEmail, adminAuthErrorMessage } from '../lib/admin-auth.ts';

test('permite os e-mails da família sem depender de maiúsculas ou espaços', () => {
  assert.equal(isAdminEmail(' THIAGOR402@gmail.com '), true);
  assert.equal(isAdminEmail('amandarincon2002@gmail.com'), true);
});

test('recusa e-mails externos e valores ausentes', () => {
  for (const email of [null, undefined, '', 'outra-pessoa@gmail.com', 'thiagor402@gmail.com.evil.test']) {
    assert.equal(isAdminEmail(email), false);
  }
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
