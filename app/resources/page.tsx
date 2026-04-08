'use client'

import Link from 'next/link'
import { Scale, ShieldCheck, FileText, ExternalLink, BookOpen } from 'lucide-react'

const regulations = [
  {
    shortName: 'DPA',
    name: "Ghana Data Protection Act, 2012 (Act 843)",
    description: "Ghana's primary data protection legislation governing the processing of personal data.",
    keyPoints: [
      "Register as a data controller with the Data Protection Commission",
      "Obtain consent before processing personal data",
      "Ensure data accuracy and secure storage",
      "Respect data subjects' right to access and correction",
    ],
    link: "https://www.dataprotection.org.gh/",
    category: "data",
  },
  {
    shortName: 'Labour Act',
    name: "Ghana Labour Act, 2003 (Act 651)",
    description: "Regulates employment relationships, working conditions, hours, and employee rights in Ghana.",
    keyPoints: [
      "Maximum 8 working hours per day / 40 hours per week",
      "Overtime must be compensated at 1.5× or 2× rate",
      "Mandatory rest periods and annual leave entitlements",
      "Proper record-keeping of working hours and wages",
    ],
    link: "https://www.melr.gov.gh/",
    category: "labor",
  },
  {
    shortName: 'HeFRA',
    name: "Health Facilities Regulatory Agency Act (Act 829)",
    description: "Governs the licensing and regulation of health facilities in Ghana.",
    keyPoints: [
      "Obtain and renew facility operating license",
      "Meet minimum staffing and equipment standards",
      "Maintain hygiene, safety, and infection control protocols",
      "Submit to periodic inspections and audits",
    ],
    link: "https://hefra.gov.gh/",
    category: "health",
  },
  {
    shortName: 'AHP Act',
    name: "Allied Health Professions Act, 2000 (Act 595)",
    description: "Regulates allied health professions to ensure practitioners meet qualification and ethical standards.",
    keyPoints: [
      "All allied health staff must be registered and licensed",
      "Adhere to professional codes of conduct",
      "Maintain continuing professional development",
      "Report malpractice and disciplinary issues",
    ],
    link: "https://ahpc.gov.gh/",
    category: "health",
  },
  {
    shortName: 'HIPAA',
    name: "Health Insurance Portability and Accountability Act",
    description: "Federal law protecting sensitive patient health information.",
    keyPoints: [
      "Safeguard Protected Health Information (PHI)",
      "Implement administrative, physical & technical safeguards",
      "Ensure minimum necessary access to data",
      "Report breaches within 60 days",
    ],
    link: "https://www.hhs.gov/hipaa/index.html",
    category: "privacy",
  },
  {
    shortName: 'GDPR',
    name: "General Data Protection Regulation",
    description: "EU regulation applicable if handling data of EU nationals.",
    keyPoints: [
      "Lawful basis required for all data processing",
      "Right to erasure ('right to be forgotten')",
      "72-hour breach notification requirement",
      "Data Protection Impact Assessments for high-risk processing",
    ],
    link: "https://gdpr.eu/",
    category: "data",
  },
]

const categoryColors: Record<string, string> = {
  privacy: 'bg-blue-500/10 text-blue-400',
  labor:   'bg-amber-500/10 text-amber-400',
  health:  'bg-red-500/10 text-red-400',
  data:    'bg-purple-500/10 text-purple-400',
}
const categoryLabels: Record<string, string> = {
  privacy: 'Privacy', labor: 'Labour Law', health: 'Health Regulation', data: 'Data Protection',
}

export default function ResourcesPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Resources & Compliance</h1>
        <p className="text-sm text-white/40 mt-1">Regulations, licenses, and standards AMC must follow</p>
      </div>

      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 flex items-start gap-3">
        <BookOpen className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />
        <div className="text-sm">
          <p className="font-medium text-white">Need guidance on a regulation?</p>
          <p className="text-white/50 mt-0.5">
            Go to{' '}
            <Link href="/quick-ask" className="text-amber-400 underline underline-offset-2 font-medium">
              Quick AI Ask
            </Link>{' '}
            and ask — e.g. "What does the Ghana Labour Act say about overtime?"
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {regulations.map((reg) => (
          <div key={reg.shortName} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                {reg.category === 'labor' ? <Scale className="h-4 w-4 text-amber-400" /> :
                 reg.category === 'health' ? <ShieldCheck className="h-4 w-4 text-red-400" /> :
                 <FileText className="h-4 w-4 text-purple-400" />}
              </div>
              <div>
                <h3 className="font-semibold text-sm text-white leading-tight">{reg.shortName}</h3>
                <span className={`inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${categoryColors[reg.category]}`}>
                  {categoryLabels[reg.category]}
                </span>
              </div>
            </div>

            <p className="text-xs text-white/40 leading-relaxed">{reg.description}</p>

            <ul className="space-y-1.5">
              {reg.keyPoints.map((point, i) => (
                <li key={i} className="text-xs flex items-start gap-2 text-white/60">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                  {point}
                </li>
              ))}
            </ul>

            <a href={reg.link} target="_blank" rel="noopener noreferrer"
              className="mt-auto inline-flex items-center gap-1 text-xs text-amber-400 hover:underline underline-offset-2">
              Official resource <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        ))}
      </div>
    </div>
  )
}
