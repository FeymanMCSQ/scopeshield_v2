/**
 * infra/db/prisma
 * Owns: Prisma client singleton (Prisma 7 + Accelerate).
 * Does NOT own: business rules, authorization, workflows.
 * Layer: Infrastructure
 * Trust zone: none
 */

import { PrismaClient } from '../../generated/prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: ReturnType<typeof makeClient> | undefined;
}

function makeClient() {
  const accelerateUrl = process.env.DATABASE_URL;
  if (!accelerateUrl) throw new Error('DATABASE_URL is not set');

  // ✅ Prisma 7 client engine requires accelerateUrl (or adapter).
  // ✅ Accelerate URL uses prisma+postgres://
  return new PrismaClient({ accelerateUrl }).$extends(withAccelerate());
}

export const prisma = global.__prisma ?? makeClient();

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}
