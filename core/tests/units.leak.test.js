'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createTestDatabase } = require('./helpers/db');
const { startTestServer } = require('./helpers/server');
const { createUser } = require('./helpers/fixtures');

// ============================================================
// CONFIGURATION
// ============================================================

/**
 * Routes that are intentionally public and don't contain business data.
 * These routes are accessible to anyone (even outsiders) without 403.
 */
const OUTSIDER_ALLOW = [
  /^\/api\/session$/,
  /^\/api\/version$/,
  /^\/api\/health$/,
  /^\/api\/notifications($|\/)/,  // All notification endpoints are public
  /^\/api\/units$/,               // List of units (for login/role selection)
  /^\/api\/units\/[^/]+\/roles$/, // Unit roles (for login)
  /^\/api\/platform\/setting-locks$/, // Anyone authenticated can view locks
  /^\/api\/platform\/visibility-policies$/, // Anyone authenticated can view policies
  /^\/auth\//                     // Authentication routes (e.g. /auth/microsoft)
];

/**
 * Special handling for slug parameters (like :unitSlug).
 * These will be replaced with real unit codes instead of numeric "1".
 */
const SLUG_REPLACEMENTS = {
  ':unitSlug': 'tckt',
  ':id': '1',
  ':slug': 'test'
};

// ============================================================
// ROUTE SCANNER
// ============================================================

/**
 * Scans all route files in core/src/routes/ and extracts GET routes.
 * Returns array of route paths with params replaced.
 */
function scanGetRoutes() {
  const routesDir = path.join(__dirname, '..', 'src', 'routes');
  const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));
  
  const routes = [];
  const getPattern = /router\.get\s*\(\s*['"`]([^'"`]+)['"`]/g;
  
  for (const file of files) {
    const content = fs.readFileSync(path.join(routesDir, file), 'utf8');
    let match;
    
    while ((match = getPattern.exec(content)) !== null) {
      let route = match[1];
      
      // Replace parameters with test values
      for (const [param, value] of Object.entries(SLUG_REPLACEMENTS)) {
        route = route.replace(new RegExp(param, 'g'), value);
      }
      
      // Final fallback: replace any remaining :param with 1
      route = route.replace(/:[A-Za-z_]+/g, '1');
      
      routes.push(route);
    }
  }
  
  return [...new Set(routes)].sort(); // Dedupe and sort
}

/**
 * Filters out public routes that don't need permission checks.
 */
function filterBusinessRoutes(routes) {
  return routes.filter(route => {
    return !OUTSIDER_ALLOW.some(pattern => pattern.test(route));
  });
}

// ============================================================
// TEST SUITE
// ============================================================

test('Data leak regression test: outsiders get 403, platform admins do not', { timeout: 60000 }, async (t) => {
  const { pool, teardown } = await createTestDatabase();
  const { client, close } = await startTestServer(pool);
  
  try {
    // ============================================================
    // SETUP: Create test users
    // ============================================================
    
    // VPD user (outsider - not in TCKT, no dieu-hanh module)
    const vpdUser = await createUser(pool, { 
      role: 'member',
      email: 'vpd_officer@test.com',
      units: [['VPD', 'officer']]
    });
    
    // DYC user (platform admin - can read everything)
    const dycUser = await createUser(pool, { 
      role: 'admin',
      email: 'dyc_engineer@test.com',
      units: [['DYC', 'dyc_admin']]
    });
    
    // ============================================================
    // SCAN: Get all business routes
    // ============================================================
    
    const allRoutes = scanGetRoutes();
    const businessRoutes = filterBusinessRoutes(allRoutes);
    
    console.log(`\n📊 Route scan results:`);
    console.log(`   Total GET routes: ${allRoutes.length}`);
    console.log(`   Public routes (whitelisted): ${allRoutes.length - businessRoutes.length}`);
    console.log(`   Business routes (to test): ${businessRoutes.length}`);
    
    // ============================================================
    // TEST 1: Outsider (VPD without dieu-hanh) must get 403 on all business routes
    // ============================================================
    
    await client.login(vpdUser.email, vpdUser.password);
    
    const vpdLeaks = [];
    
    for (const route of businessRoutes) {
      const res = await client.request('GET', route);
      
      // If VPD can access (not 403), it's a potential leak
      if (res.status !== 403) {
        vpdLeaks.push({ route, status: res.status });
      }
    }
    
    // ============================================================
    // TEST 2: Platform admin (DYC) must NOT get 403
    // ============================================================
    
    await client.login(dycUser.email, dycUser.password);
    
    const dycDenials = [];
    
    for (const route of businessRoutes) {
      const res = await client.request('GET', route);
      
      // If DYC gets 403, something is wrong with platform admin permissions
      if (res.status === 403) {
        dycDenials.push({ route, status: 403 });
      }
    }
    
    // ============================================================
    // ASSERTIONS
    // ============================================================
    
    if (vpdLeaks.length > 0) {
      console.error('\n❌ DATA LEAK DETECTED:');
      console.error('   The following routes are accessible to outsiders (VPD without dieu-hanh):');
      for (const leak of vpdLeaks) {
        console.error(`   - ${leak.route} → ${leak.status}`);
      }
    }
    
    if (dycDenials.length > 0) {
      console.error('\n⚠️  PLATFORM ADMIN ACCESS DENIED:');
      console.error('   DYC is unexpectedly blocked from these routes:');
      for (const denial of dycDenials) {
        console.error(`   - ${denial.route} → 403`);
      }
    }
    
    assert.equal(
      vpdLeaks.length, 
      0, 
      `Found ${vpdLeaks.length} data leak(s). Outsiders should get 403 on all business routes.`
    );
    
    assert.equal(
      dycDenials.length,
      0,
      `Found ${dycDenials.length} route(s) blocking DYC. Platform admins should have full read access.`
    );
    
    console.log('\n✅ No data leaks detected. Authorization working correctly.');
    
  } finally {
    await close();
    await teardown();
  }
});

// ============================================================
// NOTES & LIMITATIONS
// ============================================================
/*
 * SCOPE:
 * This test only covers 2 basic cases:
 * 1. Outsiders (users from other units like BTV) → must get 403
 * 2. Platform admins (DYC) → must NOT get 403 (can read everything)
 * 
 * More complex authorization logic (e.g., unit leaders can view their own
 * unit's data but not other units) is covered by dedicated integration tests.
 * 
 * LIMITATIONS:
 * - Routes with complex query params are not tested (only path params)
 * - Does not test POST/PUT/DELETE/PATCH (only GET)
 * - 404 responses are considered acceptable (route exists but resource not found)
 * - Does not validate response data structure, only authorization
 */
