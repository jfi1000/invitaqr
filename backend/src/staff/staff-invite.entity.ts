import { Column, Entity, PrimaryColumn } from 'typeorm';

/** Tokens de activación de STAFF (evita ALTER sobre users sin ownership). */
@Entity('staff_invites')
export class StaffInvite {
  @PrimaryColumn({ name: 'staff_id', type: 'uuid' })
  staffId: string;

  @Column({ name: 'invite_token', type: 'uuid', unique: true })
  inviteToken: string;

  @Column({ name: 'invite_token_expiry', type: 'timestamptz' })
  inviteTokenExpiry: Date;
}
