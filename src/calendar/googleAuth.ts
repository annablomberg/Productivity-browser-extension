const scope = 'https://www.googleapis.com/auth/calendar.app.created'
const tokenKey = 'heartbloomWebAccessToken'

type CachedToken = { clientId: string; token: string; expiresAt: number }

declare const chrome: {
  identity: {
    getAuthToken: (options: { interactive: boolean }) => Promise<{ token?: string } | string>
    removeCachedAuthToken: (options: { token: string }) => Promise<void>
    getRedirectURL: (path?: string) => string
    launchWebAuthFlow: (options: { url: string; interactive: boolean }) => Promise<string | undefined>
  }
  runtime: {
    getManifest: () => { oauth2?: { client_id?: string } }
    getURL: (path: string) => string
  }
  storage: {
    session: {
      get: (key: string) => Promise<Record<string, unknown>>
      set: (items: Record<string, unknown>) => Promise<void>
      remove: (key: string) => Promise<void>
    }
  }
}

let webClientIdPromise: Promise<string | null> | undefined

function webClientId(): Promise<string | null> {
  if (!webClientIdPromise) {
    webClientIdPromise = fetch(chrome.runtime.getURL('google-auth.json'))
      .then((response) => response.json() as Promise<{ web_client_id?: string }>)
      .then((config) => {
        const id = config.web_client_id?.trim()
        return id && !id.includes('YOUR_') ? id : null
      })
  }
  return webClientIdPromise
}

function extensionClientId(): string {
  const id = chrome.runtime.getManifest().oauth2?.client_id
  if (!id || id.includes('YOUR_')) {
    throw new Error('Set your Google OAuth client ID in public/manifest.json, then rebuild and reload the extension.')
  }
  return id
}

function isCachedToken(value: unknown, clientId: string): value is CachedToken {
  if (typeof value !== 'object' || value === null) return false
  const cached = value as Partial<CachedToken>
  return cached.clientId === clientId && typeof cached.token === 'string' &&
    typeof cached.expiresAt === 'number' && cached.expiresAt > Date.now() + 60_000
}

async function webAccessToken(clientId: string, interactive: boolean): Promise<string> {
  const items = await chrome.storage.session.get(tokenKey)
  if (isCachedToken(items[tokenKey], clientId)) return items[tokenKey].token

  const redirectUri = chrome.identity.getRedirectURL('oauth2')
  const state = crypto.randomUUID()
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('response_type', 'token')
  authUrl.searchParams.set('scope', scope)
  authUrl.searchParams.set('state', state)
  if (interactive) authUrl.searchParams.set('prompt', 'select_account')

  const responseUrl = await chrome.identity.launchWebAuthFlow({ url: authUrl.toString(), interactive })
  if (!responseUrl) throw new Error('Google Calendar authorization did not return a response.')
  const callback = new URL(responseUrl)
  if (`${callback.origin}${callback.pathname}` !== redirectUri) {
    throw new Error('Google Calendar authorization returned an unexpected redirect URL.')
  }
  const result = new URLSearchParams(callback.hash.slice(1))
  if (result.get('state') !== state) {
    throw new Error('Google Calendar authorization returned an invalid state.')
  }
  if (result.has('error')) {
    throw new Error(`Google Calendar authorization failed: ${result.get('error_description') ?? result.get('error')}`)
  }
  const value = result.get('access_token')
  const expiresIn = Number(result.get('expires_in'))
  if (!value || result.get('token_type')?.toLowerCase() !== 'bearer' || !Number.isFinite(expiresIn) || expiresIn <= 0) {
    throw new Error('Google Calendar authorization did not return a valid access token.')
  }
  await chrome.storage.session.set({ [tokenKey]: { clientId, token: value, expiresAt: Date.now() + expiresIn * 1000 } })
  return value
}

export async function accessToken(interactive: boolean): Promise<string> {
  if (typeof chrome === 'undefined' || !chrome.identity) {
    throw new Error('Google Calendar is available in the installed extension.')
  }
  const clientId = await webClientId()
  if (clientId) return webAccessToken(clientId, interactive)

  extensionClientId()
  let result: { token?: string } | string
  try {
    result = await chrome.identity.getAuthToken({ interactive })
  } catch (error) {
    if (String(error).includes('Custom URI scheme')) {
      throw new Error('Brave needs a Google Web application OAuth client ID in public/google-auth.json. See the Brave setup in README.md.', { cause: error })
    }
    throw error
  }
  const value = typeof result === 'string' ? result : result.token
  if (!value) throw new Error('Google Calendar authorization did not return a token.')
  return value
}

export async function authorizeCalendar(): Promise<string> {
  if (typeof chrome === 'undefined' || !chrome.identity) {
    throw new Error('Google Calendar is available in the installed extension.')
  }
  if (await webClientId()) await chrome.storage.session.remove(tokenKey)
  return accessToken(true)
}

export async function invalidateAccessToken(value: string): Promise<void> {
  if (await webClientId()) {
    const items = await chrome.storage.session.get(tokenKey)
    const cached = items[tokenKey] as Partial<CachedToken> | undefined
    if (cached?.token === value) await chrome.storage.session.remove(tokenKey)
  } else {
    await chrome.identity.removeCachedAuthToken({ token: value })
  }
}
