/**
 * infra/db/prisma
 * Owns: Prisma client singleton (Prisma 7 + driver adapter).
 * Does NOT own: business rules, authorization, workflows.
 * Layer: Infrastructure
 * Trust zone: none
 */

import { PrismaClient } from '../../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

function makeClient() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');

  const adapter = new PrismaPg({ connectionString: url });
  return new PrismaClient({ adapter });
}

export const prisma: PrismaClient = global.__prisma ?? makeClient();

if (process.env.NODE_ENV !== 'production') global.__prisma = prisma;
