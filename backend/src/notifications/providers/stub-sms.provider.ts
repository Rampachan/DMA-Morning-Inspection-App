import { Injectable, Logger } from '@nestjs/common';
import { ISmsProvider } from '../interfaces/sms-provider.interface';

/**
 * StubSmsProvider — logs the SMS message to the console.
 * Replace with a real provider (Twilio, SNS, etc.) in production.
 */
@Injectable()
export class StubSmsProvider implements ISmsProvider {
  private readonly logger = new Logger(StubSmsProvider.name);

  async sendSms(to: string, message: string): Promise<void> {
    this.logger.log(`[SMS STUB] To: ${to} | Message: ${message}`);
    // Resolves immediately — no external call
  }
}
