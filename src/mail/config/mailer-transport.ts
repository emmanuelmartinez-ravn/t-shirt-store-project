import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

const DEFAULT_MAIL_FROM = 'no-reply@tshirt-store.com';

export function createMailTransporter(): Transporter {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
}

export function getMailFromAddress(): string {
  return process.env.SMTP_FROM ?? DEFAULT_MAIL_FROM;
}
