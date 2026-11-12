import { UserRole } from '../users/user-role.enum';

export interface TokenPayload {
  sub: string;
  email: string;
  role: UserRole;
  type: 'access' | 'refresh';
}

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}
