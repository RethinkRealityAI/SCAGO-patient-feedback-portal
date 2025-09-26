import Link from 'next/link'
import { HeartPulse } from 'lucide-react'

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/30 bg-background/20 backdrop-blur-xl mobile-glass">
      <div className="container flex h-16 items-center px-4 sm:px-6">
        <div className="mr-4 flex items-center">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="p-2 rounded-lg bg-primary/10 backdrop-blur-sm border border-primary/20 group-hover:bg-primary/20 transition-all duration-300">
              <HeartPulse className="h-5 w-5 text-primary" />
            </div>
            <span className="font-bold text-lg bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Patient Feedback Portal
            </span>
          </Link>
        </div>
        <nav className="flex flex-1 items-center space-x-2 sm:justify-end sm:space-x-4">
          <Link 
            href="/" 
            className="px-3 py-2 text-sm font-medium text-foreground/80 transition-all duration-300 hover:text-foreground hover:bg-accent/20 rounded-lg backdrop-blur-sm"
          >
            Surveys
          </Link>
          <Link 
            href="/resources" 
            className="px-3 py-2 text-sm font-medium text-foreground/80 transition-all duration-300 hover:text-foreground hover:bg-accent/20 rounded-lg backdrop-blur-sm"
          >
            Resources
          </Link>
          <Link 
            href="/dashboard" 
            className="px-3 py-2 text-sm font-medium text-foreground/80 transition-all duration-300 hover:text-foreground hover:bg-accent/20 rounded-lg backdrop-blur-sm"
          >
            Dashboard
          </Link>
          <Link 
            href="/editor" 
            className="px-3 py-2 text-sm font-medium text-foreground/80 transition-all duration-300 hover:text-foreground hover:bg-accent/20 rounded-lg backdrop-blur-sm"
          >
            Editor
          </Link>
        </nav>
      </div>
    </header>
  )
}
