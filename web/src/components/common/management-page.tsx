import type { ReactNode } from 'react'
import { Activity, Layers3, Radar } from 'lucide-react'

export interface ManagementMetric {
  label: string
  value: ReactNode
  caption: string
}

interface ManagementPageProps {
  title: string
  description: string
  metrics?: [ManagementMetric, ManagementMetric, ManagementMetric]
  children: ReactNode
}

const metricIcons = [Radar, Layers3, Activity]

const defaultMetrics: [ManagementMetric, ManagementMetric, ManagementMetric] = [
  { label: '管理范围', value: '系统', caption: '统一管理' },
  { label: '运行模式', value: '集中', caption: '集中控制' },
  { label: '数据状态', value: '实时', caption: '实时同步' },
]

export function ManagementPage({
  title,
  description,
  metrics = defaultMetrics,
  children,
}: ManagementPageProps) {
  return (
    <div className="flex flex-col gap-5">
      <section className="control-grid relative overflow-hidden rounded-xl bg-primary text-primary-foreground shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div className="absolute top-0 right-0 size-24 border-b border-l border-primary-foreground/15" />
        <div className="relative grid gap-6 p-5 sm:p-6 lg:grid-cols-[1fr_1fr] lg:items-end lg:p-8">
          <div className="flex max-w-xl flex-col items-start gap-4">
            <div className="flex flex-col gap-2">
              <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
                {title}
              </h1>
              <p className="text-sm leading-6 text-primary-foreground/70">
                {description}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 overflow-hidden rounded-lg border border-primary-foreground/15 bg-primary-foreground/5 backdrop-blur-xs">
            {metrics.map((metric, index) => {
              const Icon = metricIcons[index]
              return (
                <div
                  key={metric.label}
                  className="flex min-w-0 flex-col gap-2 border-l border-primary-foreground/15 p-3 first:border-l-0 sm:p-4"
                >
                  <div className="flex items-center gap-2 text-primary-foreground/55">
                    <Icon className="size-4" />
                    <span className="truncate font-mono text-[0.65rem] tracking-widest">
                      {metric.label}
                    </span>
                  </div>
                  <strong className="truncate font-mono text-xl font-medium tabular-nums sm:text-2xl">
                    {metric.value}
                  </strong>
                  <span className="truncate text-xs text-primary-foreground/65">
                    {metric.caption}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </section>
      {children}
    </div>
  )
}
