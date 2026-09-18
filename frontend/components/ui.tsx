import { ButtonHTMLAttributes, ReactNode } from "react";
import { LucideIcon, Loader2 } from "lucide-react";

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

// ---------- Botones ----------

type ButtonVariant = "primary" | "secondary" | "ghost" | "warning" | "danger";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-600/20",
  secondary: "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
  ghost: "text-gray-500 hover:bg-gray-100 hover:text-gray-700",
  warning: "bg-amber-500 text-white hover:bg-amber-600 shadow-sm shadow-amber-500/20",
  danger: "bg-red-600 text-white hover:bg-red-700 shadow-sm shadow-red-600/20",
};

export function Button({
  variant = "primary",
  className,
  icon: Icon,
  busy,
  fullWidthOnMobile,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  icon?: LucideIcon;
  busy?: boolean;
  fullWidthOnMobile?: boolean;
}) {
  return (
    <button
      {...props}
      disabled={props.disabled || busy}
      className={cx(
        "inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        VARIANT_CLASSES[variant],
        fullWidthOnMobile && "w-full sm:w-auto",
        className,
      )}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : Icon && <Icon className="h-4 w-4" aria-hidden="true" />}
      {children}
    </button>
  );
}

export function LinkButton({
  variant = "primary",
  className,
  icon: Icon,
  children,
}: {
  variant?: ButtonVariant;
  className?: string;
  icon?: LucideIcon;
  children: ReactNode;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
        VARIANT_CLASSES[variant],
        className,
      )}
    >
      {Icon && <Icon className="h-4 w-4" aria-hidden="true" />}
      {children}
    </span>
  );
}

// ---------- Card ----------

export function Card({
  className,
  accent,
  children,
}: {
  className?: string;
  accent?: "blue" | "green" | "amber" | "red" | "none";
  children: ReactNode;
}) {
  const accentClass =
    accent && accent !== "none"
      ? {
          blue: "border-l-4 border-l-blue-500",
          green: "border-l-4 border-l-green-500",
          amber: "border-l-4 border-l-amber-500",
          red: "border-l-4 border-l-red-500",
        }[accent]
      : "";
  return (
    <div
      className={cx(
        "rounded-xl border border-gray-100 bg-white p-5 shadow-sm",
        accentClass,
        accentClass && "rounded-l-none",
        className,
      )}
    >
      {children}
    </div>
  );
}

// ---------- Badge ----------

type BadgeTone = "gray" | "blue" | "green" | "amber" | "red";

const BADGE_CLASSES: Record<BadgeTone, string> = {
  gray: "bg-gray-100 text-gray-600",
  blue: "bg-blue-50 text-blue-800",
  green: "bg-green-50 text-green-800",
  amber: "bg-amber-50 text-amber-800",
  red: "bg-red-50 text-red-800",
};

export function Badge({ tone = "gray", className, children }: { tone?: BadgeTone; className?: string; children: ReactNode }) {
  return (
    <span className={cx("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium", BADGE_CLASSES[tone], className)}>
      {children}
    </span>
  );
}

// ---------- Empty state ----------

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-gray-200 bg-white/60 px-6 py-10 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-blue-600">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <p className="font-medium text-gray-700">{title}</p>
      {description && <p className="max-w-sm text-sm text-gray-500">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

// ---------- Loading ----------

export function LoadingRow({ label = "Cargando..." }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-6 text-sm text-gray-400">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      {label}
    </div>
  );
}

// ---------- Page header ----------

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        {eyebrow && <p className="text-xs font-medium uppercase tracking-wide text-blue-600">{eyebrow}</p>}
        <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">{actions}</div>}
    </div>
  );
}

// ---------- Text field ----------

export function TextField({
  label,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return (
    <label className="block text-sm">
      {label && <span className="mb-1 block font-medium text-gray-700">{label}</span>}
      <input
        {...props}
        className={cx(
          "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100",
          className,
        )}
      />
    </label>
  );
}
