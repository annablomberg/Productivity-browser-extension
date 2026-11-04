# Anna's productivity timer

Build with `npm run build`, then open `chrome://extensions`, enable Developer mode, and choose **Load unpacked**. Select this project's **`dist` folder**, which contains `manifest.json`. After later builds, click **Reload** on the extension card.

Click the extension's toolbar icon from any page, including `chrome://extensions`, to open the timer in a separate small window. It stays open when you click elsewhere or switch tabs. Clicking the icon again focuses the same window. Closing the window does not reset the saved stopwatch.

If the window does not appear, check **Errors** on the extension card in `chrome://extensions`.

## YouTube Shorts blocker

Open **Blockers** in the extension window and turn on **YouTube Shorts**. The setting is saved in Chrome, hides Shorts entries on YouTube, and redirects direct Shorts pages to the YouTube home page. Reload the unpacked extension after building to activate the YouTube content script.

## Google Calendar activity logging

The timer can save focused sessions to a separate **Activity Tracker** calendar. Each session uses the activity name and Google Calendar event color selected before Start. Stop saves the session, and the timer page lists today's time by activity from that calendar. Paused time is excluded from the event's duration. If saving fails, the timer is kept so Stop can be retried.

Google OAuth setup is required before connecting:

1. In a Google Cloud project, enable the Google Calendar API and configure the OAuth consent screen. Add your Google account as a test user if the app is in testing mode.
2. Find the extension ID in `chrome://extensions`. Create an OAuth client of type **Chrome Extension** for that ID. Keep the extension ID stable during development; Chrome's [OAuth guide](https://developer.chrome.com/docs/extensions/how-to/integrate/oauth) describes using a manifest `key` for this.
3. Replace `YOUR_EXTENSION_OAUTH_CLIENT_ID.apps.googleusercontent.com` in `public/manifest.json` with the client ID. Run `npm run build`, then reload the unpacked extension.
4. Open the timer and click **Connect Google Calendar**. This requests the `calendar.app.created` scope and creates the dedicated calendar in your Google account.

The OAuth client ID is public application configuration, not a secret. Google Calendar access is available in the installed Chrome extension; the Vite development page cannot use `chrome.identity`.

## Vite template notes

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

You can also install [eslint-plugin-react-x](https://npmx.dev/package/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://npmx.dev/package/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```
