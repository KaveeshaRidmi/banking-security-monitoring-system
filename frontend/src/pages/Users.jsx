import { useEffect, useState } from 'react'
import { api } from '../api'
import { Badge, Table, PageTitle, selectCls, btnCls, btnGhost } from '../ui'

export default function Users({ token, me }) {
  const [rows, setRows] = useState([])
  const [err, setErr] = useState('')
  const [form, setForm] = useState({ username: '', full_name: '', password: '', role: 'teller' })

  const load = () => api('/users', { token }).then(setRows).catch((e) => setErr(e.message))
  useEffect(() => { load() }, [token])

  const run = async (fn) => {
    setErr('')
    try { await fn(); await load() } catch (e) { setErr(e.message) }
  }
  const patch = (id, body) => run(() => api(`/users/${id}`, { method: 'PATCH', body, token }))
  const unlock = (id) => run(() => api(`/users/${id}/unlock`, { method: 'POST', token }))
  const create = (e) => {
    e.preventDefault()
    run(async () => {
      await api('/users', { method: 'POST', body: form, token })
      setForm({ username: '', full_name: '', password: '', role: 'teller' })
    })
  }
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  return (
    <>
      <PageTitle sub="Control who can sign in and what they can see.">User access</PageTitle>
      {err && <p className="mb-3 rounded border border-red-200 bg-red-50 p-2 text-sm text-bad">{err}</p>}

      <form onSubmit={create} className="mb-5 grid grid-cols-1 gap-2 rounded-lg border border-line bg-white p-4 md:grid-cols-5">
        <input required minLength={3} className={selectCls} placeholder="Username" value={form.username} onChange={set('username')} />
        <input required className={selectCls} placeholder="Full name" value={form.full_name} onChange={set('full_name')} />
        <input required minLength={8} type="password" className={selectCls} placeholder="Password (8+ characters)" value={form.password} onChange={set('password')} />
        <select className={selectCls} value={form.role} onChange={set('role')} aria-label="Role">
          <option value="teller">Teller</option>
          <option value="manager">Manager</option>
          <option value="admin">Admin</option>
        </select>
        <button className={btnCls}>Add user</button>
      </form>

      <Table
        rows={rows}
        columns={[
          { key: 'username', label: 'User', render: (u) => <div><div className="font-medium">{u.username}</div><div className="text-xs text-slate-500">{u.full_name}</div></div> },
          { key: 'role', label: 'Role', render: (u) => (
            <select className={selectCls} value={u.role} disabled={u.id === me.id} onChange={(e) => patch(u.id, { role: e.target.value })} aria-label={`Role for ${u.username}`}>
              <option value="teller">Teller</option><option value="manager">Manager</option><option value="admin">Admin</option>
            </select>) },
          { key: 'status', label: 'Status', render: (u) => (
            <div className="flex flex-wrap gap-1">
              <Badge kind={u.is_active ? 'success' : 'failed'}>{u.is_active ? 'Active' : 'Deactivated'}</Badge>
              {u.locked && <Badge kind="critical">Locked</Badge>}
              {u.failed_attempts > 0 && !u.locked && <Badge kind="warning">{u.failed_attempts} failed</Badge>}
            </div>) },
          { key: 'actions', label: 'Actions', render: (u) => (
            <div className="flex gap-2">
              {(u.locked || u.failed_attempts > 0) && <button className={btnGhost} onClick={() => unlock(u.id)}>Unlock</button>}
              {u.id !== me.id && <button className={btnGhost} onClick={() => patch(u.id, { is_active: !u.is_active })}>{u.is_active ? 'Deactivate' : 'Activate'}</button>}
            </div>) },
        ]}
      />
    </>
  )
}
