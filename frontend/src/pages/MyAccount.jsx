import { useEffect, useState } from 'react'
import { api } from '../api'
import { Badge, Table, PageTitle, fmt } from '../ui'

export default function MyAccount({ token, me }) {
  const [rows, setRows] = useState([])
  useEffect(() => { api('/me/activity', { token }).then(setRows).catch(() => {}) }, [token])
  return (
    <>
      <PageTitle sub={`Signed in as ${me.full_name} (${me.role}). If you see a sign-in you do not recognise, tell your administrator.`}>My recent sign-ins</PageTitle>
      <Table
        rows={rows}
        columns={[
          { key: 'created_at', label: 'Time', render: (r) => fmt(r.created_at) },
          { key: 'success', label: 'Result', render: (r) => <Badge kind={r.success ? 'success' : 'failed'}>{r.success ? 'Success' : 'Failed'}</Badge> },
          { key: 'ip_address', label: 'IP address' },
        ]}
      />
    </>
  )
}
