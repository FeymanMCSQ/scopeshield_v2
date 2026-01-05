import 'dotenv/config';
import { prisma } from '../src/infra/db/prisma';

async function main() {
  const res = await prisma.$queryRaw`SELECT 1`;
  console.log(res);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
