export const fmt = (s) => (s ? new Date(s).toLocaleString() : '-')

const tones = {
  info: 'bg-slate-100 text-slate-700',
  warning: 'bg-amber-100 text-warn',
  critical: 'bg-red-100 text-bad',
  success: 'bg-emerald-100 text-ok',
  failed: 'bg-red-100 text-bad',
}

export function Badge({ kind, children }) {
  return <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${tones[kind] || tones.info}`}>{children}</span>
}

export function Stat({ label, value, tone }) {
  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <div className="text-sm text-slate-500">{label}</div>
      <div className={`mt-1 text-3xl font-semibold ${tone || ''}`}>{value}</div>
    </div>
  )
}

export function Table({ columns, rows, empty = 'Nothing to show yet.' }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-white">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-line bg-slate-50 text-slate-600">
          <tr>{columns.map((c) => <th key={c.key} className="px-3 py-2 font-medium">{c.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={columns.length} className="px-3 py-6 text-center text-slate-500">{empty}</td></tr>
          )}
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-line last:border-0">
              {columns.map((c) => <td key={c.key} className="px-3 py-2 align-top">{c.render ? c.render(r) : r[c.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export const PageTitle = ({ children, sub }) => (
  <div className="mb-5">
    <h1 className="text-xl font-semibold">{children}</h1>
    {sub && <p className="text-sm text-slate-500">{sub}</p>}
  </div>
)

export const selectCls = 'rounded border border-line bg-white px-2 py-1.5 text-sm'
export const btnCls = 'rounded bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-50'
export const btnGhost = 'rounded border border-line bg-white px-2.5 py-1 text-xs font-medium hover:bg-slate-50'
