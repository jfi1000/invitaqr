import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PaymentStatus } from './payment-status.enum';

export type PaidPlan = 'BASIC' | 'PRO';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'event_id', type: 'uuid' })
  eventId: string;

  @Column({
    name: 'stripe_session_id',
    type: 'varchar',
    length: 255,
    unique: true,
    nullable: true,
  })
  stripeSessionId: string | null;

  @Column({
    name: 'stripe_payment_id',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  stripePaymentId: string | null;

  @Column({ type: 'varchar', length: 20 })
  plan: PaidPlan;

  @Column({ type: 'int' })
  amount: number;

  @Column({ type: 'varchar', length: 10, default: 'MXN' })
  currency: string;

  @Column({ type: 'varchar', length: 20, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
