import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { randomBytes, randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { AuthUser } from '../auth/token-payload';
import { BCRYPT_ROUNDS } from '../common/constants';
import { Event } from '../events/event.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { User } from '../users/user.entity';
import { UserRole } from '../users/user-role.enum';
import { InviteStaffDto } from './dto/invite-staff.dto';
import { EventStaff } from './event-staff.entity';
import { StaffInvite } from './staff-invite.entity';

export type StaffAssignmentStatus = 'active' | 'invited';

export interface StaffMemberView {
  staffId: string;
  name: string;
  email: string;
  status: StaffAssignmentStatus;
  assignedAt: Date;
}

export interface InviteStaffResult {
  staffId: string;
  name: string;
  email: string;
  status: 'invited' | 'assigned';
}

export interface StaffEventSummary {
  id: string;
  name: string;
  date: string;
  location: string | null;
  venueName: string | null;
  status: string;
  logo: string | null;
}

@Injectable()
export class StaffService {
  constructor(
    @InjectRepository(EventStaff)
    private readonly eventStaff: Repository<EventStaff>,
    @InjectRepository(StaffInvite)
    private readonly staffInvites: Repository<StaffInvite>,
    @InjectRepository(Event)
    private readonly events: Repository<Event>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly notifications: NotificationsService,
  ) {}

  async invite(
    eventId: string,
    dto: InviteStaffDto,
    actor: AuthUser,
  ): Promise<InviteStaffResult> {
    const event = await this.requireEventForManager(eventId, actor);
    const email = dto.email.trim().toLowerCase();
    const name = dto.name.trim();

    let staff = await this.users.findOne({ where: { email } });
    let created = false;

    if (staff) {
      if (staff.role !== UserRole.STAFF) {
        throw new ConflictException({
          error: 'EMAIL_NOT_STAFF',
          message: 'Ese correo ya pertenece a otra cuenta (no staff)',
        });
      }
      if (name && staff.name !== name) {
        staff.name = name;
        staff = await this.users.save(staff);
      }
    } else {
      const tempPassword = randomBytes(24).toString('base64url');
      staff = this.users.create({
        name,
        email,
        passwordHash: await bcrypt.hash(tempPassword, BCRYPT_ROUNDS),
        role: UserRole.STAFF,
        isActive: false,
      });
      try {
        staff = await this.users.save(staff);
      } catch {
        throw new ConflictException({
          error: 'EMAIL_ALREADY_EXISTS',
          message: 'Ese correo ya está registrado',
        });
      }
      created = true;
    }

    const existing = await this.eventStaff.findOne({
      where: { eventId: event.id, staffId: staff.id },
    });
    if (!existing) {
      await this.eventStaff.save(
        this.eventStaff.create({
          eventId: event.id,
          staffId: staff.id,
        }),
      );
    }

    const needsActivation = created || !staff.isActive;
    if (needsActivation) {
      const inviteToken = await this.upsertInvite(staff.id);
      await this.notifications.sendStaffInvite({
        staffName: staff.name,
        staffEmail: staff.email,
        eventName: event.name,
        inviteToken,
      });
    } else {
      await this.notifications.sendStaffAccess({
        staffName: staff.name,
        staffEmail: staff.email,
        eventName: event.name,
      });
    }

    return {
      staffId: staff.id,
      name: staff.name,
      email: staff.email,
      status: needsActivation ? 'invited' : 'assigned',
    };
  }

  async getInviteStatus(
    inviteToken: string,
  ): Promise<{ status: 'valid' | 'expired' | 'unavailable' }> {
    const token = inviteToken?.trim();
    if (!token) {
      return { status: 'unavailable' };
    }
    const invite = await this.staffInvites.findOne({ where: { inviteToken: token } });
    if (!invite) {
      return { status: 'unavailable' };
    }
    if (invite.inviteTokenExpiry.getTime() < Date.now()) {
      return { status: 'expired' };
    }
    return { status: 'valid' };
  }

  async listForEvent(
    eventId: string,
    actor: AuthUser,
  ): Promise<StaffMemberView[]> {
    await this.requireEventForManager(eventId, actor);
    const rows = await this.eventStaff
      .createQueryBuilder('es')
      .innerJoin(User, 'u', 'u.id = es.staff_id')
      .where('es.event_id = :eventId', { eventId })
      .select([
        'es.staff_id AS "staffId"',
        'es.created_at AS "assignedAt"',
        'u.name AS name',
        'u.email AS email',
        'u.is_active AS "isActive"',
      ])
      .orderBy('es.created_at', 'DESC')
      .getRawMany<{
        staffId: string;
        assignedAt: Date;
        name: string;
        email: string;
        isActive: boolean;
      }>();

    return rows.map((row) => ({
      staffId: row.staffId,
      name: row.name,
      email: row.email,
      status: row.isActive ? 'active' : 'invited',
      assignedAt: row.assignedAt,
    }));
  }

  async removeFromEvent(
    eventId: string,
    staffId: string,
    actor: AuthUser,
  ): Promise<{ removed: true }> {
    await this.requireEventForManager(eventId, actor);
    const result = await this.eventStaff.delete({ eventId, staffId });
    if (!result.affected) {
      throw new NotFoundException({
        error: 'STAFF_ASSIGNMENT_NOT_FOUND',
        message: 'Ese personal no está asignado a este evento',
      });
    }
    return { removed: true };
  }

  async myEvents(staffId: string): Promise<StaffEventSummary[]> {
    const rows = await this.events
      .createQueryBuilder('e')
      .innerJoin(EventStaff, 'es', 'es.event_id = e.id')
      .where('es.staff_id = :staffId', { staffId })
      .orderBy('e.starts_at', 'ASC')
      .getMany();

    return rows.map((event) => this.toEventSummary(event));
  }

  async getEventForScanner(
    eventId: string,
    actor: AuthUser,
  ): Promise<StaffEventSummary> {
    if (actor.role !== UserRole.STAFF && actor.role !== UserRole.OWNER) {
      throw new ForbiddenException({
        error: 'FORBIDDEN',
        message: 'Solo el personal de acceso puede ver este evento',
      });
    }

    const event = await this.events.findOne({ where: { id: eventId } });
    if (!event) {
      throw new NotFoundException({
        error: 'EVENT_NOT_FOUND',
        message: 'Evento no encontrado',
      });
    }

    if (actor.role === UserRole.STAFF) {
      await this.assertAssignedToEvent(eventId, actor.id);
    }

    return this.toEventSummary(event);
  }

  private toEventSummary(event: Event): StaffEventSummary {
    return {
      id: event.id,
      name: event.name,
      date: event.startsAt.toISOString(),
      location: event.location,
      venueName: event.venueName,
      status: event.status,
      logo: event.logo,
    };
  }

  async setPassword(inviteToken: string, password: string): Promise<{ success: true }> {
    const invite = await this.staffInvites.findOne({ where: { inviteToken } });
    if (!invite) {
      throw new BadRequestException({
        error: 'INVALID_INVITE',
        message: 'El enlace de invitación no es válido',
      });
    }
    if (invite.inviteTokenExpiry.getTime() < Date.now()) {
      throw new BadRequestException({
        error: 'INVITE_EXPIRED',
        message: 'El enlace de invitación expiró. Pide una nueva invitación',
      });
    }

    const user = await this.users.findOne({ where: { id: invite.staffId } });
    if (!user || user.role !== UserRole.STAFF) {
      throw new BadRequestException({
        error: 'INVALID_INVITE',
        message: 'El enlace de invitación no es válido',
      });
    }

    user.passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    user.isActive = true;
    await this.users.save(user);
    await this.staffInvites.delete({ staffId: user.id });

    const assigned = await this.myEvents(user.id);
    const eventName = assigned[0]?.name ?? 'tu evento';
    try {
      await this.notifications.sendStaffAccess({
        staffName: user.name,
        staffEmail: user.email,
        eventName,
      });
    } catch {
      // La cuenta ya quedó activa aunque el correo de acceso falle
    }

    return { success: true };
  }

  async assertAssignedToEvent(eventId: string, staffId: string): Promise<void> {
    const row = await this.eventStaff.findOne({
      where: { eventId, staffId },
    });
    if (!row) {
      throw new ForbiddenException({
        error: 'NOT_ASSIGNED',
        message: 'No estás asignado a este evento',
      });
    }
  }

  private async upsertInvite(staffId: string): Promise<string> {
    const inviteToken = randomUUID();
    const existing = await this.staffInvites.findOne({ where: { staffId } });
    if (existing) {
      existing.inviteToken = inviteToken;
      existing.inviteTokenExpiry = this.inviteExpiry();
      await this.staffInvites.save(existing);
      return inviteToken;
    }
    await this.staffInvites.save(
      this.staffInvites.create({
        staffId,
        inviteToken,
        inviteTokenExpiry: this.inviteExpiry(),
      }),
    );
    return inviteToken;
  }

  private inviteExpiry(): Date {
    return new Date(Date.now() + 48 * 60 * 60 * 1000);
  }

  private async requireEventForManager(
    eventId: string,
    actor: AuthUser,
  ): Promise<Event> {
    if (actor.role === UserRole.STAFF) {
      throw new ForbiddenException({
        error: 'FORBIDDEN',
        message: 'El personal de acceso no puede gestionar staff',
      });
    }
    const event = await this.events.findOne({ where: { id: eventId } });
    if (
      !event ||
      (actor.role === UserRole.PLANNER && event.ownerId !== actor.id)
    ) {
      throw new NotFoundException({
        error: 'EVENT_NOT_FOUND',
        message: 'Evento no encontrado',
      });
    }
    return event;
  }
}
