import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import { logger } from './logger';
import { SITE_NAME, SITE_URL } from './constants';

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

function isSmtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export function isResendConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

/** True when password-reset / account-deletion OTP emails can be sent. */
export function isEmailConfigured() {
  return isResendConfigured() || isSmtpConfigured();
}

/** Resend's built-in sender — works without a verified domain (testing / pre-DNS). */
const RESEND_SANDBOX_FROM = `${SITE_NAME} <onboarding@resend.dev>`;

function extractEmailAddress(from: string) {
  const match = from.match(/<([^>]+)>/);
  return (match?.[1] || from).trim().toLowerCase();
}

function isUnverifiableResendFrom(from: string) {
  const email = extractEmailAddress(from);
  return (
    email.endsWith('.vercel.app') ||
    email.endsWith('.vercel.com') ||
    email.endsWith('.netlify.app') ||
    email.endsWith('.localhost')
  );
}

function resolveResendFrom() {
  const configured = process.env.RESEND_FROM || process.env.SMTP_FROM;
  if (!configured) return RESEND_SANDBOX_FROM;
  if (isUnverifiableResendFrom(configured)) {
    logger.warn(
      { module: 'email', from: configured, sandbox: RESEND_SANDBOX_FROM },
      'RESEND_FROM uses a host Resend cannot verify — using sandbox sender',
    );
    return RESEND_SANDBOX_FROM;
  }
  return configured;
}

function getFromAddress() {
  if (isResendConfigured()) return resolveResendFrom();
  return process.env.SMTP_FROM || process.env.RESEND_FROM || RESEND_SANDBOX_FROM;
}

function isDomainVerificationError(error: {
  message?: string | null;
  statusCode?: number | null;
}) {
  const msg = (error.message || '').toLowerCase();
  return error.statusCode === 403 && msg.includes('domain') && msg.includes('not verified');
}

function getSmtpTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

function otpEmailShell(opts: {
  title: string;
  greeting: string;
  body: string;
  code: string;
  footer: string;
}) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${opts.title}</title>
</head>
<body style="margin:0;padding:0;background:#0a0b0d;font-family:Georgia,'Times New Roman',serif;color:#e8e4dc;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0a0b0d;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#12141a;border:1px solid #2a2418;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:28px 32px 8px;text-align:center;">
              <p style="margin:0;font-size:22px;letter-spacing:0.08em;color:#c9a227;">${SITE_NAME}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 32px;">
              <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">${opts.greeting}</p>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#c8c2b6;">${opts.body}</p>
              <p style="margin:0;text-align:center;font-size:32px;font-weight:700;letter-spacing:0.35em;color:#c9a227;font-family:ui-monospace,Menlo,monospace;">${opts.code}</p>
              <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#9a9488;">${opts.footer}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 24px;border-top:1px solid #2a2418;text-align:center;">
              <p style="margin:0;font-size:12px;color:#6f6a60;">— The ${SITE_NAME} team</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function deliverEmail(opts: {
  to: string;
  subject: string;
  text: string;
  html: string;
}) {
  if (isResendConfigured()) {
    const resend = getResend();
    if (!resend) return false;

    let from = getFromAddress();

    const send = async (fromAddress: string) =>
      resend.emails.send({
        from: fromAddress,
        to: opts.to,
        subject: opts.subject,
        text: opts.text,
        html: opts.html,
      });

    let { error } = await send(from);

    if (error && isDomainVerificationError(error) && from !== RESEND_SANDBOX_FROM) {
      logger.warn({ module: 'email', sandbox: RESEND_SANDBOX_FROM }, 'Retrying with sandbox sender after domain verification failure');
      from = RESEND_SANDBOX_FROM;
      ({ error } = await send(from));
    }

    if (error) {
      logger.error({ module: 'email', err: error }, 'Resend send failed');
      return false;
    }
    return true;
  }

  const from = getFromAddress();
  const transporter = getSmtpTransporter();
  if (!transporter) {
    logger.warn({ module: 'email' }, 'No email provider configured');
    return false;
  }

  await transporter.sendMail({
    from,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
  });

  return true;
}

export async function sendWelcomeEmail(opts: {
  to: string;
  name: string;
  username: string;
}) {
  if (!isEmailConfigured()) {
    logger.warn({ module: 'email' }, 'Email not configured — skipping welcome email');
    return false;
  }

  const firstName = opts.name.split(' ')[0] || opts.name;

  return deliverEmail({
    to: opts.to,
    subject: `Welcome to ${SITE_NAME}`,
    text: [
      `Assalamu alaikum ${firstName},`,
      '',
      `Welcome to ${SITE_NAME}! Your account @${opts.username} is ready.`,
      '',
      `Sign in anytime at ${SITE_URL}/login`,
      '',
      'May Allah accept your efforts in salah tracking.',
      '',
      `— The ${SITE_NAME} team`,
    ].join('\n'),
    html: `
      <p>Assalamu alaikum <strong>${firstName}</strong>,</p>
      <p>Welcome to <strong>${SITE_NAME}</strong>! Your account <strong>@${opts.username}</strong> is ready.</p>
      <p><a href="${SITE_URL}/login">Sign in to your account</a></p>
      <p>May Allah accept your efforts in salah tracking.</p>
      <p>— The ${SITE_NAME} team</p>
    `,
  });
}

export async function sendPasswordResetOtpEmail(opts: {
  to: string;
  name: string;
  code: string;
}) {
  if (!isEmailConfigured()) return false;

  const firstName = opts.name.split(' ')[0] || opts.name;
  const greeting = `Assalamu alaikum <strong>${firstName}</strong>,`;
  const body = 'You requested to reset your password. Enter this verification code on the reset page:';
  const footer =
    'This code expires in <strong>10 minutes</strong>. If you did not request this, you can ignore this email.';

  return deliverEmail({
    to: opts.to,
    subject: `Your ${SITE_NAME} password reset code`,
    text: [
      `Assalamu alaikum ${firstName},`,
      '',
      'You requested to reset your Addawah password.',
      '',
      `Your verification code is: ${opts.code}`,
      '',
      'This code expires in 10 minutes. If you did not request this, you can ignore this email.',
      '',
      `— The ${SITE_NAME} team`,
    ].join('\n'),
    html: otpEmailShell({
      title: `Password reset — ${SITE_NAME}`,
      greeting,
      body,
      code: opts.code,
      footer,
    }),
  });
}

export async function sendDeletionOtpEmail(opts: {
  to: string;
  name: string;
  code: string;
}) {
  if (!isEmailConfigured()) return false;

  const firstName = opts.name.split(' ')[0] || opts.name;
  const greeting = `Assalamu alaikum <strong>${firstName}</strong>,`;
  const body =
    'You requested to permanently delete your account. Enter this verification code to confirm:';
  const footer =
    'This code expires in <strong>10 minutes</strong>. If you did not request this, sign in and change your password immediately.';

  return deliverEmail({
    to: opts.to,
    subject: `Your ${SITE_NAME} account deletion code`,
    text: [
      `Assalamu alaikum ${firstName},`,
      '',
      'You requested to permanently delete your Addawah account.',
      '',
      `Your verification code is: ${opts.code}`,
      '',
      'This code expires in 10 minutes. If you did not request this, sign in and change your password.',
      '',
      `— The ${SITE_NAME} team`,
    ].join('\n'),
    html: otpEmailShell({
      title: `Account deletion — ${SITE_NAME}`,
      greeting,
      body,
      code: opts.code,
      footer,
    }),
  });
}
