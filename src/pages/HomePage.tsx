import { useEffect, useMemo, useState } from 'react'
import { DateTimeToolModal } from '../components/DateTimeToolModal'
import { JsonToolModal } from '../components/JsonToolModal'
import { Md5ToolModal } from '../components/Md5ToolModal'
import { SearchInput } from '../components/SearchInput'
import { ToolCard } from '../components/ToolCard'
import { tools } from '../data/tools'

export function HomePage() {
  const [query, setQuery] = useState('')
  const [isDateTimeToolOpen, setIsDateTimeToolOpen] = useState(false)
  const [isMd5ToolOpen, setIsMd5ToolOpen] = useState(false)
  const [isJsonToolOpen, setIsJsonToolOpen] = useState(false)

  const filteredTools = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase()

    if (!normalizedQuery) {
      return tools
    }

    return tools.filter((tool) => {
      const searchableText = [tool.name, tool.description, ...tool.keywords]
        .join(' ')
        .toLocaleLowerCase()

      return searchableText.includes(normalizedQuery)
    })
  }, [query])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === 'k') {
        event.preventDefault()
        document.querySelector<HTMLInputElement>('#tool-search')?.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const statusItems = ['local-only', 'command-ready', 'private runtime', 'no cloud sync']

  return (
    <div className="demo-page-in grid gap-6">
      <section className="relative rounded-[2rem] border border-white/10 bg-gradient-to-br from-cyan-400/20 via-sky-500/10 to-emerald-400/20 p-px shadow-[0_40px_120px_-64px_rgb(34_211_238/0.55)]" aria-labelledby="tool-list-title">
        <div className="rounded-[2rem] bg-[#0a0f17]/95 p-5 lg:p-7">
          <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="grid gap-5">
              <div className="rounded-[1.8rem] border border-white/10 bg-[#0d121c] p-7 lg:p-8">
                <p className="text-xs font-black uppercase tracking-[0.3em] text-cyan-300">Command Desk</p>
                <h1 id="tool-list-title" className="mt-5 max-w-4xl text-4xl font-black tracking-tight text-white md:text-5xl lg:text-6xl">
                  八方来财
                </h1>
                <p className="mt-5 max-w-2xl text-base leading-7 text-slate-400">
                  搜索工具、打开面板、完成转换都在浏览器内进行。无需账号、无需后端，常用格式处理随手可用。
                </p>
              </div>
              <SearchInput value={query} onChange={setQuery} />
            </div>

            <div className="grid gap-5">
              <div className="demo-breathing-border rounded-[1.8rem] border border-white/10 bg-white/[0.04] p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-black text-slate-300">Bento Launchpad</p>
                  <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-black text-cyan-100">
                    {filteredTools.length}/{tools.length}
                  </span>
                </div>

                {filteredTools.length > 0 ? (
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {filteredTools.map((tool) => {
                      const openTool = tool.slug === 'date-time'
                        ? () => setIsDateTimeToolOpen(true)
                        : tool.slug === 'md5'
                          ? () => setIsMd5ToolOpen(true)
                          : tool.slug === 'json'
                            ? () => setIsJsonToolOpen(true)
                            : undefined

                      return <ToolCard key={tool.slug} tool={tool} onOpen={openTool} />
                    })}
                  </div>
                ) : (
                  <div className="mt-5 rounded-[1.25rem] border border-dashed border-cyan-300/30 bg-slate-950/70 p-6 text-center">
                    <h3 className="text-xl font-black text-white">未找到匹配工具</h3>
                    <p className="mt-3 text-sm text-slate-500">请尝试其他关键词或清空搜索</p>
                  </div>
                )}
              </div>

              <div className="rounded-[1.8rem] border border-white/10 bg-white/[0.04] p-5">
                <p className="text-sm font-black text-slate-300">Session</p>
                <p className="mt-4 text-4xl font-black text-white">04</p>
                <p className="mt-2 text-sm text-slate-500">个工具已固定在今天的桌面</p>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-3 border-t border-white/10 pt-5 md:grid-cols-[1fr_auto] md:items-center">
            <div className="flex flex-wrap gap-2">
              {statusItems.map((item) => (
                <span key={item} className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 text-xs font-black text-slate-400">
                  {item}
                </span>
              ))}
            </div>
            <div className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-4 py-2 text-xs font-black text-emerald-200">
              desktop status: armed
            </div>
          </div>
        </div>
      </section>

      {isDateTimeToolOpen && <DateTimeToolModal onClose={() => setIsDateTimeToolOpen(false)} />}
      {isMd5ToolOpen && <Md5ToolModal onClose={() => setIsMd5ToolOpen(false)} />}
      {isJsonToolOpen && <JsonToolModal onClose={() => setIsJsonToolOpen(false)} />}
    </div>
  )
}
