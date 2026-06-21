export const RESET_OTP_TTL_MS = 10 * 60 * 1000;
export const RESET_OTP_MAX_ATTEMPTS = 5;
export const RESET_OTP_MAX_SENDS = 3;
export const RESET_OTP_RESEND_COOLDOWN_MS = 60 * 1000;
export const RESET_TOKEN_TTL_MIN = 15;

export { maskEmail, generateDeletionOtpCode as generateResetOtpCode } from './account-deletion';
