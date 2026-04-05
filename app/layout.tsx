import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import { AuthProvider } from '@/lib/auth'
import { Sidebar } from '@/components/Sidebar'
import './globals.css'

const geist = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AMC Workforce',
  description: 'Attendance & Rostering — Accra Medical Centre',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased dark`}>
      <body className="min-h-full flex bg-background text-foreground">
        <AuthProvider>
          <Sidebar />
          <main className="flex-1 overflow-auto">{children}</main>
        </AuthProvider>
      </body>
    </html>
  )
}
