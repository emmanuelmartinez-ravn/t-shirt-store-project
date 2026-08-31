export abstract class EmailQueueService {
  abstract enqueueAccountVerificationEmail(params: {
    to: string;
    token: string;
  }): Promise<void>;
}
