import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Event } from '../events/event.entity';
import { Guest } from '../guests/guest.entity';
import { Pass } from '../guests/pass.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { QR_JWT, RsvpService } from './rsvp.service';
import { RsvpController } from './rsvp.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Pass, Guest, Event]),
    NotificationsModule,
  ],
  controllers: [RsvpController],
  providers: [
    RsvpService,
    {
      provide: QR_JWT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new JwtService({
          secret: config.get<string>('QR_JWT_SECRET') || undefined,
          signOptions: {
            expiresIn: config.get<string>('QR_JWT_EXPIRES_IN') || '30d',
          },
        }),
    },
  ],
  exports: [RsvpService],
})
export class RsvpModule {}
