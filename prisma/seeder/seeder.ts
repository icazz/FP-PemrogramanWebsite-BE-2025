import { PrismaClient } from '@prisma/client';

import {
  gameTemplateSeed,
  quizSeed,
  spinTheWheelSeed,
  userSeed,
  whackAMoleSeed,
} from './seed';
import { seedAirplaneGame } from './seed/airplane.seed';

const prisma = new PrismaClient();

async function main() {
  console.log('⚒️ Seeding for WordIT backend database...');

  try {
    await userSeed(process.env.NODE_ENV === 'production');
    await gameTemplateSeed();
    await quizSeed();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    await spinTheWheelSeed();

    await whackAMoleSeed();
    await seedAirplaneGame();
  } catch (error: unknown) {
    console.error('⛔ Seeding error:', error);
    process.exit(1);
  } finally {
    console.log('✅ Seeding success');
    await prisma.$disconnect();
  }
}

main();
