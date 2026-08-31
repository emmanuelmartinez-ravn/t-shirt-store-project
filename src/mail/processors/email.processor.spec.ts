import { Job } from 'bullmq';
import { SEND_VERIFICATION_EMAIL_JOB } from '../mail.constants';
import { MailerService } from '../services/mailer.service';
import { EmailProcessor } from './email.processor';

describe('EmailProcessor', () => {
  let processor: EmailProcessor;
  let mailerService: jest.Mocked<MailerService>;

  beforeEach(() => {
    mailerService = {
      sendAccountVerificationEmail: jest.fn(),
    } as unknown as jest.Mocked<MailerService>;

    processor = new EmailProcessor(mailerService);
  });

  it('is defined', () => {
    expect(processor).toBeDefined();
  });

  describe('process', () => {
    it('sends the account verification email with the built activation link', async () => {
      const job = {
        name: SEND_VERIFICATION_EMAIL_JOB,
        data: { to: 'joe.doe@example.com', token: 'jti-value' },
      } as unknown as Job<{ to: string; token: string }>;

      await processor.process(job);

      expect(mailerService.sendAccountVerificationEmail).toHaveBeenCalledWith(
        'joe.doe@example.com',
        expect.stringContaining('/activation/jti-value'),
      );
    });

    it('ignores jobs with an unrecognized name', async () => {
      const job = {
        name: 'some-other-job',
        data: { to: 'joe.doe@example.com', token: 'jti-value' },
      } as unknown as Job<{ to: string; token: string }>;

      await processor.process(job);

      expect(mailerService.sendAccountVerificationEmail).not.toHaveBeenCalled();
    });
  });
});
