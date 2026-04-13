type Variant = 'success' | 'error' | 'warning' | 'neutral' | 'info';

const styles: Record<Variant, string> = {
  success: 'bg-profit/20 text-profit border-profit/30',
  error: 'bg-loss/20 text-loss border-loss/30',
  warning: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  neutral: 'bg-surface-300 text-muted border-surface-400',
  info: 'bg-accent/20 text-accent border-accent/30',
};

export default function Badge({
  variant = 'neutral',
  children,
}: {
  variant?: Variant;
  children: React.ReactNode;
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${styles[variant]}`}>
      {children}
    </span>
  );
}

export function StatusDot({ connected }: { connected: boolean }) {
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${
        connected ? 'bg-profit shadow-[0_0_6px_#3fb950]' : 'bg-surface-400'
      }`}
    />
  );
}
