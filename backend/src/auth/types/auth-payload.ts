import { UserRole } from '@prisma/client';

export interface AuthPayload {
  sub: string;
  role: UserRole;
  email: string;
}
