import { useEffect, useState } from 'react'
import Home from './Pages/Home'
import Library from './Pages/Library'
import Login from './Pages/Login'
import Profile from './Pages/Profile'
import LectureHalls from './Pages/LectureHalls'
import Projects from './Pages/Projects'
import Bus from './Pages/Bus'
import AppNavbar from './components/AppNavbar'

import Chatbot from './components/Chatbot'

export const DarkModeContext = { isDark: false, toggle: () => {} }

function App() {
  const [hash, setHash] = useState(window.location.hash)
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('slotDotExeAuth') === 'true'
  })
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('slotDotExeDarkMode')
    return saved !== 'false'
  })

  useEffect(() => {
    localStorage.setItem('slotDotExeDarkMode', String(darkMode))
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  useEffect(() => {
    const onHashChange = () => {
      if (window.location.hash === '#logout') {
        localStorage.removeItem('slotDotExeAuth')
        setIsAuthenticated(false)
        window.location.hash = ''
      } else {
        setHash(window.location.hash)
      }
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const toggleDarkMode = () => setDarkMode(prev => !prev)

  if (!isAuthenticated) {
    return <Login onLogin={() => setIsAuthenticated(true)} darkMode={darkMode} />
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'dark bg-black text-zinc-100' : 'bg-zinc-50 text-zinc-900'}`}>
      <AppNavbar darkMode={darkMode} onToggleDarkMode={toggleDarkMode} />
      <main>
        {hash === '#library' && <Library darkMode={darkMode} />}
        {hash === '#profile' && <Profile darkMode={darkMode} />}
        {hash === '#lecture-halls' && <LectureHalls darkMode={darkMode} />}
        {hash === '#projects' && <Projects darkMode={darkMode} />}
        {hash === '#bus' && <Bus darkMode={darkMode} />}
        {!hash && <Home darkMode={darkMode} />}
      </main>
      <Chatbot darkMode={darkMode} />
    </div>
  )
}

export default App