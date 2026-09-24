import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface FcmPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

@Injectable()
export class FcmService {
  private readonly logger = new Logger(FcmService.name);
  private readonly serverKey: string;
  private readonly fcmUrl =
    'https://fcm.googleapis.com/fcm/send';

  constructor(private readonly configService: ConfigService) {
    this.serverKey = this.configService.get<string>('FCM_SERVER_KEY', '');
  }

  /**
   * Sends a FCM push notification to a single device token or a topic.
   * @param target  Device registration token or '/topics/<topic>'
   * @param payload  Notification content
   */
  async sendPush(target: string, payload: FcmPayload): Promise<void> {
    if (!this.serverKey) {
      this.logger.warn(
        '[FCM] FCM_SERVER_KEY is not configured — skipping push notification.',
      );
      return;
    }

    const body: Record<string, unknown> = {
      notification: {
        title: payload.title,
        body: payload.body,
      },
    };

    if (payload.data) {
      body.data = payload.data;
    }

    // Distinguish between topic and device token
    if (target.startsWith('/topics/')) {
      body.to = target;
    } else {
      body.to = target;
    }

    try {
      const response = await fetch(this.fcmUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `key=${this.serverKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const text = await response.text();
        this.logger.error(
          `FCM push failed: ${response.status} ${text}`,
        );
      } else {
        this.logger.debug(
          `FCM push sent to ${target}: ${payload.title}`,
        );
      }
    } catch (err) {
      this.logger.error('FCM push error', err);
    }
  }
}
