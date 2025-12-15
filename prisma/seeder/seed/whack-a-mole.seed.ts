import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const whackAMoleSeed = async () => {
  try {
    console.log('🌱 Seed whack-a-mole game');

    // Get super admin user (creator)
    const superAdmin = await prisma.users.findFirst({
      where: { role: 'SUPER_ADMIN' },
    });

    if (!superAdmin) {
      console.log('⚠️  No super admin found, skipping whack-a-mole seed');

      return;
    }

    // Get whack-a-mole template
    const whackAMoleTemplate = await prisma.gameTemplates.findFirst({
      where: { slug: 'whack-a-mole' },
    });

    if (!whackAMoleTemplate) {
      console.log('⚠️  Whack-a-mole template not found, skipping seed');

      return;
    }

    // Create demo whack-a-mole game
    await prisma.games.upsert({
      where: { name: 'Demo Whack-a-Mole' },
      create: {
        name: 'Demo Whack-a-Mole',
        description: 'A fun whack-a-mole game to test your reflexes!',
        thumbnail_image:
          'https://via.placeholder.com/300x200?text=Whack-a-Mole',
        game_template_id: whackAMoleTemplate.id,
        creator_id: superAdmin.id,
        is_published: true,
        game_json: {
          title: 'Demo Whack-a-Mole',
          description: 'Hit as many moles as you can!',
          time_limit: 60,
          mole_count: 9,
          mole_speed: 1000,
        },
        total_played: 0,
      },
      update: {
        description: 'A fun whack-a-mole game to test your reflexes!',
        is_published: true,
      },
    });

    console.log('✅ Whack-a-mole game seeded successfully');
  } catch (error) {
    console.log(`❌ Error in whack-a-mole seed. ${error}`);

    throw error;
  }
};
