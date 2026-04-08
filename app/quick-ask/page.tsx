'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Loader2, Sparkles } from 'lucide-react'

type Msg = { role: 'user' | 'assistant'; content: string }

const SUGGESTIONS = [
  "How many annual leave days are AMC staff entitled to?",
  "What does the Ghana Labour Act say about overtime pay?",
  "What are the HeFRA requirements for staff licensing?",
  "How should missed clock-ins be handled under policy?",
]

export default function QuickAskPage() {
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  const send = async (text?: string) => {
    const q = (text ?? input).trim()
    if (!q || loading) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: q }])
    setLoading(true)

    // Simple local response for now (can wire to Claude API later)
    await new Promise(r => setTimeout(r, 800))
    const answer = getLocalAnswer(q)
    setMessages(prev => [...prev, { role: 'assistant', content: answer }])
    setLoading(false)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-0px)] max-w-3xl mx-auto px-6 py-6">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-5 w-5 text-amber-400" />
          <h1 className="text-2xl font-bold text-white">Quick AI Ask</h1>
        </div>
        <p className="text-sm text-white/40">Ask anything about AMC policies, labour law, or staff management</p>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-white/30 uppercase tracking-wider">Suggested questions</p>
            {SUGGESTIONS.map((s, i) => (
              <button key={i} onClick={() => send(s)}
                className="w-full text-left px-4 py-3 rounded-xl border border-white/[0.06] bg-white/[0.02] text-sm text-white/60 hover:bg-white/[0.05] hover:text-white/80 transition-all">
                {s}
              </button>
            ))}
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'assistant' && (
              <div className="h-8 w-8 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="h-4 w-4 text-amber-400" />
              </div>
            )}
            <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
              m.role === 'user'
                ? 'bg-amber-500 text-black rounded-br-sm'
                : 'bg-white/[0.05] border border-white/[0.06] text-white/80 rounded-bl-sm'
            }`}>
              {m.content}
            </div>
            {m.role === 'user' && (
              <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                <User className="h-4 w-4 text-white/60" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="h-8 w-8 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0">
              <Bot className="h-4 w-4 text-amber-400" />
            </div>
            <div className="px-4 py-3 rounded-2xl bg-white/[0.05] border border-white/[0.06]">
              <Loader2 className="h-4 w-4 animate-spin text-white/40" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex gap-3">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="Ask about policies, leave, overtime, compliance..."
          className="flex-1 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-white/20 outline-none focus:ring-1 focus:ring-amber-500/50 transition"
        />
        <button onClick={() => send()} disabled={!input.trim() || loading}
          className="px-4 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black transition disabled:opacity-40">
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

function getLocalAnswer(q: string): string {
  const lower = q.toLowerCase()
  if (lower.includes('annual leave') || lower.includes('leave days'))
    return "Under the Ghana Labour Act (Act 651), employees are entitled to at least 15 working days of annual leave after 12 months of continuous employment. AMC policy provides additional leave based on seniority and role type."
  if (lower.includes('overtime'))
    return "The Ghana Labour Act requires overtime to be compensated at a minimum of 1.5× the normal rate for weekday overtime and 2× for work on rest days or public holidays. AMC tracks overtime automatically through the attendance system — any shift exceeding 9 hours flags for approval."
  if (lower.includes('hefra') || lower.includes('licensing'))
    return "HeFRA (Health Facilities Regulatory Agency Act, Act 829) requires AMC to maintain valid operating licenses, meet minimum staffing ratios, and submit to periodic inspections. All clinical staff must hold current professional registration."
  if (lower.includes('clock') || lower.includes('missed'))
    return "A missed clock-in is flagged automatically in the attendance system. The department head is notified and can apply a manual override with a reason. Repeated missed punches may trigger a deduction per the credit balance policy."
  if (lower.includes('locum'))
    return "Locum staff are tracked separately from permanent employees in the system. They are not entitled to annual leave accrual but must adhere to the same shift rules and clock-in requirements."
  return "I don't have a specific answer for that yet. For detailed policy questions, please refer to your HR department or the official resources in the Resources page. You can also connect this to the Claude AI API for full AI responses."
}
