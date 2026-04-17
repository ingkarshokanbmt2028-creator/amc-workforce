import { NextResponse } from 'next/server'
import { PrismaClient } from '@/app/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { execSync } from 'child_process'

// One-time setup endpoint — creates tables and seeds data if DB is empty
export async function POST() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL!,
    ssl: { rejectUnauthorized: false },
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adapter = new PrismaPg(pool as any)
  const prisma = new PrismaClient({ adapter })

  try {
    // Push schema first (creates tables if they don't exist)
    execSync('npx prisma db push --skip-generate', {
      env: { ...process.env },
      stdio: 'pipe',
      cwd: process.cwd(),
    })

    const existing = await prisma.department.count()
    if (existing > 0) {
      await pool.end()
      return NextResponse.json({ message: 'Already seeded', departments: existing })
    }

    // Seed data
    execSync('npx tsx prisma/seed.ts', {
      env: { ...process.env },
      stdio: 'pipe',
      cwd: process.cwd(),
    })

    await pool.end()
    return NextResponse.json({ message: 'Seeded successfully' })
  } catch (err) {
    await pool.end()
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
