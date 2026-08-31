import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { buildActivationLink } from '../config/frontend-activation-link';
import { buildResetPasswordLink } from '../config/frontend-reset-password-link';
import {
  EMAIL_QUEUE_NAME,
  SEND_PASSWORD_RESET_EMAIL_JOB,
  SEND_VERIFICATION_EMAIL_JOB,
} from '../mail.constants';
import { MailerService } from '../services/mailer.service';

interface EmailJobData {
  to: string;
  token: string;
}

@Processor(EMAIL_QUEUE_NAME)
export class EmailProcessor extends WorkerHost {
  private readonly logger: Logger = new Logger(EmailProcessor.name);

  constructor(private readonly mailerService: MailerService) {
    super();
  }

  async process(job: Job<EmailJobData>): Promise<void> {
    switch (job.name) {
      case SEND_VERIFICATION_EMAIL_JOB:
        await this.mailerService.sendAccountVerificationEmail(
          job.data.to,
          buildActivationLink(job.data.token),
        );
        return;
      case SEND_PASSWORD_RESET_EMAIL_JOB:
        await this.mailerService.sendPasswordResetEmail(
          job.data.to,
          buildResetPasswordLink(job.data.token),
        );
        return;
      default:
        this.logger.warn(`Received unknown job "${job.name}"`);
    }
  }
}
