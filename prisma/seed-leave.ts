/**
 * Seed leave balances from "AMC Leave Data 2026 - TETR.xlsx"
 * Run: npx tsx prisma/seed-leave.ts
 */
import 'dotenv/config'
import { PrismaClient } from '../app/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import * as XLSX from 'xlsx'
import * as path from 'path'
import * as fs from 'fs'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  ssl: { rejectUnauthorized: false },
})
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const adapter = new PrismaPg(pool as any)
const prisma = new PrismaClient({ adapter })

async function main() {
  const candidates = [
    'AMC Leave Data 2026 - TETR.xlsx',
    'AMC_LEAVE_DATA_2026_TETR.xlsx',
  ]
  const filePath = candidates
    .map(f => path.join(process.cwd(), 'data', f))
    .find(fs.existsSync)

  if (!filePath) {
    console.error('Leave Excel not found in data/ — place "AMC Leave Data 2026 - TETR.xlsx" in the data/ folder')
    process.exit(1)
  }

  console.log('Reading:', filePath)
  const wb = XLSX.readFile(filePath)
  const ws = wb.Sheets['FY2026 - 2027']
  if (!ws) { console.error('Sheet "FY2026 - 2027" not found'); process.exit(1) }

  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' })

  let seeded = 0, skipped = 0

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as (string | number)[]
    const lastName  = String(row[1] ?? '').trim()
    const firstName = String(row[2] ?? '').trim()
    if (!lastName) continue

    // DB name format: "FIRSTNAME MIDDLENAME LASTNAME" (all caps)
    const fullName = `${firstName} ${lastName}`.trim().toUpperCase()

    const n = (v: unknown, def = 0) => typeof v === 'number' ? v : def

    const annualEntitlement   = n(row[5])
    const annualCarryForward  = n(row[4])
    const annualTaken         = n(row[6])
    const annualRemaining     = n(row[7], annualEntitlement - annualTaken)
    const holidayCarryForward = n(row[8])
    const sickEntitlement     = n(row[14], 12)
    const sickTaken           = n(row[15])
    const sickRemaining       = n(row[16], sickEntitlement - sickTaken)
    const leaveNotes          = String(row[17] ?? '').trim() || null

    const employee = await prisma.employee.findFirst({
      where: { name: { equals: fullName, mode: 'insensitive' } },
    })

    if (!employee) {
      console.warn(`  Not found: "${fullName}" — skipping`)
      skipped++
      continue
    }

    await prisma.leaveBalance.upsert({
      where: { employeeId_fiscalYear: { employeeId: employee.id, fiscalYear: '2025-2026' } },
      create: {
        employeeId:         employee.id,
        fiscalYear:         '2025-2026',
        annualEntitlement,
        openingBalance:     annualCarryForward,
        totalAvailable:     annualEntitlement + annualCarryForward + holidayCarryForward,
        daysTaken:          annualTaken,
        daysRemaining:      annualRemaining,
        holidayCarryForward,
        sickEntitlement,
        sickTaken,
        sickRemaining,
        leaveNotes,
      },
      update: {
        annualEntitlement,
        openingBalance:     annualCarryForward,
        totalAvailable:     annualEntitlement + annualCarryForward + holidayCarryForward,
        daysTaken:          annualTaken,
        daysRemaining:      annualRemaining,
        holidayCarryForward,
        sickEntitlement,
        sickTaken,
        sickRemaining,
        leaveNotes,
      },
    })
    seeded++
  }

  console.log(`Done — seeded: ${seeded}, skipped: ${skipped}`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
