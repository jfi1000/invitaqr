import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Event } from '../events/event.entity';
import { Guest } from '../guests/guest.entity';
import { Pass } from '../guests/pass.entity';
import { ScanLog } from './scan-log.entity';
import { QR_JWT, ScannerService } from './scanner.service';
import { ScannerController } from './scanner.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ScanLog, Pass, Guest, Event])],
  controllers: [ScannerController],
  providers: [
    ScannerService,
    {
      provide: QR_JWT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new JwtService({
          secret: config.get<string>('QR_JWT_SECRET') || undefined,
        }),
    },
  ],
})
export class ScannerModule {}
