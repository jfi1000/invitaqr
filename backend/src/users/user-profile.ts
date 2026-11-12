import { UserRole } from './user-role.enum';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}
