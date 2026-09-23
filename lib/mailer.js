import nodemailer from 'nodemailer';

/**
 * Transactional email over SMTP.
 *
 * The transport is built lazily and cached, so importing this module never
 * opens a connection and a missing configuration is a degraded feature rather
 * than a crash at boot.
 */

let transport;

export function hasMailer() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getTransport() {
  if (!hasMailer()) throw new Error('SMTP is not configured');
  if (!transport) {
    const port = Number(process.env.SMTP_PORT || 587);
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      // 465 is implicit TLS; 587 upgrades with STARTTLS.
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      pool: true,
      maxConnections: 3,
    });
  }
  return transport;
}

function fromAddress() {
  return process.env.MAIL_FROM || 'BoliBazzar <no-reply@bolibazzar.in>';
}

/** Verify SMTP credentials without sending. Used by the health endpoint. */
export async function verifyMailer() {
  if (!hasMailer()) return { ok: false, reason: 'not configured' };
  try {
    await getTransport().verify();
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: error.message };
  }
}

export async function sendMail({ to, subject, text, html }) {
  const info = await getTransport().sendMail({ from: fromAddress(), to, subject, text, html });
  return { messageId: info.messageId, accepted: info.accepted };
}

const BRAND_HEAD = `
  <div style="display:flex;align-items:center;gap:10px;border-bottom:1px solid rgba(0,0,0,0.06);padding-bottom:14px;margin-bottom:20px">
    <div style="width:36px;height:36px;border-radius:8px;background:linear-gradient(135deg,#4338ca,#e11d48,#f97316)"></div>
    <div style="font-weight:700;font-size:18px;color:#0a0a12">Boli<span style="color:#e11d48">Bazzar</span></div>
  </div>`;

const BRAND_FOOT = `
  <div style="margin-top:24px;padding-top:16px;border-top:1px solid rgba(0,0,0,0.06);font-size:11px;color:rgba(0,0,0,0.5)">
    You Ask. Sellers Compete. You Win.<br>© BoliBazzar Technologies · Made for Bharat
  </div>`;

/** The login code email. Deliberately plain and fast to render. */
export async function sendOtpEmail(to, code) {
  const subject = `${code} is your BoliBazzar login code`;
  const text =
    `${code} is your BoliBazzar login code.\n\n` +
    `It expires in 10 minutes. If you did not request it, you can ignore this email.\n` +
    `Never share this code with anyone — BoliBazzar staff will never ask for it.`;
  const html = `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0a0a12">
    ${BRAND_HEAD}
    <p style="margin:0 0 8px">Here is your login code:</p>
    <div style="font-size:34px;font-weight:700;letter-spacing:10px;padding:18px 0;text-align:center;background:linear-gradient(135deg,rgba(67,56,202,0.06),rgba(249,115,22,0.06));border-radius:14px;margin:12px 0">${code}</div>
    <p style="font-size:14px;color:rgba(0,0,0,0.65);margin:12px 0 0">
      It expires in 10 minutes. If you didn't request it, you can safely ignore this email.
    </p>
    <p style="font-size:13px;color:rgba(0,0,0,0.5);margin:10px 0 0">
      Never share this code. BoliBazzar staff will never ask you for it.
    </p>
    ${BRAND_FOOT}
  </div>`;
  return sendMail({ to, subject, text, html });
}
