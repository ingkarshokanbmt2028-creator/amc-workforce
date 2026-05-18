#!/usr/bin/env node
/**
 * AMC BioTime → Vercel Sync Script
 * Run this on any PC on the same network as the BioTime server in Ghana.
 *
 * Setup:
 *   1. Install Node.js (nodejs.org)
 *   2. Edit the CONFIG section below
 *   3. Run:  node ghana-sync.js
 *   4. To auto-run every day: node ghana-sync.js --schedule
 */

// ─── CONFIG — edit these ─────────────────────────────────────────────────────

const CONFIG = {
  // BioTime server on your local network
  BIOTIME_URL:      'http://192.168.1.100:8080',  // ← change to your BioTime IP
  BIOTIME_USERNAME: 'admin',                        // ← BioTime login
  BIOTIME_PASSWORD: 'password',                     // ← BioTime password

  // Your Vercel app
  VERCEL_URL:   'https://amc-workforce.vercel.app',
  SYNC_SECRET:  'CHANGE_THIS_SECRET',               // ← must match SYNC_SECRET in Vercel env vars

  // How many days back to pull (default: 1 = yesterday + today)
  DAYS_BACK: 1,
}

// ────────────────────────────────────────────────────────────────────────────

async function run() {
  console.log('=== AMC BioTime Sync ===')
  console.log(`BioTime: ${CONFIG.BIOTIME_URL}`)
  console.log(`Vercel:  ${CONFIG.VERCEL_URL}`)
  console.log()

  // Step 1: Authenticate with BioTime
  console.log('1. Authenticating with BioTime...')
  let token
  try {
    const authRes = await fetch(`${CONFIG.BIOTIME_URL}/jwt-api-token-auth/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: CONFIG.BIOTIME_USERNAME, password: CONFIG.BIOTIME_PASSWORD }),
    })
    if (!authRes.ok) {
      const text = await authRes.text()
      throw new Error(`Auth failed (${authRes.status}): ${text}`)
    }
    const data = await authRes.json()
    token = data.token
    console.log('   ✓ Authenticated')
  } catch (err) {
    console.error('   ✗ BioTime auth error:', err.message)
    console.error('   → Check BIOTIME_URL, BIOTIME_USERNAME, BIOTIME_PASSWORD in CONFIG')
    process.exit(1)
  }

  // Step 2: Fetch punch records
  const toDate   = new Date()
  const fromDate = new Date()
  fromDate.setDate(fromDate.getDate() - CONFIG.DAYS_BACK)

  const start = fromDate.toISOString().replace('T', ' ').slice(0, 19)
  const end   = toDate.toISOString().replace('T', ' ').slice(0, 19)

  console.log(`2. Fetching punches from ${start} to ${end}...`)
  const punches = []
  let nextUrl = `${CONFIG.BIOTIME_URL}/att/api/transactions/?start_time=${encodeURIComponent(start)}&end_time=${encodeURIComponent(end)}&page_size=500`

  try {
    while (nextUrl) {
      const res = await fetch(nextUrl, { headers: { Authorization: `JWT ${token}` } })
      if (!res.ok) throw new Error(`Fetch failed (${res.status})`)
      const page = await res.json()
      const records = page.data ?? page.results ?? []
      punches.push(...records)
      nextUrl = page.next ?? null
      process.stdout.write(`   Fetched ${punches.length} punches...\r`)
    }
    console.log(`\n   ✓ Got ${punches.length} punch records`)
  } catch (err) {
    console.error('   ✗ Fetch error:', err.message)
    process.exit(1)
  }

  if (punches.length === 0) {
    console.log('   No punches found for this period. Nothing to push.')
    process.exit(0)
  }

  // Step 3: Push to Vercel
  console.log(`3. Pushing to ${CONFIG.VERCEL_URL}...`)
  try {
    const pushRes = await fetch(`${CONFIG.VERCEL_URL}/api/attendance/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        punches,
        from_date: fromDate.toISOString(),
        to_date:   toDate.toISOString(),
        secret:    CONFIG.SYNC_SECRET,
      }),
    })

    const result = await pushRes.json()

    if (!pushRes.ok || !result.ok) {
      throw new Error(result.error ?? `Push failed (${pushRes.status})`)
    }

    console.log(`   ✓ Synced ${result.recordsProcessed} attendance records`)
    if (result.errors) console.warn('   ⚠ Partial errors:', result.errors)
  } catch (err) {
    console.error('   ✗ Push error:', err.message)
    console.error('   → Check VERCEL_URL and SYNC_SECRET in CONFIG')
    process.exit(1)
  }

  console.log('\n✓ Done!')
}

// ─── Auto-schedule (runs every day at 8am local time) ───────────────────────

if (process.argv.includes('--schedule')) {
  console.log('Running in scheduled mode — will sync every day at 08:00 local time')
  console.log('Press Ctrl+C to stop\n')

  function msUntil8am() {
    const now  = new Date()
    const next = new Date(now)
    next.setHours(8, 0, 0, 0)
    if (next <= now) next.setDate(next.getDate() + 1)
    return next.getTime() - now.getTime()
  }

  function scheduleNext() {
    const ms = msUntil8am()
    const hrs = Math.floor(ms / 3600000)
    const min = Math.floor((ms % 3600000) / 60000)
    console.log(`Next sync in ${hrs}h ${min}m (08:00 local)`)
    setTimeout(() => {
      run().catch(console.error).finally(scheduleNext)
    }, ms)
  }

  run().catch(console.error).finally(scheduleNext)
} else {
  run().catch(err => { console.error(err); process.exit(1) })
}
