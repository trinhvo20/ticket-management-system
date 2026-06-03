import { useEffect, useState } from 'react'
import './App.css'

function App() {
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('http://localhost:3001/health')
      .then(res => res.json())
      .then(data => setStatus(data.status))
      .catch(() => setError('Could not reach server'))
  }, [])

  return (
    <div>
      <h1>Ticket Management System</h1>
      <p>Server status: {error ?? status ?? 'loading...'}</p>
    </div>
  )
}

export default App
