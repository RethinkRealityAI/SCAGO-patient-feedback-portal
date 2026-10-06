'use client'

import ReactMarkdown from 'react-markdown'

/**
 * Styled renderer for the AI-generated markdown reports.
 *
 * The survey dashboard wrapped ReactMarkdown in `prose prose-sm`, but
 * `@tailwindcss/typography` is not installed in this project — those classes do
 * nothing, so headings, lists and paragraphs all rendered as identical flat
 * text. Styling each element explicitly keeps the report readable without
 * pulling in another dependency.
 */
export function MarkdownReport({ markdown, className = '' }: { markdown: string; className?: string }) {
  return (
    <div className={`text-sm leading-relaxed text-foreground ${className}`}>
      <ReactMarkdown
        components={{
          h1: ({ children }) => (
            <h2 className="mb-3 text-xl font-bold tracking-tight text-foreground">{children}</h2>
          ),
          h2: ({ children }) => (
            <h3 className="mb-2 mt-6 text-sm font-semibold uppercase tracking-wide text-[#C8262A] first:mt-0">
              {children}
            </h3>
          ),
          h3: ({ children }) => (
            <h4 className="mb-1.5 mt-4 font-semibold text-foreground">{children}</h4>
          ),
          p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="mb-3 space-y-1.5 last:mb-0">{children}</ul>,
          ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1.5 pl-5 last:mb-0">{children}</ol>,
          li: ({ children }) => (
            <li className="relative pl-4 before:absolute before:left-0 before:top-[0.6em] before:h-1.5 before:w-1.5 before:rounded-full before:bg-[#C8262A]/50">
              {children}
            </li>
          ),
          strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#C8262A] underline underline-offset-2">
              {children}
            </a>
          ),
          hr: () => <hr className="my-4 border-border" />,
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  )
}

export default MarkdownReport
