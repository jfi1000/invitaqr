import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Event } from '../events/event.entity';
import { EventStatus } from '../events/event-status.enum';
import { Guest } from '../guests/guest.entity';
import { Pass } from '../guests/pass.entity';
import { PassRsvpStatus } from '../guests/pass-rsvp-status.enum';

export const QR_JWT = 'QR_JWT';

export interface RsvpView {
  pass: {
    id: string;
    rsvpStatus: PassRsvpStatus;
    companionsConfirmed: number;
    rsvpAt: Date | null;
    qrToken: string | null;
  };
  guest: {
    id: string;
    name: string;
    maxCompanions: number;
  };
  event: {
    id: string;
    name: string;
    description: string | null;
    location: string | null;
    startsAt: Date;
    endsAt: Date;
    capacity: number;
    rsvpDeadline: Date | null;
    status: EventStatus;
  };
}

@Injectable()
export class RsvpService {
  constructor(
    @InjectRepository(Pass)
    private readonly passes: Repository<Pass>,
    @InjectRepository(Guest)
    private readonly guests: Repository<Guest>,
    @InjectRepository(Event)
    private readonly events: Repository<Event>,
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
    @Inject(QR_JWT) private readonly qrJwt: JwtService,
  ) {}

  async getPass(rsvpToken: string): Promise<RsvpView> {
    const pass = await this.passes.findOne({ where: { rsvpToken } });
    if (!pass) {
      throw this.passNotFound();
    }
    const guest = await this.requireGuest(pass.guestId);
    const event = await this.requireEvent(pass.eventId);
    return this.toView(pass, guest, event);
  }

  async confirm(rsvpToken: string, companions: number): Promise<RsvpView> {
    const partySize = companions ?? 0;
    return this.dataSource.transaction(async (manager) => {
      const { pass, guest, event } = await this.lockRsvp(manager, rsvpToken);
      this.assertOpen(event);
      if (
        pass.rsvpStatus !== PassRsvpStatus.PENDING &&
        pass.rsvpStatus !== PassRsvpStatus.WAITLIST
      ) {
        throw new BadRequestException({
          error: 'RSVP_ALREADY_ANSWERED',
          message: 'Esta invitación ya fue respondida',
        });
      }
      if (partySize > guest.maxCompanions) {
        throw new BadRequestException({
          error: 'COMPANIONS_LIMIT_EXCEEDED',
          message: `Puedes confirmar hasta ${guest.maxCompanions} acompañantes`,
        });
      }

      const occupied = await this.countOccupiedSeats(manager, event.id);
      const hasRoom = occupied + 1 + partySize <= event.capacity;
      pass.companionsConfirmed = partySize;
      pass.rsvpAt = new Date();
      if (hasRoom) {
        pass.rsvpStatus = PassRsvpStatus.CONFIRMED;
        pass.qrToken = await this.signQr(pass);
      } else {
        pass.rsvpStatus = PassRsvpStatus.WAITLIST;
        pass.qrToken = null;
      }
      const saved = await manager.getRepository(Pass).save(pass);
      return this.toView(saved, guest, event);
    });
  }

  async decline(rsvpToken: string): Promise<RsvpView> {
    return this.dataSource.transaction(async (manager) => {
      const { pass, guest, event } = await this.lockRsvp(manager, rsvpToken);
      this.assertOpen(event);
      if (pass.rsvpStatus === PassRsvpStatus.DECLINED) {
        throw new BadRequestException({
          error: 'RSVP_ALREADY_ANSWERED',
          message: 'Esta invitación ya fue respondida',
        });
      }
      const wasConfirmed = pass.rsvpStatus === PassRsvpStatus.CONFIRMED;
      pass.rsvpStatus = PassRsvpStatus.DECLINED;
      pass.rsvpAt = new Date();
      pass.qrToken = null;
      const saved = await manager.getRepository(Pass).save(pass);
      if (wasConfirmed) {
        await this.promoteFromWaitlist(event.id, manager);
      }
      return this.toView(saved, guest, event);
    });
  }

  private async promoteFromWaitlist(
    eventId: string,
    manager: EntityManager,
  ): Promise<void> {
    const next = await manager
      .getRepository(Pass)
      .createQueryBuilder('pass')
      .setLock('pessimistic_write')
      .where('pass.eventId = :eventId', { eventId })
      .andWhere('pass.rsvpStatus = :status', {
        status: PassRsvpStatus.WAITLIST,
      })
      .orderBy('pass.rsvpAt', 'ASC')
      .addOrderBy('pass.createdAt', 'ASC')
      .getOne();
    if (!next) {
      return;
    }

    const event = await manager.getRepository(Event).findOne({
      where: { id: eventId },
    });
    if (!event) {
      return;
    }
    const occupied = await this.countOccupiedSeats(manager, eventId);
    const seats = 1 + next.companionsConfirmed;
    if (occupied + seats > event.capacity) {
      return;
    }

    next.rsvpStatus = PassRsvpStatus.CONFIRMED;
    next.rsvpAt = new Date();
    next.qrToken = await this.signQr(next);
    await manager.getRepository(Pass).save(next);
  }

  private async lockRsvp(
    manager: EntityManager,
    rsvpToken: string,
  ): Promise<{ pass: Pass; guest: Guest; event: Event }> {
    const existing = await manager
      .getRepository(Pass)
      .findOne({ where: { rsvpToken } });
    if (!existing) {
      throw this.passNotFound();
    }

    const event = await manager
      .getRepository(Event)
      .createQueryBuilder('event')
      .setLock('pessimistic_write')
      .where('event.id = :id', { id: existing.eventId })
      .getOne();
    if (!event) {
      throw new NotFoundException({
        error: 'EVENT_NOT_FOUND',
        message: 'Evento no encontrado',
      });
    }

    const pass = await manager
      .getRepository(Pass)
      .createQueryBuilder('pass')
      .setLock('pessimistic_write')
      .where('pass.id = :id', { id: existing.id })
      .getOne();
    if (!pass) {
      throw this.passNotFound();
    }

    const guest = await manager
      .getRepository(Guest)
      .findOne({ where: { id: pass.guestId } });
    if (!guest) {
      throw new NotFoundException({
        error: 'GUEST_NOT_FOUND',
        message: 'Invitado no encontrado',
      });
    }
    return { pass, guest, event };
  }

  private assertOpen(event: Event): void {
    if (event.status !== EventStatus.ACTIVE) {
      throw new BadRequestException({
        error: 'EVENT_NOT_ACTIVE',
        message: 'Este evento no está recibiendo confirmaciones',
      });
    }
    if (
      event.rsvpDeadline &&
      event.rsvpDeadline.getTime() < Date.now()
    ) {
      throw new BadRequestException({
        error: 'RSVP_DEADLINE_PASSED',
        message: 'La fecha límite de confirmación ya pasó',
      });
    }
  }

  private async countOccupiedSeats(
    manager: EntityManager,
    eventId: string,
  ): Promise<number> {
    const rows: Array<{ occupied: string | number }> = await manager.query(
      `SELECT COALESCE(SUM(1 + companions_confirmed), 0) AS occupied
       FROM passes
       WHERE event_id = $1 AND rsvp_status = 'CONFIRMED'`,
      [eventId],
    );
    return Number(rows[0]?.occupied ?? 0);
  }

  private async signQr(pass: Pass): Promise<string> {
    const secret = this.config.get<string>('QR_JWT_SECRET');
    if (!secret) {
      throw new InternalServerErrorException({
        error: 'QR_NOT_CONFIGURED',
        message: 'No se puede generar el pase QR',
      });
    }
    return this.qrJwt.signAsync({
      passId: pass.id,
      eventId: pass.eventId,
      guestId: pass.guestId,
    });
  }

  private async requireGuest(guestId: string): Promise<Guest> {
    const guest = await this.guests.findOne({ where: { id: guestId } });
    if (!guest) {
      throw new NotFoundException({
        error: 'GUEST_NOT_FOUND',
        message: 'Invitado no encontrado',
      });
    }
    return guest;
  }

  private async requireEvent(eventId: string): Promise<Event> {
    const event = await this.events.findOne({ where: { id: eventId } });
    if (!event) {
      throw new NotFoundException({
        error: 'EVENT_NOT_FOUND',
        message: 'Evento no encontrado',
      });
    }
    return event;
  }

  private passNotFound(): NotFoundException {
    return new NotFoundException({
      error: 'PASS_NOT_FOUND',
      message: 'Invitación no encontrada',
    });
  }

  private toView(pass: Pass, guest: Guest, event: Event): RsvpView {
    return {
      pass: {
        id: pass.id,
        rsvpStatus: pass.rsvpStatus,
        companionsConfirmed: pass.companionsConfirmed,
        rsvpAt: pass.rsvpAt,
        qrToken: pass.qrToken,
      },
      guest: {
        id: guest.id,
        name: guest.name,
        maxCompanions: guest.maxCompanions,
      },
      event: {
        id: event.id,
        name: event.name,
        description: event.description,
        location: event.location,
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        capacity: event.capacity,
        rsvpDeadline: event.rsvpDeadline,
        status: event.status,
      },
    };
  }
}
