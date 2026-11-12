import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Event } from '../events/event.entity';
import { User } from '../users/user.entity';
import { Guest } from './guest.entity';
import { GuestsController } from './guests.controller';
import { GuestsService } from './guests.service';
import { Pass } from './pass.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Guest, Pass, Event, User])],
  controllers: [GuestsController],
  providers: [GuestsService],
  exports: [GuestsService],
})
export class GuestsModule {}
