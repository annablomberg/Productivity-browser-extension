import { Link, NavLink } from 'react-router-dom'
import heartbloomIcon from '../assets/heartbloom_icon.svg'

export function Header() {
  return (
    <header className="site-header">
      <Link className="site-header__brand" to="/timer" aria-label="Go to countdown timer">
        <img src={heartbloomIcon} alt="Heartbloom" width={36} height={36} />
      </Link>
      <nav className="site-nav" aria-label="Main navigation">
        <NavLink to="/timer">Countdown</NavLink>
        <NavLink to="/weekly-hour-tracker">Weekly tracker</NavLink>
        <NavLink to="/distraction-blockers">Blockers</NavLink>
      </nav>
    </header>
  )
}
