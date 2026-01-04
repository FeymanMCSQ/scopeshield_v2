/**
 * UserRepo
 * Owns: persistence access for User.
 * Does NOT own: auth/session, domain policies, HTTP.
 * Layer: Infrastructure
 * Trust zone: none
 */

import { prisma } from '../db/prisma';

export class UserRepo {
  async findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  }

  async upsert(input: { id: string; email: string | null }) {
    return prisma.user.upsert({
      where: { id: input.id },
      update: { email: input.email },
      create: { id: input.id, email: input.email },
    });
  }
}
