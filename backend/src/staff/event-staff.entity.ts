import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

@Entity('event_staff')
@Unique('uq_event_staff', ['eventId', 'staffId'])
@Index('idx_event_staff_event', ['eventId'])
@Index('idx_event_staff_staff', ['staffId'])
export class EventStaff {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'event_id', type: 'uuid' })
  eventId: string;

  @Column({ name: 'staff_id', type: 'uuid' })
  staffId: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
