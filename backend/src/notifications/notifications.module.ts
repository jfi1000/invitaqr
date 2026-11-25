import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Event } from '../events/event.entity';
import { Guest } from '../guests/guest.entity';
import { Pass } from '../guests/pass.entity';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [TypeOrmModule.forFeature([Event, Guest, Pass])],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
