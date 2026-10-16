import { useEffect, useState } from 'react'
import {
  BarChart3,
  Check,
  Copy,
  Download,
  Home,
  Inbox,
  Moon,
  PanelLeft,
  RotateCcw,
  Search,
  Settings,
  Sun,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { BeaconTip, useBeaconTips } from './demo/tips'

const REPO_URL = 'https://github.com/Tautorn/beacon-tip'
const INSTALL = 'npx shadcn@latest add https://tautorn.github.io/beacon-tip/r/beacon-tip.json'

const USAGE = `// lib/tips.ts
import { createBeaconTips } from '@/components/beacon-tip'

export const { BeaconTip, useBeaconTips } = createBeaconTips({
  'command-menu': {
    kind: 'new',
    title: 'Command menu',
    body: 'Press Ctrl K anywhere.',
    until: '2026-12-31',
  },
})

// anywhere
<BeaconTip id="command-menu" side="bottom">
  <Button>Search</Button>
</BeaconTip>`

const FEATURES = [
  ['One at a time', 'Only the first unseen tip opens. The rest pulse until it is their turn.'],
  ['Hidden targets wait', 'A tip inside a closed sidebar or tab joins the queue when it becomes visible.'],
  ['Announcements expire', 'Set until and the beacon disappears after that day, no cleanup deploy needed.'],
  ['Typed ids', 'The catalog is the source of truth. A typo in an id fails to compile.'],
  ['Snooze or skip', 'Closing hides it for this visit. "Got it" remembers it. "Skip all" clears the queue.'],
  ['Your storage', 'localStorage by default. Pass load and save to keep it on your server.'],
] as const

export function App() {
  const [dark, setDark] = useState(() => matchMedia('(prefers-color-scheme: dark)').matches)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { reset } = useBeaconTips()

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  return (
    <div className="mx-auto w-full max-w-4xl space-y-12 px-4 py-10 sm:px-6 sm:py-16">
      <header className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs font-semibold tracking-widest text-primary uppercase">shadcn/ui registry</p>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" aria-label="Toggle theme" onClick={() => setDark(d => !d)}>
              {dark ? <Sun /> : <Moon />}
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <a href={REPO_URL}>GitHub</a>
            </Button>
          </div>
        </div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Beacon Tip<span className="text-primary">.</span>
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          A pulsing dot on any element that opens a "what's new" or tip popover. No tours, no modals: one tip at a
          time, in the place where the feature lives.
        </p>
        <InstallCommand />
      </header>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Try it</h2>
          <Button variant="outline" size="sm" onClick={reset}>
            <RotateCcw />
            Show tips again
          </Button>
        </div>
        <DemoApp sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen(o => !o)} />
        <p className="text-sm text-muted-foreground">
          Acknowledge the first tip and the next one opens. Then open the sidebar: its tip was waiting for the target
          to be visible.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {FEATURES.map(([title, body]) => (
          <div key={title} className="rounded-xl border p-4">
            <p className="font-medium">{title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{body}</p>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Usage</h2>
        <pre className="overflow-x-auto rounded-xl border bg-card p-4 text-sm leading-relaxed">
          <code>{USAGE}</code>
        </pre>
      </section>

      <footer className="border-t pt-6 text-sm text-muted-foreground">
        MIT licensed.{' '}
        <a className="underline underline-offset-4 hover:text-foreground" href={REPO_URL}>
          Source on GitHub
        </a>
      </footer>
    </div>
  )
}

function InstallCommand() {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(INSTALL)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="flex min-w-0 items-center gap-2 rounded-xl border bg-card py-1.5 pr-1.5 pl-4">
      <code className="min-w-0 flex-1 truncate text-sm">{INSTALL}</code>
      <Button variant="ghost" size="icon" className="shrink-0" aria-label="Copy install command" onClick={copy}>
        {copied ? <Check /> : <Copy />}
      </Button>
    </div>
  )
}

function DemoApp({ sidebarOpen, onToggleSidebar }: { sidebarOpen: boolean; onToggleSidebar: () => void }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <Button variant="ghost" size="icon" aria-label="Toggle sidebar" onClick={onToggleSidebar}>
          <PanelLeft />
        </Button>
        <BeaconTip id="command-menu" side="bottom">
          <Button variant="outline" size="sm" className="text-muted-foreground">
            <Search />
            <span className="hidden sm:inline">Search...</span>
          </Button>
        </BeaconTip>
        <div className="flex-1" />
        <BeaconTip id="old-announcement" side="bottom">
          <Button variant="ghost" size="icon" aria-label="Settings">
            <Settings />
          </Button>
        </BeaconTip>
      </div>
      <div className="flex min-h-64">
        <nav className={cn('w-40 shrink-0 space-y-1 border-r p-2', !sidebarOpen && 'hidden')}>
          <SidebarItem icon={Home} label="Home" />
          <SidebarItem icon={Inbox} label="Inbox" />
          <BeaconTip id="sidebar-reports" side="right" className="w-full">
            <SidebarItem icon={BarChart3} label="Reports" />
          </BeaconTip>
        </nav>
        <main className="min-w-0 flex-1 space-y-4 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium">Orders</p>
            <BeaconTip id="export-csv" side="bottom" align="end">
              <Button size="sm" variant="outline">
                <Download />
                Export
              </Button>
            </BeaconTip>
          </div>
          <div className="space-y-2">
            {[72, 56, 64].map(width => (
              <div key={width} className="h-3 rounded-full bg-border" style={{ width: `${width}%` }} />
            ))}
          </div>
        </main>
      </div>
    </div>
  )
}

function SidebarItem({ icon: Icon, label }: { icon: typeof Home; label: string }) {
  return (
    <button
      type="button"
      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
    >
      <Icon className="size-4" />
      {label}
    </button>
  )
}
