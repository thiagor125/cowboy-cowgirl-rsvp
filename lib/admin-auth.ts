// Esta configuração identifica a conta; não contém senha nem concede acesso ao banco.
// O mesmo UID deve ser autorizado nas regras do Firestore.
export const ADMIN_ACCOUNT = {
  username: "lucca",
  email: "admin-lucca@cowboycowgirl-751c4.firebaseapp.com",
  uid: "yAatGnbjbaOTE1Zjdya90IJ6oIC3",
} as const;

export function isAdminLogin(login: string): boolean {
  return login.trim().toLowerCase() === ADMIN_ACCOUNT.username;
}

export function isAuthorizedAdmin(user: { uid: string } | null, adminUid: string): boolean {
  return adminUid.length > 0 && user?.uid === adminUid;
}

export function adminAuthErrorMessage(code: string): string {
  switch (code) {
    case "auth/network-request-failed":
      return "Verifique sua conexão e tente novamente.";
    case "auth/too-many-requests":
      return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
    case "auth/operation-not-allowed":
      return "O acesso por senha precisa estar habilitado no Firebase.";
    default:
      return "Não foi possível entrar. Confira seu usuário e sua senha.";
  }
}
