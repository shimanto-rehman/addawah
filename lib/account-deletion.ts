export const DELETE_CONFIRMATION_PHRASE = 'I want to delete my account';

export const DELETE_OTP_TTL_MS = 10 * 60 * 1000;
export const DELETE_OTP_MAX_ATTEMPTS = 5;
export const DELETE_OTP_MAX_SENDS = 3;
export const DELETE_OTP_RESEND_COOLDOWN_MS = 60 * 1000;

export function normalizeDeletePhrase(input: string) {
  return input.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function isDeletePhraseValid(input: string) {
  return normalizeDeletePhrase(input) === normalizeDeletePhrase(DELETE_CONFIRMATION_PHRASE);
}

export function maskEmail(email: string) {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '•••@•••';
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${local.length > 2 ? '•••' : '•'}@${domain}`;
}

export function generateDeletionOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}
