import './App.css'
import { Plant } from './components/Plant'
import Stopwatch from './components/Stopwatch'

export default function App() {

  return (
    <main>
      <h1>Productivity timer</h1>
       <Plant />
       <Stopwatch />
    </main>
  )
}