export abstract class FileStorageService {
  abstract upload(params: {
    key: string;
    body: Buffer;
    contentType: string;
  }): Promise<void>;
  abstract delete(key: string): Promise<void>;
  abstract getSignedUrl(key: string): Promise<string>;
}
