/**
 * server/services
 * Owns: composition root for application services.
 * Layer: Application
 */

import { TicketService } from '@/application/ticketService';
import { TicketRepoPrisma } from '@/infra/repositories/ticketRepoPrisma';
import { ids, time } from '@/server/providers';
import { UserService } from '@/application/userService';
import { UserRepo } from '@/infra/repositories/userRepo';

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
