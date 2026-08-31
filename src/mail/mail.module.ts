import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { createMailTransporter } from './config/mailer-transport';
import { EMAIL_QUEUE_NAME, MAIL_TRANSPORTER } from './mail.constants';
import { EmailProcessor } from './processors/email.processor';
import { BullMqEmailQueueService } from './services/bullmq-email-queue.service';
import { EmailQueueService } from './services/email-queue.service';
import { MailerService } from './services/mailer.service';

@Module({
  imports: [BullModule.registerQueue({ name: EMAIL_QUEUE_NAME })],
  providers: [
    { provide: MAIL_TRANSPORTER, useFactory: createMailTransporter },
    MailerService,
    EmailProcessor,
    { provide: EmailQueueService, useClass: BullMqEmailQueueService },
  ],
  exports: [EmailQueueService],
})
export class MailModule {}
