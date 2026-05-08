import { useState, useEffect, useRef } from 'react'
import Header from './components/Header'
import AuthPage from './components/AuthPage'
import ToneSelector from './components/ToneSelector'
import EmailOutput from './components/EmailOutput'
import PromptHistory from './components/PromptHistory'
import { generateEmailStream, fetchModels, getMe } from './utils/api'
import styles from './App.module.css'

const EXAMPLES = [
  'Write a follow-up email after a job interview',
  'Request a salary raise from my manager',
  'Cold outreach for a SaaS product to potential clients',
  'Apologize for missing an important deadline',
  'Request a meeting with a senior executive',
  'Send a project status update to stakeholders',
]

const PROVIDER_COLORS = {
  openai: { bg: 'rgba(16,163,127,0.12)', color: '#10a37f', label: 'OpenAI' },
  groq:   { bg: 'rgba(249,115,22,0.12)', color: '#f97316', label: 'Groq'   },
}

export default function App() {
  const [user, setUser]               = useState(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [prompt, setPrompt]           = useState('')
  const [tone, setTone]               = useState('professional')
  const [model, setModel]             = useState('gpt-4o-mini')
  const [models, setModels]           = useState([])
  const [historyTrigger, setHistoryTrigger] = useState(0)
  const [error, setError]             = useState(null)

  const [subject, setSubject]     = useState('')
  const [body, setBody]           = useState('')
  const [loading, setLoading]     = useState(false)
  const [done, setDone]           = useState(false)
  const [updateKey, setUpdateKey] = useState(0)

  const abortRef = useRef(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      getMe().then(u => setUser(u))
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setAuthChecked(true))
    } else {
      setAuthChecked(true)
    }
  }, [])

  useEffect(() => {
    fetchModels().then(d => setModels(d.models || [])).catch(() => {})
  }, [])

  function clearOutput() {
    setSubject('')
    setBody('')
    setLoading(false)
    setDone(false)
    setUpdateKey(k => k + 1)
  }

  function handleLogout() {
    localStorage.removeItem('token')
    setUser(null)
    clearOutput()
    setPrompt('')
  }

  function handleAuth(u) {
    setUser(u)
    clearOutput()
    setPrompt('')
  }

  function handleGenerate() {
    if (!prompt.trim()) { setError('Please enter a prompt.'); return }
    if (abortRef.current) abortRef.current()
    setError(null)
    setSubject('')
    setBody('')
    setDone(false)
    setLoading(true)
    setUpdateKey(k => k + 1)

    abortRef.current = generateEmailStream({
      prompt, tone, model,
      onSubject:   s     => setSubject(s),
      onBodyChunk: chunk => setBody(prev => prev + chunk),
      onDone:      ()    => { setLoading(false); setDone(true) },
      onError:     msg   => { setError(msg); setLoading(false) },
    })
    setHistoryTrigger(t => t + 1)
  }

  function handleHistorySelect(item) {
    if (abortRef.current) { abortRef.current(); abortRef.current = null }
    setPrompt(item.prompt)
    setTone(item.tone)
    setError(null)
    setLoading(false)
    setDone(false)
    setSubject('')
    setBody('')
    setUpdateKey(0)
    setTimeout(() => {
      setSubject(item.subject || '')
      setBody(item.body || '')
      setDone(true)
      setUpdateKey(1)
    }, 50)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleGenerate()
  }

  const selectedModel = models.find(m => m.id === model)
  const providerInfo  = PROVIDER_COLORS[selectedModel?.provider] || null
  const grouped = models.reduce((acc, m) => {
    acc[m.provider] = acc[m.provider] || []
    acc[m.provider].push(m)
    return acc
  }, {})

  if (!authChecked) return null
  if (!user) return <AuthPage onAuth={handleAuth} />

  return (
    <div className={styles.app}>
      <Header user={user} onLogout={handleLogout} />
      <main className={styles.main}>
        <div className={styles.layout}>
          <div className={styles.inputPanel}>
            <section className={styles.section}>
              <label className={styles.sectionLabel}>What email do you need?</label>
              <textarea className={styles.textarea}
                placeholder="e.g. Write a follow-up email after an interview..."
                value={prompt}
                onChange={e => { setPrompt(e.target.value); setError(null) }}
                onKeyDown={handleKeyDown}
                rows={4}
              />
              <div className={styles.chips}>
                {EXAMPLES.map(ex => (
                  <button key={ex} className={styles.chip} onClick={() => setPrompt(ex)} type="button">{ex}</button>
                ))}
              </div>
            </section>

            <section className={styles.section}>
              <label className={styles.sectionLabel}>Tone</label>
              <ToneSelector selected={tone} onChange={setTone} />
            </section>

            <section className={styles.section}>
              <label className={styles.sectionLabel}>AI Model</label>
              <div className={styles.modelRow}>
                <select className={styles.select} value={model} onChange={e => setModel(e.target.value)}>
                  {Object.entries(grouped).map(([provider, ms]) => (
                    <optgroup key={provider} label={PROVIDER_COLORS[provider]?.label || provider}>
                      {ms.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                    </optgroup>
                  ))}
                </select>
                {providerInfo && (
                  <span className={styles.providerBadge} style={{ background: providerInfo.bg, color: providerInfo.color }}>
                    {providerInfo.label}
                  </span>
                )}
              </div>
            </section>

            {error && <div className={styles.errorBox}><span>⚠</span> {error}</div>}

            <button className={styles.generateBtn} onClick={handleGenerate} disabled={loading} type="button">
              {loading
                ? <><span className={styles.btnSpinner} /> Generating…</>
                : <>✉ Generate email <span className={styles.shortcut}>⌘↵</span></>
              }
            </button>

            <PromptHistory
              onSelect={handleHistorySelect}
              refreshTrigger={historyTrigger}
            />
          </div>

          <div className={styles.outputPanel}>
            <EmailOutput
              subject={subject}
              body={body}
              loading={loading}
              done={done}
              updateKey={updateKey}
            />
          </div>
        </div>
      </main>
    </div>
  )
}
