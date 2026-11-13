import { randomUUID } from 'crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { isEmail, validate, ValidationError } from 'class-validator';
import QRCode from 'qrcode';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Event } from '../events/event.entity';
import { EventPlan } from '../events/event-plan.enum';
import { EventStatus } from '../events/event-status.enum';
import { EventType } from '../events/event-type.enum';
import { User } from '../users/user.entity';
import { UserRole } from '../users/user-role.enum';
import { CreateGuestDto } from './dto/create-guest.dto';
import { ImportGuestsDto } from './dto/import-guests.dto';
import { Guest } from './guest.entity';
import { Pass } from './pass.entity';
import { PassAccessStatus } from './pass-access-status.enum';
import { PassRsvpStatus } from './pass-rsvp-status.enum';

const PLAN_GUEST_LIMIT: Record<EventPlan, number> = {
  [EventPlan.FREE]: 50,
  [EventPlan.BASIC]: 150,
  [EventPlan.PRO]: 500,
};

const COLUMN_ALIASES: Record<
  string,
  'name' | 'phone' | 'email' | 'max_companions' | 'table_number' | 'zone' | 'notes'
> = {
  name: 'name',
  nombre: 'name',
  phone: 'phone',
  telefono: 'phone',
  tel: 'phone',
  celular: 'phone',
  email: 'email',
  correo: 'email',
  'e-mail': 'email',
  max_companions: 'max_companions',
  acompanantes: 'max_companions',
  companions: 'max_companions',
  table_number: 'table_number',
  mesa: 'table_number',
  zone: 'zone',
  zona: 'zone',
  notes: 'notes',
  notas: 'notes',
};

const EMAIL_PATTERN = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const PHONE_PATTERN = /\+?\d[\d\s().-]{5,22}\d/;

export interface CsvUpload {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
}

export interface PassView {
  id: string;
  guestId: string;
  eventId: string;
  rsvpToken: string;
  qrToken: string | null;
  rsvpStatus: PassRsvpStatus;
  companionsConfirmed: number;
  accessedAt: Date | null;
  accessStatus: PassAccessStatus;
  rsvpAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface GuestView {
  id: string;
  eventId: string;
  name: string;
  phone: string | null;
  email: string | null;
  maxCompanions: number;
  tableNumber: number | null;
  zone: string | null;
  notes: string | null;
  createdAt: Date;
  pass: PassView | null;
}

export interface PassQrView {
  guestName: string;
  eventName: string;
  eventType: EventType;
  logo: string | null;
  tableNumber: number | null;
  maxCompanions: number;
  zone: string | null;
  companionsConfirmed: number;
  qrDataUrl: string;
  shareUrl: string;
  rsvpStatus: PassRsvpStatus;
}

export interface ImportRejection {
  line: number;
  reason: string;
}

export interface ImportGuestsResult {
  imported: number;
  duplicates: number;
  rejected: ImportRejection[];
  guests: GuestView[];
}

interface NormalizedGuest {
  name: string;
  phone: string | null;
  email: string | null;
  maxCompanions: number;
  tableNumber: number | null;
  zone: string | null;
  notes: string | null;
  phoneKey: string | null;
  emailKey: string | null;
}

interface ParsedGuests {
  guests: CreateGuestDto[];
  rejected: ImportRejection[];
  duplicates: number;
}

@Injectable()
export class GuestsService {
  constructor(
    @InjectRepository(Guest)
    private readonly guests: Repository<Guest>,
    @InjectRepository(Pass)
    private readonly passes: Repository<Pass>,
    @InjectRepository(Event)
    private readonly events: Repository<Event>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
  ) {}

  async createOne(
    eventId: string,
    dto: CreateGuestDto,
    userId: string,
  ): Promise<GuestView> {
    const result = await this.importGuests(
      eventId,
      userId,
      Object.assign(new ImportGuestsDto(), { guests: [dto] }),
      [],
      0,
      true,
    );
    const guest = result.guests[0];
    if (!guest) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: 'No se pudo crear el invitado',
      });
    }
    return guest;
  }

  async importCsv(
    eventId: string,
    file: CsvUpload | undefined,
    userId: string,
  ): Promise<ImportGuestsResult> {
    if (!file?.buffer?.length) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: 'Sube un archivo CSV',
      });
    }
    const name = file.originalname?.toLowerCase() ?? '';
    const type = file.mimetype?.toLowerCase() ?? '';
    if (!name.endsWith('.csv') && !type.includes('csv')) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: 'El archivo debe ser CSV',
      });
    }
    const parsed = await this.parseCsv(file.buffer.toString('utf8'));
    return this.finishImport(eventId, userId, parsed);
  }

  async importText(
    eventId: string,
    text: string,
    userId: string,
  ): Promise<ImportGuestsResult> {
    const parsed = await this.parseText(text);
    return this.finishImport(eventId, userId, parsed);
  }

  async getPassQr(
    eventId: string,
    passId: string,
    userId: string,
  ): Promise<PassQrView> {
    const event = await this.requireOwnedEvent(eventId, userId);
    const pass = await this.passes.findOne({ where: { id: passId, eventId } });
    if (!pass) {
      throw new NotFoundException({
        error: 'PASS_NOT_FOUND',
        message: 'Pase no encontrado',
      });
    }
    if (pass.rsvpStatus !== PassRsvpStatus.CONFIRMED || !pass.qrToken) {
      throw new BadRequestException({
        error: 'QR_NOT_READY',
        message: 'El invitado aún no ha confirmado',
      });
    }
    const guest = await this.guests.findOne({ where: { id: pass.guestId } });
    if (!guest) {
      throw new NotFoundException({
        error: 'GUEST_NOT_FOUND',
        message: 'Invitado no encontrado',
      });
    }
    const qrDataUrl = await QRCode.toDataURL(pass.qrToken, {
      errorCorrectionLevel: 'L',
      margin: 1,
      width: 360,
      type: 'image/png',
    });
    const appUrl = (
      this.config.get<string>('APP_URL') || 'http://localhost:3000'
    ).replace(/\/$/, '');
    return {
      guestName: guest.name,
      eventName: event.name,
      eventType: event.type ?? EventType.SOCIAL,
      logo: event.logo ?? null,
      tableNumber: event.hasTables ? guest.tableNumber : null,
      maxCompanions: guest.maxCompanions,
      zone: event.hasZones ? guest.zone : null,
      companionsConfirmed: pass.companionsConfirmed,
      qrDataUrl,
      shareUrl: `${appUrl}/rsvp/${pass.rsvpToken}`,
      rsvpStatus: pass.rsvpStatus,
    };
  }

  async ensurePasses(
    eventId: string,
    userId: string,
  ): Promise<{ created: number; guests: GuestView[] }> {
    await this.requireOwnedEvent(eventId, userId);
    const guests = await this.guests.find({ where: { eventId } });
    const passes = await this.passes.find({ where: { eventId } });
    const covered = new Set(passes.map((pass) => pass.guestId));
    const missing = guests.filter((guest) => !covered.has(guest.id));
    if (missing.length > 0) {
      await this.passes.save(
        missing.map((guest) =>
          this.passes.create({
            guestId: guest.id,
            eventId,
            rsvpToken: randomUUID(),
            qrToken: null,
            rsvpStatus: PassRsvpStatus.PENDING,
            companionsConfirmed: 0,
            accessStatus: PassAccessStatus.NOT_ACCESSED,
            accessedAt: null,
            rsvpAt: null,
          }),
        ),
      );
    }
    return {
      created: missing.length,
      guests: await this.findAll(eventId, userId),
    };
  }

  async findAll(eventId: string, userId: string): Promise<GuestView[]> {
    await this.requireOwnedEvent(eventId, userId);
    const guests = await this.guests.find({
      where: { eventId },
      order: { createdAt: 'DESC' },
    });
    if (guests.length === 0) {
      return [];
    }
    const passes = await this.passes.find({ where: { eventId } });
    const byGuest = new Map(passes.map((pass) => [pass.guestId, pass]));
    return guests.map((guest) =>
      this.toView(guest, byGuest.get(guest.id) ?? null),
    );
  }

  private async finishImport(
    eventId: string,
    userId: string,
    parsed: ParsedGuests,
  ): Promise<ImportGuestsResult> {
    if (parsed.guests.length === 0) {
      const event = await this.requireOwnedEvent(eventId, userId);
      this.assertCanAddGuests(event);
      return {
        imported: 0,
        duplicates: parsed.duplicates,
        rejected: parsed.rejected,
        guests: [],
      };
    }
    const payload = Object.assign(new ImportGuestsDto(), {
      guests: parsed.guests,
    });
    return this.importGuests(
      eventId,
      userId,
      payload,
      parsed.rejected,
      parsed.duplicates,
      false,
    );
  }

  private async importGuests(
    eventId: string,
    userId: string,
    payload: ImportGuestsDto,
    rejected: ImportRejection[],
    duplicates: number,
    strictDuplicates: boolean,
  ): Promise<ImportGuestsResult> {
    const rejectedRows = [...rejected];
    return this.dataSource.transaction(async (manager) => {
      const event = await this.lockOwnedEvent(manager, eventId, userId);
      this.assertCanAddGuests(event);

      const existing = await manager.getRepository(Guest).find({
        where: { eventId },
        select: ['id', 'phone', 'email'],
      });
      const emails = new Set<string>();
      const phones = new Set<string>();
      for (const guest of existing) {
        if (guest.email) {
          emails.add(guest.email.toLowerCase());
        }
        if (guest.phone) {
          phones.add(guest.phone);
        }
      }

      const ready: NormalizedGuest[] = [];
      let skipped = duplicates;
      for (const dto of payload.guests) {
        const normalized = this.normalize(dto, event.defaultMaxCompanions);
        if (!normalized.guest) {
          if (strictDuplicates) {
            throw new BadRequestException({
              error: 'VALIDATION_ERROR',
              message: normalized.error ?? 'Datos del invitado no válidos',
            });
          }
          rejectedRows.push({
            line: 0,
            reason: normalized.error ?? 'Datos del invitado no válidos',
          });
          continue;
        }
        const guest = normalized.guest;
        const isDuplicate =
          (guest.emailKey !== null && emails.has(guest.emailKey)) ||
          (guest.phoneKey !== null && phones.has(guest.phoneKey));
        if (isDuplicate) {
          if (strictDuplicates) {
            throw new ConflictException({
              error: 'DUPLICATE_GUEST',
              message:
                'Ya existe un invitado con ese teléfono o correo en el evento',
            });
          }
          skipped += 1;
          continue;
        }
        if (guest.emailKey) {
          emails.add(guest.emailKey);
        }
        if (guest.phoneKey) {
          phones.add(guest.phoneKey);
        }
        ready.push(guest);
      }

      const limit = PLAN_GUEST_LIMIT[event.plan];
      if (existing.length + ready.length > limit) {
        throw new BadRequestException({
          error: 'PLAN_LIMIT_EXCEEDED',
          message: `El plan ${event.plan} permite hasta ${limit} invitados`,
        });
      }

      const saved = await this.saveGuests(manager, eventId, ready);
      return {
        imported: saved.length,
        duplicates: skipped,
        rejected: rejectedRows,
        guests: saved,
      };
    });
  }

  private async saveGuests(
    manager: EntityManager,
    eventId: string,
    ready: NormalizedGuest[],
  ): Promise<GuestView[]> {
    if (ready.length === 0) {
      return [];
    }
    const guestsRepo = manager.getRepository(Guest);
    const passesRepo = manager.getRepository(Pass);
    const savedGuests = await guestsRepo.save(
      ready.map((guest) =>
        guestsRepo.create({
          eventId,
          name: guest.name,
          phone: guest.phone,
          email: guest.email,
          maxCompanions: guest.maxCompanions,
          tableNumber: guest.tableNumber,
          zone: guest.zone,
          notes: guest.notes,
        }),
      ),
    );
    const savedPasses = await passesRepo.save(
      savedGuests.map((guest) =>
        passesRepo.create({
          guestId: guest.id,
          eventId,
          rsvpToken: randomUUID(),
          qrToken: null,
          rsvpStatus: PassRsvpStatus.PENDING,
          companionsConfirmed: 0,
          accessStatus: PassAccessStatus.NOT_ACCESSED,
          accessedAt: null,
          rsvpAt: null,
        }),
      ),
    );
    return savedGuests.map((guest, index) =>
      this.toView(guest, savedPasses[index] ?? null),
    );
  }

  private async requireOwnedEvent(
    eventId: string,
    userId: string,
  ): Promise<Event> {
    const event = await this.events.findOne({ where: { id: eventId } });
    if (!event) {
      throw new NotFoundException({
        error: 'EVENT_NOT_FOUND',
        message: 'Evento no encontrado',
      });
    }
    await this.assertAccess(event, userId, this.users);
    return event;
  }

  private async lockOwnedEvent(
    manager: EntityManager,
    eventId: string,
    userId: string,
  ): Promise<Event> {
    const event = await manager
      .getRepository(Event)
      .createQueryBuilder('event')
      .setLock('pessimistic_write')
      .where('event.id = :eventId', { eventId })
      .getOne();
    if (!event) {
      throw new NotFoundException({
        error: 'EVENT_NOT_FOUND',
        message: 'Evento no encontrado',
      });
    }
    await this.assertAccess(event, userId, manager.getRepository(User));
    return event;
  }

  private async assertAccess(
    event: Event,
    userId: string,
    users: Repository<User>,
  ): Promise<void> {
    const user = await users.findOne({ where: { id: userId } });
    if (!user || user.role === UserRole.STAFF) {
      throw new ForbiddenException({
        error: 'FORBIDDEN',
        message: 'No puedes gestionar invitados de este evento',
      });
    }
    if (user.role === UserRole.PLANNER && event.ownerId !== userId) {
      throw new NotFoundException({
        error: 'EVENT_NOT_FOUND',
        message: 'Evento no encontrado',
      });
    }
  }

  private assertCanAddGuests(event: Event): void {
    if (
      event.status === EventStatus.CLOSED ||
      event.status === EventStatus.CANCELLED
    ) {
      throw new BadRequestException({
        error: 'EVENT_CLOSED',
        message:
          'No se pueden agregar invitados a un evento cerrado o cancelado',
      });
    }
  }

  private async parseCsv(content: string): Promise<ParsedGuests> {
    const table = parseCsvTable(content);
    if (table.length === 0) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: 'El CSV está vacío',
      });
    }
    const header = table[0].map((cell) => COLUMN_ALIASES[columnKey(cell)]);
    const nameIndex = header.indexOf('name');
    const phoneIndex = header.indexOf('phone');
    const emailIndex = header.indexOf('email');
    const companionsIndex = header.indexOf('max_companions');
    const tableIndex = header.indexOf('table_number');
    const zoneIndex = header.indexOf('zone');
    const notesIndex = header.indexOf('notes');
    if (nameIndex < 0) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: 'El CSV debe incluir la columna name',
      });
    }
    if (phoneIndex < 0 && emailIndex < 0) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: 'El CSV debe incluir teléfono o correo',
      });
    }

    const parsed: ParsedGuests = { guests: [], rejected: [], duplicates: 0 };
    const emails = new Set<string>();
    const phones = new Set<string>();
    for (let index = 1; index < table.length; index++) {
      const cells = table[index];
      const line = index + 1;
      const companions = readCompanions(
        companionsIndex >= 0 ? cells[companionsIndex] : undefined,
      );
      if (companions.error) {
        parsed.rejected.push({ line, reason: companions.error });
        continue;
      }
      const tableNumber = readOptionalInt(
        tableIndex >= 0 ? cells[tableIndex] : undefined,
      );
      if (tableNumber.error) {
        parsed.rejected.push({ line, reason: tableNumber.error });
        continue;
      }
      const dto = plainToInstance(CreateGuestDto, {
        name: cells[nameIndex] ?? '',
        phone: phoneIndex >= 0 ? blankToUndefined(cells[phoneIndex]) : undefined,
        email: emailIndex >= 0 ? blankToUndefined(cells[emailIndex]) : undefined,
        max_companions: companions.value,
        table_number: tableNumber.value,
        zone: zoneIndex >= 0 ? blankToUndefined(cells[zoneIndex]) : undefined,
        notes: notesIndex >= 0 ? blankToUndefined(cells[notesIndex]) : undefined,
      });
      const errors = await validate(dto);
      if (errors.length > 0) {
        parsed.rejected.push({ line, reason: flattenErrors(errors) });
        continue;
      }
      const normalized = this.normalize(dto);
      if (!normalized.guest) {
        parsed.rejected.push({
          line,
          reason: normalized.error ?? 'Datos del invitado no válidos',
        });
        continue;
      }
      if (this.rememberDuplicate(normalized.guest, emails, phones)) {
        parsed.duplicates += 1;
        continue;
      }
      parsed.guests.push(this.toDto(normalized.guest));
    }
    return parsed;
  }

  private async parseText(text: string): Promise<ParsedGuests> {
    const parsed: ParsedGuests = { guests: [], rejected: [], duplicates: 0 };
    const emails = new Set<string>();
    const phones = new Set<string>();
    const lines = text.split(/\r?\n/);
    for (let index = 0; index < lines.length; index++) {
      const raw = lines[index].trim();
      if (!raw) {
        continue;
      }
      const line = index + 1;
      const extracted = extractFreeLine(raw);
      if (!extracted.dto) {
        parsed.rejected.push({
          line,
          reason: extracted.error ?? 'Línea no válida',
        });
        continue;
      }
      const dto = plainToInstance(CreateGuestDto, extracted.dto);
      const errors = await validate(dto);
      if (errors.length > 0) {
        parsed.rejected.push({ line, reason: flattenErrors(errors) });
        continue;
      }
      const normalized = this.normalize(dto);
      if (!normalized.guest) {
        parsed.rejected.push({
          line,
          reason: normalized.error ?? 'Datos del invitado no válidos',
        });
        continue;
      }
      if (this.rememberDuplicate(normalized.guest, emails, phones)) {
        parsed.duplicates += 1;
        continue;
      }
      parsed.guests.push(this.toDto(normalized.guest));
    }
    return parsed;
  }

  private rememberDuplicate(
    guest: NormalizedGuest,
    emails: Set<string>,
    phones: Set<string>,
  ): boolean {
    const isDuplicate =
      (guest.emailKey !== null && emails.has(guest.emailKey)) ||
      (guest.phoneKey !== null && phones.has(guest.phoneKey));
    if (isDuplicate) {
      return true;
    }
    if (guest.emailKey) {
      emails.add(guest.emailKey);
    }
    if (guest.phoneKey) {
      phones.add(guest.phoneKey);
    }
    return false;
  }

  private toDto(guest: NormalizedGuest): CreateGuestDto {
    const dto = new CreateGuestDto();
    dto.name = guest.name;
    dto.phone = guest.phone ?? undefined;
    dto.email = guest.email ?? undefined;
    dto.max_companions = guest.maxCompanions;
    dto.table_number = guest.tableNumber ?? undefined;
    dto.zone = guest.zone ?? undefined;
    dto.notes = guest.notes ?? undefined;
    return dto;
  }

  private normalize(
    dto: CreateGuestDto,
    defaultMaxCompanions = 0,
  ): { guest?: NormalizedGuest; error?: string } {
    const name = dto.name?.trim() ?? '';
    if (!name) {
      return { error: 'El nombre es obligatorio' };
    }
    if (name.length > 150) {
      return { error: 'El nombre supera 150 caracteres' };
    }
    const phone = this.readPhone(dto.phone);
    if (phone.error) {
      return { error: phone.error };
    }
    const email = this.readEmail(dto.email);
    if (email.error) {
      return { error: email.error };
    }
    if (!phone.phone && !email.email) {
      return { error: 'El invitado debe tener teléfono o correo' };
    }
    const maxCompanions = dto.max_companions ?? defaultMaxCompanions;
    if (!Number.isInteger(maxCompanions) || maxCompanions < 0) {
      return { error: 'Los acompañantes máximos no son válidos' };
    }
    const tableNumber =
      dto.table_number === undefined || dto.table_number === null
        ? null
        : dto.table_number;
    if (tableNumber !== null && (!Number.isInteger(tableNumber) || tableNumber < 1)) {
      return { error: 'El número de mesa no es válido' };
    }
    const zone = dto.zone?.trim() || null;
    const notes = dto.notes?.trim();
    return {
      guest: {
        name,
        phone: phone.phone,
        email: email.email,
        maxCompanions,
        tableNumber,
        zone,
        notes: notes ? notes : null,
        phoneKey: phone.phone,
        emailKey: email.email,
      },
    };
  }

  private readPhone(raw?: string): { phone: string | null; error?: string } {
    if (!raw?.trim()) {
      return { phone: null };
    }
    const digits = raw.replace(/\D/g, '');
    if (digits.length < 7 || digits.length > 20) {
      return { phone: null, error: 'El teléfono no es válido' };
    }
    return { phone: digits };
  }

  private readEmail(raw?: string): { email: string | null; error?: string } {
    if (!raw?.trim()) {
      return { email: null };
    }
    const email = raw.trim().toLowerCase();
    if (email.length > 255 || !isEmail(email)) {
      return { email: null, error: 'El correo no es válido' };
    }
    return { email };
  }

  private toView(guest: Guest, pass: Pass | null): GuestView {
    return {
      id: guest.id,
      eventId: guest.eventId,
      name: guest.name,
      phone: guest.phone,
      email: guest.email,
      maxCompanions: guest.maxCompanions,
      tableNumber: guest.tableNumber,
      zone: guest.zone,
      notes: guest.notes,
      createdAt: guest.createdAt,
      pass: pass
        ? {
            id: pass.id,
            guestId: pass.guestId,
            eventId: pass.eventId,
            rsvpToken: pass.rsvpToken,
            qrToken: pass.qrToken,
            rsvpStatus: pass.rsvpStatus,
            companionsConfirmed: pass.companionsConfirmed,
            accessedAt: pass.accessedAt,
            accessStatus: pass.accessStatus,
            rsvpAt: pass.rsvpAt,
            createdAt: pass.createdAt,
            updatedAt: pass.updatedAt,
          }
        : null,
    };
  }
}

function blankToUndefined(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function columnKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, '_');
}

function readCompanions(raw: string | undefined): {
  value: number;
  error?: string;
} {
  if (!raw?.trim()) {
    return { value: 0 };
  }
  if (!/^\d+$/.test(raw.trim())) {
    return { value: 0, error: 'Los acompañantes máximos no son válidos' };
  }
  return { value: Number(raw.trim()) };
}

function readOptionalInt(raw: string | undefined): {
  value?: number;
  error?: string;
} {
  if (!raw?.trim()) {
    return {};
  }
  if (!/^\d+$/.test(raw.trim())) {
    return { error: 'El número de mesa no es válido' };
  }
  const value = Number(raw.trim());
  if (value < 1) {
    return { error: 'El número de mesa no es válido' };
  }
  return { value };
}

function flattenErrors(errors: ValidationError[]): string {
  const messages: string[] = [];
  for (const error of errors) {
    if (error.constraints) {
      messages.push(...Object.values(error.constraints));
    }
    if (error.children?.length) {
      messages.push(flattenErrors(error.children));
    }
  }
  return messages.join('. ') || 'Datos del invitado no válidos';
}

function extractFreeLine(line: string): {
  dto?: CreateGuestDto;
  error?: string;
} {
  const emailMatch = line.match(EMAIL_PATTERN);
  let rest = line;
  let email: string | undefined;
  if (emailMatch) {
    email = emailMatch[0];
    rest = rest.replace(email, ' ');
  }
  const phoneMatch = rest.match(PHONE_PATTERN);
  let phone: string | undefined;
  if (phoneMatch) {
    phone = phoneMatch[0];
    rest = rest.replace(phone, ' ');
  }
  const name = rest
    .replace(/[|,;<>()[\]{}]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[-–—:\s]+|[-–—:\s]+$/g, '')
    .trim();
  if (!name) {
    return { error: 'Falta el nombre' };
  }
  if (!phone && !email) {
    return { error: 'El invitado debe tener teléfono o correo' };
  }
  const dto = new CreateGuestDto();
  dto.name = name;
  dto.phone = phone;
  dto.email = email;
  dto.max_companions = 0;
  return { dto };
}

function detectDelimiter(sample: string): string {
  const counts: Record<string, number> = { ',': 0, ';': 0, '\t': 0 };
  let inQuotes = false;
  for (let i = 0; i < sample.length; i++) {
    const char = sample[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes && (char === '\n' || char === '\r')) {
      break;
    }
    if (!inQuotes && counts[char] !== undefined) {
      counts[char] += 1;
    }
  }
  return Object.entries(counts).sort((left, right) => right[1] - left[1])[0][0];
}

function parseCsvTable(content: string): string[][] {
  const text = content.replace(/^\uFEFF/, '');
  if (!text.trim()) {
    return [];
  }
  const delimiter = detectDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
      continue;
    }
    if (char === delimiter) {
      row.push(field);
      field = '';
      continue;
    }
    if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') {
        i += 1;
      }
      row.push(field);
      field = '';
      if (row.some((cell) => cell.trim() !== '')) {
        rows.push(row);
      }
      row = [];
      continue;
    }
    field += char;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some((cell) => cell.trim() !== '')) {
      rows.push(row);
    }
  }
  return rows;
}
