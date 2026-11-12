import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AuthUser } from '../auth/token-payload';
import { UserRole } from '../users/user-role.enum';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { Event } from './event.entity';
import { EventPlan } from './event-plan.enum';
import { EventStatus } from './event-status.enum';

const PLAN_CAPACITY: Record<EventPlan, number> = {
  [EventPlan.FREE]: 50,
  [EventPlan.BASIC]: 150,
  [EventPlan.PRO]: 500,
};

const ALLOWED_TRANSITIONS: Record<EventStatus, EventStatus[]> = {
  [EventStatus.DRAFT]: [EventStatus.ACTIVE, EventStatus.CANCELLED],
  [EventStatus.ACTIVE]: [EventStatus.CLOSED, EventStatus.CANCELLED],
  [EventStatus.CLOSED]: [],
  [EventStatus.CANCELLED]: [],
};

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private readonly events: Repository<Event>,
    private readonly dataSource: DataSource,
  ) {}

  async create(user: AuthUser, dto: CreateEventDto): Promise<Event> {
    this.assertCanManage(user);
    const plan = dto.plan ?? EventPlan.FREE;
    const capacity = dto.capacity ?? Math.min(100, PLAN_CAPACITY[plan]);
    this.assertCapacity(plan, capacity);
    const startsAt = new Date(dto.starts_at);
    const endsAt = new Date(dto.ends_at);
    this.assertDates(startsAt, endsAt);

    const event = this.events.create({
      ownerId: user.id,
      name: dto.name.trim(),
      description: this.emptyToNull(dto.description),
      location: this.emptyToNull(dto.location),
      startsAt,
      endsAt,
      capacity,
      rsvpDeadline: dto.rsvp_deadline ? new Date(dto.rsvp_deadline) : null,
      plan,
      status: EventStatus.DRAFT,
    });

    return this.events.save(event);
  }

  async findAll(user: AuthUser): Promise<Event[]> {
    this.assertCanManage(user);
    const where = user.role === UserRole.OWNER ? {} : { ownerId: user.id };
    return this.events.find({ where, order: { createdAt: 'DESC' } });
  }

  async findOne(user: AuthUser, id: string): Promise<Event> {
    this.assertCanManage(user);
    return this.requireAccessible(user, id);
  }

  async update(user: AuthUser, id: string, dto: UpdateEventDto): Promise<Event> {
    this.assertCanManage(user);
    const event = await this.requireAccessible(user, id);
    const plan = dto.plan ?? event.plan;
    const capacity = dto.capacity ?? event.capacity;
    this.assertCapacity(plan, capacity);

    const startsAt = dto.starts_at ? new Date(dto.starts_at) : event.startsAt;
    const endsAt = dto.ends_at ? new Date(dto.ends_at) : event.endsAt;
    this.assertDates(startsAt, endsAt);

    if (dto.name !== undefined) {
      event.name = dto.name.trim();
    }
    if (dto.description !== undefined) {
      event.description = this.emptyToNull(dto.description);
    }
    if (dto.location !== undefined) {
      event.location = this.emptyToNull(dto.location);
    }
    if (dto.rsvp_deadline !== undefined) {
      event.rsvpDeadline = dto.rsvp_deadline
        ? new Date(dto.rsvp_deadline)
        : null;
    }
    event.startsAt = startsAt;
    event.endsAt = endsAt;
    event.capacity = capacity;
    event.plan = plan;

    return this.events.save(event);
  }

  async changeStatus(
    user: AuthUser,
    id: string,
    status: EventStatus,
  ): Promise<Event> {
    this.assertCanManage(user);
    const event = await this.requireAccessible(user, id);
    const allowed = ALLOWED_TRANSITIONS[event.status];
    if (!allowed.includes(status)) {
      throw new BadRequestException({
        error: 'INVALID_STATUS_TRANSITION',
        message: 'Esa transición de estado no está permitida',
      });
    }
    if (status === EventStatus.ACTIVE) {
      await this.assertPlanPaid(event);
    }
    event.status = status;
    return this.events.save(event);
  }

  private assertCanManage(user: AuthUser): void {
    if (user.role === UserRole.STAFF) {
      throw new ForbiddenException({
        error: 'FORBIDDEN',
        message: 'El personal de acceso no puede gestionar eventos',
      });
    }
  }

  private async requireAccessible(user: AuthUser, id: string): Promise<Event> {
    const event = await this.events.findOne({ where: { id } });
    if (!event || (user.role === UserRole.PLANNER && event.ownerId !== user.id)) {
      throw new NotFoundException({
        error: 'EVENT_NOT_FOUND',
        message: 'Evento no encontrado',
      });
    }
    return event;
  }

  private assertCapacity(plan: EventPlan, capacity: number): void {
    if (capacity > PLAN_CAPACITY[plan]) {
      throw new BadRequestException({
        error: 'PLAN_LIMIT_EXCEEDED',
        message: `La capacidad supera el límite del plan ${plan} (${PLAN_CAPACITY[plan]})`,
      });
    }
  }

  private assertDates(startsAt: Date, endsAt: Date): void {
    if (!(endsAt.getTime() > startsAt.getTime())) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: 'La fecha de fin debe ser posterior a la de inicio',
      });
    }
  }

  private async assertPlanPaid(event: Event): Promise<void> {
    if (event.plan === EventPlan.FREE) {
      return;
    }
    const rows: unknown[] = await this.dataSource.query(
      `SELECT 1 FROM payments WHERE event_id = $1 AND plan = $2 AND status = 'PAID' LIMIT 1`,
      [event.id, event.plan],
    );
    if (rows.length === 0) {
      throw new BadRequestException({
        error: 'PLAN_NOT_PAID',
        message: 'El plan debe estar pagado antes de activar el evento',
      });
    }
  }

  private emptyToNull(value: string | undefined): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }
}
