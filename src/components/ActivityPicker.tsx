import { useEffect, useState } from 'react'
import { connectCalendar, eventColors, loadEventColors, savedCalendarId, todayTotals, type Activity, type CalendarColor, type DailyTotal } from '../calendar/calendar'
import './ActivityPicker.css'

type Props = {
  value: Activity
  onChange: (activity: Activity) => void
  disabled: boolean
  calendarId: string | null
  onCalendarConnected: (calendarId: string) => void
  savedVersion: number
  message: string
  onMessage: (message: string) => void
}

declare const chrome: {
  storage: { local: {
    get: (key: string) => Promise<Record<string, unknown>>
    set: (items: Record<string, unknown>) => Promise<void>
  } }
}

const draftKey = 'heartbloomActivityDraft'

function formatTime(milliseconds: number) {
  const totalSeconds = Math.floor(milliseconds / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds / 60) % 60)
  const seconds = totalSeconds % 60
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':')
}

export function ActivityPicker({ value, onChange, disabled, calendarId, onCalendarConnected, savedVersion, message, onMessage }: Props) {
  const [colors, setColors] = useState<CalendarColor[]>(eventColors)
  const [totals, setTotals] = useState<DailyTotal[]>([])
  const [connecting, setConnecting] = useState(false)

  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.storage) return
    let active = true
    void Promise.all([chrome.storage.local.get(draftKey), savedCalendarId()]).then(([items, savedId]) => {
      if (!active) return
      const draft = items[draftKey] as Partial<Activity> | undefined
      if (draft && typeof draft.name === 'string' && typeof draft.colorId === 'string') onChange(draft as Activity)
      if (savedId) onCalendarConnected(savedId)
    }).catch((error) => { if (active) onMessage(String(error)) })
    return () => { active = false }
  }, [onChange, onCalendarConnected, onMessage])

  useEffect(() => {
    if (!calendarId) return
    let active = true
    void todayTotals(calendarId).then((result) => { if (active) setTotals(result) }).catch(() => undefined)
    void loadEventColors().then((result) => { if (active) setColors(result) }).catch(() => undefined)
    return () => { active = false }
  }, [calendarId, savedVersion])

  const changeActivity = (next: Activity) => {
    onChange(next)
    if (typeof chrome !== 'undefined' && chrome.storage) {
      void chrome.storage.local.set({ [draftKey]: next }).catch(console.error)
    }
  }

  const connect = async () => {
    setConnecting(true)
    onMessage('')
    try {
      const id = await connectCalendar()
      onCalendarConnected(id)
      onMessage('Connected to Heartbloom Activity Tracker in Google Calendar.')
    } catch (error) {
      onMessage(error instanceof Error ? error.message : String(error))
    } finally {
      setConnecting(false)
    }
  }

  const refresh = async () => {
    if (!calendarId) return
    try {
      setTotals(await todayTotals(calendarId))
      onMessage('')
    } catch (error) {
      onMessage(`Could not refresh totals: ${String(error)}`)
    }
  }

  return (
    <section className="activity-panel" aria-label="Activity and Google Calendar">
      <div className="activity-panel__connection">
        <span>{calendarId ? 'Google Calendar connected' : 'Connect a dedicated Google Calendar to log sessions.'}</span>
        <button type="button" onClick={() => void connect()} disabled={connecting}>{calendarId ? 'Reconnect' : 'Connect Google Calendar'}</button>
      </div>
      <div className="activity-picker">
        <label>
          Activity type
          <input
            type="text"
            value={value.name}
            onChange={(event) => changeActivity({ ...value, name: event.target.value })}
            placeholder="e.g. Programming"
            maxLength={80}
            disabled={disabled}
          />
        </label>
        <label>
          Google Calendar color
          <select value={value.colorId} onChange={(event) => changeActivity({ ...value, colorId: event.target.value })} disabled={disabled}>
            {colors.map((color) => <option key={color.id} value={color.id}>{color.name}</option>)}
          </select>
        </label>
        <span className="activity-picker__swatch" style={{ backgroundColor: colors.find((color) => color.id === value.colorId)?.hex }} aria-hidden="true" />
      </div>
      {disabled && <p className="activity-panel__hint">This activity is locked until you stop and save the session.</p>}
      {message && <p className="activity-panel__message" role="status">{message}</p>}
      {calendarId && (
        <div className="activity-panel__totals">
          <div className="activity-panel__totals-heading">
            <h2>Today’s activities</h2>
            <button type="button" onClick={() => void refresh()}>Refresh</button>
          </div>
          {totals.length === 0 ? <p>No sessions logged today.</p> : (
            <ul>{totals.map((total) => (
              <li key={total.name}>
                <span className="activity-picker__swatch" style={{ backgroundColor: colors.find((color) => color.id === total.colorId)?.hex }} aria-hidden="true" />
                <span>{total.name}</span>
                <strong>{formatTime(total.milliseconds)}</strong>
              </li>
            ))}</ul>
          )}
        </div>
      )}
    </section>
  )
}
