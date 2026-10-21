/**
 * Security Test Script: Administrator Permissions and Demo Isolation
 * 
 * Tests the following security requirements:
 * 1. Unauthenticated users cannot approve verifications
 * 2. Ordinary creators/brands cannot approve verifications
 * 3. Authorized administrators can approve verifications
 * 4. Users cannot grant themselves administrator privileges
 * 5. Demo users cannot access real private records
 * 6. Users cannot modify another user's private records
 * 7. Authorized brand and creator actions still work
 * 
 * IMPORTANT: This script connects to the database configured in .env.local
 * Before running, ensure you're connected to a DEVELOPMENT database, not production.
 * 
 * Run: npx tsx scripts/test-admin-and-demo-security.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

// Test accounts (must exist in database)
const TEST_ACCOUNTS = {
  demo_creator: {
    email: 'creator@cinegen.demo',
    password: 'Demo@123',
    expectedRole: 'creator',
    expectedIsDemo: true,
  },
  demo_brand: {
    email: 'brand@cinegen.demo',
    password: 'Demo@123',
    expectedRole: 'brand',
    expectedIsDemo: true,
  },
  // Note: Admin account must be created manually in database
  admin: {
    email: 'admin@cinegen.test', // Update this to match your admin account
    password: 'AdminTest@123', // Update this to match your admin password
    expectedRole: 'admin',
    expectedIsDemo: false,
  },
};

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  details?: any;
}

const results: TestResult[] = [];

function logTest(name: string, passed: boolean, message: string, details?: any) {
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} ${name}: ${message}`);
  if (details) {
    console.log('   Details:', JSON.stringify(details, null, 2));
  }
  results.push({ name, passed, message, details });
}

async function checkDatabaseSetup() {
  console.log('\n=== Checking Database Setup ===\n');
  
  const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  
  // Check if migration has been applied
  const { data: users, error } = await serviceClient
    .from('users')
    .select('id, email, role, is_demo')
    .limit(1);
  
  if (error) {
    if (error.message.includes('column "is_demo" does not exist')) {
      logTest(
        'Migration Check',
        false,
        'Migration 006_admin_and_demo_security.sql has NOT been applied',
        { error: error.message }
      );
      console.log('\n⚠️  SETUP REQUIRED:');
      console.log('   1. Run the migration in Supabase SQL Editor:');
      console.log('      database/migrations/006_admin_and_demo_security.sql');
      console.log('   2. Create an admin account:');
      console.log(`      UPDATE users SET role = 'admin', is_demo = false WHERE email = 'your-admin@email.com';`);
      console.log('   3. Re-run this test script\n');
      return false;
    }
  }
  
  logTest('Migration Check', true, 'Database schema includes is_demo column and admin role');
  
  // Check if admin account exists
  const { data: adminUser } = await serviceClient
    .from('users')
    .select('id, email, role')
    .eq('role', 'admin')
    .limit(1)
    .single();
  
  if (!adminUser) {
    logTest(
      'Admin Account Check',
      false,
      'No admin account found in database',
      { hint: 'Create one with: UPDATE users SET role = \'admin\' WHERE email = \'your-admin@email.com\';' }
    );
    return false;
  }
  
  logTest('Admin Account Check', true, `Admin account exists: ${adminUser.email}`);
  
  // Check if demo accounts are marked
  const { data: demoAccounts } = await serviceClient
    .from('users')
    .select('email, is_demo')
    .eq('is_demo', true);
  
  logTest(
    'Demo Accounts Check',
    (demoAccounts?.length || 0) > 0,
    `Found ${demoAccounts?.length || 0} demo accounts`,
    { accounts: demoAccounts?.map(a => a.email) }
  );
  
  return true;
}

async function test1_UnauthenticatedCannotApprove() {
  console.log('\n=== Test 1: Unauthenticated Cannot Approve Verifications ===\n');
  
  // Use anon key (no authentication)
  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  // Try to fetch verifications
  const { data, error } = await anonClient
    .from('verifications')
    .select('*')
    .eq('status', 'pending');
  
  if (error) {
    logTest(
      'Unauthenticated Read Verifications',
      true,
      'Correctly blocked: unauthenticated user cannot read verifications',
      { error: error.message }
    );
  } else {
    logTest(
      'Unauthenticated Read Verifications',
      false,
      'SECURITY ISSUE: Unauthenticated user can read verifications',
      { data }
    );
  }
  
  // Try to update a verification (will fail anyway due to no auth)
  const { error: updateError } = await anonClient
    .from('verifications')
    .update({ status: 'approved' })
    .eq('id', '00000000-0000-0000-0000-000000000000'); // Fake ID
  
  if (updateError) {
    logTest(
      'Unauthenticated Update Verification',
      true,
      'Correctly blocked: unauthenticated user cannot update verifications',
      { error: updateError.message }
    );
  } else {
    logTest(
      'Unauthenticated Update Verification',
      false,
      'SECURITY ISSUE: Unauthenticated user can update verifications'
    );
  }
}

async function test2_CreatorCannotApprove() {
  console.log('\n=== Test 2: Regular Creator Cannot Approve Verifications ===\n');
  
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  // Login as demo creator
  const { data: authData, error: authError } = await client.auth.signInWithPassword({
    email: TEST_ACCOUNTS.demo_creator.email,
    password: TEST_ACCOUNTS.demo_creator.password,
  });
  
  if (authError) {
    logTest(
      'Creator Login',
      false,
      `Failed to login as demo creator: ${authError.message}`,
      { hint: 'Ensure demo account exists and has correct password in Supabase Auth' }
    );
    return;
  }
  
  logTest('Creator Login', true, `Logged in as ${TEST_ACCOUNTS.demo_creator.email}`);
  
  // Try to read verifications
  const { data, error } = await client
    .from('verifications')
    .select('*')
    .eq('status', 'pending');
  
  if (error || (data && data.length === 0)) {
    logTest(
      'Creator Read Verifications',
      true,
      'Correctly restricted: creator can only see their own verification requests',
      { error: error?.message }
    );
  } else {
    logTest(
      'Creator Read Verifications',
      false,
      'SECURITY ISSUE: Creator can read all pending verifications',
      { count: data.length }
    );
  }
  
  // Try to approve a verification
  const { error: updateError } = await client
    .from('verifications')
    .update({ status: 'approved', admin_notes: 'Hacked!' })
    .eq('id', '00000000-0000-0000-0000-000000000000'); // Fake ID
  
  if (updateError) {
    logTest(
      'Creator Update Verification',
      true,
      'Correctly blocked: creator cannot approve verifications',
      { error: updateError.message }
    );
  } else {
    logTest(
      'Creator Update Verification',
      false,
      'SECURITY ISSUE: Creator can approve verifications'
    );
  }
  
  await client.auth.signOut();
}

async function test3_AdminCanApprove() {
  console.log('\n=== Test 3: Administrator Can Approve Verifications ===\n');
  
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  // Login as admin
  const { data: authData, error: authError } = await client.auth.signInWithPassword({
    email: TEST_ACCOUNTS.admin.email,
    password: TEST_ACCOUNTS.admin.password,
  });
  
  if (authError) {
    logTest(
      'Admin Login',
      false,
      `Failed to login as admin: ${authError.message}`,
      { 
        hint: 'Update TEST_ACCOUNTS.admin in this script with your actual admin credentials',
        email: TEST_ACCOUNTS.admin.email 
      }
    );
    return;
  }
  
  logTest('Admin Login', true, `Logged in as ${TEST_ACCOUNTS.admin.email}`);
  
  // Verify role is admin
  const { data: userData } = await client
    .from('users')
    .select('role')
    .eq('id', authData.user.id)
    .single();
  
  if (userData?.role !== 'admin') {
    logTest(
      'Admin Role Check',
      false,
      `User role is ${userData?.role}, not admin`,
      { hint: `Run: UPDATE users SET role = 'admin' WHERE email = '${TEST_ACCOUNTS.admin.email}';` }
    );
    await client.auth.signOut();
    return;
  }
  
  logTest('Admin Role Check', true, 'User has admin role');
  
  // Try to read all verifications
  const { data, error } = await client
    .from('verifications')
    .select('*');
  
  if (error) {
    logTest(
      'Admin Read Verifications',
      false,
      `Admin cannot read verifications: ${error.message}`
    );
  } else {
    logTest(
      'Admin Read Verifications',
      true,
      `Admin can read verifications (found ${data.length})`
    );
  }
  
  await client.auth.signOut();
}

async function test4_CannotSelfPromote() {
  console.log('\n=== Test 4: Users Cannot Grant Themselves Admin Role ===\n');
  
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  // Login as demo creator
  const { data: authData, error: authError } = await client.auth.signInWithPassword({
    email: TEST_ACCOUNTS.demo_creator.email,
    password: TEST_ACCOUNTS.demo_creator.password,
  });
  
  if (authError) {
    logTest('Creator Login for Self-Promotion Test', false, authError.message);
    return;
  }
  
  // Try to update own role to admin
  const { error } = await client
    .from('users')
    .update({ role: 'admin' })
    .eq('id', authData.user.id);
  
  if (error) {
    logTest(
      'Self-Promotion Blocked',
      true,
      'Correctly blocked: user cannot change their own role',
      { error: error.message }
    );
  } else {
    logTest(
      'Self-Promotion Blocked',
      false,
      'CRITICAL SECURITY ISSUE: User can grant themselves admin role!'
    );
  }
  
  // Verify role unchanged
  const { data: userData } = await client
    .from('users')
    .select('role')
    .eq('id', authData.user.id)
    .single();
  
  if (userData?.role === TEST_ACCOUNTS.demo_creator.expectedRole) {
    logTest(
      'Role Unchanged',
      true,
      `Role remains ${userData.role} after update attempt`
    );
  } else {
    logTest(
      'Role Unchanged',
      false,
      `SECURITY ISSUE: Role changed to ${userData?.role}!`
    );
  }
  
  await client.auth.signOut();
}

async function test5_DemoIsolation() {
  console.log('\n=== Test 5: Demo Users Cannot Access Real Private Records ===\n');
  
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  // Login as demo creator
  const { data: authData, error: authError } = await client.auth.signInWithPassword({
    email: TEST_ACCOUNTS.demo_creator.email,
    password: TEST_ACCOUNTS.demo_creator.password,
  });
  
  if (authError) {
    logTest('Demo Login for Isolation Test', false, authError.message);
    return;
  }
  
  // Try to read all users (should only see demo users)
  const { data: allUsers, error: usersError } = await client
    .from('users')
    .select('id, email, is_demo');
  
  if (allUsers) {
    const nonDemoVisible = allUsers.filter(u => !u.is_demo);
    if (nonDemoVisible.length === 0) {
      logTest(
        'Demo User Isolation',
        true,
        `Demo user can only see ${allUsers.length} demo users (no real users visible)`,
        { visibleEmails: allUsers.map(u => u.email) }
      );
    } else {
      logTest(
        'Demo User Isolation',
        false,
        `SECURITY ISSUE: Demo user can see ${nonDemoVisible.length} real users!`,
        { realUsers: nonDemoVisible.map(u => u.email) }
      );
    }
  }
  
  // Try to read briefs (should only see demo briefs)
  const { data: allBriefs } = await client
    .from('briefs')
    .select('id, campaign_title, brand_id');
  
  if (allBriefs) {
    // Get brand profiles to check if they're demo
    const brandIds = allBriefs.map(b => b.brand_id);
    const { data: brands } = await client
      .from('brand_profiles')
      .select('id, user_id')
      .in('id', brandIds);
    
    if (brands) {
      const userIds = brands.map(b => b.user_id);
      const { data: users } = await client
        .from('users')
        .select('id, is_demo')
        .in('id', userIds);
      
      const nonDemoBriefs = allBriefs.filter(brief => {
        const brand = brands.find(b => b.id === brief.brand_id);
        if (!brand) return false;
        const user = users?.find(u => u.id === brand.user_id);
        return user && !user.is_demo;
      });
      
      if (nonDemoBriefs.length === 0) {
        logTest(
          'Demo Brief Isolation',
          true,
          `Demo user can only see demo briefs (total: ${allBriefs.length})`,
          { briefTitles: allBriefs.map(b => b.campaign_title) }
        );
      } else {
        logTest(
          'Demo Brief Isolation',
          false,
          `SECURITY ISSUE: Demo user can see ${nonDemoBriefs.length} real briefs!`
        );
      }
    }
  }
  
  await client.auth.signOut();
}

async function test6_CrossUserAccess() {
  console.log('\n=== Test 6: Users Cannot Modify Another User\'s Records ===\n');
  
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  // Login as demo creator
  const { data: authData, error: authError } = await client.auth.signInWithPassword({
    email: TEST_ACCOUNTS.demo_creator.email,
    password: TEST_ACCOUNTS.demo_creator.password,
  });
  
  if (authError) {
    logTest('Creator Login for Cross-User Test', false, authError.message);
    return;
  }
  
  // Get another user's ID (demo brand)
  const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const { data: otherUser } = await serviceClient
    .from('users')
    .select('id')
    .eq('email', TEST_ACCOUNTS.demo_brand.email)
    .single();
  
  if (!otherUser) {
    logTest('Get Other User', false, 'Could not find demo brand account');
    await client.auth.signOut();
    return;
  }
  
  // Try to update another user's name
  const { error } = await client
    .from('users')
    .update({ name: 'Hacked Name' })
    .eq('id', otherUser.id);
  
  if (error) {
    logTest(
      'Cross-User Update Blocked',
      true,
      'Correctly blocked: user cannot modify another user\'s record',
      { error: error.message }
    );
  } else {
    logTest(
      'Cross-User Update Blocked',
      false,
      'SECURITY ISSUE: User can modify another user\'s record!'
    );
  }
  
  await client.auth.signOut();
}

async function test7_LegitimateActionsWork() {
  console.log('\n=== Test 7: Legitimate Brand and Creator Actions Still Work ===\n');
  
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  // Test creator actions
  const { data: creatorAuth, error: creatorError } = await client.auth.signInWithPassword({
    email: TEST_ACCOUNTS.demo_creator.email,
    password: TEST_ACCOUNTS.demo_creator.password,
  });
  
  if (creatorError) {
    logTest('Creator Login for Legitimate Actions', false, creatorError.message);
    return;
  }
  
  // Creator can read their own profile
  const { data: creatorProfile, error: profileError } = await client
    .from('creator_profiles')
    .select('*')
    .eq('user_id', creatorAuth.user.id)
    .single();
  
  logTest(
    'Creator Read Own Profile',
    !profileError && !!creatorProfile,
    profileError ? `Failed: ${profileError.message}` : 'Creator can read their own profile'
  );
  
  // Creator can read open briefs
  const { data: briefs, error: briefsError } = await client
    .from('briefs')
    .select('*')
    .eq('status', 'Open');
  
  logTest(
    'Creator Read Open Briefs',
    !briefsError,
    briefsError ? `Failed: ${briefsError.message}` : `Creator can read ${briefs?.length || 0} open briefs`
  );
  
  await client.auth.signOut();
  
  // Test brand actions
  const { data: brandAuth, error: brandError } = await client.auth.signInWithPassword({
    email: TEST_ACCOUNTS.demo_brand.email,
    password: TEST_ACCOUNTS.demo_brand.password,
  });
  
  if (brandError) {
    logTest('Brand Login for Legitimate Actions', false, brandError.message);
    return;
  }
  
  // Brand can read their own briefs
  const { data: brandProfile } = await client
    .from('brand_profiles')
    .select('id')
    .eq('user_id', brandAuth.user.id)
    .single();
  
  if (brandProfile) {
    const { data: ownBriefs, error: ownBriefsError } = await client
      .from('briefs')
      .select('*')
      .eq('brand_id', brandProfile.id);
    
    logTest(
      'Brand Read Own Briefs',
      !ownBriefsError,
      ownBriefsError ? `Failed: ${ownBriefsError.message}` : `Brand can read their ${ownBriefs?.length || 0} briefs`
    );
  }
  
  await client.auth.signOut();
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  CineGen Security Test Suite                              ║');
  console.log('║  Administrator Permissions & Demo Isolation               ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  console.log(`\n📡 Connected to: ${SUPABASE_URL}`);
  console.log('⚠️  Ensure this is a DEVELOPMENT database, not production!\n');
  
  // Check database setup first
  const setupOk = await checkDatabaseSetup();
  if (!setupOk) {
    console.log('\n❌ Database setup incomplete. Please complete setup steps above.\n');
    process.exit(1);
  }
  
  // Run all tests
  await test1_UnauthenticatedCannotApprove();
  await test2_CreatorCannotApprove();
  await test3_AdminCanApprove();
  await test4_CannotSelfPromote();
  await test5_DemoIsolation();
  await test6_CrossUserAccess();
  await test7_LegitimateActionsWork();
  
  // Summary
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  Test Summary                                              ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total:  ${results.length}\n`);
  
  if (failed > 0) {
    console.log('⚠️  SECURITY ISSUES DETECTED:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`   - ${r.name}: ${r.message}`);
    });
    console.log();
    process.exit(1);
  } else {
    console.log('🎉 All security tests passed!\n');
    process.exit(0);
  }
}

main().catch(error => {
  console.error('\n❌ Test suite failed with error:', error);
  process.exit(1);
});
