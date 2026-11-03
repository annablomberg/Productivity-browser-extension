import { Plant } from '../components/Plant'
import Stopwatch from '../components/Stopwatch'

export function TimerPage() {
  return (
    <section className="timer-page" aria-label="Productivity timer">
      <h1>Productivity timer</h1>
      <Plant />
      <Stopwatch />
    </section>
  )
}
