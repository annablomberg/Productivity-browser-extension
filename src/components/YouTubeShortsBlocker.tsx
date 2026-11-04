import { useEffect, useState } from 'react'
import './YouTubeShortsBlocker.css'

declare const chrome: {
  storage: {
    local: {
      get: (key: string) => Promise<Record<string, unknown>>
      set: (items: Record<string, unknown>) => Promise<void>
    }
    onChanged: {
      addListener: (listener: (changes: Record<string, { newValue?: unknown }>, area: string) => void) => void
      removeListener: (listener: (changes: Record<string, { newValue?: unknown }>, area: string) => void) => void
    }
  }
}

const storageKey = 'youtubeShortsBlocked'

export function YouTubeShortsBlocker() {
  const [blocked, setBlocked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const available = typeof chrome !== 'undefined' && !!chrome.storage?.local

  useEffect(() => {
    if (!available) return

    let active = true
    let changedSinceLoad = false
    const onStorageChanged = (changes: Record<string, { newValue?: unknown }>, area: string) => {
      if (area === 'local' && storageKey in changes) {
        changedSinceLoad = true
        setBlocked(changes[storageKey].newValue === true)
      }
    }

    chrome.storage.onChanged.addListener(onStorageChanged)
    void chrome.storage.local.get(storageKey)
      .then((items) => {
        if (active && !changedSinceLoad) setBlocked(items[storageKey] === true)
      })
      .catch(() => {
        if (active) setError('Could not load the Shorts setting.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
      chrome.storage.onChanged.removeListener(onStorageChanged)
    }
  }, [available])

  const changeBlocked = async (next: boolean) => {
    setSaving(true)
    setError('')
    try {
      await chrome.storage.local.set({ [storageKey]: next })
      setBlocked(next)
    } catch {
      setError('Could not save the Shorts setting. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="shorts-blocker" aria-labelledby="shorts-blocker-title">
      <div className="shorts-blocker__details">
        <h2 id="shorts-blocker-title">YouTube Shorts</h2>
        <p>Hide Shorts links on YouTube and redirect Shorts pages to the YouTube home page.</p>
      </div>
      <label className="shorts-blocker__control">
        <span className="shorts-blocker__switch">
          <input
            type="checkbox"
            role="switch"
            aria-label="Block YouTube Shorts"
            checked={blocked}
            disabled={!available || loading || saving}
            onChange={(event) => void changeBlocked(event.target.checked)}
            aria-describedby="shorts-blocker-status"
          />
          <span className="shorts-blocker__track" aria-hidden="true" />
        </span>
        <span id="shorts-blocker-status" className="shorts-blocker__status">
          {loading && available ? 'Loading' : blocked ? 'On' : 'Off'}
        </span>
      </label>
      {!available && <p className="shorts-blocker__message">Load the Chrome extension to use this switch.</p>}
      {error && <p className="shorts-blocker__message" role="alert">{error}</p>}
    </section>
  )
}
