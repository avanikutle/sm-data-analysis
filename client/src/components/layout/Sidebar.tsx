import { NavLink } from 'react-router-dom';

const navItems = [
  {
    to: '/',
    label: 'Summary',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M4 6h16M4 10h16M4 14h10M4 18h6" />
      </svg>
    ),
  },
  {
    to: '/data-analysis',
    label: 'Data Analysis',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
      </svg>
    ),
  },
  {
    to: '/connectivity',
    label: 'Connectivity',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  return (
    <aside className="w-56 shrink-0 bg-surface-200 border-r border-surface-400 flex flex-col h-screen sticky top-0">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-surface-400">
        <div className="h-7 w-7 rounded bg-accent flex items-center justify-center">
          <svg className="h-4 w-4 text-surface-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        </div>
        <span className="text-sm font-semibold text-primary tracking-tight">BrokerConnect</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                isActive
                  ? 'bg-accent/15 text-accent'
                  : 'text-muted hover:text-primary hover:bg-surface-300'
              }`
            }
          >
            {icon}
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-5 py-3 border-t border-surface-400 text-xs text-muted">
        India Broker Dashboard
      </div>
    </aside>
  );
}
