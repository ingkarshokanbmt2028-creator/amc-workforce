/* eslint-disable @typescript-eslint/no-require-imports */
// Required to bypass Supabase self-signed cert in serverless environment
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

import { NextResponse } from 'next/server'
import { PrismaClient } from '@/app/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { readFileSync } from 'fs'
import path from 'path'

export async function POST() {
  const pool = new Pool({
    connectionString: (process.env.POSTGRES_URL_NON_POOLING ?? process.env.POSTGRES_PRISMA_URL ?? process.env.DATABASE_URL!).replace('pgbouncer=true', '').replace('&&', '&').replace('?&', '?'),
    ssl: { rejectUnauthorized: false },
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adapter = new PrismaPg(pool as any)
  const prisma = new PrismaClient({ adapter })

  try {
    // Run migration SQL directly — ignore "already exists" errors
    const migrationSQL = readFileSync(
      path.join(process.cwd(), 'prisma/migrations/0001_init/migration.sql'),
      'utf-8'
    )
    try {
      await pool.query(migrationSQL)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      if (!msg.includes('already exists')) throw e
    }

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
