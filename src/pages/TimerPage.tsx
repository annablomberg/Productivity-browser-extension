import { useState } from 'react'
import type { Activity } from '../calendar/calendar'
import { ActivityPicker } from '../components/ActivityPicker'
import { Plant } from '../components/Plant'
import Stopwatch from '../components/Stopwatch'

export function TimerPage() {
  const [activity, setActivity] = useState<Activity>({ name: '', colorId: '2' })
  const [lockedActivity, setLockedActivity] = useState<Activity | null>(null)
  const [calendarId, setCalendarId] = useState<string | null>(null)
  const [savedVersion, setSavedVersion] = useState(0)
  const [message, setMessage] = useState('')

  return (
    <section className="timer-page" aria-label="Productivity timer">
      <h1>Productivity timer</h1>
      <Plant />
      <Stopwatch
        activity={activity}
        calendarId={calendarId}
        onSessionChange={setLockedActivity}
        onSaved={() => setSavedVersion((version) => version + 1)}
        onMessage={setMessage}
      />
      <ActivityPicker
        value={lockedActivity ?? activity}
        onChange={setActivity}
        disabled={lockedActivity !== null}
        calendarId={calendarId}
        onCalendarConnected={setCalendarId}
        savedVersion={savedVersion}
        message={message}
        onMessage={setMessage}
      />
    </section>
  )
}
