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
import { EventType } from './event-type.enum';

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
    const endsAt = dto.ends_at ? new Date(dto.ends_at) : new Date(startsAt);
    this.assertDates(startsAt, endsAt);

    const extras = this.resolveTypeExtras(dto);
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
      ...extras,
      logo: this.normalizeLogo(dto.logo),
    });

    return this.events.save(event);
  }

  async findAll(user: AuthUser): Promise<Event[]> {
    this.assertCanManage(user);
    const where = user.role === UserRole.OWNER ? {} : { ownerId: user.id };
    const events = await this.events.find({
      where,
      order: { createdAt: 'DESC' },
    });
    if (events.length === 0) {
      return events;
    }

    const ids = events.map((event) => event.id);
    const rows: {
      eventId: string;
      guestCount: number | string;
      confirmedCount: number | string;
    }[] = await this.dataSource.query(
      `SELECT
         e.id AS "eventId",
         (SELECT COUNT(*)::int FROM guests g WHERE g.event_id = e.id) AS "guestCount",
         COUNT(*) FILTER (WHERE p.rsvp_status = 'CONFIRMED')::int AS "confirmedCount"
       FROM events e
       LEFT JOIN passes p ON p.event_id = e.id
       WHERE e.id = ANY($1::uuid[])
       GROUP BY e.id`,
      [ids],
    );
    const byId = new Map(
      rows.map((row) => [
        row.eventId,
        {
          guestCount: Number(row.guestCount ?? 0),
          confirmedCount: Number(row.confirmedCount ?? 0),
        },
      ]),
    );

    for (const event of events) {
      const stats = byId.get(event.id) ?? { guestCount: 0, confirmedCount: 0 };
      Object.assign(event, stats);
    }
    return events;
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

    if (
      dto.type !== undefined ||
      dto.has_tables !== undefined ||
      dto.table_count !== undefined ||
      dto.default_max_companions !== undefined ||
      dto.has_zones !== undefined ||
      dto.zones !== undefined
    ) {
      const extras = this.resolveTypeExtras({
        type: dto.type ?? event.type,
        has_tables: dto.has_tables ?? event.hasTables,
        table_count: dto.table_count ?? event.tableCount ?? undefined,
        default_max_companions:
          dto.default_max_companions ?? event.defaultMaxCompanions,
        has_zones: dto.has_zones ?? event.hasZones,
        zones: dto.zones ?? event.zones ?? undefined,
      });
      Object.assign(event, extras);
    }
    if (dto.logo !== undefined) {
      event.logo = this.normalizeLogo(dto.logo);
    }

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
    if (endsAt.getTime() < startsAt.getTime()) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: 'La fecha de fin no puede ser anterior a la de inicio',
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

  private resolveTypeExtras(dto: {
    type?: EventType;
    has_tables?: boolean;
    table_count?: number | null;
    default_max_companions?: number;
    has_zones?: boolean;
    zones?: string | null;
  }): {
    type: EventType;
    hasTables: boolean;
    tableCount: number | null;
    defaultMaxCompanions: number;
    hasZones: boolean;
    zones: string | null;
  } {
    const type = dto.type ?? EventType.SOCIAL;
    if (type === EventType.SOCIAL) {
      const hasTables = Boolean(dto.has_tables);
      return {
        type,
        hasTables,
        tableCount: hasTables ? dto.table_count ?? null : null,
        defaultMaxCompanions: dto.default_max_companions ?? 0,
        hasZones: false,
        zones: null,
      };
    }
    if (type === EventType.ENTERTAINMENT) {
      const hasZones = Boolean(dto.has_zones);
      return {
        type,
        hasTables: false,
        tableCount: null,
        defaultMaxCompanions: 0,
        hasZones,
        zones: hasZones ? this.normalizeZones(dto.zones ?? null) : null,
      };
    }
    return {
      type,
      hasTables: false,
      tableCount: null,
      defaultMaxCompanions: 0,
      hasZones: false,
      zones: null,
    };
  }

  private normalizeZones(value: string | null): string | null {
    if (!value?.trim()) {
      return null;
    }
    const parts = value
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
  }

  private normalizeLogo(value?: string | null): string | null {
    if (value === undefined || value === null) {
      return null;
    }
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    if (trimmed.length > 2_000_000) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: 'El logo es demasiado grande',
      });
    }
    if (!trimmed.startsWith('data:image/')) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: 'El logo debe ser una imagen',
      });
    }
    return trimmed;
  }

  private emptyToNull(value: string | undefined): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }
}
