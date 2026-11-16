import { useEffect, useState } from 'react'
import { api } from '../api'
import { Badge, Table, PageTitle, fmt, selectCls } from '../ui'

export default function Logs({ token }) {
  const [rows, setRows] = useState([])
  const [severity, setSeverity] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => {
    api('/logs' + (severity ? `?severity=${severity}` : ''), { token }).then(setRows).catch((e) => setErr(e.message))
  }, [token, severity])

  return (
    <>
      <PageTitle sub="Logins, lockouts, role changes and other security events.">Security event log</PageTitle>
      <div className="mb-3">
        <select className={selectCls} value={severity} onChange={(e) => setSeverity(e.target.value)} aria-label="Filter by severity">
          <option value="">All severities</option>
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="critical">Critical</option>
        </select>
      </div>
      {err && <p className="mb-2 text-bad">{err}</p>}
      <Table
        rows={rows}
        empty="No events match this filter."
        columns={[
          { key: 'created_at', label: 'Time', render: (r) => fmt(r.created_at) },
          { key: 'severity', label: 'Severity', render: (r) => <Badge kind={r.severity}>{r.severity}</Badge> },
          { key: 'event_type', label: 'Event' },
          { key: 'description', label: 'Details' },
        ]}
      />
    </>
  )
}
