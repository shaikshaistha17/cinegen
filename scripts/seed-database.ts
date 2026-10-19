#!/usr/bin/env tsx

/**
 * CineGen Database Seeding Script
 * 
 * Seeds the Supabase database with initial data:
 * - 18 creator profiles with portfolios
 * - 4 sample briefs
 * - 1 brand account
 * 
 * Usage:
 *   npm run db:seed
 * 
 * Requirements:
 *   - Supabase project set up
 *   - Environment variables set in .env.local
 *   - Database schema already applied
 */

import { seedCreatorProfiles, seedBriefs } from '../lib/supabase-admin';
import { seedCreators } from '../lib/seed/creators';
import { seedBriefs as briefsData } from '../lib/seed/briefs';

async function main() {
  console.log('🌱 Starting database seed...\n');

  // Validate environment variables
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL is not set');
    console.error('Please set up your .env.local file with Supabase credentials');
    process.exit(1);
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY is not set');
    console.error('Please add your service role key to .env.local');
    process.exit(1);
  }

  try {
    // Seed creators
    console.log('📝 Seeding creator profiles...\n');
    const creatorResults = await seedCreatorProfiles(seedCreators);

    console.log('\n📊 Creator Seeding Results:');
    console.log(`  ✓ Success: ${creatorResults.success.length} creators`);
    console.log(`  ✗ Errors: ${creatorResults.errors.length} creators`);

    if (creatorResults.errors.length > 0) {
      console.log('\n❌ Failed creators:');
      creatorResults.errors.forEach(({ creator, error }) => {
        console.log(`  - ${creator}: ${error}`);
      });
    }

    // Seed briefs
    console.log('\n📝 Seeding briefs...\n');
    const briefResults = await seedBriefs(briefsData);

    console.log('\n📊 Brief Seeding Results:');
    console.log(`  ✓ Success: ${briefResults.success.length} briefs`);
    console.log(`  ✗ Errors: ${briefResults.errors.length} briefs`);

    if (briefResults.errors.length > 0) {
      console.log('\n❌ Failed briefs:');
      briefResults.errors.forEach(({ brief, error }) => {
        console.log(`  - ${brief}: ${error}`);
      });
    }

    // Summary
    console.log('\n✅ Database seeding complete!');
    console.log('\n📋 Summary:');
    console.log(`  Total creators: ${creatorResults.success.length}/${seedCreators.length}`);
    console.log(`  Total briefs: ${briefResults.success.length}/${briefsData.length}`);
    console.log(`  Total users: ${creatorResults.success.length + 1} (18 creators + 1 brand)`);

    console.log('\n🎉 Next steps:');
    console.log('  1. Visit your Supabase dashboard Table Editor to verify data');
    console.log('  2. Run npm run dev to start the development server');
    console.log('  3. Login with any creator email and password: Demo@123');
    console.log('  4. Or login as brand: arjun@nexusbrands.com / Demo@123');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Fatal error during seeding:');
    console.error(error);
    process.exit(1);
  }
}

// Run the script
main();
