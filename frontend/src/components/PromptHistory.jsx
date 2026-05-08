import { useEffect, useState } from 'react'
import { fetchHistory, clearHistory } from '../utils/api'
import styles from './PromptHistory.module.css'

const DOT_COLORS = ['#4f8ef7','#4ade80','#a78bfa','#fbbf24','#f87171','#34d399']

export default function PromptHistory({ onSelect, refreshTrigger }) {
  const [history, setHistory] = useState([])

  useEffect(() => { load() }, [refreshTrigger])

  async function load() {
    try {
      const data = await fetchHistory()
      setHistory(data)
    } catch {}
  }

  async function handleClear() {
    try { await clearHistory(); setHistory([]) } catch {}
  }

  if (history.length === 0) return null

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <span className={styles.title}>Recent prompts</span>
        <button className={styles.clearBtn} onClick={handleClear}>Clear</button>
      </div>
      <div className={styles.list}>
        {history.slice(0, 6).map((item, i) => (
          <div
            key={item.id}
            className={styles.item}
            onClick={() => onSelect(item)}
          >
            <span className={styles.dot} style={{ background: DOT_COLORS[i % DOT_COLORS.length] }} />
            <div className={styles.itemContent}>
              <span className={styles.prompt}>
                {item.prompt.length > 55 ? item.prompt.slice(0, 55) + '…' : item.prompt}
              </span>
              {item.subject && (
                <span className={styles.subject}>
                  📧 {item.subject.length > 45 ? item.subject.slice(0, 45) + '…' : item.subject}
                </span>
              )}
            </div>
            <span className={styles.tone}>{item.tone}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
