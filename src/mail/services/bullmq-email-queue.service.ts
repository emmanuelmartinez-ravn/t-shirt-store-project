import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  EMAIL_QUEUE_NAME,
  SEND_VERIFICATION_EMAIL_JOB,
} from '../mail.constants';
import { EmailQueueService } from './email-queue.service';

const JOB_ATTEMPTS = 3;
const JOB_BACKOFF_DELAY_MS = 5000;

@Injectable()
export class BullMqEmailQueueService extends EmailQueueService {
  constructor(
    @InjectQueue(EMAIL_QUEUE_NAME) private readonly emailQueue: Queue,
  ) {
    super();
  }

  async enqueueAccountVerificationEmail(params: {
    to: string;
    token: string;
  }): Promise<void> {
    await this.emailQueue.add(SEND_VERIFICATION_EMAIL_JOB, params, {
      attempts: JOB_ATTEMPTS,
      backoff: { type: 'exponential', delay: JOB_BACKOFF_DELAY_MS },
    });
  }
}
