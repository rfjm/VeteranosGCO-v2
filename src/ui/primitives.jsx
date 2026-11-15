import Icon from "./Icon";
import { teamColor } from "./teams";

export function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:mb-8 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-1 text-brand-400">{eyebrow}</p>}
        <h1 className="text-4xl font-extrabold uppercase leading-none sm:text-5xl">{title}</h1>
        {description && <p className="mt-2 max-w-xl text-sm text-ink-300">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function Spinner({ className = "" }) {
  return (
    <span
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent ${className}`}
      aria-hidden="true"
    />
  );
}

export function Skeleton({ className = "" }) {
  return <div className={`animate-pulse rounded-xl bg-white/[0.05] ${className}`} />;
}

export function SkeletonList({ rows = 6, className = "h-16" }) {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="A carregar">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className={className} />
      ))}
    </div>
  );
}

export function EmptyState({ icon = "info", title, children, action }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-white/10 px-6 py-10 text-center">
      <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-white/[0.05] text-ink-300">
        <Icon name={icon} size={22} />
      </div>
      <p className="font-semibold text-ink-100">{title}</p>
      {children && <p className="mt-1 max-w-sm text-sm text-ink-400">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Banner({ tone = "info", icon, title, children, className = "" }) {
  const tones = {
    info: "border-sky-500/30 bg-sky-500/[0.07] text-sky-100",
    success: "border-brand-500/30 bg-brand-500/[0.08] text-brand-50",
    warning: "border-amber-500/30 bg-amber-500/[0.08] text-amber-50",
    error: "border-red-500/30 bg-red-500/[0.08] text-red-100",
  };
  const icons = { info: "info", success: "checkCircle", warning: "alert", error: "alert" };
  const iconColors = {
    info: "text-sky-300",
    success: "text-brand-300",
    warning: "text-amber-300",
    error: "text-red-300",
  };

  return (
    <div className={`flex gap-3 rounded-2xl border p-4 text-sm ${tones[tone]} ${className}`}>
      <Icon name={icon || icons[tone]} size={18} className={`mt-0.5 ${iconColors[tone]}`} />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? "mt-0.5 opacity-85" : ""}>{children}</div>}
      </div>
    </div>
  );
}

export function TeamDot({ teamNumber, size = 12, className = "" }) {
  const color = teamColor(teamNumber);
  return (
    <span
      className={`inline-block shrink-0 rounded-full ring-1 ring-white/30 ${className}`}
      style={{ width: size, height: size, backgroundColor: color.bg }}
      aria-hidden="true"
    />
  );
}

export function Stat({ label, value, sub, accent = "text-ink-50" }) {
  return (
    <div className="min-w-0">
      <p className="eyebrow truncate">{label}</p>
      <p className={`stat-num mt-0.5 text-2xl leading-none ${accent}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-ink-400">{sub}</p>}
    </div>
  );
}

export function Initials({ name = "", className = "" }) {
  const initials = String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <span
      className={`grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-600/40 to-brand-900/40 font-display text-base font-bold text-brand-100 ring-1 ring-brand-400/20 ${className}`}
      aria-hidden="true"
    >
      {initials || "?"}
    </span>
  );
}
