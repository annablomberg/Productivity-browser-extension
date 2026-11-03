import { useEffect, useState } from 'react'
import './Stopwatch.css'

type TimerState = {
  accumulatedMs: number
  startedAt: number | null
}

type StorageChange = { newValue?: unknown }

declare const chrome: {
  storage: {
    local: {
      get: (key: string) => Promise<Record<string, unknown>>
      set: (items: Record<string, unknown>) => Promise<void>
    }
    onChanged: {
      addListener: (listener: (changes: Record<string, StorageChange>, area: string) => void) => void
      removeListener: (listener: (changes: Record<string, StorageChange>, area: string) => void) => void
    }
  }
}

const storageKey = 'stopwatch'
const initialState: TimerState = { accumulatedMs: 0, startedAt: null }

function isTimerState(value: unknown): value is TimerState {
  if (typeof value !== 'object' || value === null) return false
  const timer = value as Partial<TimerState>
  return typeof timer.accumulatedMs === 'number' && Number.isFinite(timer.accumulatedMs) &&
    (timer.startedAt === null || (typeof timer.startedAt === 'number' && Number.isFinite(timer.startedAt)))
}

function elapsedTime(timer: TimerState, now: number) {
  return timer.accumulatedMs + (timer.startedAt === null ? 0 : Math.max(0, now - timer.startedAt))
}

function formatTime(milliseconds: number) {
  const totalSeconds = Math.floor(milliseconds / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds / 60) % 60)
  const seconds = totalSeconds % 60
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':')
}

export function Stopwatch() {
  const extensionStorage = typeof chrome !== 'undefined' ? chrome.storage : undefined
  const [timer, setTimer] = useState<TimerState>(initialState)
  const [ready, setReady] = useState(!extensionStorage)
  const [now, setNow] = useState(Date.now)

  useEffect(() => {
    if (!extensionStorage) return

    let active = true
    const onChanged = (changes: Record<string, StorageChange>, area: string) => {
      if (area === 'local' && isTimerState(changes[storageKey]?.newValue)) {
        setTimer(changes[storageKey].newValue)
        setNow(Date.now())
      }
    }
    extensionStorage.onChanged.addListener(onChanged)
    extensionStorage.local.get(storageKey).then((items) => {
      if (active && isTimerState(items[storageKey])) setTimer(items[storageKey])
    }).catch(console.error).finally(() => {
      if (active) setReady(true)
    })

    return () => {
      active = false
      extensionStorage.onChanged.removeListener(onChanged)
    }
  }, [extensionStorage])

  useEffect(() => {
    if (timer.startedAt === null) return
    const interval = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(interval)
  }, [timer.startedAt])

  const save = (next: TimerState) => {
    setTimer(next)
    setNow(Date.now())
    void extensionStorage?.local.set({ [storageKey]: next }).catch(console.error)
  }

  const start = () => {
    if (!ready || timer.startedAt !== null) return
    save({ ...timer, startedAt: Date.now() })
  }

  const pause = () => {
    if (!ready || timer.startedAt === null) return
    save({ accumulatedMs: elapsedTime(timer, Date.now()), startedAt: null })
  }

  const stop = () => {
    if (!ready) return
    save(initialState)
  }

  return (
    <section className="stopwatch" aria-label="Stopwatch">
      <output className="stopwatch__display" aria-label="Elapsed time">
        {formatTime(elapsedTime(timer, now))}
      </output>
      <div className="stopwatch__controls">
        <button type="button" onClick={start} disabled={!ready || timer.startedAt !== null}>Start</button>
        <button type="button" onClick={pause} disabled={!ready || timer.startedAt === null}>Pause</button>
        <button type="button" onClick={stop} disabled={!ready}>Stop</button>
      </div>
    </section>
  )
}

export default Stopwatch
