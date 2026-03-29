'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell,
} from 'recharts'
import {
  Calendar, TrendingUp, Users, Package,
  Clock, ChevronRight, AlertTriangle, CheckCircle2,
  IndianRupee, UserCheck, Scissors,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { formatCurrency, formatTime, formatNumber, cn } from '@/lib/utils'
import { StatCard, Avatar, AppointmentStatusBadge, Card } from '@/components/ui'

interface Props {
  userName: string
  stats: {
    todayRevenue: number
    monthRevenue: number
    todayAppointments: number
    pendingAppointments: number
    activeStaff: number
    lowStockCount: number
  }
  todayAppointments: any[]
  staffList: any[]
  lowStockProducts: any[]
  recentCustomers: any[]
  chartData: { date: string; revenue: number }[]
}

const STATUS_COLORS: Record<string, string> = {
  confirmed:   '#3b82f6',
  pending:     '#f59e0b',
  completed:   '#22c55e',
  in_progress: '#a855f7',
  cancelled:   '#ef4444',
}

export default function DashboardClient({
  userName, stats, todayAppointments, staffList,
  lowStockProducts, recentCustomers, chartData,
}: Props) {
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const today = format(new Date(), 'EEEE, dd MMMM yyyy')

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">{greeting}, {userName.split(' ')[0]} 👋</h2>
          <p className="text-muted-foreground text-sm mt-0.5">{today}</p>
        </div>
        <Link
          href="/appointments/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm w-fit"
        >
          <Calendar className="w-4 h-4" />
          New Booking
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today's Revenue"
          value={formatCurrency(stats.todayRevenue)}
          icon={<IndianRupee className="w-5 h-5 text-primary" />}
          iconBg="bg-primary/10"
          change="vs yesterday"
          changeType="positive"
        />
        <StatCard
          title="Today's Bookings"
          value={stats.todayAppointments}
          icon={<Calendar className="w-5 h-5 text-blue-500" />}
          iconBg="bg-blue-50 dark:bg-blue-900/20"
          change={`${stats.pendingAppointments} pending`}
          changeType="neutral"
        />
        <StatCard
          title="Monthly Revenue"
          value={formatCurrency(stats.monthRevenue)}
          icon={<TrendingUp className="w-5 h-5 text-green-500" />}
          iconBg="bg-green-50 dark:bg-green-900/20"
        />
        <StatCard
          title="Active Staff"
          value={stats.activeStaff}
          icon={<UserCheck className="w-5 h-5 text-purple-500" />}
          iconBg="bg-purple-50 dark:bg-purple-900/20"
          change={stats.lowStockCount > 0 ? `${stats.lowStockCount} low-stock alerts` : 'All good'}
          changeType={stats.lowStockCount > 0 ? 'negative' : 'positive'}
        />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Revenue chart — spans 2 cols */}
        <Card className="xl:col-span-2" title="Revenue — This Month" action={
          <span className="text-xs text-muted-foreground">{formatCurrency(stats.monthRevenue)} total</span>
        }>
          <div className="p-5 pt-2">
            {chartData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                No revenue data yet for this month
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="hsl(338 100% 55%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(338 100% 55%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={d => format(parseISO(d), 'dd')}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={v => `₹${formatNumber(v)}`}
                    tickLine={false}
                    axisLine={false}
                    width={60}
                  />
                  <Tooltip
                    formatter={(v: number) => [formatCurrency(v), 'Revenue']}
                    labelFormatter={d => format(parseISO(d as string), 'dd MMM')}
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(338 100% 55%)"
                    strokeWidth={2}
                    fill="url(#revenueGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Low stock alert */}
        <Card title="Low Stock Alerts" action={
          <Link href="/inventory" className="text-xs text-primary hover:underline">View all</Link>
        }>
          <div className="p-3 space-y-1">
            {lowStockProducts.length === 0 ? (
              <div className="py-6 text-center">
                <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">All stock levels are healthy</p>
              </div>
            ) : (
              lowStockProducts.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-muted/40">
                  <div className="flex items-center gap-2 min-w-0">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                    <span className="text-xs font-medium truncate">{p.name}</span>
                  </div>
                  <span className="text-xs text-red-500 font-semibold flex-shrink-0">
                    {p.current_stock} {p.unit}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Today's Schedule & Staff */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Today's Appointments */}
        <Card
          className="xl:col-span-2"
          title={`Today's Schedule (${todayAppointments.length})`}
          action={
            <Link href={`/appointments?date=${new Date().toISOString().split('T')[0]}`}
              className="text-xs text-primary hover:underline flex items-center gap-1">
              Full calendar <ChevronRight className="w-3 h-3" />
            </Link>
          }
        >
          <div className="divide-y divide-border">
            {todayAppointments.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground text-sm">
                <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No appointments scheduled today
              </div>
            ) : (
              todayAppointments.slice(0, 6).map((appt: any) => (
                <div key={appt.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/20 transition-colors">
                  <div
                    className="w-1 h-10 rounded-full flex-shrink-0"
                    style={{ background: STATUS_COLORS[appt.status] ?? '#888' }}
                  />
                  <div className="w-16 flex-shrink-0 text-center">
                    <div className="text-sm font-semibold tabular-nums">{formatTime(appt.start_time)}</div>
                    <div className="text-xs text-muted-foreground">{appt.service?.duration_minutes}min</div>
                  </div>
                  <Avatar name={appt.customer?.full_name ?? '?'} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{appt.customer?.full_name}</div>
                    <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
                      <Scissors className="w-3 h-3" />
                      {appt.service?.name}
                      {appt.staff && ` · ${appt.staff.full_name}`}
                    </div>
                  </div>
                  <AppointmentStatusBadge status={appt.status} />
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Staff on duty */}
        <Card title="Staff Today">
          <div className="p-4 space-y-3">
            {staffList.slice(0, 6).map((s: any) => (
              <div key={s.id} className="flex items-center gap-3">
                <Avatar name={s.full_name} src={s.avatar_url} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{s.full_name}</div>
                  <div className="text-xs text-muted-foreground truncate">{s.designation ?? 'Stylist'}</div>
                </div>
                <div className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" title="Active" />
              </div>
            ))}
            {staffList.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No staff records</p>
            )}
            <Link
              href="/staff"
              className="block text-center text-xs text-primary hover:underline pt-1"
            >
              Manage staff →
            </Link>
          </div>
        </Card>
      </div>

      {/* Recent customers */}
      <Card title="Recent Customers" action={
        <Link href="/customers" className="text-xs text-primary hover:underline">View all</Link>
      }>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Phone</th>
                <th className="text-right">Visits</th>
                <th className="text-right">Total Spent</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {recentCustomers.map((c: any) => (
                <tr key={c.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <Avatar name={c.full_name} size="xs" />
                      <Link href={`/customers/${c.id}`} className="font-medium text-sm hover:text-primary">
                        {c.full_name}
                      </Link>
                    </div>
                  </td>
                  <td className="text-muted-foreground text-sm">{c.phone}</td>
                  <td className="text-right text-sm">{c.total_visits}</td>
                  <td className="text-right text-sm font-medium">{formatCurrency(c.total_spent)}</td>
                  <td className="text-muted-foreground text-sm">
                    {format(new Date(c.created_at), 'dd MMM')}
                  </td>
                </tr>
              ))}
              {recentCustomers.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-muted-foreground py-6">No customers yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
