import { useEffect, useState } from 'react'
import { api } from './api'
import { btnCls } from './ui'
import Dashboard from './pages/Dashboard'
import Activity from './pages/Activity'
import Logs from './pages/Logs'
import Users from './pages/Users'
import MyAccount from './pages/MyAccount'

const NAV = [
  { id: 'dashboard', label: 'Overview', roles: ['admin', 'manager'] },
  { id: 'activity', label: 'Login activity', roles: ['admin', 'manager'] },
  { id: 'logs', label: 'Event log', roles: ['admin', 'manager'] },
  { id: 'users', label: 'User access', roles: ['admin'] },
  { id: 'me', label: 'My sign-ins', roles: ['admin', 'manager', 'teller'] },
]

function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setErr('')
    try {
      const r = await api('/auth/login', { method: 'POST', body: { username, password } })
      onLogin(r.access_token, r.user)
    } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-xl border border-line bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Security Monitor</h1>
        <p className="mb-5 text-sm text-slate-500">Sign in with your bank staff account.</p>
        <label className="mb-1 block text-sm font-medium" htmlFor="u">Username</label>
        <input id="u" autoFocus required className="mb-3 w-full rounded border border-line px-3 py-2" value={username} onChange={(e) => setUsername(e.target.value)} />
        <label className="mb-1 block text-sm font-medium" htmlFor="p">Password</label>
        <input id="p" type="password" required className="mb-3 w-full rounded border border-line px-3 py-2" value={password} onChange={(e) => setPassword(e.target.value)} />
        {err && <p role="alert" className="mb-3 rounded bg-red-50 p-2 text-sm text-bad">{err}</p>}
        <button disabled={busy} className={btnCls + ' w-full py-2'}>{busy ? 'Signing in...' : 'Sign in'}</button>
      </form>
    </div>
  )
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [me, setMe] = useState(null)
  const [page, setPage] = useState(null)

  const logout = () => { localStorage.removeItem('token'); setToken(null); setMe(null) }
  const onLogin = (t, u) => { localStorage.setItem('token', t); setToken(t); setMe(u); setPage(null) }

  useEffect(() => {
    if (token && !me) api('/auth/me', { token }).then(setMe).catch(logout)
  }, [token])

  if (!token) return <Login onLogin={onLogin} />
  if (!me) return <p className="p-6 text-slate-500">Loading...</p>

  const items = NAV.filter((n) => n.roles.includes(me.role))
  const current = page && items.find((i) => i.id === page) ? page : items[0].id

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="bg-ink text-slate-200 md:w-56 md:shrink-0">
        <div className="px-4 py-4 text-base font-semibold text-white">Security Monitor</div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:pb-0">
          {items.map((n) => (
            <button key={n.id} onClick={() => setPage(n.id)}
              className={`whitespace-nowrap rounded px-3 py-2 text-left text-sm ${current === n.id ? 'bg-white/15 text-white' : 'hover:bg-white/10'}`}>
              {n.label}
            </button>
          ))}
        </nav>
        <div className="hidden px-4 py-4 text-xs text-slate-400 md:block">
          {me.full_name}<br />{me.role}
          <button onClick={logout} className="mt-2 block text-slate-200 underline">Sign out</button>
        </div>
      </aside>
      <main className="flex-1 p-4 md:p-8">
        <div className="mb-4 flex justify-end md:hidden"><button onClick={logout} className="text-sm underline">Sign out</button></div>
        {current === 'dashboard' && <Dashboard token={token} />}
        {current === 'activity' && <Activity token={token} />}
        {current === 'logs' && <Logs token={token} />}
        {current === 'users' && <Users token={token} me={me} />}
        {current === 'me' && <MyAccount token={token} me={me} />}
      </main>
    </div>
  )
}
