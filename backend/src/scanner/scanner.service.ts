import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { DataSource, EntityManager } from 'typeorm';
import { Event } from '../events/event.entity';
import { EventStatus } from '../events/event-status.enum';
import { Guest } from '../guests/guest.entity';
import { Pass } from '../guests/pass.entity';
import { PassAccessStatus } from '../guests/pass-access-status.enum';
import { PassRsvpStatus } from '../guests/pass-rsvp-status.enum';
import { StaffService } from '../staff/staff.service';
import { UserRole } from '../users/user-role.enum';
import { ScanQrDto } from './dto/scan-qr.dto';
import { isWithinScanWindow } from './scan-window';
import { ScanLog } from './scan-log.entity';
import { ScanResult } from './scan-result.enum';

export const QR_JWT = 'SCANNER_QR_JWT';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface QrPayload {
  passId: string;
  eventId: string;
  guestId: string;
  exp?: number;
}

interface CheckedScan {
  result: ScanResult;
  passId: string | null;
  guestName?: string;
  companions?: number;
  tableNumber?: number | null;
}

export interface ScanValidationResult {
  result: ScanResult;
  guestName?: string;
  companions?: number;
  tableNumber?: number | null;
  guestCount?: number;
}

@Injectable()
export class ScannerService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
    private readonly staffService: StaffService,
    @Inject(QR_JWT) private readonly qrJwt: JwtService,
  ) {}

  async validate(
    dto: ScanQrDto,
    scannerId: string,
    role: UserRole,
  ): Promise<ScanValidationResult> {
    if (role === UserRole.STAFF) {
      await this.staffService.assertAssignedToEvent(dto.eventId, scannerId);
    }
    return this.dataSource.transaction((manager) =>
      this.evaluate(manager, dto, scannerId),
    );
  }

  private async evaluate(
    manager: EntityManager,
    dto: ScanQrDto,
    scannerId: string,
  ): Promise<ScanValidationResult> {
    const checked = await this.check(manager, dto);
    await manager.getRepository(ScanLog).insert({
      passId: checked.passId,
      eventId: dto.eventId,
      scannerId,
      rawToken: dto.qrToken,
      result: checked.result,
      scannedAt: new Date(),
    });
    return this.toResponse(checked);
  }

  private async check(
    manager: EntityManager,
    dto: ScanQrDto,
  ): Promise<CheckedScan> {
    const token = await this.readToken(dto.qrToken);
    if (token.error || !token.payload) {
      return { result: ScanResult.INVALID_TOKEN, passId: null };
    }
    if (token.expired) {
      return { result: ScanResult.EXPIRED, passId: null };
    }

    const passId = token.payload.passId;
    if (!UUID_PATTERN.test(passId)) {
      return { result: ScanResult.INVALID_TOKEN, passId: null };
    }

    const pass = await manager
      .getRepository(Pass)
      .createQueryBuilder('pass')
      .setLock('pessimistic_write')
      .where('pass.id = :id', { id: passId })
      .getOne();
    if (!pass) {
      return { result: ScanResult.INVALID_TOKEN, passId: null };
    }

    const guest = await manager
      .getRepository(Guest)
      .findOne({ where: { id: pass.guestId } });
    const known: CheckedScan = {
      result: ScanResult.INVALID_TOKEN,
      passId: pass.id,
      companions: pass.companionsConfirmed,
    };
    if (guest) {
      known.guestName = guest.name;
      known.tableNumber = guest.tableNumber;
    }

    if (pass.eventId !== dto.eventId) {
      return { ...known, result: ScanResult.WRONG_EVENT };
    }

    const event = await manager
      .getRepository(Event)
      .findOne({ where: { id: pass.eventId } });
    if (event && !event.hasTables) {
      known.tableNumber = null;
    }
    if (!event || event.status !== EventStatus.ACTIVE) {
      return { ...known, result: ScanResult.EVENT_INACTIVE };
    }

    if (!isWithinScanWindow(Date.now(), event.startsAt, event.endsAt)) {
      return { ...known, result: ScanResult.OUT_OF_SCHEDULE };
    }

    if (pass.rsvpStatus !== PassRsvpStatus.CONFIRMED) {
      return { ...known, result: ScanResult.NOT_CONFIRMED };
    }

    if (pass.accessStatus !== PassAccessStatus.NOT_ACCESSED) {
      return { ...known, result: ScanResult.ALREADY_USED };
    }

    pass.accessStatus = PassAccessStatus.ACCESSED;
    pass.accessedAt = new Date();
    await manager.getRepository(Pass).save(pass);
    return { ...known, result: ScanResult.OK };
  }

  private async readToken(qrToken: string): Promise<{
    payload?: QrPayload;
    error?: true;
    expired?: true;
  }> {
    let decoded: unknown;
    try {
      decoded = this.qrJwt.decode(qrToken);
    } catch {
      return { error: true };
    }
    if (!decoded || typeof decoded !== 'object') {
      return { error: true };
    }

    let verified: QrPayload;
    try {
      verified = await this.qrJwt.verifyAsync<QrPayload>(qrToken, {
        secret: this.config.get<string>('QR_JWT_SECRET') || undefined,
        ignoreExpiration: true,
      });
    } catch {
      return { error: true };
    }

    if (
      typeof verified.passId !== 'string' ||
      typeof verified.eventId !== 'string' ||
      typeof verified.guestId !== 'string' ||
      typeof verified.exp !== 'number'
    ) {
      return { error: true };
    }
    if (verified.exp * 1000 <= Date.now()) {
      return { payload: verified, expired: true };
    }
    return { payload: verified };
  }

  private toResponse(checked: CheckedScan): ScanValidationResult {
    const response: ScanValidationResult = { result: checked.result };
    if (checked.guestName !== undefined) {
      response.guestName = checked.guestName;
    }
    if (checked.companions !== undefined) {
      response.companions = checked.companions;
      response.guestCount = 1 + checked.companions;
    }
    if (checked.tableNumber !== undefined && checked.tableNumber !== null) {
      response.tableNumber = checked.tableNumber;
    }
    return response;
  }
}
