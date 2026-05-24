import { PrismaClient } from '../app/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})
const adapter = new PrismaPg(pool as any)
const prisma = new PrismaClient({ adapter })

async function main() {
  const departments = await prisma.department.findMany({ select: { id: true, code: true, name: true } })

  const doctorCodes = new Set(['MED', 'SPE'])
  const techCodes = new Set(['LAB', 'PHM', 'IMG'])

  for (const dept of departments) {
    let hours: number | null = null
    if (doctorCodes.has(dept.code)) hours = 192
    else if (techCodes.has(dept.code)) hours = 150
    if (hours === null) continue

    const result = await prisma.employee.updateMany({
      where: { departmentId: dept.id, status: 'ACTIVE' },
      data: { expectedMonthlyHours: hours },
    })
    console.log(`${dept.code} (${dept.name}): updated ${result.count} employees → ${hours}h`)
  }

  console.log('Done.')
}

main().catch(console.error).finally(() => prisma.$disconnect())
