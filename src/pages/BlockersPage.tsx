import { VinylAnimation } from '../components/VinylAnimation'
import { YouTubeBlocker } from '../components/YouTubeBlocker'
import { YouTubeShortsBlocker } from '../components/YouTubeShortsBlocker'

export function BlockersPage() {
  return (
    <section aria-label="Distraction Blockers">
      <h1>Distraction Blockers</h1>
      <p>Choose which distractions to hide while you focus.</p>
      <div className="blockers-list">
        <VinylAnimation />
        <YouTubeShortsBlocker />
        <YouTubeBlocker />
      </div>
    </section>
  )
}
