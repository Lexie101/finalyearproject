export const STUDENT_EMAIL_REGEX = /^[A-Za-z]{2,3}\d{6,8}@students\.cavendish\.co\.zm$/;

export const ROLES = {
  ADMIN: 'ADMIN',
  DRIVER: 'DRIVER',
  STUDENT: 'STUDENT',
} as const;

export type UserRole = keyof typeof ROLES;

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  token: string;
}
