import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Transporter } from 'nodemailer';
import { getMailFromAddress } from '../config/mailer-transport';
import { MAIL_TRANSPORTER } from '../mail.constants';

@Injectable()
export class MailerService {
  private readonly logger: Logger = new Logger(MailerService.name);

  constructor(
    @Inject(MAIL_TRANSPORTER) private readonly transporter: Transporter,
  ) {}

  async sendAccountVerificationEmail(to: string, link: string): Promise<void> {
    await this.transporter.sendMail({
      from: getMailFromAddress(),
      to,
      subject: 'Verify your account',
      html: `<p>Click the link below to verify your account:</p><p><a href="${link}">${link}</a></p>`,
    });

    this.logger.log(`Sent account verification email to ${to}`);
  }
}
