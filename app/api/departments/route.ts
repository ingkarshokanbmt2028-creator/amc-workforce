import { NextResponse } from 'next/server'

const DEPARTMENTS = [
  { id: 'MED', name: 'MEDICINE',          code: 'MED' },
  { id: 'NUR', name: 'NURSING & MIDWIFERY', code: 'NUR' },
  { id: 'AHT', name: 'ALLIED HEALTH',     code: 'AHT' },
  { id: 'ADM', name: 'ADMIN',             code: 'ADM' },
  { id: 'AUX', name: 'AUXILIARY',         code: 'AUX' },
  { id: 'PHM', name: 'PHARMACY',          code: 'PHM' },
  { id: 'IMG', name: 'IMAGING',           code: 'IMG' },
  { id: 'SPE', name: 'SPECIALIST',        code: 'SPE' },
  { id: 'EMG', name: 'EMERGENCY',         code: 'EMG' },
  { id: 'HDU', name: 'HDU-ICU',           code: 'HDU' },
  { id: 'LAB', name: 'LABORATORY',        code: 'LAB' },
  { id: 'MNT', name: 'MAINTENANCE',       code: 'MNT' },
  { id: 'THR', name: 'THEATRE',           code: 'THR' },
  { id: 'WRD', name: 'WARD',              code: 'WRD' },
]

export async function GET() {
  try {
    const { prisma } = await import('@/lib/prisma')
    const departments = await prisma.department.findMany({ orderBy: { name: 'asc' } })
    if (departments.length > 0) return NextResponse.json(departments)
  } catch {
    // DB not available
  }
  return NextResponse.json(DEPARTMENTS)
}
