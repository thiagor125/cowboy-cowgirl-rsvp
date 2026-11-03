const ADMIN_EMAILS = ["thiagor402@gmail.com", "amandarincon2002@gmail.com"];

export function isAdminEmail(email: string | null | undefined): boolean {
  return typeof email === "string" && ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

export function adminAuthErrorMessage(code: string): string {
  switch (code) {
    case "auth/network-request-failed":
      return "Verifique sua conexão e tente novamente.";
    case "auth/too-many-requests":
      return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
    case "auth/operation-not-allowed":
      return "O acesso por e-mail e senha precisa estar habilitado no Firebase.";
    default:
      return "Não foi possível entrar. Confira seu e-mail e sua senha.";
  }
}
