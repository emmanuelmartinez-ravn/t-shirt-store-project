import { Queue } from 'bullmq';
import {
  SEND_PASSWORD_RESET_EMAIL_JOB,
  SEND_VERIFICATION_EMAIL_JOB,
} from '../mail.constants';
import { BullMqEmailQueueService } from './bullmq-email-queue.service';

describe('BullMqEmailQueueService', () => {
  let service: BullMqEmailQueueService;
  let emailQueue: jest.Mocked<Queue>;

  beforeEach(() => {
    emailQueue = {
      add: jest.fn(),
    } as unknown as jest.Mocked<Queue>;

    service = new BullMqEmailQueueService(emailQueue);
  });

  it('is defined', () => {
    expect(service).toBeDefined();
  });

  describe('enqueueAccountVerificationEmail', () => {
    it('adds a send-verification-email job with the given payload', async () => {
      await service.enqueueAccountVerificationEmail({
        to: 'joe.doe@example.com',
        token: 'jti-value',
      });

      expect(emailQueue.add).toHaveBeenCalledWith(
        SEND_VERIFICATION_EMAIL_JOB,
        { to: 'joe.doe@example.com', token: 'jti-value' },
        expect.objectContaining({ attempts: 3 }),
      );
    });
  });

  describe('enqueuePasswordResetEmail', () => {
    it('adds a send-password-reset-email job with the given payload', async () => {
      await service.enqueuePasswordResetEmail({
        to: 'joe.doe@example.com',
        token: 'jti-value',
      });

      expect(emailQueue.add).toHaveBeenCalledWith(
        SEND_PASSWORD_RESET_EMAIL_JOB,
        { to: 'joe.doe@example.com', token: 'jti-value' },
        expect.objectContaining({
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        }),
      );
    });
  });
});
