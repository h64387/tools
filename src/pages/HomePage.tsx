import { useEffect, useMemo, useState } from 'react'
import { Base64ToolModal } from '../components/Base64ToolModal'
import { DateTimeToolModal } from '../components/DateTimeToolModal'
import { JsonToolModal } from '../components/JsonToolModal'
import { Md5ToolModal } from '../components/Md5ToolModal'
import { SearchInput } from '../components/SearchInput'
import { ToolCard } from '../components/ToolCard'
import { TranslationToolModal } from '../components/TranslationToolModal'
import { tools } from '../data/tools'

export function HomePage() {
  const [query, setQuery] = useState('')
  const [isDateTimeToolOpen, setIsDateTimeToolOpen] = useState(false)
  const [isMd5ToolOpen, setIsMd5ToolOpen] = useState(false)
  const [isBase64ToolOpen, setIsBase64ToolOpen] = useState(false)
  const [isJsonToolOpen, setIsJsonToolOpen] = useState(false)
  const [isTranslationToolOpen, setIsTranslationToolOpen] = useState(false)

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

  const statusItems = ['local ui', 'runtime llm', 'private config', 'no account sync']

  return (
    <div className="demo-page-in grid gap-6">
      <section className="relative rounded-[2rem] border border-white/10 bg-gradient-to-br from-cyan-400/20 via-sky-500/10 to-emerald-400/20 p-px shadow-[0_40px_120px_-64px_rgb(34_211_238/0.55)]" aria-labelledby="tool-list-title">
        <div className="rounded-[2rem] bg-[#0a0f17]/95 p-5 lg:p-7">
          <div className="grid min-w-0 gap-5 lg:grid-cols-[1fr_0.95fr] xl:gap-6">
            <div className="grid min-w-0 gap-5">
              <div className="min-w-0 rounded-[1.8rem] border border-white/10 bg-[#0d121c] p-6 sm:p-7 lg:p-8">
                <p className="text-xs font-black uppercase tracking-[0.3em] text-cyan-300">Command Desk</p>
                <h1 id="tool-list-title" className="mt-5 max-w-4xl text-4xl font-black tracking-tight text-white md:text-5xl lg:text-6xl">
                  八方来财
                </h1>
                <pre className="mt-5 block w-full min-w-0 overflow-hidden font-mono text-[0.58rem] font-black leading-4 tracking-[0.05em] text-slate-200/85 sm:text-sm sm:leading-5 sm:tracking-[0.16em] xl:text-base xl:leading-6" aria-label="本地工具状态图形">
                  {'+-- LOCAL TOOL MATRIX ------------------------+\n|  DATE     #######..  ready                  |\n|  JSON     #########  armed                  |\n|  MD5      ######...  local                  |\n|  BASE64   ######...  local                  |\n|  TRANS    #######..  ready                  |\n+------------------- runtime configured ------+'}
                </pre>
              </div>
              <SearchInput value={query} onChange={setQuery} />
            </div>

            <div className="grid gap-4">
              <div className="demo-breathing-border rounded-[1.5rem] border border-white/10 bg-[#10151d]/88 p-4 shadow-[inset_0_1px_0_rgb(255_255_255/0.05)]">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-black text-slate-200">Bento Launchpad</p>
                  <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-black text-cyan-100 shadow-[inset_0_1px_0_rgb(255_255_255/0.08)]">
                    {filteredTools.length}/{tools.length}
                  </span>
                </div>

                {filteredTools.length > 0 ? (
                  <div className="toolbox-thin-scrollbar mt-4 h-[22rem] overflow-y-auto pr-2 lg:h-[26rem]">
                    <div className="grid gap-3 sm:grid-cols-2">
                      {filteredTools.map((tool) => {
                        const openTool = tool.slug === 'date-time'
                          ? () => setIsDateTimeToolOpen(true)
                          : tool.slug === 'md5'
                            ? () => setIsMd5ToolOpen(true)
                            : tool.slug === 'base64'
                              ? () => setIsBase64ToolOpen(true)
                              : tool.slug === 'json'
                                ? () => setIsJsonToolOpen(true)
                                : tool.slug === 'translate'
                                  ? () => setIsTranslationToolOpen(true)
                                  : undefined

                        return <ToolCard key={tool.slug} tool={tool} onOpen={openTool} />
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 rounded-[1.25rem] border border-dashed border-cyan-300/30 bg-slate-950/70 p-6 text-center">
                    <h3 className="text-xl font-black text-white">未找到匹配工具</h3>
                    <p className="mt-3 text-sm text-slate-500">请尝试其他关键词或清空搜索</p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-4 rounded-[1.5rem] border border-white/10 bg-white/[0.035] px-5 py-4">
                <div>
                  <p className="text-sm font-black text-slate-300">Session</p>
                  <p className="mt-1 text-sm text-slate-500">个工具已固定在当前桌面</p>
                </div>
                <p className="text-4xl font-black text-white">05</p>
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
      {isBase64ToolOpen && <Base64ToolModal onClose={() => setIsBase64ToolOpen(false)} />}
      {isJsonToolOpen && <JsonToolModal onClose={() => setIsJsonToolOpen(false)} />}
      {isTranslationToolOpen && <TranslationToolModal onClose={() => setIsTranslationToolOpen(false)} />}
    </div>
  )
}
