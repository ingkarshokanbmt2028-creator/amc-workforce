import type { Metadata } from 'next'
import { AuthProvider } from '@/lib/auth'
import { SettingsProvider } from '@/lib/settings'
import { Sidebar } from '@/components/Sidebar'
import './globals.css'

export const metadata: Metadata = {
  title: 'AMC Workforce',
  description: 'Attendance & Rostering — Accra Medical Centre',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex bg-background text-foreground">
        <SettingsProvider>
          <AuthProvider>
            <Sidebar />
            <main className="flex-1 overflow-auto">{children}</main>
          </AuthProvider>
        </SettingsProvider>
      </body>
    </html>
  )
}
