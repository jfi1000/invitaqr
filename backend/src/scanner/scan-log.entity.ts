import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { ScanResult } from './scan-result.enum';

@Entity('scan_logs')
export class ScanLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'pass_id', type: 'uuid', nullable: true })
  passId: string | null;

  @Column({ name: 'event_id', type: 'uuid' })
  eventId: string;

  @Column({ name: 'scanner_id', type: 'uuid', nullable: true })
  scannerId: string | null;

  @Column({ name: 'raw_token', type: 'text', nullable: true })
  rawToken: string | null;

  @Column({ type: 'varchar', length: 30 })
  result: ScanResult;

  @CreateDateColumn({ name: 'scanned_at', type: 'timestamptz' })
  scannedAt: Date;
}
