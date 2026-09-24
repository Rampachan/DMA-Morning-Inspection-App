import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { FcmService } from './fcm.service';
import { StubSmsProvider } from './providers/stub-sms.provider';
import { UsersModule } from '../users/users.module';
import { UlbModule } from '../ulb/ulb.module';

@Module({
  imports: [UsersModule, UlbModule],
  providers: [NotificationsService, FcmService, StubSmsProvider],
  exports: [NotificationsService],
})
export class NotificationsModule {}
