/**
 * Copy roster pattern from Jan-Mar 2026 → April & May 2026 (batch version)
 * Run: npx tsx scripts/copy-roster-forward.ts
 */
import 'dotenv/config'
import { PrismaClient } from '../app/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL!, ssl: { rejectUnauthorized: false } })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool as any) })

const TARGET_MONTHS = [
  { month: 4, year: 2026 },
  { month: 5, year: 2026 },
]

function daysInMonth(month: number, year: number) {
  return new Date(year, month, 0).getDate()
}

async function main() {
  const departments = await prisma.department.findMany()

  // Load all Jan-Mar 2026 rosters with slots at once
  const templateRosters = await prisma.roster.findMany({
    where: { year: 2026, month: { in: [1, 2, 3] } },
    include: { slots: true },
  })

  for (const dept of departments) {
    // Find best template: prefer March, then Feb, then Jan
    const template = [3, 2, 1]
      .map(m => templateRosters.find(r => r.departmentId === dept.id && r.month === m))
      .find(r => r && r.slots.length > 0)

    if (!template) {
      console.log(`  No template for ${dept.name} — skipping`)
      continue
    }

    console.log(`  ${dept.name}: using month ${template.month} (${template.slots.length} slots) as template`)

    for (const { month, year } of TARGET_MONTHS) {
      // Upsert roster
      const roster = await prisma.roster.upsert({
        where: { departmentId_month_year: { departmentId: dept.id, month, year } },
        create: { departmentId: dept.id, month, year, createdBy: 'copy-script', status: 'PUBLISHED', publishedAt: new Date(), publishedBy: 'copy-script' },
        update: {},
      })

      const maxDay = daysInMonth(month, year)

      const slotsToCreate = template.slots
        .map(slot => {
          const dayOfMonth = new Date(slot.date).getUTCDate()
          if (dayOfMonth > maxDay) return null
          return {
            rosterId: roster.id,
            employeeId: slot.employeeId,
            date: new Date(Date.UTC(year, month - 1, dayOfMonth)),
            shiftType: slot.shiftType,
            startTime: slot.startTime,
            endTime: slot.endTime,
            plannedHours: slot.plannedHours,
          }
        })
        .filter(Boolean) as any[]

      const result = await prisma.rosterSlot.createMany({
        data: slotsToCreate,
        skipDuplicates: true,
      })

      console.log(`    → ${month}/${year}: ${result.count} slots created`)
    }
  }

  console.log('Done.')
  await prisma.$disconnect()
  await pool.end()
}

main().catch(e => { console.error(e); process.exit(1) })
