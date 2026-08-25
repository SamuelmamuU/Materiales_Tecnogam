import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Checking DB Connection and Materials Count...");
  const count = await prisma.material.count();
  console.log(`Total materials: ${count}`);

  const activeCount = await prisma.material.count({
    where: { activo: true }
  });
  console.log(`Active materials: ${activeCount}`);

  const sample = await prisma.material.findMany({
    take: 5
  });
  console.log("Sample materials:", JSON.stringify(sample, null, 2));
}

main()
  .catch(err => {
    console.error("Error checking database:", err);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
