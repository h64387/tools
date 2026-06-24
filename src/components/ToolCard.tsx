import { Link } from 'react-router-dom'
import type { Tool } from '../data/tools'

type ToolCardProps = {
  tool: Tool
  onOpen?: () => void
}

function getToolDisplayName(name: string) {
  return name.replace(/\s*工具$/, '')
}

function getToolLabel(tool: Tool) {
  if (tool.slug === 'date-time') {
    return 'DATE'
  }

  if (tool.slug === 'json') {
    return 'JSON'
  }

  return tool.slug.toUpperCase()
}

function ToolCardContent({ tool }: { tool: Tool }) {
  const displayName = getToolDisplayName(tool.name)

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="grid size-11 place-items-center rounded-xl border border-cyan-300/20 bg-cyan-300/10 text-sm font-black text-cyan-100 shadow-[0_14px_40px_-28px_rgb(34_211_238/0.85)]">
          {displayName.slice(0, 2)}
        </div>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-slate-400">
          {getToolLabel(tool)}
        </span>
      </div>
      <div>
        <h3 className="text-lg font-black tracking-tight text-white">{displayName}</h3>
      </div>
      <div className="mt-auto flex flex-nowrap gap-2 pt-2">
        {tool.keywords.slice(0, 2).map((keyword) => (
          <span key={keyword} className="shrink-0 whitespace-nowrap rounded-full border border-white/10 bg-white/[0.035] px-3 py-1 text-xs font-bold text-slate-400">
            {keyword}
          </span>
        ))}
      </div>
    </div>
  )
}

export function ToolCard({ tool, onOpen }: ToolCardProps) {
  const className =
    'focus-ring group min-h-44 rounded-[1.25rem] border border-white/10 bg-slate-950/70 p-4 text-left shadow-[0_22px_60px_-50px_rgb(0_0_0/0.9)] transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-300/35 hover:bg-slate-900/80 hover:shadow-[0_24px_72px_-56px_rgb(34_211_238/0.65)]'

  if (onOpen) {
    return (
      <button type="button" onClick={onOpen} className={`${className} cursor-pointer`}>
        <ToolCardContent tool={tool} />
      </button>
    )
  }

  return (
    <Link to={tool.path} className={className}>
      <ToolCardContent tool={tool} />
    </Link>
  )
}
