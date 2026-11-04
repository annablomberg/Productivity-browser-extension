import { accessToken, authorizeCalendar, invalidateAccessToken } from './googleAuth'

export type Activity = { name: string; colorId: string }
export type CalendarColor = { id: string; name: string; hex: string }
export type DailyTotal = { name: string; colorId: string; milliseconds: number }

export const eventColors: CalendarColor[] = [
  { id: '1', name: 'Lavender', hex: '#a4bdfc' },
  { id: '2', name: 'Sage', hex: '#7ae7bf' },
  { id: '3', name: 'Grape', hex: '#dbadff' },
  { id: '4', name: 'Flamingo', hex: '#ff887c' },
  { id: '5', name: 'Banana', hex: '#fbd75b' },
  { id: '6', name: 'Tangerine', hex: '#ffb878' },
  { id: '7', name: 'Peacock', hex: '#46d6db' },
  { id: '8', name: 'Graphite', hex: '#e1e1e1' },
  { id: '9', name: 'Blueberry', hex: '#5484ed' },
  { id: '10', name: 'Basil', hex: '#51b749' },
  { id: '11', name: 'Tomato', hex: '#dc2127' },
]

const calendarKey = 'heartbloomCalendarId'
const api = 'https://www.googleapis.com/calendar/v3'

class CalendarRequestError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'CalendarRequestError'
    this.status = status
  }
}

declare const chrome: {
  storage: {
    local: {
      get: (key: string) => Promise<Record<string, unknown>>
      set: (items: Record<string, unknown>) => Promise<void>
    }
  }
}

async function request<T>(path: string, options: RequestInit = {}, interactive = false): Promise<T> {
  let credential = await accessToken(interactive)
  let response: Response
  const send = (credential: string) => fetch(`${api}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${credential}`, 'Content-Type': 'application/json', ...options.headers },
  })
  response = await send(credential)
  if (response.status === 401) {
    await invalidateAccessToken(credential)
    credential = await accessToken(interactive)
    response = await send(credential)
  }
  if (!response.ok) {
    if (response.status === 409) throw new Error('Calendar event already exists.')
    const body = await response.json().catch(() => null) as { error?: { message?: string } } | null
    throw new CalendarRequestError(response.status, body?.error?.message ?? `Google Calendar request failed (${response.status}).`)
  }
  return response.json() as Promise<T>
}

export async function savedCalendarId(): Promise<string | null> {
  if (typeof chrome === 'undefined' || !chrome.storage) return null
  const stored = await chrome.storage.local.get(calendarKey)
  return typeof stored[calendarKey] === 'string' ? stored[calendarKey] : null
}

export async function connectCalendar(): Promise<string> {
  await authorizeCalendar()
  const existing = await savedCalendarId()
  if (existing) {
    try {
      await request(`/calendars/${encodeURIComponent(existing)}`, {}, true)
      return existing
    } catch (error) {
      if (!(error instanceof CalendarRequestError) || error.status !== 404) throw error
    }
  }
  const calendar = await request<{ id: string }>('/calendars', {
    method: 'POST',
    body: JSON.stringify({ summary: 'Heartbloom Activity Tracker', description: 'Focused activity sessions logged by Heartbloom.' }),
  }, true)
  await chrome.storage.local.set({ [calendarKey]: calendar.id })
  return calendar.id
}

export async function loadEventColors(): Promise<CalendarColor[]> {
  const palette = await request<{ event: Record<string, { background: string }> }>('/colors')
  return Object.entries(palette.event).map(([id, color]) => ({
    id,
    name: eventColors.find((known) => known.id === id)?.name ?? `Color ${id}`,
    hex: color.background,
  }))
}

export async function saveSession(calendarId: string, activity: Activity, endTime: number, durationMs: number, sessionId: string) {
  const startTime = endTime - durationMs
  const event = {
    id: sessionId,
    summary: activity.name,
    colorId: activity.colorId,
    start: { dateTime: new Date(startTime).toISOString() },
    end: { dateTime: new Date(endTime).toISOString() },
    reminders: { useDefault: false },
    extendedProperties: { private: { heartbloom: 'activity-session', activityType: activity.name, durationMs: String(durationMs) } },
  }
  try {
    await request(`/calendars/${encodeURIComponent(calendarId)}/events`, { method: 'POST', body: JSON.stringify(event) }, true)
  } catch (error) {
    if (error instanceof Error && error.message === 'Calendar event already exists.') return
    if (error instanceof CalendarRequestError && error.status === 404) {
      throw new Error('This Google calendar is no longer available. Click Reconnect to create a new one.', { cause: error })
    }
    throw error
  }
}

type CalendarEvent = {
  summary?: string
  colorId?: string
  start?: { dateTime?: string }
  end?: { dateTime?: string }
  extendedProperties?: { private?: { heartbloom?: string; activityType?: string } }
}

export async function todayTotals(calendarId: string, interactive = false): Promise<DailyTotal[]> {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  const totals = new Map<string, DailyTotal>()
  let pageToken: string | undefined
  do {
    const query = new URLSearchParams({ timeMin: start.toISOString(), timeMax: end.toISOString(), singleEvents: 'true', maxResults: '2500' })
    if (pageToken) query.set('pageToken', pageToken)
    const page = await request<{ items?: CalendarEvent[]; nextPageToken?: string }>(
      `/calendars/${encodeURIComponent(calendarId)}/events?${query}`,
      {},
      interactive,
    )
    for (const event of page.items ?? []) {
      if (event.extendedProperties?.private?.heartbloom !== 'activity-session') continue
      const eventStart = Date.parse(event.start?.dateTime ?? '')
      const eventEnd = Date.parse(event.end?.dateTime ?? '')
      const duration = Math.max(0, Math.min(eventEnd, end.getTime()) - Math.max(eventStart, start.getTime()))
      if (!Number.isFinite(duration) || duration === 0) continue
      const name = event.extendedProperties.private.activityType ?? event.summary ?? 'Activity'
      const previous = totals.get(name)
      totals.set(name, { name, colorId: event.colorId ?? previous?.colorId ?? '1', milliseconds: (previous?.milliseconds ?? 0) + duration })
    }
    pageToken = page.nextPageToken
  } while (pageToken)
  return [...totals.values()].sort((a, b) => b.milliseconds - a.milliseconds)
}
