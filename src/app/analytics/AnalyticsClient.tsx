'use client'

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie, Legend,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { TrendingUp, TrendingDown, Users, Calendar, IndianRupee } from 'lucide-react'
import { formatCurrency, formatNumber, cn } from '@/lib/utils'
import { Card, StatCard } from '@/components/ui'

const COLORS = ['#FF2070', '#7C3AED', '#0891B2', '#059669', '#D97706', '#DC2626']

interface Props {
  revenueChart: { date: string; revenue: number }[]
  topServices: { name: string; count: number; revenue: number }[]
  staffStats: { name: string; count: number; revenue: number }[]
  thisMonthRevenue: number
  prevMonthRevenue: number
  totalAppointments: number
  newCustomers: number
}

export default function AnalyticsClient({
  revenueChart, topServices, staffStats,
  thisMonthRevenue, prevMonthRevenue, totalAppointments, newCustomers,
}: Props) {
  const revenueGrowth = prevMonthRevenue > 0
    ? ((thisMonthRevenue - prevMonthRevenue) / prevMonthRevenue * 100).toFixed(1)
    : '0'
  const isPositive = thisMonthRevenue >= prevMonthRevenue

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="This Month"
          value={formatCurrency(thisMonthRevenue)}
          change={`${isPositive ? '▲' : '▼'} ${Math.abs(Number(revenueGrowth))}% vs last month`}
          changeType={isPositive ? 'positive' : 'negative'}
          icon={<IndianRupee className="w-5 h-5 text-primary" />}
          iconBg="bg-primary/10"
        />
        <StatCard
          title="Last Month"
          value={formatCurrency(prevMonthRevenue)}
          icon={isPositive ? <TrendingUp className="w-5 h-5 text-green-500" /> : <TrendingDown className="w-5 h-5 text-red-500" />}
          iconBg={isPositive ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}
        />
        <StatCard
          title="Appointments (month)"
          value={totalAppointments}
          icon={<Calendar className="w-5 h-5 text-blue-500" />}
          iconBg="bg-blue-50 dark:bg-blue-900/20"
        />
        <StatCard
          title="New Customers (30d)"
          value={newCustomers}
          icon={<Users className="w-5 h-5 text-purple-500" />}
          iconBg="bg-purple-50 dark:bg-purple-900/20"
        />
      </div>

      {/* Revenue chart */}
      <Card title="Revenue — Last 30 Days">
        <div className="p-5 pt-2">
          {revenueChart.length === 0 ? (
            <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={revenueChart}>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(338 100% 55%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(338 100% 55%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={d => format(parseISO(d), 'dd MMM')} tickLine={false} axisLine={false} interval={4} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={v => `₹${formatNumber(v)}`} tickLine={false} axisLine={false} width={65} />
                <Tooltip
                  formatter={(v: number) => [formatCurrency(v), 'Revenue']}
                  labelFormatter={d => format(parseISO(d as string), 'dd MMM yyyy')}
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="hsl(338 100% 55%)" strokeWidth={2} fill="url(#grad)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {/* Services + Staff side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top services */}
        <Card title="Top Services (this month)">
          <div className="p-5 pt-2">
            {topServices.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={topServices} layout="vertical" margin={{ left: 8 }}>
                  <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={v => `₹${formatNumber(v)}`} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false} axisLine={false} width={100} />
                  <Tooltip formatter={(v: number) => [formatCurrency(v), 'Revenue']}
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                  <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                    {topServices.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Staff performance */}
        <Card title="Staff Performance (this month)">
          <div className="divide-y divide-border">
            {staffStats.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-muted-foreground text-sm px-5">No data</div>
            ) : (
              staffStats.map((s, i) => {
                const max = staffStats[0]?.revenue ?? 1
                const pct = (s.revenue / max) * 100
                return (
                  <div key={s.name} className="px-5 py-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{s.name}</span>
                      <div className="text-right">
                        <div className="text-sm font-semibold">{formatCurrency(s.revenue)}</div>
                        <div className="text-xs text-muted-foreground">{s.count} services</div>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }}
                      />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </Card>
      </div>

      {/* Services revenue pie */}
      {topServices.length > 0 && (
        <Card title="Revenue Share by Service">
          <div className="p-5">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={topServices}
                  cx="50%" cy="50%"
                  innerRadius={60}
                  outerRadius={110}
                  dataKey="revenue"
                  nameKey="name"
                  paddingAngle={2}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                >
                  {topServices.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip
                  formatter={(v: number) => [formatCurrency(v), 'Revenue']}
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
    </div>
  )
}
