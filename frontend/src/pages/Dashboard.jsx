import { useEffect, useState } from 'react'
import { api } from '../api'
import { Badge, Stat, PageTitle, fmt } from '../ui'

function HourlyChart({ data }) {
  const max = Math.max(1, ...data.map((d) => d.success + d.failed))
  const H = 140
  return (
    <svg viewBox="0 0 720 170" className="w-full" role="img" aria-label="Logins per hour, last 24 hours">
      {data.map((d, i) => {
        const s = (d.success / max) * H
        const f = (d.failed / max) * H
        const x = i * 30 + 3
        return (
          <g key={d.hour}>
            <rect x={x} y={H - s + 10} width="24" height={s} fill="#1F6F78" />
            <rect x={x} y={H - s - f + 10} width="24" height={f} fill="#B3261E" />
            {i % 4 === 0 && (
              <text x={x} y="165" fontSize="10" fill="#64748b">{new Date(d.hour).getHours()}:00</text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

export default function Dashboard({ token }) {
  const [d, setD] = useState(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    const load = () => api('/dashboard', { token }).then(setD).catch((e) => setErr(e.message))
    load()
    const t = setInterval(load, 15000)
    return () => clearInterval(t)
  }, [token])

  if (err) return <p className="text-bad">{err}</p>
  if (!d) return <p className="text-slate-500">Loading...</p>

  return (
    <>
      <PageTitle sub="Last 24 hours. Refreshes every 15 seconds.">Security overview</PageTitle>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Successful logins" value={d.success_24h} tone="text-ok" />
        <Stat label="Failed logins" value={d.failed_24h} tone={d.failed_24h ? 'text-bad' : ''} />
        <Stat label="Locked accounts" value={d.locked_accounts} tone={d.locked_accounts ? 'text-warn' : ''} />
        <Stat label="Critical alerts" value={d.critical_24h} tone={d.critical_24h ? 'text-bad' : ''} />
        <Stat label="Users" value={d.total_users} />
      </div>

      <section className="mt-6 rounded-lg border border-line bg-white p-4">
        <div className="mb-2 flex items-center gap-4 text-sm">
          <h2 className="font-medium">Logins per hour</h2>
          <span className="flex items-center gap-1 text-slate-500"><i className="inline-block h-2.5 w-2.5 bg-brand" /> Successful</span>
          <span className="flex items-center gap-1 text-slate-500"><i className="inline-block h-2.5 w-2.5 bg-bad" /> Failed</span>
        </div>
        <HourlyChart data={d.hourly} />
      </section>

      <section className="mt-6">
        <h2 className="mb-2 font-medium">Latest alerts</h2>
        <ul className="divide-y divide-line rounded-lg border border-line bg-white">
          {d.alerts.length === 0 && <li className="p-4 text-sm text-slate-500">No alerts. Warnings and critical events will appear here.</li>}
          {d.alerts.map((a) => (
            <li key={a.id} className="flex items-start gap-3 p-3 text-sm">
              <Badge kind={a.severity}>{a.severity}</Badge>
              <div className="flex-1">{a.description}</div>
              <div className="whitespace-nowrap text-xs text-slate-500">{fmt(a.created_at)}</div>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
