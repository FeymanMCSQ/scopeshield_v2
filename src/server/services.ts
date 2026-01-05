/**
 * server/services
 * Owns: composition root for application services.
 * Layer: Application
 */
// /src/server/service.ts

import { TicketService } from '@/application/ticketService';
import { TicketRepoPrisma } from '@/infra/repositories/ticketRepoPrisma';
import { ids, time } from '@/server/providers';
import { UserService } from '@/application/userService';
import { UserRepo } from '@/infra/repositories/userRepo';
import { ClientService } from '@/application/clientService';
import { ClientRepoPrisma } from '@/infra/repositories/clientRepoPrisma';

export function makeTicketService() {
  return new TicketService({
    ticketRepo: new TicketRepoPrisma(),
    ids,
    time,
  });
}

export function makeUserService() {
  return new UserService({ userRepo: new UserRepo() });
}

export function makeClientService() {
  return new ClientService({
    clientRepo: new ClientRepoPrisma(),
    ids: { newClientId: ids.newClientId },
    time,
  });
}
