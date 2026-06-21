import nodemailer from 'nodemailer';
import { SITE_URL } from './constants';

function getTransporter() {
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

export function isEmailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export async function sendWelcomeEmail(opts: {
  to: string;
  name: string;
  username: string;
}) {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn('[email] SMTP not configured — skipping welcome email');
    return false;
  }

  const from = process.env.SMTP_FROM || 'Addawah <noreply@addawah.com>';
  const firstName = opts.name.split(' ')[0] || opts.name;

  await transporter.sendMail({
    from,
    to: opts.to,
    subject: 'Welcome to Addawah',
    text: [
      `Assalamu alaikum ${firstName},`,
      '',
      `Welcome to Addawah! Your account @${opts.username} is ready.`,
      '',
      `Sign in anytime at ${SITE_URL}/login`,
      '',
      'May Allah accept your efforts in salah tracking.',
      '',
      '— The Addawah team',
    ].join('\n'),
    html: `
      <p>Assalamu alaikum <strong>${firstName}</strong>,</p>
      <p>Welcome to <strong>Addawah</strong>! Your account <strong>@${opts.username}</strong> is ready.</p>
      <p><a href="${SITE_URL}/login">Sign in to your account</a></p>
      <p>May Allah accept your efforts in salah tracking.</p>
      <p>— The Addawah team</p>
    `,
  });

  return true;
}

export async function sendPasswordResetOtpEmail(opts: {
  to: string;
  name: string;
  code: string;
}) {
  const transporter = getTransporter();
  if (!transporter) return false;

  const from = process.env.SMTP_FROM || 'Addawah <noreply@addawah.com>';
  const firstName = opts.name.split(' ')[0] || opts.name;

  await transporter.sendMail({
    from,
    to: opts.to,
    subject: 'Your Addawah password reset code',
    text: [
      `Assalamu alaikum ${firstName},`,
      '',
      'You requested to reset your Addawah password.',
      '',
      `Your verification code is: ${opts.code}`,
      '',
      'This code expires in 10 minutes. If you did not request this, you can ignore this email.',
      '',
      '— The Addawah team',
    ].join('\n'),
    html: `
      <p>Assalamu alaikum <strong>${firstName}</strong>,</p>
      <p>You requested to reset your Addawah password.</p>
      <p style="font-size:28px;font-weight:700;letter-spacing:0.2em;margin:24px 0">${opts.code}</p>
      <p>This code expires in <strong>10 minutes</strong>. If you did not request this, you can ignore this email.</p>
      <p>— The Addawah team</p>
    `,
  });

  return true;
}

export async function sendDeletionOtpEmail(opts: {
  to: string;
  name: string;
  code: string;
}) {
  const transporter = getTransporter();
  if (!transporter) return false;

  const from = process.env.SMTP_FROM || 'Addawah <noreply@addawah.com>';
  const firstName = opts.name.split(' ')[0] || opts.name;

  await transporter.sendMail({
    from,
    to: opts.to,
    subject: 'Your Addawah account deletion code',
    text: [
      `Assalamu alaikum ${firstName},`,
      '',
      'You requested to permanently delete your Addawah account.',
      '',
      `Your verification code is: ${opts.code}`,
      '',
      'This code expires in 10 minutes. If you did not request this, sign in and change your password.',
      '',
      '— The Addawah team',
    ].join('\n'),
    html: `
      <p>Assalamu alaikum <strong>${firstName}</strong>,</p>
      <p>You requested to permanently delete your Addawah account.</p>
      <p style="font-size:28px;font-weight:700;letter-spacing:0.2em;margin:24px 0">${opts.code}</p>
      <p>This code expires in <strong>10 minutes</strong>. If you did not request this, sign in and change your password.</p>
      <p>— The Addawah team</p>
    `,
  });

  return true;
}
