export abstract class EmailQueueService {
  abstract enqueueAccountVerificationEmail(params: {
    to: string;
    token: string;
  }): Promise<void>;
  abstract enqueuePasswordResetEmail(params: {
    to: string;
    token: string;
  }): Promise<void>;
}
