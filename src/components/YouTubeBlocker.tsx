import { useEffect, useState } from 'react'
import './YouTubeShortsBlocker.css'

type DynamicRule = {
  id: number
  priority: number
  action: { type: 'redirect'; redirect: { extensionPath: string } }
  condition: { urlFilter: string; resourceTypes: ['main_frame'] }
}

declare const chrome: {
  declarativeNetRequest: {
    getDynamicRules: () => Promise<Array<{ id: number }>>
    updateDynamicRules: (options: { removeRuleIds: number[]; addRules: DynamicRule[] }) => Promise<void>
  }
  runtime: { getURL: (path: string) => string }
  storage: {
    local: { set: (items: Record<string, unknown>) => Promise<void> }
    onChanged: {
      addListener: (listener: (changes: Record<string, { newValue?: unknown }>, area: string) => void) => void
      removeListener: (listener: (changes: Record<string, { newValue?: unknown }>, area: string) => void) => void
    }
  }
  tabs: {
    query: (options: { url: string[] }) => Promise<Array<{ id?: number }>>
    update: (tabId: number, options: { url: string }) => Promise<unknown>
  }
}

const ruleId = 1001
const storageKey = 'youtubeBlocked'
const youtubeRule: DynamicRule = {
  id: ruleId,
  priority: 1,
  action: { type: 'redirect', redirect: { extensionPath: '/youtube-blocked.html' } },
  condition: { urlFilter: '||youtube.com/', resourceTypes: ['main_frame'] },
}

export function YouTubeBlocker() {
  const [blocked, setBlocked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const available = typeof chrome !== 'undefined' && !!chrome.declarativeNetRequest?.getDynamicRules && !!chrome.tabs?.query

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
    void chrome.declarativeNetRequest.getDynamicRules()
      .then((rules) => {
        if (active && !changedSinceLoad) setBlocked(rules.some((rule) => rule.id === ruleId))
      })
      .catch(() => {
        if (active) setError('Could not load the YouTube blocker setting.')
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
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: [ruleId],
        addRules: next ? [youtubeRule] : [],
      })
      setBlocked(next)
    } catch {
      setError('Could not update the YouTube blocker. Please try again.')
      setSaving(false)
      return
    }

    try {
      await chrome.storage.local.set({ [storageKey]: next })
    } catch {
      setError('The blocker changed, but other open extension windows may need reopening.')
    }

    if (next) {
      try {
        const tabs = await chrome.tabs.query({ url: ['*://*.youtube.com/*'] })
        const blockedPage = chrome.runtime.getURL('youtube-blocked.html')
        const results = await Promise.allSettled(
          tabs.filter((tab) => tab.id !== undefined).map((tab) => chrome.tabs.update(tab.id!, { url: blockedPage })),
        )
        if (results.some((result) => result.status === 'rejected')) {
          setError('YouTube is blocked, but an open tab could not be redirected. Reload that tab to block it.')
        }
      } catch {
        setError('YouTube is blocked, but open tabs could not be redirected. Reload them to block YouTube.')
      }
    }
    setSaving(false)
  }

  return (
    <section className="shorts-blocker" aria-labelledby="youtube-blocker-title">
      <div className="shorts-blocker__details">
        <h2 id="youtube-blocker-title">YouTube</h2>
        <p>Block the entire YouTube site, after turning off just open a new Youtube tab</p>
      </div>
      <label className="shorts-blocker__control">
        <span className="shorts-blocker__switch">
          <input
            type="checkbox"
            role="switch"
            aria-label="Block YouTube"
            aria-describedby="youtube-blocker-status"
            checked={blocked}
            disabled={!available || loading || saving}
            onChange={(event) => void changeBlocked(event.target.checked)}
          />
          <span className="shorts-blocker__track" aria-hidden="true" />
        </span>
        <span id="youtube-blocker-status" className="shorts-blocker__status">
          {loading && available ? 'Loading' : blocked ? 'On' : 'Off'}
        </span>
      </label>
      {!available && <p className="shorts-blocker__message">Load the Chrome extension to use this switch.</p>}
      {error && <p className="shorts-blocker__message" role="alert">{error}</p>}
    </section>
  )
}
