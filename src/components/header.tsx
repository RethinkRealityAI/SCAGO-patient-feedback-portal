import Link from 'next/link'
import { HeartPulse } from 'lucide-react'

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex items-center">
          <Link href="/" className="flex items-center space-x-2">
            <HeartPulse className="h-6 w-6 text-primary" />
            <span className="font-bold">SCAGO Feedback</span>
          </Link>
        </div>
        <nav className="flex flex-1 items-center space-x-6 sm:justify-end">
          <Link href="/" className="text-sm font-medium text-foreground/80 transition-colors hover:text-foreground">
            Feedback
          </Link>
          <Link href="/resources" className="text-sm font-medium text-foreground/80 transition-colors hover:text-foreground">
            Resources
          </Link>
          <Link href="/dashboard" className="text-sm font-medium text-foreground/80 transition-colors hover:text-foreground">
            Dashboard
          </Link>
        </nav>
      </div>
    </header>
  )
}
