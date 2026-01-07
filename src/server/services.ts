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
import { PairingService } from '@/application/pairingService';
import { PairingTokenRepoPrisma } from '@/infra/repositories/pairingTokenRepoPrisma';
import { DeviceRepoPrisma } from '@/infra/repositories/deviceRepoPrisma';
import { PaymentsService } from '@/application/payments/paymentsService';
import { StripeAdapter } from '@/infra/payments/stripeAdapter';
import { DeviceAuthService } from '@/application/deviceAuthService';

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

export function makePaymentsService() {
  return new PaymentsService({
    paymentPort: new StripeAdapter(
      process.env.STRIPE_SECRET_KEY!,
      process.env.STRIPE_WEBHOOK_SECRET!
    ),
    ticketService: makeTicketService(),
    baseUrl: process.env.NEXT_PUBLIC_URL ?? 'http://localhost:3000',
  });
}

export function makePairingService() {
  return new PairingService({
    pairingTokenRepo: new PairingTokenRepoPrisma(),
    deviceRepo: new DeviceRepoPrisma(),
  });
}

export function makeDeviceAuthService() {
  return new DeviceAuthService({
    deviceRepo: new DeviceRepoPrisma(),
  });
}
