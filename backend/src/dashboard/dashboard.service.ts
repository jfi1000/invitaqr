import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from '../events/event.entity';
import { User } from '../users/user.entity';
import { UserRole } from '../users/user-role.enum';
import { DashboardStatsDto } from './dto/dashboard-stats.dto';

interface StatsRow {
  ownerId: string;
  totalGuests: number | string;
  confirmed: number | string;
  declined: number | string;
  waitlist: number | string;
  pending: number | string;
  accessed: number | string;
  notAccessed: number | string;
  occupancyPercent: number | string;
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Event)
    private readonly events: Repository<Event>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  async getEventStats(
    eventId: string,
    userId: string,
  ): Promise<DashboardStatsDto> {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user || user.role === UserRole.STAFF) {
      throw new ForbiddenException({
        error: 'FORBIDDEN',
        message: 'No puedes ver las estadísticas de este evento',
      });
    }

    const rows: StatsRow[] = await this.events.query(
      `SELECT
         e.owner_id AS "ownerId",
         (SELECT COUNT(*)::int FROM guests g WHERE g.event_id = e.id) AS "totalGuests",
         COUNT(*) FILTER (WHERE p.rsvp_status = 'CONFIRMED')::int AS confirmed,
         COUNT(*) FILTER (WHERE p.rsvp_status = 'DECLINED')::int AS declined,
         COUNT(*) FILTER (WHERE p.rsvp_status = 'WAITLIST')::int AS waitlist,
         COUNT(*) FILTER (WHERE p.rsvp_status = 'PENDING')::int AS pending,
         COUNT(*) FILTER (WHERE p.access_status = 'ACCESSED')::int AS accessed,
         COUNT(*) FILTER (
           WHERE p.rsvp_status = 'CONFIRMED'
             AND p.access_status = 'NOT_ACCESSED'
         )::int AS "notAccessed",
         CASE
           WHEN e.capacity = 0 THEN 0
           ELSE ROUND(
             (
               COUNT(*) FILTER (WHERE p.access_status = 'ACCESSED')::numeric
               / e.capacity
             ) * 100,
             1
           )
         END AS "occupancyPercent"
       FROM events e
       LEFT JOIN passes p ON p.event_id = e.id
       WHERE e.id = $1
       GROUP BY e.id`,
      [eventId],
    );

    const row = rows[0];
    if (!row || (user.role === UserRole.PLANNER && row.ownerId !== userId)) {
      throw new NotFoundException({
        error: 'EVENT_NOT_FOUND',
        message: 'Evento no encontrado',
      });
    }

    return {
      totalGuests: Number(row.totalGuests ?? 0),
      confirmed: Number(row.confirmed ?? 0),
      declined: Number(row.declined ?? 0),
      waitlist: Number(row.waitlist ?? 0),
      pending: Number(row.pending ?? 0),
      accessed: Number(row.accessed ?? 0),
      notAccessed: Number(row.notAccessed ?? 0),
      occupancyPercent: Number(row.occupancyPercent ?? 0),
    };
  }
}
