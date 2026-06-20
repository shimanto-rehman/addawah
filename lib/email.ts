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
