import 'dotenv/config'
import { PrismaClient } from '../app/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import * as XLSX from 'xlsx'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pool = new Pool({ connectionString: process.env.DATABASE_URL!, ssl: { rejectUnauthorized: false } })
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const adapter = new PrismaPg(pool as any)
const prisma = new PrismaClient({ adapter })

const MONTHS = ['january','february','march','april','may','june','july','august','september','october','november','december']

function parseMonthNum(name: string): number {
  const idx = MONTHS.findIndex(m => name.toLowerCase().includes(m))
  return idx >= 0 ? idx + 1 : -1
}

// Parse date ranges from strings like:
// "2025: 5 days (11 - 17 December 2025)"
// "2025: 15 days (12 - 30 January 2026)"
// "2025: 26 days (23 February - 10 April 2026)"
function parseLeaveDates(text: string): Date[] {
  const dates: Date[] = []
  if (!text || typeof text !== 'string') return dates

  // Pattern: (START - END) where END has a month+year
  const pattern = /\((\d+)\s*(?:(\w+)\s+)?(\d{4})?\s*[-–]\s*(\d+)\s+(\w+)\s+(\d{4})\)/g
  let match
  while ((match = pattern.exec(text)) !== null) {
    const [, startDay, startMonthStr, startYearStr, endDay, endMonthStr, endYearStr] = match
    const endMonth = parseMonthNum(endMonthStr)
    const endYear = parseInt(endYearStr)
    if (endMonth < 0) continue

    const startMonth = startMonthStr ? parseMonthNum(startMonthStr) : endMonth
    const startYear = startYearStr ? parseInt(startYearStr) : (startMonth > endMonth ? endYear - 1 : endYear)

    const start = new Date(startYear, startMonth - 1, parseInt(startDay))
    const end = new Date(endYear, endMonth - 1, parseInt(endDay))

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const day = d.getDay()
      if (day !== 0 && day !== 6) { // skip weekends
        dates.push(new Date(d))
      }
    }
  }
  return dates
}

function normalizeName(s: string) {
  return s.toLowerCase().replace(/[^a-z]/g, '').trim()
}

async function main() {
  // Load leave register
  const wb = XLSX.readFile('data/gdrive_1h1ymTfgvUTWOKLjg7irStzGZovbT-Cuq.bin')
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' })
  const leaveRows = rows.filter((r: unknown[]) => typeof r[0] === 'number' && r[1])

  // Get all employees from DB
  const employees = await prisma.employee.findMany({ select: { id: true, name: true, departmentId: true } })
  console.log(`Loaded ${employees.length} employees from DB`)

  // Build name → employee map
  const empMap = new Map<string, typeof employees[0]>()
  for (const e of employees) {
    const key = normalizeName(e.name)
    empMap.set(key, e)
  }

  // Build working days for Jan-Mar 2026
  const START = new Date(2026, 0, 1)  // Jan 1
  const END   = new Date(2026, 2, 31) // Mar 31
  const workingDays: Date[] = []
  for (let d = new Date(START); d <= END; d.setDate(d.getDate() + 1)) {
    if (d.getDay() !== 0 && d.getDay() !== 6) workingDays.push(new Date(d))
  }
  console.log(`Working days Jan-Mar 2026: ${workingDays.length}`)

  // Delete existing attendance for this period
  await prisma.attendance.deleteMany({
    where: { date: { gte: START, lte: END } }
  })
  console.log('Cleared existing attendance for Jan-Mar 2026')

  let matched = 0, skipped = 0, totalRecords = 0

  for (const row of leaveRows as unknown[][]) {
    const lastName  = String(row[1] ?? '').trim()
    const firstName = String(row[2] ?? '').trim()
    const fullName  = `${lastName} ${firstName}`.trim()
    const fullNameAlt = `${firstName} ${lastName}`.trim()

    // Try to match employee
    const key1 = normalizeName(fullName)
    const key2 = normalizeName(fullNameAlt)
    const emp = empMap.get(key1) || empMap.get(key2)

    // Also try partial match (last name only)
    let resolvedEmp = emp
    if (!resolvedEmp) {
      const lastKey = normalizeName(lastName)
      for (const [k, v] of empMap.entries()) {
        if (k.startsWith(lastKey) && lastKey.length > 3) {
          resolvedEmp = v
          break
        }
      }
    }

    if (!resolvedEmp) {
      skipped++
      continue
    }
    matched++

    // Parse all leave date texts
    const leaveText = [row[13], row[14], row[18]].map(c => String(c ?? '')).join('\n')
    const leaveDates = parseLeaveDates(leaveText)
    const leaveDateSet = new Set(leaveDates.map(d => d.toISOString().slice(0, 10)))

    // Create attendance records for Jan-Mar 2026
    const records = workingDays.map(day => {
      const dateStr = day.toISOString().slice(0, 10)
      const isLeave = leaveDateSet.has(dateStr)

      // Randomise for realism: 8% absent, 6% late, rest present
      const rand = Math.random()
      let status: 'PRESENT' | 'ABSENT' | 'LATE' | 'ON_LEAVE' | 'EARLY_DEPARTURE' | 'PARTIAL'
      let clockIn: Date | null = null
      let clockOut: Date | null = null
      let totalHours: number | null = null
      let lateMinutes: number | null = null

      if (isLeave) {
        status = 'ON_LEAVE'
      } else if (rand < 0.08) {
        status = 'ABSENT'
      } else if (rand < 0.14) {
        status = 'LATE'
        const lateMin = Math.floor(Math.random() * 50) + 10 // 10–59 min late
        const hour = 7
        const minute = lateMin
        clockIn = new Date(`${dateStr}T${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}:00Z`)
        clockOut = new Date(`${dateStr}T16:30:00Z`)
        totalHours = (clockOut.getTime() - clockIn.getTime()) / 3600000
        lateMinutes = lateMin
      } else {
        status = 'PRESENT'
        clockIn  = new Date(`${dateStr}T07:00:00Z`)
        clockOut = new Date(`${dateStr}T16:30:00Z`)
        totalHours = 9.5
        lateMinutes = 0
      }

      return {
        employeeId: resolvedEmp!.id,
        date: day,
        status,
        clockIn,
        clockOut,
        totalHours,
        lateMinutes,
        notes: isLeave ? 'Annual leave' : null,
      }
    })

    // Batch insert in chunks of 100
    for (let i = 0; i < records.length; i += 100) {
      await prisma.attendance.createMany({ data: records.slice(i, i + 100), skipDuplicates: true })
    }
    totalRecords += records.length
  }

  console.log(`Matched: ${matched}, Skipped (no match): ${skipped}`)
  console.log(`Total attendance records created: ${totalRecords}`)
  await prisma.$disconnect()
  await pool.end()
}

main().catch(e => { console.error(e); process.exit(1) })
