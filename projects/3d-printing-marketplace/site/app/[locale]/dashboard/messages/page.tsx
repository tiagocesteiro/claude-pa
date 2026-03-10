'use client'
import { useEffect, useState, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Send } from 'lucide-react'

export default function MessagesPage() {
  const pathname = usePathname()
  const [conversations, setConversations] = useState<any[]>([])
  const [messages, setMessages] = useState<any[]>([])
  const [activeConv, setActiveConv] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      if (data.user) {
        supabase.from('conversations')
          .select('*, buyer:profiles!buyer_id(display_name), maker:profiles!maker_id(display_name), order:orders(id)')
          .or(`buyer_id.eq.${data.user.id},maker_id.eq.${data.user.id}`)
          .order('created_at', { ascending: false })
          .then(({ data: c }) => {
            setConversations(c ?? [])
            if (c && c.length > 0) setActiveConv(c[0])
          })
      }
    })
  }, [])

  useEffect(() => {
    if (!activeConv) return
    const supabase = createClient()
    supabase.from('messages').select('*, sender:profiles(display_name)')
      .eq('conversation_id', activeConv.id)
      .order('created_at', { ascending: true })
      .then(({ data }) => setMessages(data ?? []))

    const channel = supabase.channel(`conv:${activeConv.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${activeConv.id}` },
        (payload) => setMessages(m => [...m, payload.new]))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [activeConv])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const send = async () => {
    if (!input.trim() || !user || !activeConv) return
    const supabase = createClient()
    await supabase.from('messages').insert({ conversation_id: activeConv.id, sender_id: user.id, content: input.trim() })
    setInput('')
  }

  const otherName = (conv: any) => {
    if (!user) return ''
    return conv.buyer_id === user.id ? conv.maker?.display_name : conv.buyer?.display_name
  }

  if (!conversations.length) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Messages</h1>
        <p className="text-[var(--muted)] text-sm py-12 text-center">No conversations yet.</p>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Messages</h1>
      <div className="border border-[var(--border)] rounded-[var(--radius)] overflow-hidden flex h-[500px]">
        {/* Sidebar */}
        <div className="w-48 border-r border-[var(--border)] flex flex-col overflow-y-auto">
          {conversations.map(conv => (
            <button key={conv.id} onClick={() => setActiveConv(conv)}
              className={`text-left px-3 py-3 text-sm border-b border-[var(--border)] last:border-0 hover:bg-[var(--border)] transition-colors ${activeConv?.id === conv.id ? 'bg-[var(--border)]' : ''}`}>
              <p className="font-medium truncate">{otherName(conv)}</p>
              {conv.order && <p className="text-xs text-[var(--muted)]">re: order</p>}
            </button>
          ))}
        </div>

        {/* Chat */}
        {activeConv && (
          <div className="flex-1 flex flex-col">
            <div className="px-4 py-3 border-b border-[var(--border)] text-sm font-semibold">{otherName(activeConv)}</div>
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
              {messages.map(msg => {
                const mine = msg.sender_id === user?.id
                return (
                  <div key={msg.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] px-3 py-2 rounded-lg text-sm ${mine ? 'bg-[var(--fg)] text-white' : 'bg-[var(--border)] text-[var(--fg)]'}`}>
                      {msg.content}
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>
            <div className="p-3 border-t border-[var(--border)] flex gap-2">
              <input value={input} onChange={e => setInput(e.target.value)} placeholder="Type a message..."
                onKeyDown={e => e.key === 'Enter' && send()}
                className="flex-1 border border-[var(--border)] rounded-[var(--radius)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" />
              <button onClick={send} className="bg-[var(--fg)] text-white px-3 py-2 rounded-[var(--radius)] hover:bg-[var(--accent)] transition-colors">
                <Send size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
