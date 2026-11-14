import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EventPlan } from './event-plan.enum';
import { EventStatus } from './event-status.enum';
import { EventType } from './event-type.enum';

@Entity('events')
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId: string;

  @Column({ length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 300, nullable: true })
  location: string | null;

  @Column({ name: 'venue_name', type: 'varchar', length: 200, nullable: true })
  venueName: string | null;

  @Column({ type: 'double precision', nullable: true })
  latitude: number | null;

  @Column({ type: 'double precision', nullable: true })
  longitude: number | null;

  @Column({ name: 'starts_at', type: 'timestamptz' })
  startsAt: Date;

  @Column({ name: 'ends_at', type: 'timestamptz' })
  endsAt: Date;

  @Column({ type: 'int', default: 100 })
  capacity: number;

  @Column({ name: 'rsvp_deadline', type: 'timestamptz', nullable: true })
  rsvpDeadline: Date | null;

  @Column({ type: 'varchar', length: 20, default: EventPlan.FREE })
  plan: EventPlan;

  @Column({ type: 'varchar', length: 20, default: EventStatus.DRAFT })
  status: EventStatus;

  @Column({ type: 'varchar', length: 30, default: EventType.SOCIAL })
  type: EventType;

  @Column({ name: 'has_tables', type: 'boolean', default: false })
  hasTables: boolean;

  @Column({ name: 'table_count', type: 'int', nullable: true })
  tableCount: number | null;

  @Column({ name: 'default_max_companions', type: 'int', default: 0 })
  defaultMaxCompanions: number;

  @Column({ name: 'has_zones', type: 'boolean', default: false })
  hasZones: boolean;

  @Column({ type: 'text', nullable: true })
  zones: string | null;

  @Column({ type: 'text', nullable: true })
  logo: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
