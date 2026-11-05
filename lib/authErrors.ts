/**
 * Traduz os erros do better-auth (que chegam em inglês) para mensagens em português.
 * Cai na mensagem original só quando o código não é conhecido.
 */
const MESSAGES: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: 'E-mail ou senha incorretos.',
  INVALID_PASSWORD: 'Senha incorreta.',
  INVALID_EMAIL: 'Digite um e-mail válido.',
  USER_NOT_FOUND: 'E-mail ou senha incorretos.',
  USER_ALREADY_EXISTS: 'Já existe uma conta com esse e-mail.',
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: 'Já existe uma conta com esse e-mail.',
  PASSWORD_TOO_SHORT: 'A senha é curta demais.',
  PASSWORD_TOO_LONG: 'A senha é longa demais.',
  EMAIL_NOT_VERIFIED: 'Confirme o seu e-mail antes de entrar.',
}

export function authErrorMessage(error: { code?: string, message?: string, status?: number } | null | undefined, fallback = 'Não foi possível concluir a operação.'): string {
  if (error?.code && MESSAGES[error.code]) return MESSAGES[error.code]!
  if (error?.status === 429) return 'Muitas tentativas. Aguarde um pouco e tente de novo.'
  return error?.message || fallback
}
