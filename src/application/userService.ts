import type { UserId } from '@/domain/shared';
import { DomainError } from '@/domain/shared';

export interface UserRepo {
  upsert(input: { id: string; email: string | null }): Promise<{ id: string }>;
}

export class UserService {
  constructor(private readonly deps: { userRepo: UserRepo }) {}

  async ensureUserExists(input: { userId: UserId; email: string | null }) {
    // You can tighten invariants later; keep it boring now.
    if (!input.userId)
      throw new DomainError('VALIDATION_ERROR', 'Missing userId');
    return this.deps.userRepo.upsert({ id: input.userId, email: input.email });
  }
}
