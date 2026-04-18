import { NextResponse } from 'next/server'

export async function GET() {
  const info: Record<string, unknown> = {
    env: {
      hasPostgresPrismaUrl: !!process.env.POSTGRES_PRISMA_URL,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      nodeEnv: process.env.NODE_ENV,
    }
  }

  try {
    const { Pool } = await import('pg')
    const connStr = (process.env.POSTGRES_PRISMA_URL ?? process.env.DATABASE_URL ?? '')
      .replace('pgbouncer=true', '').replace('sslmode=require', '').replace('?&', '?').replace('&&', '&').replace(/[?&]$/, '')
    info.connectionString = connStr.replace(/:([^:@]+)@/, ':***@')

    const pool = new Pool({ connectionString: connStr, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 5000 })
    const result = await pool.query('SELECT count(*) FROM "Employee"')
    info.employeeCount = result.rows[0].count
    await pool.end()
  } catch (err) {
    info.error = String(err)
  }

  return NextResponse.json(info)
}
