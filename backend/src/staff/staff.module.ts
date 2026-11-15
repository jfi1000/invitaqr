import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Event } from '../events/event.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { User } from '../users/user.entity';
import { EventStaff } from './event-staff.entity';
import { StaffInvite } from './staff-invite.entity';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([EventStaff, StaffInvite, Event, User]),
    NotificationsModule,
  ],
  controllers: [StaffController],
  providers: [StaffService],
  exports: [StaffService],
})
export class StaffModule {}
