import { NextResponse } from 'next/server'
import { PrismaClient } from '@/app/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

// One-time seed endpoint — only works if DB is empty
export async function POST() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL!,
    ssl: { rejectUnauthorized: false },
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adapter = new PrismaPg(pool as any)
  const prisma = new PrismaClient({ adapter })

  try {
    const existing = await prisma.department.count()
    if (existing > 0) {
      await pool.end()
      return NextResponse.json({ message: 'Already seeded', departments: existing })
    }

    // Run seed via child process
    const { execSync } = await import('child_process')
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
