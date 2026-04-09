#!/usr/bin/env node
/**
 * Fadaa Sales — User Seed Script
 * Creates initial users in the sales_users table.
 *
 * Usage:
 *   NEXT_PUBLIC_SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=yyy node supabase/seed_users.js
 *
 * Or generate a password hash only:
 *   node supabase/seed_users.js hash mypassword
 */
const bcrypt = require('bcryptjs')
const { createClient } = require('@supabase/supabase-js')

const args = process.argv.slice(2)

// Just hash a password and print it
if (args[0] === 'hash') {
  const pw = args[1]
  if (!pw) { console.error('Usage: node seed_users.js hash <password>'); process.exit(1) }
  console.log(bcrypt.hashSync(pw, 10))
  process.exit(0)
}

// Seed default users
const USERS = [
  { username: 'manager',    name: 'Sales Manager',  email: 'manager@company.com', role: 'manager', password: 'Manager@123'  },
  { username: 'rep1',       name: 'Sales Rep One',  email: 'rep1@company.com',    role: 'rep',     password: 'Rep1@123'     },
  { username: 'rep2',       name: 'Sales Rep Two',  email: 'rep2@company.com',    role: 'rep',     password: 'Rep2@123'     },
  { username: 'sysadmin',   name: 'System Admin',   email: 'admin@company.com',   role: 'admin',   password: 'Admin@123'    },
]

async function seed() {
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key  = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars')
    process.exit(1)
  }
  const db = createClient(url, key, { auth: { persistSession: false } })

  for (const u of USERS) {
    const hash = bcrypt.hashSync(u.password, 10)
    const { error } = await db.from('sales_users').upsert(
      { username: u.username, name: u.name, email: u.email, role: u.role, password_hash: hash },
      { onConflict: 'username' }
    )
    if (error) console.error(`  ✗ ${u.username}:`, error.message)
    else console.log(`  ✓ ${u.username} (${u.role}) — password: ${u.password}`)
  }
  console.log('\nDone. Change all passwords after first login!')
}

seed()
