import 'dotenv/config'
import { PrismaClient } from '../app/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import * as XLSX from 'xlsx'
import * as path from 'path'
import * as fs from 'fs'
import { SHIFT_CODES, SHIFT_HOURS, SHIFT_TIMES } from '../lib/shifts'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  ssl: { rejectUnauthorized: false },
})
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const adapter = new PrismaPg(pool as any)
const prisma = new PrismaClient({ adapter })

const DEPARTMENTS = [
  { name: 'MEDICINE', code: 'MED' },
  { name: 'NURSING & MIDWIFERY', code: 'NUR' },
  { name: 'ALLIED HEALTH', code: 'AHT' },
  { name: 'ADMIN', code: 'ADM' },
  { name: 'AUXILIARY', code: 'AUX' },
  { name: 'PHARMACY', code: 'PHM' },
  { name: 'IMAGING', code: 'IMG' },
  { name: 'SPECIALIST', code: 'SPE' },
  { name: 'EMERGENCY', code: 'EMG' },
  { name: 'HDU-ICU', code: 'HDU' },
  { name: 'LABORATORY', code: 'LAB' },
  { name: 'MAINTENANCE', code: 'MNT' },
  { name: 'THEATRE', code: 'THR' },
  { name: 'WARD', code: 'WRD' },
]

const ROTA_SKIP_NAMES = new Set([
  'RADIOGRAPHERS', 'SONOGRAPHERS', 'IMAGING NURSE', 'LOCUM',
  'NAME', '', 'STAFF', 'EMPLOYEE', 'SPECIALIST', 'RGN',
  '12 HOUR SHIFT FOR EMERGENCY TEAM', 'OPD & EMERGENCY',
  'L - DAY SHIFT', 'N - NIGHT SHIFT', 'AL - ANNUAL LEAVE',
  'W- WARD', 'F - FLOATING', 'V - VIP', 'T - TRAINING',
  'M - MORNING SHIFT 8:00AM - 2:00PM', 'A - AFTERNOON SHIFT 2:00PM - 8:00PM',
  'SL - SICK LEAVE', 'ML - MATERNITY LEAVE', 'L - DAY SHIFT   8:00AM - 8:00PM',
  'N - NIGHT SHIFT 8:00PM - 8:00AM',
])

const MONTH_MAP: Record<string, number> = {
  JANUARY:1, FEBRUARY:2, MARCH:3, APRIL:4, MAY:5, JUNE:6,
  JULY:7, AUGUST:8, SEPTEMBER:9, OCTOBER:10, NOVEMBER:11, DECEMBER:12,
  JAN:1, FEB:2, MAR:3, APR:4, JUN:6, JUL:7, AUG:8, SEP:9, OCT:10, NOV:11, DEC:12,
}

// ── Departments ────────────────────────────────────────────────────────────

async function seedDepartments() {
  console.log('Seeding departments…')
  for (const dept of DEPARTMENTS) {
    await prisma.department.upsert({
      where: { code: dept.code },
      create: dept,
      update: { name: dept.name },
    })
  }
}

// ── Employees ──────────────────────────────────────────────────────────────

async function seedEmployees(deptMap: Map<string, string>) {
  const filePath = path.join(process.cwd(), 'data', 'AMC_EMPLOYEE_LIST_2026.xlsx')
  if (!fs.existsSync(filePath)) {
    console.log('No employee xlsx — skipping')
    return
  }
  console.log('Seeding employees…')
  const wb = XLSX.readFile(filePath)
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { defval: '', header: 1 })

  let count = 0
  for (const rawRow of rows) {
    const row = rawRow as string[]
    const name    = String(row[2] ?? '').trim()
    const staffId = String(row[4] ?? '').trim()
    const deptName = String(row[6] ?? '').trim().toUpperCase()
    const location = String(row[8] ?? 'ACCRA').trim() || 'ACCRA'
    const position = String(row[10] ?? '').trim()

    if (!name || !staffId || name === 'NAME' || !staffId.startsWith('AMC')) continue

    let deptId = deptMap.get(deptName)
    if (!deptId) {
      for (const [key, id] of deptMap) {
        if (deptName.includes(key) || key.includes(deptName)) { deptId = id; break }
      }
    }
    if (!deptId) { console.warn(`  Unknown dept "${deptName}" for ${name}`); continue }

    await prisma.employee.upsert({
      where: { staffId },
      create: { staffId, name, departmentId: deptId, position, location },
      update: { name, departmentId: deptId, position, location },
    })
    count++
  }
  console.log(`  Seeded ${count} employees`)
}

// ── Rota (single sheet) ────────────────────────────────────────────────────

async function seedRotaSheet(
  ws: XLSX.WorkSheet,
  sheetLabel: string,
  deptId: string,
  month: number,
  year: number,
) {
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { defval: '', header: 1 })

  // Row 1 contains day numbers interleaved with legend/summary columns
  const dayRow = rows[1] as unknown[]
  const colToDay = new Map<number, number>()
  for (let col = 0; col < dayRow.length; col++) {
    const val = Number(dayRow[col])
    if (!isNaN(val) && val >= 1 && val <= 31) colToDay.set(col, val)
  }

  if (colToDay.size === 0) {
    console.warn(`  Sheet "${sheetLabel}": no day columns found — skipping`)
    return 0
  }

  const roster = await prisma.roster.upsert({
    where: { departmentId_month_year: { departmentId: deptId, month, year } },
    create: { departmentId: deptId, month, year, createdBy: 'seed', status: 'PUBLISHED', publishedAt: new Date(), publishedBy: 'seed' },
    update: { status: 'PUBLISHED' },
  })

  let slotCount = 0
  for (const rawRow of rows.slice(2)) {
    const row = rawRow as unknown[]
    const name = String(row[0] ?? '').trim().toUpperCase()
    if (!name || ROTA_SKIP_NAMES.has(name) || !name.match(/[A-Z]{2,}/)) continue

    const isLocum = / \(LOCUM\)/i.test(name)
    const cleanName = name.replace(/ \(LOCUM\)/i, '').trim()

    let employee = await prisma.employee.findFirst({
      where: { name: { contains: cleanName, mode: 'insensitive' } },
    })

    // Auto-create any employee found in rota but not in employee list
    if (!employee) {
      const empType = isLocum ? 'LOCUM' : 'PERMANENT'
      const prefix = isLocum ? 'LOC' : 'AUTO'
      const autoStaffId = `${prefix}/${deptId.slice(-6)}/${cleanName.replace(/\s+/g, '').slice(0, 8).toUpperCase()}`
      const existing = await prisma.employee.findFirst({ where: { staffId: autoStaffId } })
      employee = existing ?? await prisma.employee.create({
        data: { staffId: autoStaffId, name: cleanName, departmentId: deptId, position: isLocum ? 'LOCUM' : 'STAFF', employeeType: empType },
      })
      console.log(`  Auto-created ${empType}: "${cleanName}"`)
    }

    for (const [col, day] of colToDay) {
      const raw = String(row[col] ?? '').trim().toUpperCase()
      if (!raw || raw === '0') continue

      const shiftType = SHIFT_CODES[raw]
      if (!shiftType) {
        if (raw) console.warn(`  Unknown code "${raw}" for ${name} day ${day}`)
        continue
      }

      const date = new Date(year, month - 1, day)
      const times = SHIFT_TIMES[shiftType]

      const existing = await prisma.rosterSlot.findFirst({
        where: { rosterId: roster.id, employeeId: employee.id, date },
        select: { id: true },
      })
      if (existing) {
        await prisma.rosterSlot.update({
          where: { id: existing.id },
          data: { shiftType: shiftType as any, startTime: times?.start, endTime: times?.end, plannedHours: SHIFT_HOURS[shiftType] ?? 0 },
        })
      } else {
        await prisma.rosterSlot.create({
          data: { rosterId: roster.id, employeeId: employee.id, date, shiftType: shiftType as any, startTime: times?.start, endTime: times?.end, plannedHours: SHIFT_HOURS[shiftType] ?? 0 },
        })
      }
      slotCount++
    }
  }
  return slotCount
}

async function seedRotaFile(
  filePath: string,
  deptCode: string,
  defaultMonth: number,
  defaultYear: number,
  deptMap: Map<string, string>,
) {
  if (!fs.existsSync(filePath)) { console.log(`No rota at ${filePath} — skipping`); return }

  const deptId = [...deptMap.entries()].find(([, id]) => {
    return DEPARTMENTS.find(d => d.code === deptCode && deptMap.get(d.name) === id)
  })?.[1]
  if (!deptId) { console.error(`Dept code ${deptCode} not in map`); return }

  console.log(`Seeding rota from ${path.basename(filePath)}…`)
  const wb = XLSX.readFile(filePath)

  let totalSlots = 0
  for (const sheetName of wb.SheetNames) {
    // Try to parse month/year from sheet name e.g. "JANUARY 2026"
    const upper = sheetName.toUpperCase()
    let month = defaultMonth, year = defaultYear
    for (const [name, m] of Object.entries(MONTH_MAP)) {
      if (upper.includes(name)) { month = m; break }
    }
    const yearMatch = upper.match(/20(\d{2})/)
    if (yearMatch) year = 2000 + Number(yearMatch[1])

    const ws = wb.Sheets[sheetName]
    const count = await seedRotaSheet(ws, sheetName, deptId, month, year)
    console.log(`  Sheet "${sheetName}" → ${month}/${year}: ${count} slots`)
    totalSlots += count
  }
  console.log(`  Total: ${totalSlots} roster slots`)
}

// ── Leave Balances ─────────────────────────────────────────────────────────

async function seedLeaveData() {
  const filePath = path.join(process.cwd(), 'data', 'AMC_LEAVE_2025_2026.xlsx')
  if (!fs.existsSync(filePath)) { console.log('No leave data file — skipping'); return }

  console.log('Seeding leave balances…')
  const wb = XLSX.readFile(filePath)
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { defval: '', header: 1 })

  // Column layout (0-indexed):
  // 0=#, 1=LastName, 2=FirstName, 3=OpeningBalance, 4=Entitlement, 5=TotalAvailable,
  // 6=DaysTaken, 7=?, 8=Remaining1, 9=?, 10=Remaining2, 11=?, 12=FinalRemaining, 13=LeaveNotes
  let seeded = 0, skipped = 0

  for (const rawRow of rows) {
    const row = rawRow as unknown[]
    const lastName  = String(row[1] ?? '').trim()
    const firstName = String(row[2] ?? '').trim()
    if (!lastName || !firstName || lastName === 'NAME' || !isNaN(Number(lastName))) continue

    const fullName = `${lastName} ${firstName}`.trim()

    // Find employee by name (try "LastName FirstName" and "FirstName LastName")
    let employee = await prisma.employee.findFirst({
      where: { name: { contains: lastName, mode: 'insensitive' } },
    })
    // If multiple matches, narrow by first name
    if (!employee) {
      employee = await prisma.employee.findFirst({
        where: { name: { contains: firstName.split(' ')[0], mode: 'insensitive' } },
      })
    }
    if (!employee) { skipped++; continue }

    const openingBalance    = Number(row[3]) || 0
    const annualEntitlement = Number(row[4]) || 0
    const totalAvailable    = Number(row[5]) || openingBalance + annualEntitlement
    const daysTaken         = Number(row[6]) || 0
    const daysRemaining     = Number(row[12]) || Math.max(0, totalAvailable - daysTaken)
    const leaveNotes        = String(row[13] ?? '').trim() || null

    await prisma.leaveBalance.upsert({
      where: { employeeId_fiscalYear: { employeeId: employee.id, fiscalYear: '2025-2026' } },
      create: { employeeId: employee.id, fiscalYear: '2025-2026', annualEntitlement, openingBalance, totalAvailable, daysTaken, daysRemaining, leaveNotes },
      update: { annualEntitlement, openingBalance, totalAvailable, daysTaken, daysRemaining, leaveNotes },
    })
    seeded++
  }
  console.log(`  Seeded ${seeded} leave balances (${skipped} employees not matched)`)
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  await seedDepartments()

  const depts = await prisma.department.findMany()
  const deptMap = new Map<string, string>(depts.map((d: { name: string; id: string }) => [d.name, d.id]))

  await seedEmployees(deptMap)

  // Seed all rota files in data/
  const dataDir = path.join(process.cwd(), 'data')
  const rotaFiles = fs.readdirSync(dataDir).filter(f => f.endsWith('.xlsx') && f.toUpperCase().includes('ROTA'))

  for (const file of rotaFiles) {
    const fp = path.join(dataDir, file)
    const upper = file.toUpperCase()

    let deptCode = 'MED'
    if (upper.includes('IMAGING') || upper.includes('RADIOL')) deptCode = 'IMG'
    else if (upper.includes('NURS') || upper.includes('MIDWIF')) deptCode = 'NUR'
    else if (upper.includes('PHARMA')) deptCode = 'PHM'
    else if (upper.includes('ADMIN')) deptCode = 'ADM'
    else if (upper.includes('SPECIALIST')) deptCode = 'SPE'
    else if (upper.includes('EMERGENCY') || upper.includes('EMERG')) deptCode = 'EMG'
    else if (upper.includes('HDU') || upper.includes('ICU')) deptCode = 'HDU'
    else if (upper.includes('LAB') || upper.includes('LABORATOR')) deptCode = 'LAB'
    else if (upper.includes('MAINTEN')) deptCode = 'MNT'
    else if (upper.includes('THEATRE') || upper.includes('THEATER')) deptCode = 'THR'
    else if (upper.includes('WARD')) deptCode = 'WRD'

    // Default month/year from filename
    let month = new Date().getMonth() + 1, year = new Date().getFullYear()
    for (const [abbr, m] of Object.entries(MONTH_MAP)) {
      if (upper.includes(abbr)) { month = m; break }
    }
    const yearMatch = upper.match(/20(\d{2})/)
    if (yearMatch) year = 2000 + Number(yearMatch[1])

    await seedRotaFile(fp, deptCode, month, year, deptMap)
  }

  await seedLeaveData()

  console.log('Done.')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
