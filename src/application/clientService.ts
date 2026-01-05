import { createClient } from '@/domain/client';
import type { ClientRepo } from '@/infra/repositories/clientRepoPrisma';
import type { ClientId, IsoDateTime, UserId } from '@/domain/shared';

export class ClientService {
  constructor(
    private readonly deps: {
      clientRepo: ClientRepo;
      ids: { newClientId(): ClientId };
      time: { now(): IsoDateTime };
    }
  ) {}

  async createClient(input: { userId: UserId; name: string }) {
    const client = createClient({
      id: this.deps.ids.newClientId(),
      userId: input.userId,
      name: input.name,
      createdAt: this.deps.time.now(),
    });

    return this.deps.clientRepo.create(client);
  }
}
