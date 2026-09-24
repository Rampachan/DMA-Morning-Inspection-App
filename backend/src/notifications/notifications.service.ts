import { Injectable, Logger } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { FcmService } from './fcm.service';
import { StubSmsProvider } from './providers/stub-sms.provider';
import { UlbService } from '../ulb/ulb.service';
import { Role } from '../common/enums/roles.enum';

const REMINDER_TITLE = 'MCRS: Submission Reminder';
const REMINDER_BODY =
  'Please submit your compliance inspection report. Deadline: 07:30 IST.';

const ESCALATION_TITLE = 'MCRS: Missing Submissions Alert';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly fcmService: FcmService,
    private readonly smsProvider: StubSmsProvider,
    private readonly ulbService: UlbService,
  ) {}

  /**
   * Sends SMS + FCM reminder to commissioner users assigned to the given ULBs.
   */
  async sendReminder(ulbIds: string[]): Promise<void> {
    if (ulbIds.length === 0) return;

    const users = await this.usersService.findByUlbIds(ulbIds);

    await Promise.allSettled(
      users.map(async (user) => {
        if (user.mobile) {
          await this.smsProvider.sendSms(user.mobile, REMINDER_BODY).catch((err) =>
            this.logger.error(`SMS reminder failed for ${user.user_id}`, err),
          );
        }
        // FCM topic per user (topic = user_id for targeted push)
        await this.fcmService
          .sendPush(`/topics/user_${user.user_id}`, {
            title: REMINDER_TITLE,
            body: REMINDER_BODY,
          })
          .catch((err) =>
            this.logger.error(`FCM reminder failed for ${user.user_id}`, err),
          );
      }),
    );

    this.logger.log(`Reminders sent to ${users.length} commissioners.`);
  }

  /**
   * Sends SMS + FCM escalation alert to admin/director users listing absent ULBs.
   */
  async sendEscalation(absentUlbIds: string[]): Promise<void> {
    if (absentUlbIds.length === 0) return;

    const [adminUsers, ulbs] = await Promise.all([
      this.usersService.findByRoles([Role.ADMIN, Role.DIRECTOR]),
      this.ulbService.getByIds(absentUlbIds),
    ]);

    const ulbNames = ulbs.map((u) => u.name).join(', ');
    const escalationBody = `${absentUlbIds.length} ULB(s) missed today's submission deadline: ${ulbNames}`;

    await Promise.allSettled(
      adminUsers.map(async (user) => {
        if (user.mobile) {
          await this.smsProvider.sendSms(user.mobile, escalationBody).catch((err) =>
            this.logger.error(`SMS escalation failed for ${user.user_id}`, err),
          );
        }
        await this.fcmService
          .sendPush(`/topics/user_${user.user_id}`, {
            title: ESCALATION_TITLE,
            body: escalationBody,
            data: { absentCount: String(absentUlbIds.length) },
          })
          .catch((err) =>
            this.logger.error(`FCM escalation failed for ${user.user_id}`, err),
          );
      }),
    );

    this.logger.log(
      `Escalation sent to ${adminUsers.length} admins/directors for ${absentUlbIds.length} absent ULBs.`,
    );
  }
}
