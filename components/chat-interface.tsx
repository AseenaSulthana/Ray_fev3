'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { RayMascot } from './ray-mascot'
import { Loader2, Send, ChevronDown, Upload, X, FileText, Image as ImageIcon, Search, Sparkles } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Role = 'employee' | 'admin' | 'executive'

// Voice states for the mic button
type VoiceState = 'idle' | 'listening' | 'transcribing'

interface UploadedFile {
  name: string
  type: string
  size: number
  dataUrl: string
}

interface Message {
  id: string
  type: 'user' | 'assistant'
  content?: string
  timestamp: Date
  answer?: string
  source?: string
  confidence?: number
  noData?: boolean
  files?: UploadedFile[]
  validated?: boolean
  metadata?: {
    processingTime: number
    keywords: string[]
  }
}

interface SerializedMessage {
  id: string
  type: 'user' | 'assistant'
  content?: string
  timestamp: string
  answer?: string
  source?: string
  confidence?: number
  noData?: boolean
}

interface ChatInterfaceProps {
  role: Role
  selectedSessionId?: string | null
}

type ApiChatResponse = {
  answer?: string
  source?: string
  confidence?: number | string
  raw?: unknown
}

type ApiRequestError = Error & {
  status?: number
}

type HistoryApiMessage = {
  id?: string
  type?: 'user' | 'assistant' | string
  content?: string
  answer?: string
  source?: string
  confidence?: number | string
  timestamp?: string
}

interface RecentChatItem {
  id: string
  sessionId: string
  role: Role
  title: string
  updatedAt: string
}

// ---------------------------------------------------------------------------
// Cookie helpers
// ---------------------------------------------------------------------------

const COOKIE_MAX_AGE = 60 * 60 * 24 * 7
const SESSION_COOKIE_KEY = 'ray_session_id'
const getHistoryCookieKey = (role: Role) => `ray_chat_history_v2_${role}`
const LEGACY_HISTORY_COOKIE_KEY = 'ray_chat_history'
const RECENT_CHATS_STORAGE_KEY = 'ray_recent_chats'

const setCookie = (name: string, value: string, maxAge = COOKIE_MAX_AGE) => {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; samesite=lax`
}

const getCookie = (name: string) => {
  const match = document.cookie
    .split('; ')
    .find((part) => part.startsWith(`${name}=`))
  return match ? decodeURIComponent(match.split('=').slice(1).join('=')) : null
}

// ---------------------------------------------------------------------------
// Message serialization
// ---------------------------------------------------------------------------

const serializeMessages = (messages: Message[]): SerializedMessage[] =>
  messages.slice(-8).map((msg) => ({ ...msg, timestamp: msg.timestamp.toISOString() }))

const deserializeMessages = (messages: SerializedMessage[]): Message[] =>
  messages.map((msg) => ({ ...msg, timestamp: new Date(msg.timestamp) }))

// ---------------------------------------------------------------------------
// Confidence helper
// ---------------------------------------------------------------------------

const toConfidencePercent = (value: unknown): number | undefined => {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim()
        ? Number(value.trim())
        : NaN
  if (!Number.isFinite(parsed)) return undefined
  return parsed <= 1 ? Math.round(parsed * 100) : Math.round(parsed)
}

// ---------------------------------------------------------------------------
// History response mapper
// ---------------------------------------------------------------------------

const mapHistoryMessages = (payload: unknown): Message[] => {
  if (!Array.isArray(payload)) return []

  return payload
    .map((raw, index): Message | null => {
      if (!raw || typeof raw !== 'object') return null
      const item = raw as HistoryApiMessage
      const type = item.type === 'assistant' ? 'assistant' : item.type === 'user' ? 'user' : null
      if (!type) return null

      const id =
        typeof item.id === 'string' && item.id.trim()
          ? item.id.trim()
          : `history-${Date.now()}-${index}`

      const timestamp =
        typeof item.timestamp === 'string' && item.timestamp.trim()
          ? new Date(item.timestamp)
          : new Date()

      if (type === 'user') {
        const content =
          typeof item.content === 'string' && item.content.trim()
            ? item.content
            : typeof item.answer === 'string'
              ? item.answer
              : ''
        return { id, type, content, timestamp }
      }

      const answer =
        typeof item.answer === 'string' && item.answer.trim()
          ? item.answer
          : typeof item.content === 'string'
            ? item.content
            : ''

      return {
        id,
        type,
        timestamp,
        answer,
        source: typeof item.source === 'string' && item.source.trim() ? item.source : undefined,
        confidence: toConfidencePercent(item.confidence),
        noData: !answer,
      }
    })
    .filter((msg): msg is Message => Boolean(msg))
}

// ---------------------------------------------------------------------------
// Session helpers
// ---------------------------------------------------------------------------

const generateSessionId = () => {
  const randomPart = Math.random().toString(36).slice(2, 8)
  return `session-${Date.now()}-${randomPart}`
}

// ---------------------------------------------------------------------------
// Recent chats helpers
// ---------------------------------------------------------------------------

const getRecentChats = (): RecentChatItem[] => {
  if (typeof window === 'undefined') return []
  const raw = localStorage.getItem(RECENT_CHATS_STORAGE_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as RecentChatItem[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const saveRecentChats = (recentChats: RecentChatItem[]) => {
  localStorage.setItem(RECENT_CHATS_STORAGE_KEY, JSON.stringify(recentChats.slice(0, 8)))
  window.dispatchEvent(new Event('ray_recent_chats_updated'))
}

const getChatTitle = (question: string) => {
  const trimmed = question.trim()
  if (!trimmed) return 'New Chat'
  return trimmed.length > 42 ? `${trimmed.slice(0, 42)}...` : trimmed
}

// ---------------------------------------------------------------------------
// Web Speech API type declarations
// ---------------------------------------------------------------------------

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
}

interface SpeechRecognitionInstance extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((e: SpeechRecognitionEvent) => void) | null
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null
  onstart: (() => void) | null
  onend: (() => void) | null
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ChatInterface({ role, selectedSessionId }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [chatInput, setChatInput] = useState('')
  const [sessionId, setSessionId] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorStatus, setErrorStatus] = useState<number | null>(null)
  const [lastPayload, setLastPayload] = useState<{
    chatInput: string
    sessionId: string
    role: Role
  } | null>(null)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [expandedMetadata, setExpandedMetadata] = useState<string | null>(null)
  const [isOcrLoading, setIsOcrLoading] = useState(false)
  const [ocrIngestStatus, setOcrIngestStatus] = useState<{
    filename: string
    chunksStored: number
    driveUrl: string
    textPreview: string
  } | null>(null)

  // ── Voice state ──────────────────────────────────────────────────────────
  const [voiceState, setVoiceState] = useState<VoiceState>('idle')
  const [voiceTranscript, setVoiceTranscript] = useState<string>('')
  const [voiceError, setVoiceError] = useState<string | null>(null)
  // Waveform animation bars (random heights, re-randomised each render tick)
  const [waveBars] = useState<number[]>([6, 12, 9, 16, 8, 14, 7, 11, 5, 13, 10, 7])
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const voiceSupportRef = useRef<boolean>(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatInputRef = useRef<HTMLTextAreaElement>(null)

  // ── Check browser support for Web Speech API ─────────────────────────────
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      voiceSupportRef.current = Boolean(SpeechRecognition)
    }
  }, [])

  // ── Auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // ── Load session from cookies ─────────────────────────────────────────────
  useEffect(() => {
    const savedSession = getCookie(SESSION_COOKIE_KEY)
    if (savedSession) setSessionId(savedSession)
  }, [])

  // ── Slash commands ────────────────────────────────────────────────────────
  const slashCommands: {
    command: string
    label: string
    Icon: React.ComponentType<{ className?: string }>
  }[] = [
    { command: '/search', label: '/search', Icon: Search },
    { command: '/create', label: '/create', Icon: Sparkles },
    { command: '/image', label: '/image', Icon: ImageIcon },
  ]

  const handleSlashChip = (command: string) => {
    const prefilled = `${command}`
    setChatInput((prev) => {
      if (!prev.trim()) return prefilled
      return prev.endsWith(' ') ? `${prev}${prefilled}` : `${prev} ${prefilled}`
    })
    setTimeout(() => chatInputRef.current?.focus(), 0)
  }

  // ── Role theme ────────────────────────────────────────────────────────────
  const roleTheme =
    role === 'executive'
      ? {
          icon: 'text-cyan-600',
          border: 'border-cyan-200',
          hover: 'hover:border-cyan-400',
          title: 'text-cyan-600',
          badge: 'bg-cyan-600 text-white',
        }
      : role === 'admin'
      ? {
          icon: 'text-cyan-600',
          border: 'border-cyan-200',
          hover: 'hover:border-cyan-400',
          title: 'text-cyan-600',
          badge: 'bg-cyan-600 text-white',
        }
      : {
          icon: 'text-cyan-600',
          border: 'border-border',
          hover: 'hover:border-cyan-400',
          title: 'text-cyan-600',
          badge: 'bg-cyan-600 text-white',
        }

  const suggestionBtn = `p-4 rounded-lg bg-card border ${roleTheme.border} ${roleTheme.hover} hover:shadow-md transition-all cursor-pointer text-left`

  // ── File upload handlers ──────────────────────────────────────────────────

  const handleFiles = async (files: FileList) => {
    const newFiles: UploadedFile[] = []
    for (let i = 0; i < Math.min(files.length, 5); i++) {
      const file = files[i]
      const reader = new FileReader()
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string
        newFiles.push({ name: file.name, type: file.type, size: file.size, dataUrl })
        if (newFiles.length === Math.min(files.length, 5)) {
          setUploadedFiles((prev) => [...prev, ...newFiles])
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true)
    else if (e.type === 'dragleave') setDragActive(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files) handleFiles(e.dataTransfer.files)
  }

  const handleRemoveFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  // ── Voice handlers ────────────────────────────────────────────────────────

  const startListening = useCallback(() => {
    if (!voiceSupportRef.current) {
      setVoiceError('Voice input is not supported in your browser. Try Chrome or Edge.')
      return
    }

    setVoiceError(null)
    setVoiceTranscript('')

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    const recognition: SpeechRecognitionInstance = new SpeechRecognition()
    recognition.lang = 'en-IN' // Indian English — adjust as needed
    recognition.continuous = false
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      setVoiceState('listening')
    }

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = e.results[0][0].transcript
      setVoiceState('transcribing')
      // Small delay to show transcribing state before populating
      setTimeout(() => {
        setVoiceTranscript(transcript)
        setVoiceState('idle')
        // Auto-populate the chat input
        setChatInput(transcript)
        setTimeout(() => chatInputRef.current?.focus(), 0)
      }, 600)
    }

    recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
      setVoiceState('idle')
      if (e.error === 'not-allowed') {
        setVoiceError('Microphone access denied. Please allow microphone permissions.')
      } else if (e.error === 'no-speech') {
        setVoiceError('No speech detected. Please try again.')
      } else {
        setVoiceError('Voice input failed. Please try again.')
      }
    }

    recognition.onend = () => {
      // Only reset to idle if not already in transcribing state
      setVoiceState((prev) => (prev === 'listening' ? 'idle' : prev))
    }

    recognitionRef.current = recognition
    recognition.start()
  }, [])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    setVoiceState('idle')
  }, [])

  const handleMicClick = () => {
    if (voiceState === 'listening') {
      stopListening()
    } else if (voiceState === 'idle') {
      startListening()
    }
    // Do nothing if transcribing — let it finish
  }

  const handleVoiceRedo = () => {
    setChatInput('')
    setVoiceTranscript('')
    startListening()
  }

  // ── API helpers ───────────────────────────────────────────────────────────

  const runRequest = async (payload: { chatInput: string; sessionId: string; role: Role }): Promise<ApiChatResponse> => {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const contentType = response.headers.get('content-type') || ''
    const details = contentType.includes('application/json')
      ? await response.json().catch(() => null)
      : await response.text().catch(() => '')

    if (!response.ok) {
      const message =
        typeof details === 'string'
          ? details
          : details?.error || details?.details || 'Request failed.'
      throw { status: response.status, message }
    }

    return (details || {}) as ApiChatResponse
  }

  const parseAssistantMessage = (data: ApiChatResponse): Message => {
    const answer = typeof data?.answer === 'string' ? data.answer : ''
    return {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: 'assistant',
      timestamp: new Date(),
      answer,
      source: typeof data?.source === 'string' && data.source.trim() ? data.source : undefined,
      confidence: toConfidencePercent(data?.confidence),
      noData: !answer,
    }
  }

  // ── Submit handlers ───────────────────────────────────────────────────────

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    void handleSend()
  }

  // ── OCR ingest helper ────────────────────────────────────────────────────
  // Sends each image through the full pipeline:
  //   OCR → .txt → Google Drive → RAG chunk + embed
  // Returns a combined summary string shown to the user.
  const runOcrIngest = async (files: UploadedFile[]): Promise<{
    summary: string
    succeeded: number
    failed: number
  }> => {
    const imageFiles = files.filter((f) => f.type.startsWith('image/'))
    if (imageFiles.length === 0) return { summary: '', succeeded: 0, failed: 0 }

    let succeeded = 0
    let failed = 0
    const previews: string[] = []

    for (const img of imageFiles) {
      try {
        const res = await fetch('/api/ocr/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageData: img.dataUrl,
            mimeType: img.type,
            filename: img.name,
            role,   // admin | executive | employee — routes to correct Drive folder
          }),
        })
        const data = await res.json()

        if (data.success) {
          succeeded++
          setOcrIngestStatus({
            filename: data.txtFilename ?? img.name,
            chunksStored: data.chunksStored ?? 0,
            driveUrl: data.driveUrl ?? '',
            textPreview: data.textPreview ?? '',
          })
          previews.push(
            `✅ **${img.name}** → indexed (${data.chunksStored ?? 0} chunks)`
          )
        } else {
          failed++
          console.warn('OCR ingest failed for', img.name, data.error)
          previews.push(`⚠️ **${img.name}** → OCR failed: ${data.error ?? 'unknown error'}`)
        }
      } catch (err) {
        failed++
        console.warn('OCR ingest error for', img.name, err)
        previews.push(`⚠️ **${img.name}** → could not process`)
      }
    }

    return { summary: previews.join('\n'), succeeded, failed }
  }

  const handleSend = async () => {
    if (isLoading) return

    const normalizedQuestion = chatInput.trim()
    if (!normalizedQuestion && uploadedFiles.length === 0) {
      setError('Please enter your question.')
      setErrorStatus(400)
      return
    }

    const normalizedSession = sessionId.trim() || generateSessionId()
    if (!sessionId.trim()) {
      setSessionId(normalizedSession)
      setCookie(SESSION_COOKIE_KEY, normalizedSession)
    }

    setError(null)
    setErrorStatus(null)
    setVoiceTranscript('')

    // ── OCR ingest pass ──────────────────────────────────────────────────
    // Images go through: OCR → .txt → Drive → RAG chunk+embed.
    // After ingest the question is sent to RAG which will find the content.
    const filesToProcess = [...uploadedFiles]
    const hasImages = filesToProcess.some((f) => f.type.startsWith('image/'))
    setOcrIngestStatus(null)

    if (hasImages) {
      setIsOcrLoading(true)
      try {
        await runOcrIngest(filesToProcess)
      } catch (err) {
        console.warn('OCR ingest failed:', err)
      } finally {
        setIsOcrLoading(false)
      }
    }

    const payload = { chatInput: normalizedQuestion, sessionId: normalizedSession, role }
    setLastPayload(payload)

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      type: 'user',
      content: normalizedQuestion,
      timestamp: new Date(),
      files: uploadedFiles.length > 0 ? uploadedFiles : undefined,
    }

    setMessages((prev) => [...prev, userMessage])
    setChatInput('')
    setUploadedFiles([])
    setIsLoading(true)

    try {
      const data = await runRequest(payload)
      const assistantMessage = parseAssistantMessage(data)
      setMessages((prev) => [...prev, assistantMessage])

      const recentChats = getRecentChats()
      const existingIndex = recentChats.findIndex(
        (item) => item.sessionId === normalizedSession && item.role === role,
      )
      const chatItem: RecentChatItem = {
        id: existingIndex >= 0 ? recentChats[existingIndex].id : `recent-${Date.now()}`,
        sessionId: normalizedSession,
        role,
        title: getChatTitle(normalizedQuestion),
        updatedAt: new Date().toISOString(),
      }

      const updatedRecentChats =
        existingIndex >= 0
          ? [chatItem, ...recentChats.filter((item) => item.sessionId !== normalizedSession || item.role !== role)]
          : [chatItem, ...recentChats]

      saveRecentChats(updatedRecentChats)
    } catch (err: unknown) {
      const parsedError = err as ApiRequestError
      const message = parsedError?.message || 'Failed to get response from the server.'
      const status = parsedError?.status || 500
      if (status >= 500 || !parsedError?.status) console.error('Error sending message:', err)
      setError(message)
      setErrorStatus(status)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRetry = async () => {
    if (!lastPayload || isLoading) return
    setError(null)
    setErrorStatus(null)
    setIsLoading(true)
    try {
      const data = await runRequest(lastPayload)
      const assistantMessage = parseAssistantMessage(data)
      setMessages((prev) => [...prev, assistantMessage])
    } catch (err: unknown) {
      const parsedError = err as { status?: number; message?: string }
      setError(parsedError.message || 'Failed to get response from the server.')
      setErrorStatus(parsedError.status || 500)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRunAgain = () => {
    setMessages([])
    setChatInput('')
    setUploadedFiles([])
    setVoiceTranscript('')
    const newSession = generateSessionId()
    setSessionId(newSession)
    setCookie(SESSION_COOKIE_KEY, newSession)
    setCookie(getHistoryCookieKey(role), '', 0)
    setError(null)
    setErrorStatus(null)
    setLastPayload(null)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const containerClass = `flex-1 flex flex-col h-full ${role === 'executive' ? 'bg-[#faf9fb]' : 'bg-background'}`

  // Mic button appearance based on voiceState
  const micButtonClass =
    voiceState === 'listening'
      ? 'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-500 text-white transition hover:bg-red-600 relative'
      : voiceState === 'transcribing'
      ? 'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600 transition cursor-not-allowed'
      : 'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700'

  return (
    <div className={containerClass}>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 w-full">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6 py-8">
            <RayMascot size="xl" role={role} className="mb-6" />
            <h2 className="text-3xl font-bold text-foreground mb-3">
              <span className={roleTheme.title}>Hey!</span> I am Ray :)
            </h2>
            <p className="text-muted-foreground max-w-lg mb-8 leading-relaxed">
              {role === 'executive'
                ? 'Your AI executive assistant for insights, analysis, and strategic intelligence. Ask me anything about your organization, performance, risks, or knowledge base.'
                : role === 'admin'
                ? "I'm your AI assistant for managing your organization. Ask me anything about users, tickets, systems, reports, or settings."
                : "I'm your AI assistant for support and information. Ask me anything about your work, tickets, or organization."}
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full max-w-3xl">
              {role === 'executive' && (
                <>
                  <button className={suggestionBtn}>
                    <div className={`${roleTheme.icon} text-2xl mb-2`}>📈</div>
                    <h3 className="font-semibold text-sm text-foreground mb-1">Executive Overview</h3>
                    <p className="text-xs text-muted-foreground">Show me the executive overview for this month</p>
                  </button>
                  <button className={suggestionBtn}>
                    <div className={`${roleTheme.icon} text-2xl mb-2`}>🛡️</div>
                    <h3 className="font-semibold text-sm text-foreground mb-1">Top Risks</h3>
                    <p className="text-xs text-muted-foreground">What are the top risks that need attention?</p>
                  </button>
                  <button className={suggestionBtn}>
                    <div className={`${roleTheme.icon} text-2xl mb-2`}>👥</div>
                    <h3 className="font-semibold text-sm text-foreground mb-1">Performance Trends</h3>
                    <p className="text-xs text-muted-foreground">Compare department performance trends</p>
                  </button>
                  <button className={suggestionBtn}>
                    <div className={`${roleTheme.icon} text-2xl mb-2`}>📋</div>
                    <h3 className="font-semibold text-sm text-foreground mb-1">Highlights</h3>
                    <p className="text-xs text-muted-foreground">Summarize recent operational highlights</p>
                  </button>
                </>
              )}
              {role === 'admin' && (
                <>
                  <button className={suggestionBtn}>
                    <div className={`${roleTheme.icon} text-2xl mb-2`}>📊</div>
                    <h3 className="font-semibold text-sm text-foreground mb-1">System Insights</h3>
                    <p className="text-xs text-muted-foreground">Get real-time insights and performance overview</p>
                  </button>
                  <button className={suggestionBtn}>
                    <div className={`${roleTheme.icon} text-2xl mb-2`}>📋</div>
                    <h3 className="font-semibold text-sm text-foreground mb-1">User & Access</h3>
                    <p className="text-xs text-muted-foreground">Manage users, roles, permissions and access</p>
                  </button>
                  <button className={suggestionBtn}>
                    <div className={`${roleTheme.icon} text-2xl mb-2`}>🛡️</div>
                    <h3 className="font-semibold text-sm text-foreground mb-1">Alerts & Risks</h3>
                    <p className="text-xs text-muted-foreground">Monitor risks, alerts and system anomalies</p>
                  </button>
                  <button className={suggestionBtn}>
                    <div className={`${roleTheme.icon} text-2xl mb-2`}>⚙️</div>
                    <h3 className="font-semibold text-sm text-foreground mb-1">Automation</h3>
                    <p className="text-xs text-muted-foreground">Configure workflows and automation rules</p>
                  </button>
                </>
              )}
              {role === 'employee' && (
                <>
                  <button className={suggestionBtn}>
                    <div className={`${roleTheme.icon} text-2xl mb-2`}>🎫</div>
                    <h3 className="font-semibold text-sm text-foreground mb-1">My Tickets</h3>
                    <p className="text-xs text-muted-foreground">View and manage my support tickets</p>
                  </button>
                  <button className={suggestionBtn}>
                    <div className={`${roleTheme.icon} text-2xl mb-2`}>📚</div>
                    <h3 className="font-semibold text-sm text-foreground mb-1">Knowledge Base</h3>
                    <p className="text-xs text-muted-foreground">Search documentation and resources</p>
                  </button>
                  <button className={suggestionBtn}>
                    <div className={`${roleTheme.icon} text-2xl mb-2`}>👤</div>
                    <h3 className="font-semibold text-sm text-foreground mb-1">Profile</h3>
                    <p className="text-xs text-muted-foreground">Manage my profile and preferences</p>
                  </button>
                  <button className={suggestionBtn}>
                    <div className={`${roleTheme.icon} text-2xl mb-2`}>❓</div>
                    <h3 className="font-semibold text-sm text-foreground mb-1">Help</h3>
                    <p className="text-xs text-muted-foreground">Get help and support resources</p>
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.type === 'assistant' && (
                <RayMascot size="sm" role={role} className="mr-3 flex-shrink-0" />
              )}
              <Card
                className={`${
                  message.type === 'user'
                    ? 'max-w-md bg-primary text-primary-foreground rounded-3xl rounded-tr-sm'
                    : 'max-w-[85%] md:max-w-3xl bg-card border shadow-sm rounded-3xl rounded-tl-sm'
                }`}
              >
                <div className="p-4">
                  {message.type === 'user' && (
                    <>
                      <p className="text-sm leading-relaxed">{message.content}</p>
                      {message.files && message.files.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-white/20 space-y-2">
                          <div className="text-xs font-semibold opacity-70 mb-2">Attached Files</div>
                          <div className="space-y-2">
                            {message.files.map((file, idx) => (
                              <div key={idx} className="flex items-center gap-2 p-2 rounded bg-white/10">
                                {file.type.startsWith('image/') ? (
                                  <img src={file.dataUrl} alt={file.name} className="h-8 w-8 rounded object-cover" />
                                ) : (
                                  <FileText className="h-4 w-4 opacity-70 flex-shrink-0" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <span className="text-xs truncate block">{file.name}</span>
                                  <span className="text-xs opacity-60">{(file.size / 1024).toFixed(1)} KB</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {message.type === 'assistant' && (
                    <div className="space-y-2">
                      <div className="text-sm leading-relaxed font-medium prose prose-sm max-w-none dark:prose-invert">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {message.answer || ''}
                        </ReactMarkdown>
                      </div>
                      {message.source && (
                        <p className="text-xs text-muted-foreground pt-2 border-t border-border">
                          Source: {message.source}
                        </p>
                      )}
                      {typeof message.confidence === 'number' && Number.isFinite(message.confidence) && (
                        <div className="pt-2 border-t border-border">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-muted-foreground">Confidence</span>
                            <span className="font-semibold text-primary">{message.confidence}%</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-1.5">
                            <div
                              className="bg-primary h-full rounded-full transition-all"
                              style={{ width: `${message.confidence}%` }}
                            />
                          </div>
                        </div>
                      )}
                      {message.metadata && (
                        <>
                          <button
                            onClick={() =>
                              setExpandedMetadata(expandedMetadata === message.id ? null : message.id)
                            }
                            className="pt-2 border-t border-border flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground w-full justify-between"
                          >
                            <span>Processing Details</span>
                            <ChevronDown
                              className={`h-3 w-3 transition-transform ${
                                expandedMetadata === message.id ? 'rotate-180' : ''
                              }`}
                            />
                          </button>
                          {expandedMetadata === message.id && (
                            <div className="text-xs text-muted-foreground space-y-1">
                              <div>⏱ Processing: {message.metadata.processingTime}ms</div>
                              <div>🔑 Keywords: {message.metadata.keywords.join(', ')}</div>
                            </div>
                          )}
                        </>
                      )}
                      {message.validated && (
                        <div className="pt-2 border-t border-border">
                          <span className="inline-flex items-center gap-1 text-xs text-primary font-semibold">
                            ✓ Validated
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            </div>
          ))
        )}

        {error && (
          <div className="flex justify-start">
            <Card className="max-w-md bg-destructive/5 border-destructive/30 shadow-sm rounded-3xl rounded-tl-sm p-4">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-destructive">Request failed</p>
                <p className="text-sm text-foreground">{error}</p>
                {errorStatus && (
                  <p className="text-xs text-muted-foreground">Status: {errorStatus}</p>
                )}
                <Button size="sm" variant="outline" onClick={handleRetry} disabled={isLoading || !lastPayload}>
                  Retry
                </Button>
              </div>
            </Card>
          </div>
        )}

        {isOcrLoading && (
          <div className="flex justify-start items-center gap-3">
            <RayMascot size="sm" role={role} className="flex-shrink-0" />
            <Card className="bg-card border shadow-sm rounded-3xl rounded-tl-sm p-4">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-cyan-500" />
                <span className="text-sm text-muted-foreground">
                  Reading image → uploading to Drive → indexing…
                </span>
              </div>
            </Card>
          </div>
        )}

        {ocrIngestStatus && !isOcrLoading && (
          <div className="flex justify-start items-center gap-3">
            <RayMascot size="sm" role={role} className="flex-shrink-0" />
            <Card className="max-w-md bg-cyan-50 border border-cyan-200 shadow-sm rounded-3xl rounded-tl-sm p-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-cyan-600 text-sm font-semibold">
                    ✅ Image indexed into knowledge base
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  <span className="font-medium">File:</span> {ocrIngestStatus.filename}
                </p>
                <p className="text-xs text-slate-600">
                  <span className="font-medium">Chunks stored:</span> {ocrIngestStatus.chunksStored}
                </p>
                {ocrIngestStatus.textPreview && (
                  <p className="text-xs text-slate-500 italic border-t border-cyan-100 pt-2 line-clamp-3">
                    "{ocrIngestStatus.textPreview}…"
                  </p>
                )}
                {ocrIngestStatus.driveUrl && (
                  <a
                    href={ocrIngestStatus.driveUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-cyan-600 underline"
                  >
                    View in Drive →
                  </a>
                )}
                <p className="text-xs text-slate-400 pt-1">
                  You can now ask questions about this image.
                </p>
              </div>
            </Card>
          </div>
        )}

        {isLoading && (
          <div className="flex justify-start items-center gap-3">
            <RayMascot
              size="sm"
              role={role}
              className="flex-shrink-0"
              imageSrc={
                role === 'admin'
                  ? '/ray-admin1.png'
                  : role === 'executive'
                  ? '/ray-executive1.png'
                  : undefined
              }
            />
            <Card className="bg-card border shadow-sm rounded-3xl rounded-tl-sm p-4">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">
                  {role === 'executive'
                    ? 'Capt RAY is thinking...'
                    : role === 'admin'
                    ? 'Admin RAY is thinking...'
                    : 'RAY is thinking...'}
                </span>
              </div>
            </Card>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input Area ── */}
      <div className="border-t border-cyan-200 bg-cyan-200 px-6 py-5">

        {/* File previews */}
        {uploadedFiles.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {uploadedFiles.map((file, index) => (
              <div
                key={index}
                className="inline-flex items-center gap-2 rounded-xl border border-cyan-200 bg-white px-3 py-2 shadow-sm"
              >
                {file.type.startsWith('image/') ? (
                  <ImageIcon className="h-4 w-4 text-cyan-500" />
                ) : (
                  <FileText className="h-4 w-4 text-cyan-500" />
                )}
                <span className="max-w-[120px] truncate text-xs text-slate-700">{file.name}</span>
                <button onClick={() => handleRemoveFile(index)} className="text-slate-400 hover:text-slate-700">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Active slash-command chips */}
        {(chatInput.includes('/search') || chatInput.includes('/create') || chatInput.includes('/image')) && (
          <div className="mb-3 flex flex-wrap gap-2">
            {chatInput.includes('/create') && (
              <span className="inline-flex items-center gap-2 rounded-full bg-cyan-500 px-4 py-1.5 text-sm font-medium text-white shadow-sm">
                Create a Ticket
                <button
                  type="button"
                  onClick={() => setChatInput((prev) => prev.replace(/\*?\/create\*?\s?/g, '').trim())}
                  className="text-white/90 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            )}
            {chatInput.includes('/search') && (
              <span className="inline-flex items-center gap-2 rounded-full bg-cyan-500 px-4 py-1.5 text-sm font-medium text-white shadow-sm">
                Search Knowledge
                <button
                  type="button"
                  onClick={() => setChatInput((prev) => prev.replace(/\*?\/search\*?\s?/g, '').trim())}
                  className="text-white/90 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            )}
            {chatInput.includes('/image') && (
              <span className="inline-flex items-center gap-2 rounded-full bg-cyan-500 px-4 py-1.5 text-sm font-medium text-white shadow-sm">
                Generate Image
                <button
                  type="button"
                  onClick={() => setChatInput((prev) => prev.replace(/\*?\/image\*?\s?/g, '').trim())}
                  className="text-white/90 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            )}
          </div>
        )}

        {/* ── Voice status banners ── */}
        {voiceState === 'listening' && (
          <div className="mb-3 flex items-center gap-3 rounded-2xl bg-red-50 border border-red-200 px-4 py-2.5">
            {/* Waveform bars */}
            <div className="flex items-center gap-[3px] h-5">
              {waveBars.map((h, i) => (
                <div
                  key={i}
                  className="w-[3px] rounded-full bg-red-400"
                  style={{
                    height: `${h}px`,
                    animation: `voiceBar 0.8s ease-in-out ${i * 0.07}s infinite alternate`,
                  }}
                />
              ))}
            </div>
            <span className="text-sm text-red-600 font-medium flex-1">Listening… speak now</span>
            <button
              type="button"
              onClick={stopListening}
              className="text-xs text-red-500 hover:text-red-700 border border-red-200 rounded-full px-3 py-1 bg-white"
            >
              Stop
            </button>
          </div>
        )}

        {voiceState === 'transcribing' && (
          <div className="mb-3 flex items-center gap-3 rounded-2xl bg-violet-50 border border-violet-200 px-4 py-2.5">
            <Loader2 className="h-4 w-4 animate-spin text-violet-500 flex-shrink-0" />
            <span className="text-sm text-violet-600 font-medium">Converting voice to text…</span>
          </div>
        )}

        {/* Voice transcript confirm bar — shows after transcription */}
        {voiceState === 'idle' && voiceTranscript && chatInput === voiceTranscript && (
          <div className="mb-3 flex items-center gap-3 rounded-2xl bg-teal-50 border border-teal-300 px-4 py-2.5">
            <svg className="h-4 w-4 text-teal-500 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span className="text-sm text-teal-700 flex-1 truncate">"{voiceTranscript}"</span>
            <button
              type="button"
              onClick={handleVoiceRedo}
              className="text-xs text-slate-500 hover:text-slate-700 border border-slate-200 rounded-full px-3 py-1 bg-white flex-shrink-0"
            >
              Redo
            </button>
          </div>
        )}

        {/* Voice error */}
        {voiceError && (
          <div className="mb-3 flex items-center gap-2 rounded-2xl bg-red-50 border border-red-200 px-4 py-2.5">
            <span className="text-sm text-red-600">{voiceError}</span>
            <button
              type="button"
              onClick={() => setVoiceError(null)}
              className="ml-auto text-red-400 hover:text-red-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* The white input pill */}
        <form
          onSubmit={handleSubmit}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`
            relative flex items-center gap-3
            rounded-full bg-white
            border
            pl-2 pr-2 py-2
            shadow-[0_2px_10px_rgba(0,0,0,0.04)]
            transition-all duration-200
            ${voiceState === 'listening' ? 'border-red-300 ring-2 ring-red-100' : ''}
            ${voiceState === 'transcribing' ? 'border-violet-300' : ''}
            ${voiceState === 'idle' && voiceTranscript && chatInput === voiceTranscript ? 'border-teal-400' : ''}
            ${voiceState === 'idle' && !voiceTranscript ? 'border-slate-200' : ''}
            ${dragActive ? 'ring-2 ring-cyan-400 border-cyan-300' : ''}
          `}
        >
          {/* Upload button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-cyan-500 text-white transition hover:bg-cyan-600"
            aria-label="Upload file"
          >
            <Upload className="h-4 w-4" />
          </button>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.txt,.csv,.xlsx,.jpg,.jpeg,.png,.gif"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
            className="hidden"
          />

          {/* Textarea */}
          <textarea
            ref={chatInputRef as React.RefObject<HTMLTextAreaElement>}
            value={chatInput}
            onChange={(e) => {
              setChatInput(e.target.value)
              // Clear voice transcript ref if user edits manually
              if (voiceTranscript && e.target.value !== voiceTranscript) {
                setVoiceTranscript('')
              }
            }}
            placeholder={
              voiceState === 'listening'
                ? 'Listening…'
                : voiceState === 'transcribing'
                ? 'Converting speech to text…'
                : 'How can I help you today?'
            }
            disabled={isLoading || voiceState === 'transcribing'}
            rows={1}
            className="
              flex-1
              resize-none
              border-0
              bg-transparent
              py-2
              text-[15px]
              text-slate-800
              placeholder:text-slate-400
              focus:outline-none
              focus:ring-0
              leading-6
              max-h-32
            "
          />

          {/* Mic button — wired up */}
          <button
            type="button"
            onClick={handleMicClick}
            disabled={voiceState === 'transcribing' || isLoading}
            className={micButtonClass}
            aria-label={voiceState === 'listening' ? 'Stop recording' : 'Start voice input'}
            title={
              !voiceSupportRef.current
                ? 'Voice input not supported in this browser'
                : voiceState === 'listening'
                ? 'Click to stop recording'
                : 'Click to speak'
            }
          >
            {voiceState === 'listening' ? (
              /* Stop square icon */
              <span className="block w-3.5 h-3.5 rounded-sm bg-white" />
            ) : voiceState === 'transcribing' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              /* Mic icon */
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="9" y="2" width="6" height="12" rx="3" />
                <path d="M5 10v2a7 7 0 0 0 14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="22" />
              </svg>
            )}

            {/* Pulsing ring while listening */}
            {voiceState === 'listening' && (
              <span
                className="absolute inset-0 rounded-full border-2 border-red-300 animate-ping"
                style={{ animationDuration: '1.2s' }}
              />
            )}
          </button>

          {/* Send button */}
          <button
            type="submit"
            disabled={isLoading || (!chatInput.trim() && uploadedFiles.length === 0)}
            className="
              flex h-10 w-10 flex-shrink-0 items-center justify-center
              rounded-full bg-cyan-500 text-white
              transition hover:bg-cyan-600
              disabled:opacity-50 disabled:cursor-not-allowed
            "
            aria-label="Send message"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4 -translate-x-px" />
            )}
          </button>
        </form>

        {/* Bottom row — slash commands + Run again */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          {slashCommands.map(({ command, label, Icon }) => {
            const active = chatInput.includes(command)
            return (
              <button
                key={command}
                type="button"
                onClick={() => handleSlashChip(command)}
                disabled={isLoading}
                className={`
                  inline-flex items-center gap-2
                  rounded-full border
                  px-5 py-2
                  text-sm transition-all duration-200
                  ${
                    active
                      ? 'border-cyan-400 bg-white text-cyan-600 font-semibold shadow-sm'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  }
                `}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </button>
            )
          })}

          {/* Run again */}
          <button
            type="button"
            onClick={handleRunAgain}
            disabled={isLoading}
            className="
              inline-flex items-center gap-2
              rounded-full border border-slate-200 bg-white
              px-5 py-2
              text-sm text-slate-700
              transition-all duration-200
              hover:border-slate-300 hover:bg-slate-50
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 12a9 9 0 1 0 3-6.7" />
              <polyline points="3 4 3 10 9 10" />
            </svg>
            <span>Run again</span>
          </button>
        </div>

        {/* Inline keyframe for waveform animation */}
        <style>{`
          @keyframes voiceBar {
            from { transform: scaleY(0.4); }
            to   { transform: scaleY(1.2); }
          }
        `}</style>
      </div>
    </div>
  )
}
