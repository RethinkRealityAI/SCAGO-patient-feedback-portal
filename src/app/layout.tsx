import type { Metadata } from 'next'
import { Inter } from 'next/font/google';
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import AppBody from './app-body'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'SCAGO Portal',
  description: 'A patient feedback portal for the Sickle Cell Awareness Group of Ontario.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-body antialiased`}>
        <AppBody>{children}</AppBody>
        <Toaster />
      </body>
    </html>
  )
}
