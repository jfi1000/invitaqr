import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PassAccessStatus } from './pass-access-status.enum';
import { PassRsvpStatus } from './pass-rsvp-status.enum';

@Entity('passes')
export class Pass {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'guest_id', type: 'uuid' })
  guestId: string;

  @Column({ name: 'event_id', type: 'uuid' })
  eventId: string;

  @Column({ name: 'rsvp_token', type: 'uuid', unique: true })
  rsvpToken: string;

  @Column({ name: 'qr_token', type: 'text', unique: true, nullable: true })
  qrToken: string | null;

  @Column({
    name: 'rsvp_status',
    type: 'varchar',
    length: 20,
    default: PassRsvpStatus.PENDING,
  })
  rsvpStatus: PassRsvpStatus;

  @Column({ name: 'companions_confirmed', type: 'int', default: 0 })
  companionsConfirmed: number;

  @Column({ name: 'accessed_at', type: 'timestamptz', nullable: true })
  accessedAt: Date | null;

  @Column({
    name: 'access_status',
    type: 'varchar',
    length: 20,
    default: PassAccessStatus.NOT_ACCESSED,
  })
  accessStatus: PassAccessStatus;

  @Column({ name: 'rsvp_at', type: 'timestamptz', nullable: true })
  rsvpAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
