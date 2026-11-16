import { useEffect, useState } from 'react'
import { api } from '../api'
import { Badge, Table, PageTitle, fmt, selectCls } from '../ui'

export default function Activity({ token }) {
  const [rows, setRows] = useState([])
  const [status, setStatus] = useState('')
  const [username, setUsername] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => {
    const q = new URLSearchParams()
    if (status) q.set('status', status)
    if (username) q.set('username', username)
    api('/activity?' + q, { token }).then(setRows).catch((e) => setErr(e.message))
  }, [token, status, username])

  return (
    <>
      <PageTitle sub="Every sign-in attempt, successful or not.">Login activity</PageTitle>
      <div className="mb-3 flex gap-2">
        <select className={selectCls} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by result">
          <option value="">All results</option>
          <option value="success">Successful</option>
          <option value="failed">Failed</option>
        </select>
        <input className={selectCls} placeholder="Search username" value={username} onChange={(e) => setUsername(e.target.value)} />
      </div>
      {err && <p className="mb-2 text-bad">{err}</p>}
      <Table
        rows={rows}
        empty="No login attempts match these filters."
        columns={[
          { key: 'created_at', label: 'Time', render: (r) => fmt(r.created_at) },
          { key: 'username', label: 'Username' },
          { key: 'success', label: 'Result', render: (r) => <Badge kind={r.success ? 'success' : 'failed'}>{r.success ? 'Success' : 'Failed'}</Badge> },
          { key: 'ip_address', label: 'IP address' },
          { key: 'user_agent', label: 'Device', render: (r) => <span className="text-xs text-slate-500">{(r.user_agent || '').slice(0, 60)}</span> },
        ]}
      />
    </>
  )
}
