import styles from './ToneSelector.module.css'

const TONES = [
  { id: 'professional', label: 'Professional', icon: '💼', desc: 'Clear & business-ready' },
  { id: 'friendly',     label: 'Friendly',     icon: '😊', desc: 'Warm & approachable' },
  { id: 'formal',       label: 'Formal',       icon: '🏛️', desc: 'Structured & proper' },
  { id: 'casual',       label: 'Casual',       icon: '☕', desc: 'Relaxed & conversational' },
]

export default function ToneSelector({ selected, onChange }) {
  return (
    <div className={styles.grid}>
      {TONES.map(tone => (
        <button
          key={tone.id}
          className={`${styles.btn} ${selected === tone.id ? styles.active : ''}`}
          onClick={() => onChange(tone.id)}
          type="button"
          aria-pressed={selected === tone.id}
        >
          <span className={styles.icon}>{tone.icon}</span>
          <div className={styles.text}>
            <span className={styles.label}>{tone.label}</span>
            <span className={styles.desc}>{tone.desc}</span>
          </div>
        </button>
      ))}
    </div>
  )
}
