import { HashRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { BlockersPage } from '../pages/BlockersPage'
import { TimerPage } from '../pages/TimerPage'
import { WeeklyPage } from '../pages/WeeklyPage'
import { Header } from './Header'

function PageLayout() {
  return (
    <div className="app-shell">
      <Header />
      <main className="page-content">
        <Outlet />
      </main>
    </div>
  )
}

export function AppRouter() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<PageLayout />}>
          <Route index element={<Navigate to="/timer" replace />} />
          <Route path="/timer" element={<TimerPage />} />
          <Route path="/weekly-hour-tracker" element={<WeeklyPage />} />
          <Route path="/distraction-blockers" element={<BlockersPage />} />
          <Route path="*" element={<Navigate to="/timer" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
