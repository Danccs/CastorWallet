import type { User } from '../entities/User';

export interface UserRepository {
  getCurrentUser(): Promise<User | null>;
  signOut(): Promise<void>;
}
