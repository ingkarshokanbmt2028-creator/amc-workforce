'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Scale, ShieldCheck, FileText, ExternalLink, BookOpen, AlertTriangle, CheckCircle2, Clock, Pencil } from 'lucide-react'

// ── Tracked AMC Operational Licenses (source: compliance meeting 18/03/2026) ─

interface License {
  id: string
  name: string
  body: string
  renewalMonths: number
  description: string
  note?: string
}

const LICENSES: License[] = [
  {
    id: 'hefra',
    name: 'HeFRA Operating License',
    body: 'Health Facilities Regulatory Agency',
    renewalMonths: 12,
    description: 'Hospital facility operating license. Paid annually — valid until the third year.',
    note: 'Payment is annual but the license remains valid for 3 years.',
  },
  {
    id: 'nhia',
    name: 'NHIA Accreditation',
    body: 'National Health Insurance Authority',
    renewalMonths: 24,
    description: 'Accreditation for NHIA claims processing. Renewed every 2 years.',
  },
  {
    id: 'epa',
    name: 'EPA Environmental Permit',
    body: 'Environmental Protection Agency',
    renewalMonths: 18,
    description: 'Environmental compliance certificate for hospital waste management and operations. Renewed every 18 months.',
  },
  {
    id: 'nuclear',
    name: 'Nuclear Regulatory Authority Permit',
    body: 'Nuclear Regulatory Authority of Ghana',
    renewalMonths: 36,
    description: 'Permit for use of radiation equipment in imaging and diagnostic departments. Renewed every 3 years.',
  },
  {
    id: 'workpermit',
    name: 'Expat Staff Work Permits',
    body: 'Ghana Immigration Service',
    renewalMonths: 12,
    description: 'Work permits for all non-Ghanaian clinical staff members. Each permit renewed annually.',
  },
]

// ── Regulatory Reference (no fixed renewal cycle) ─────────────────────────────

const REGULATIONS = [
  {
    shortName: 'Labour Act',
    name: 'Ghana Labour Act, 2003 (Act 651)',
    description: 'Regulates employment relationships, working conditions, hours, and employee rights in Ghana.',
    keyPoints: [
      'Maximum 8 working hours per day / 40 hours per week',
      'Overtime must be compensated at 1.5× or 2× rate',
      'Mandatory rest periods and annual leave entitlements',
      'Proper record-keeping of working hours and wages',
    ],
    link: 'https://www.melr.gov.gh/',
    category: 'labor',
  },
  {
    shortName: 'AHP Act',
    name: 'Allied Health Professions Act, 2000 (Act 595)',
    description: 'Regulates allied health professions to ensure practitioners meet qualification and ethical standards.',
    keyPoints: [
      'All allied health staff must be registered and licensed',
      'Adhere to professional codes of conduct',
      'Maintain continuing professional development',
      'Report malpractice and disciplinary issues',
    ],
    link: 'https://ahpc.gov.gh/',
    category: 'health',
  },
  {
    shortName: 'DPA',
    name: "Ghana Data Protection Act, 2012 (Act 843)",
    description: "Ghana's primary data protection legislation governing the processing of personal data.",
    keyPoints: [
      'Register as a data controller with the Data Protection Commission',
      'Obtain consent before processing personal data',
      'Ensure data accuracy and secure storage',
      "Respect data subjects' right to access and correction",
    ],
    link: 'https://www.dataprotection.org.gh/',
    category: 'data',
  },
]

const categoryColors: Record<string, string> = {
  labor: 'bg-amber-100 text-amber-800',
  health: 'bg-red-100 text-red-700',
  data: 'bg-purple-100 text-purple-700',
}
const categoryLabels: Record<string, string> = {
  labor: 'Labour Law', health: 'Health Regulation', data: 'Data Protection',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function addMonths(date: Date, months: number): Date {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d
}

function daysUntil(date: Date): number {
  return Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

function fmtDate(date: Date): string {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function renewalLabel(months: number): string {
  if (months % 12 === 0) {
    const yrs = months / 12
    return `Every ${yrs} year${yrs !== 1 ? 's' : ''}`
  }
  return `Every ${months} months`
}

type Status = 'overdue' | 'due-soon' | 'compliant'

function getStatus(daysLeft: number): Status {
  if (daysLeft < 0) return 'overdue'
  if (daysLeft <= 60) return 'due-soon'
  return 'compliant'
}

const STATUS_META: Record<Status, { label: string; color: string; bg: string; border: string }> = {
  overdue:    { label: 'Overdue',   color: 'text-red-600',   bg: 'bg-red-50',   border: 'border-red-200'   },
  'due-soon': { label: 'Due Soon',  color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  compliant:  { label: 'Compliant', color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200' },
}

// ── License Card ──────────────────────────────────────────────────────────────

function LicenseCard({ license }: { license: License }) {
  const storageKey = `amc_compliance_${license.id}`
  const [lastRenewed, setLastRenewed] = useState<string>('')
  const [editing, setEditing]         = useState(false)
  const [inputVal, setInputVal]       = useState('')

  useEffect(() => {
    const saved = localStorage.getItem(storageKey)
    if (saved) setLastRenewed(saved)
  }, [storageKey])

  function save() {
    if (!inputVal) return
    localStorage.setItem(storageKey, inputVal)
    setLastRenewed(inputVal)
    setEditing(false)
  }

  const nextDue  = lastRenewed ? addMonths(new Date(lastRenewed), license.renewalMonths) : null
  const daysLeft = nextDue ? daysUntil(nextDue) : null
  const status   = daysLeft !== null ? getStatus(daysLeft) : null
  const meta     = status ? STATUS_META[status] : null

  return (
    <div className={`rounded-xl border p-5 space-y-3 ${meta ? `${meta.bg} ${meta.border}` : 'bg-white border-slate-200'} shadow-sm`}>

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-sm text-slate-900 leading-tight">{license.name}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{license.body}</p>
        </div>
        {meta && status && (
          <span className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${meta.bg} ${meta.color} ${meta.border}`}>
            {status === 'overdue'    && <AlertTriangle className="h-3 w-3" />}
            {status === 'due-soon'  && <Clock className="h-3 w-3" />}
            {status === 'compliant' && <CheckCircle2 className="h-3 w-3" />}
            {meta.label}
          </span>
        )}
      </div>

      <p className="text-xs text-slate-600 leading-relaxed">{license.description}</p>
      {license.note && <p className="text-[11px] text-slate-400 italic">{license.note}</p>}

      {/* Renewal info rows */}
      <div className="space-y-1.5 pt-1 border-t border-current/10">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">Renewal cycle</span>
          <span className="font-medium text-slate-700">{renewalLabel(license.renewalMonths)}</span>
        </div>

        {lastRenewed && nextDue && daysLeft !== null ? (
          <>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Last renewed</span>
              <span className="font-medium text-slate-700">{fmtDate(new Date(lastRenewed))}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Next due</span>
              <span className={`font-semibold ${meta?.color}`}>{fmtDate(nextDue)}</span>
            </div>
            <div className={`mt-2 rounded-lg px-3 py-2 text-center text-xs font-semibold ${meta?.color} ${meta?.bg}`}>
              {daysLeft < 0
                ? `${Math.abs(daysLeft)} day${Math.abs(daysLeft) !== 1 ? 's' : ''} overdue`
                : daysLeft === 0
                ? 'Due today — action required'
                : `${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining`}
            </div>
          </>
        ) : (
          <div className="mt-1 rounded-lg border border-dashed border-slate-200 px-3 py-2.5 text-center text-xs text-slate-400">
            Set last renewed date to track renewal
          </div>
        )}

        {/* Date editor */}
        {editing ? (
          <div className="flex items-center gap-2 pt-1">
            <input
              type="date"
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
            />
            <button
              onClick={save}
              disabled={!inputVal}
              className="px-3 py-1.5 rounded-lg bg-amber-500 text-black text-xs font-semibold hover:bg-amber-400 disabled:opacity-40 transition-colors"
            >
              Save
            </button>
            <button onClick={() => setEditing(false)} className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => { setInputVal(lastRenewed); setEditing(true) }}
            className="w-full flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-amber-600 py-1 transition-colors"
          >
            <Pencil className="h-3 w-3" />
            {lastRenewed ? 'Edit renewal date' : 'Set last renewed date'}
          </button>
        )}
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ResourcesPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-6 space-y-8">

      <div>
        <h1 className="text-2xl font-bold text-slate-900">Compliance</h1>
        <p className="text-sm text-slate-600 mt-1">Track AMC operating licenses and institutional compliance requirements</p>
      </div>

      {/* Tip */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
        <BookOpen className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
        <div className="text-sm">
          <p className="font-medium text-slate-900">Need guidance on a regulation?</p>
          <p className="text-slate-700 mt-0.5">
            Go to{' '}
            <Link href="/quick-ask" className="text-amber-700 underline underline-offset-2 font-medium">
              Quick AI Ask
            </Link>{' '}
            and ask, for example: &quot;What are the HeFRA requirements for staff licensing?&quot;
          </p>
        </div>
      </div>

      {/* Operational Licenses — tracked with renewal dates */}
      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">
          Operational Licenses &amp; Renewals
        </h2>
        <p className="text-xs text-slate-400 mb-4">
          Set the last renewed date for each license to see when it is next due and how many days remain.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {LICENSES.map(lic => <LicenseCard key={lic.id} license={lic} />)}
        </div>
      </section>

      {/* Regulatory Framework — reference only */}
      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">
          Regulatory Framework
        </h2>
        <p className="text-xs text-slate-400 mb-4">Ongoing statutory obligations — no fixed renewal cycle.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {REGULATIONS.map(reg => (
            <div key={reg.shortName} className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col gap-3 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                  {reg.category === 'labor'  ? <Scale className="h-4 w-4 text-amber-700" />     :
                   reg.category === 'health' ? <ShieldCheck className="h-4 w-4 text-red-600" /> :
                                               <FileText className="h-4 w-4 text-purple-700" />}
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-slate-900 leading-tight">{reg.shortName}</h3>
                  <span className={`inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${categoryColors[reg.category]}`}>
                    {categoryLabels[reg.category]}
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">{reg.description}</p>
              <ul className="space-y-1.5">
                {reg.keyPoints.map((point, i) => (
                  <li key={i} className="text-xs flex items-start gap-2 text-slate-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-600 mt-1.5 shrink-0" />
                    {point}
                  </li>
                ))}
              </ul>
              <a
                href={reg.link}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-auto inline-flex items-center gap-1 text-xs font-medium text-amber-700 hover:underline underline-offset-2"
              >
                Official resource <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          ))}
        </div>
      </section>

    </div>
  )
}
