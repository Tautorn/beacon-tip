'use client'

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode, type SyntheticEvent } from 'react'
import { Lightbulb, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export type BeaconTipKind = 'new' | 'tip'

export type BeaconTipDef = {
  /** `new` for announcements, `tip` for usage hints. Defaults to `tip`. */
  kind?: BeaconTipKind
  title: string
  body: ReactNode
  /** Last day the tip is shown (`YYYY-MM-DD`, local time). */
  until?: string
  /** Higher opens first. Equal priorities keep the order the targets appeared in. */
  priority?: number
}

export type BeaconTipStorage = {
  load: () => string[] | Promise<string[]>
  save: (seen: string[]) => void | Promise<void>
}

export type BeaconTipLabels = {
  new: string
  tip: string
  acknowledge: string
  skipAll: (count: number) => string
}

export type BeaconTipOptions = {
  /** Where seen ids are kept. Defaults to `localStorage` under `beacon-tip:seen`. */
  storage?: BeaconTipStorage
  labels?: Partial<BeaconTipLabels>
  /** Delay before a tip opens on its own, in ms. */
  openDelay?: number
}

export type BeaconTipProps<Id extends string> = {
  id: Id
  children: ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
  /** Wrapper class, e.g. `flex-1` when the child must fill its row. */
  className?: string
}

const DEFAULT_LABELS: BeaconTipLabels = {
  new: 'New',
  tip: 'Tip',
  acknowledge: 'Got it',
  skipAll: count => `Skip all (${count})`,
}

const KIND_ICON = { new: Sparkles, tip: Lightbulb } as const

export function localStorageAdapter(key = 'beacon-tip:seen'): BeaconTipStorage {
  return {
    load: () => {
      try {
        const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? '[]')
        return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []
      } catch {
        return []
      }
    },
    save: seen => {
      try {
        localStorage.setItem(key, JSON.stringify(seen))
      } catch {
        // Private mode or full quota: the tip just shows again next visit.
      }
    },
  }
}

export function isTipExpired(tip: BeaconTipDef, today = new Date()): boolean {
  if (!tip.until) return false
  const [y, m, d] = tip.until.split('-').map(Number)
  return today > new Date(y, m - 1, d, 23, 59, 59)
}

type TipState = {
  ready: boolean
  seen: string[]
  /** Visible, unseen targets waiting their turn. The first one opens on its own. */
  queue: string[]
  /** Closed without "Got it" this session: out of the queue, beacon stays. */
  snoozed: string[]
}

const INITIAL_STATE: TipState = { ready: false, seen: [], queue: [], snoozed: [] }

/**
 * Builds a typed `<BeaconTip>` and `useBeaconTips()` bound to one catalog.
 * A tip id is what gets stored as seen: changing an id shows that tip to everyone again.
 *
 * export const { BeaconTip, useBeaconTips } = createBeaconTips({
 *   'command-menu': { kind: 'new', title: 'Command menu', body: 'Press Ctrl K anywhere.', until: '2026-12-31' },
 * })
 */
export function createBeaconTips<T extends Record<string, BeaconTipDef>>(tips: T, options: BeaconTipOptions = {}) {
  type Id = Extract<keyof T, string>

  const storage = options.storage ?? localStorageAdapter()
  const labels = { ...DEFAULT_LABELS, ...options.labels }
  const openDelay = options.openDelay ?? 700

  let state = INITIAL_STATE
  let loadStarted = false
  const listeners = new Set<() => void>()

  const priority = (id: string) => tips[id]?.priority ?? 0

  const setState = (next: Partial<TipState>) => {
    const merged = { ...state, ...next }
    // Array.prototype.sort is stable, so equal priorities keep mount order.
    merged.queue = merged.queue.filter(id => !merged.seen.includes(id)).sort((a, b) => priority(b) - priority(a))
    state = merged
    listeners.forEach(listener => listener())
  }

  const persist = (seen: string[]) => {
    Promise.resolve()
      .then(() => storage.save(seen))
      .catch(error => console.error('[beacon-tip] could not save seen tips', error))
  }

  const load = () => {
    if (loadStarted) return
    loadStarted = true
    Promise.resolve()
      .then(() => storage.load())
      .then(
        seen => setState({ ready: true, seen: [...new Set([...state.seen, ...seen])] }),
        error => {
          console.error('[beacon-tip] could not load seen tips', error)
          setState({ ready: true })
        },
      )
  }

  const subscribe = (listener: () => void) => {
    load()
    listeners.add(listener)
    return () => listeners.delete(listener)
  }

  const useTipState = () => useSyncExternalStore(subscribe, () => state, () => INITIAL_STATE)

  const register = (id: string) => {
    if (state.queue.includes(id) || state.snoozed.includes(id)) return
    setState({ queue: [...state.queue, id] })
  }

  const unregister = (id: string) => {
    if (state.queue.includes(id)) setState({ queue: state.queue.filter(q => q !== id) })
  }

  const snooze = (id: string) => {
    setState({ queue: state.queue.filter(q => q !== id), snoozed: [...new Set([...state.snoozed, id])] })
  }

  const markSeen = (ids: string[]) => {
    const seen = [...new Set([...state.seen, ...ids])]
    setState({ seen })
    persist(seen)
  }

  function useBeaconTips() {
    const { ready, seen } = useTipState()
    return {
      ready,
      isSeen: (id: Id) => seen.includes(id),
      markSeen: (ids: Id[]) => markSeen(ids),
      /** Shows every tip still in the catalog again. */
      reset: () => {
        const kept = state.seen.filter(id => !(id in tips))
        setState({ seen: kept, snoozed: [] })
        persist(kept)
      },
    }
  }

  function BeaconTip({ id, children, side = 'right', align = 'start', className }: BeaconTipProps<Id>) {
    const { ready, seen } = useTipState()
    const active = ready && !seen.includes(id) && !isTipExpired(tips[id])

    if (!active) return <>{children}</>
    return (
      <ActiveBeaconTip id={id} side={side} align={align} className={className}>
        {children}
      </ActiveBeaconTip>
    )
  }

  function ActiveBeaconTip({ id, children, side, align, className }: Required<Omit<BeaconTipProps<Id>, 'className'>> & { className?: string }) {
    const tip = tips[id]
    const kind = tip.kind ?? 'tip'
    const Icon = KIND_ICON[kind]
    const anchorRef = useRef<HTMLSpanElement>(null)
    const { queue } = useTipState()
    const [open, setOpen] = useState(false)
    // A tip that opens on its own must not pull focus away from what the user is doing.
    const openedOnItsOwn = useRef(false)
    const isTurn = queue[0] === id
    // A snoozed tip reopened from its beacon is not in the queue but still goes with "Skip all".
    const pending = queue.includes(id) ? queue : [id, ...queue]

    // Only visible targets queue up, and a target that appears later (sidebar opened, tab switched) joins then.
    useEffect(() => {
      const el = anchorRef.current
      if (!el) return
      const sync = () => {
        if (el.getClientRects().length > 0) return register(id)
        unregister(id)
        setOpen(false)
      }
      sync()
      const observer = new ResizeObserver(sync)
      observer.observe(el)
      return () => {
        observer.disconnect()
        unregister(id)
      }
    }, [id])

    useEffect(() => {
      if (!isTurn) return
      const timer = setTimeout(() => {
        openedOnItsOwn.current = true
        setOpen(true)
      }, openDelay)
      return () => clearTimeout(timer)
    }, [isTurn])

    const dismiss = () => {
      setOpen(false)
      snooze(id)
    }

    const acknowledge = (ids: string[]) => {
      setOpen(false)
      markSeen(ids)
    }

    const openFromBeacon = (event: SyntheticEvent) => {
      event.preventDefault()
      event.stopPropagation()
      openedOnItsOwn.current = false
      setOpen(true)
    }

    return (
      <Popover open={open} onOpenChange={next => (next ? setOpen(true) : dismiss())}>
        <PopoverAnchor asChild>
          <span ref={anchorRef} className={cn('relative inline-flex', className)}>
            {children}
            {/* A span, not a button: the beacon often ends up inside a button or link, and nested buttons are invalid HTML. */}
            <span
              role="button"
              tabIndex={0}
              onClick={openFromBeacon}
              onKeyDown={event => {
                if (event.key === 'Enter' || event.key === ' ') openFromBeacon(event)
              }}
              aria-label={`${labels[kind]}: ${tip.title}`}
              className="absolute -top-1 -right-1 z-10 flex size-3 cursor-pointer items-center justify-center"
            >
              <span className="absolute inline-flex size-full rounded-full bg-primary/60 motion-safe:animate-ping" />
              <span className="relative inline-flex size-2 rounded-full bg-primary ring-2 ring-background" />
            </span>
          </span>
        </PopoverAnchor>
        <PopoverContent
          side={side}
          align={align}
          sideOffset={10}
          onOpenAutoFocus={event => openedOnItsOwn.current && event.preventDefault()}
          onCloseAutoFocus={event => openedOnItsOwn.current && event.preventDefault()}
          className="w-72 rounded-xl p-4"
        >
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-primary uppercase">
            <Icon className="size-3" />
            {labels[kind]}
          </span>
          <p className="mt-2 text-sm font-semibold text-foreground">{tip.title}</p>
          <div className="mt-1 text-sm text-muted-foreground">{tip.body}</div>
          <div className="mt-4 flex items-center justify-between gap-2">
            {pending.length > 1 ? (
              <button
                type="button"
                onClick={() => acknowledge(pending)}
                className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                {labels.skipAll(pending.length)}
              </button>
            ) : (
              <span />
            )}
            <Button size="sm" onClick={() => acknowledge([id])}>
              {labels.acknowledge}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    )
  }

  return { BeaconTip, useBeaconTips }
}
