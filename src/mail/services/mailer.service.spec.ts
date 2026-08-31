import type { Transporter } from 'nodemailer';
import { MailerService } from './mailer.service';

describe('MailerService', () => {
  let service: MailerService;
  let transporter: jest.Mocked<Transporter>;

  beforeEach(() => {
    transporter = {
      sendMail: jest.fn(),
    } as unknown as jest.Mocked<Transporter>;

    service = new MailerService(transporter);
  });

  it('is defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendAccountVerificationEmail', () => {
    it('sends an email containing the activation link to the given address', async () => {
      await service.sendAccountVerificationEmail(
        'joe.doe@example.com',
        'frontend.com/activation/jti-value',
      );

      const [mailOptions] = transporter.sendMail.mock.calls[0];
      expect(mailOptions.to).toBe('joe.doe@example.com');
      expect(mailOptions.html).toContain('frontend.com/activation/jti-value');
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('sends an email containing the reset link to the given address', async () => {
      await service.sendPasswordResetEmail(
        'joe.doe@example.com',
        'frontend.com/reset-password/jti-value',
      );

      const [mailOptions] = transporter.sendMail.mock.calls[0];
      expect(mailOptions.to).toBe('joe.doe@example.com');
      expect(mailOptions.subject).toBe('Reset your password');
      expect(mailOptions.html).toContain(
        'frontend.com/reset-password/jti-value',
      );
    });
  });
});
