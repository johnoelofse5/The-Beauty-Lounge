export interface EmailAttachment {
  filename: string;
  content: string;
  contentType: string;
  encoding: string;
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: EmailAttachment[];
}

export interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}