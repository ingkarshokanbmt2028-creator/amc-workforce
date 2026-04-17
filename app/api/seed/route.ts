import { NextResponse } from 'next/server'
import { PrismaClient } from '@/app/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { readFileSync } from 'fs'
import path from 'path'

export async function POST() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL!,
    ssl: { rejectUnauthorized: false },
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adapter = new PrismaPg(pool as any)
  const prisma = new PrismaClient({ adapter })

  try {
    // Run migration SQL directly
    const migrationSQL = readFileSync(
      path.join(process.cwd(), 'prisma/migrations/0001_init/migration.sql'),
      'utf-8'
    )
    await pool.query(migrationSQL)

    const existing = await prisma.department.count()
    if (existing > 0) {
      await pool.end()
      return NextResponse.json({ message: 'Already seeded', departments: existing })
    }

    // Seed departments
    const departments = [
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
      { name: 'FRONT OFFICE', code: 'FRO' },
      { name: 'ANAESTHESIA', code: 'ANS' },
    ]

    for (const dept of departments) {
      await prisma.department.upsert({
        where: { code: dept.code },
        update: {},
        create: dept,
      })
    }

    await pool.end()
    return NextResponse.json({ message: 'Tables created and departments seeded. Employee data requires running the seed script locally.' })
  } catch (err) {
    await pool.end()
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
