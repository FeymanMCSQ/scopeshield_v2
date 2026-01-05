/**
 * server/services
 * Owns: composition root for application services.
 * Layer: Application
 */

import { TicketService } from '@/application/ticketService';
import { TicketRepoPrisma } from '@/infra/repositories/ticketRepoPrisma';
import { ids, time } from '@/server/providers';

export function makeTicketService() {
  return new TicketService({
    ticketRepo: new TicketRepoPrisma(),
    ids,
    time,
  });
}
