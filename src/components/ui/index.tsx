'use client'

import { cn, getInitials } from '@/lib/utils'
import type { AppointmentStatus, PaymentStatus } from '@/types'

// ── Badge ──────────────────────────────────────────────
interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline'
  className?: string
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  const variants = {
    default: 'bg-secondary text-secondary-foreground',
    success: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    danger:  'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    info:    'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    outline: 'border border-border text-foreground bg-transparent',
  }
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
      variants[variant], className
    )}>
      {children}
    </span>
  )
}

// ── Appointment Status Badge ───────────────────────────
const STATUS_CONFIG: Record<AppointmentStatus, { label: string; variant: BadgeProps['variant'] }> = {
  pending:     { label: 'Pending',     variant: 'warning' },
  confirmed:   { label: 'Confirmed',   variant: 'info' },
  in_progress: { label: 'In Progress', variant: 'default' },
  completed:   { label: 'Completed',   variant: 'success' },
  cancelled:   { label: 'Cancelled',   variant: 'danger' },
  no_show:     { label: 'No Show',     variant: 'outline' },
}

export function AppointmentStatusBadge({ status }: { status: AppointmentStatus }) {
  const config = STATUS_CONFIG[status] ?? { label: status, variant: 'default' as const }
  return <Badge variant={config.variant}>{config.label}</Badge>
}

// ── Payment Status Badge ───────────────────────────────
const PAYMENT_CONFIG: Record<PaymentStatus, { label: string; variant: BadgeProps['variant'] }> = {
  pending:  { label: 'Pending',  variant: 'warning' },
  paid:     { label: 'Paid',     variant: 'success' },
  partial:  { label: 'Partial',  variant: 'warning' },
  refunded: { label: 'Refunded', variant: 'info' },
  failed:   { label: 'Failed',   variant: 'danger' },
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const config = PAYMENT_CONFIG[status] ?? { label: status, variant: 'default' as const }
  return <Badge variant={config.variant}>{config.label}</Badge>
}

// ── Avatar ─────────────────────────────────────────────
interface AvatarProps {
  name: string
  src?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
}

const AVATAR_SIZES = { xs: 'w-6 h-6 text-[10px]', sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-12 h-12 text-base' }
const AVATAR_COLORS = [
  'bg-pink-100 text-pink-700', 'bg-purple-100 text-purple-700',
  'bg-blue-100 text-blue-700', 'bg-teal-100 text-teal-700',
  'bg-orange-100 text-orange-700', 'bg-green-100 text-green-700',
]

export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  const initials = getInitials(name)
  const colorIndex = name.charCodeAt(0) % AVATAR_COLORS.length
  const color = AVATAR_COLORS[colorIndex]

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn('rounded-full object-cover flex-shrink-0', AVATAR_SIZES[size], className)}
      />
    )
  }

  return (
    <div className={cn(
      'rounded-full flex items-center justify-center font-semibold flex-shrink-0',
      AVATAR_SIZES[size], color, className
    )}>
      {initials}
    </div>
  )
}

// ── Skeleton ───────────────────────────────────────────
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} style={{ minHeight: '1rem' }} />
}

export function SkeletonCard() {
  return (
    <div className="stat-card space-y-3">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-3 w-20" />
    </div>
  )
}

// ── Stat Card ──────────────────────────────────────────
interface StatCardProps {
  title: string
  value: string | number
  change?: string
  changeType?: 'positive' | 'negative' | 'neutral'
  icon: React.ReactNode
  iconBg?: string
  loading?: boolean
}

export function StatCard({ title, value, change, changeType = 'neutral', icon, iconBg = 'bg-primary/10', loading }: StatCardProps) {
  if (loading) return <SkeletonCard />
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold mt-1 tabular-nums">{value}</p>
          {change && (
            <p className={cn(
              'text-xs mt-1',
              changeType === 'positive' && 'text-green-600 dark:text-green-400',
              changeType === 'negative' && 'text-red-600 dark:text-red-400',
              changeType === 'neutral' && 'text-muted-foreground',
            )}>
              {change}
            </p>
          )}
        </div>
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', iconBg)}>
          {icon}
        </div>
      </div>
    </div>
  )
}

// ── Empty State ────────────────────────────────────────
interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center mb-4 text-muted-foreground">
        {icon}
      </div>
      <h3 className="text-base font-semibold mb-1">{title}</h3>
      {description && <p className="text-sm text-muted-foreground max-w-xs mb-4">{description}</p>}
      {action}
    </div>
  )
}

// ── Loading Spinner ────────────────────────────────────
export function Spinner({ className }: { className?: string }) {
  return (
    <div className={cn(
      'w-5 h-5 rounded-full border-2 border-current border-t-transparent animate-spin',
      className
    )} />
  )
}

// ── Card ───────────────────────────────────────────────
interface CardProps {
  children: React.ReactNode
  className?: string
  title?: string
  action?: React.ReactNode
}

export function Card({ children, className, title, action }: CardProps) {
  return (
    <div className={cn('bg-card border border-border rounded-xl', className)}>
      {(title || action) && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          {title && <h3 className="font-semibold text-sm">{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </div>
  )
}

// ── Section Header ─────────────────────────────────────
export function SectionHeader({
  title, description, action
}: {
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h2 className="text-xl font-semibold">{title}</h2>
        {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}
