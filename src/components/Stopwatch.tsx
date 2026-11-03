import { useEffect, useState } from 'react'
import { saveSession, type Activity } from '../calendar/calendar'
import './Stopwatch.css'

type TimerState = {
  accumulatedMs: number
  startedAt: number | null
  activity: Activity | null
  sessionId: string | null
}

type Props = {
  activity: Activity
  calendarId: string | null
  onSessionChange: (activity: Activity | null) => void
  onSaved: () => void
  onMessage: (message: string) => void
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
const initialState: TimerState = { accumulatedMs: 0, startedAt: null, activity: null, sessionId: null }

function isTimerState(value: unknown): value is TimerState {
  if (typeof value !== 'object' || value === null) return false
  const timer = value as Partial<TimerState>
  return typeof timer.accumulatedMs === 'number' && Number.isFinite(timer.accumulatedMs) &&
    (timer.startedAt === null || (typeof timer.startedAt === 'number' && Number.isFinite(timer.startedAt)))
}

function normalizeTimer(value: TimerState): TimerState {
  return {
    accumulatedMs: value.accumulatedMs,
    startedAt: value.startedAt,
    activity: value.activity && typeof value.activity.name === 'string' && typeof value.activity.colorId === 'string' ? value.activity : null,
    sessionId: typeof value.sessionId === 'string' ? value.sessionId : null,
  }
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

export function Stopwatch({ activity, calendarId, onSessionChange, onSaved, onMessage }: Props) {
  const extensionStorage = typeof chrome !== 'undefined' ? chrome.storage : undefined
  const [timer, setTimer] = useState<TimerState>(initialState)
  const [ready, setReady] = useState(!extensionStorage)
  const [busy, setBusy] = useState(false)
  const [now, setNow] = useState(Date.now)

  useEffect(() => {
    if (!extensionStorage) return
    let active = true
    const onChanged = (changes: Record<string, StorageChange>, area: string) => {
      if (area === 'local' && isTimerState(changes[storageKey]?.newValue)) {
        const next = normalizeTimer(changes[storageKey].newValue)
        setTimer(next)
        onSessionChange(next.activity)
        setNow(Date.now())
      }
    }
    extensionStorage.onChanged.addListener(onChanged)
    extensionStorage.local.get(storageKey).then((items) => {
      if (active && isTimerState(items[storageKey])) {
        const next = normalizeTimer(items[storageKey])
        setTimer(next)
        onSessionChange(next.activity)
      }
    }).catch((error) => { if (active) onMessage(String(error)) }).finally(() => {
      if (active) setReady(true)
    })
    return () => {
      active = false
      extensionStorage.onChanged.removeListener(onChanged)
    }
  }, [extensionStorage, onSessionChange, onMessage])

  useEffect(() => {
    if (timer.startedAt === null) return
    const interval = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(interval)
  }, [timer.startedAt])

  const save = async (next: TimerState) => {
    await extensionStorage?.local.set({ [storageKey]: next })
    setTimer(next)
    onSessionChange(next.activity)
    setNow(Date.now())
  }

  const start = async () => {
    if (!ready || busy || timer.startedAt !== null) return
    if (!calendarId) { onMessage('Connect Google Calendar before starting a session.'); return }
    const selected = timer.activity ?? { name: activity.name.trim(), colorId: activity.colorId }
    if (!selected.name) { onMessage('Enter an activity type before starting.'); return }
    onMessage('')
    try {
      await save({ ...timer, activity: selected, sessionId: timer.sessionId ?? crypto.randomUUID().replaceAll('-', ''), startedAt: Date.now() })
    } catch (error) { onMessage(String(error)) }
  }

  const pause = async () => {
    if (!ready || busy || timer.startedAt === null) return
    try {
      await save({ ...timer, accumulatedMs: elapsedTime(timer, Date.now()), startedAt: null })
    } catch (error) { onMessage(String(error)) }
  }

  const stop = async () => {
    if (!ready || busy) return
    const endTime = Date.now()
    const durationMs = elapsedTime(timer, endTime)
    if (durationMs < 1000) {
      await save(initialState).catch((error) => onMessage(String(error)))
      return
    }
    const selectedActivity = timer.activity ?? { name: activity.name.trim(), colorId: activity.colorId }
    if (!calendarId || !selectedActivity.name) { onMessage('Connect Google Calendar and select an activity before stopping.'); return }
    setBusy(true)
    onMessage('Saving session to Google Calendar…')
    try {
      const stoppedTimer = {
        ...timer,
        activity: selectedActivity,
        sessionId: timer.sessionId ?? crypto.randomUUID().replaceAll('-', ''),
        accumulatedMs: durationMs,
        startedAt: null,
      }
      await save(stoppedTimer)
      await saveSession(calendarId, selectedActivity, endTime, durationMs, stoppedTimer.sessionId)
      await save(initialState)
      onSaved()
      onMessage(`Saved ${selectedActivity.name} to Google Calendar.`)
    } catch (error) {
      onMessage(`Could not save session: ${error instanceof Error ? error.message : String(error)}. Your stopped session is still available; press Stop to retry.`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="stopwatch" aria-label="Activity timer">
      <output className="stopwatch__display" aria-label="Elapsed time">{formatTime(elapsedTime(timer, now))}</output>
      <div className="stopwatch__controls">
        <button type="button" onClick={() => void start()} disabled={!ready || busy || timer.startedAt !== null}>Start</button>
        <button type="button" onClick={() => void pause()} disabled={!ready || busy || timer.startedAt === null}>Pause</button>
        <button type="button" onClick={() => void stop()} disabled={!ready || busy || elapsedTime(timer, now) === 0}>Stop and save</button>
      </div>
    </section>
  )
}

export default Stopwatch
