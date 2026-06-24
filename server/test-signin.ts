import 'dotenv/config'

const SERVER = 'http://localhost:3001'

async function trySignIn(email: string, password: string) {
  const res = await fetch(`${SERVER}/api/auth/sign-in/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const body = await res.json()
  console.log(`${email}: HTTP ${res.status}`, JSON.stringify(body))
}

await trySignIn('admin@example.com', 'password123')
await trySignIn('agent@example.com', 'password123')
