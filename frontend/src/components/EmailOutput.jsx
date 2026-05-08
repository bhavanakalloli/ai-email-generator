import { useRef, useEffect, useState } from 'react'
import styles from './EmailOutput.module.css'

export default function EmailOutput({ subject, body, loading, done, updateKey }) {
  const editorRef = useRef(null)
  const [copied, setCopied] = useState(false)
  const isEmpty = !loading && !body

  // Every time updateKey or body changes, directly set innerHTML
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = body
        ? body.split('\n').map(line =>
            line.trim() === '' ? '<p><br></p>' : `<p>${line}</p>`
          ).join('')
        : ''
    }
  }, [updateKey, body])

  function getPlainText() {
    if (!editorRef.current) return ''
    return editorRef.current.innerText || ''
  }

  async function handleCopy() {
    const plain = `Subject: ${subject}\n\n${getPlainText()}`
    try { await navigator.clipboard.writeText(plain) } catch {
      const el = document.createElement('textarea')
      el.value = plain; document.body.appendChild(el)
      el.select(); document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function execCmd(cmd, val = null) {
    editorRef.current?.focus()
    document.execCommand(cmd, false, val)
  }

  return (
    <div className={styles.wrapper}>
      {/* Subject */}
      <div className={styles.topBar}>
        <div className={styles.subjectRow}>
          <span className={styles.subjectLabel}>Subject</span>
          <span className={styles.subjectValue}>
            {loading && !subject
              ? <span className={styles.skeleton} style={{ width: '180px' }} />
              : subject || <span className={styles.placeholder}>will appear here</span>}
          </span>
        </div>
        {(loading || done) && (
          <span className={loading ? styles.streamingBadge : styles.doneBadge}>
            {loading ? '● streaming…' : '✓ done'}
          </span>
        )}
      </div>

      {/* Toolbar */}
      {!isEmpty && (
        <div className={styles.toolbar}>
          <button className={styles.tbBtn} onMouseDown={e => { e.preventDefault(); execCmd('bold') }}><b>B</b></button>
          <button className={styles.tbBtn} onMouseDown={e => { e.preventDefault(); execCmd('italic') }}><i>I</i></button>
          <button className={styles.tbBtn} onMouseDown={e => { e.preventDefault(); execCmd('underline') }}><u>U</u></button>
          <div className={styles.tbDivider} />
          <button className={styles.tbBtn} onMouseDown={e => { e.preventDefault(); execCmd('insertUnorderedList') }}>• List</button>
          <button className={styles.tbBtn} onMouseDown={e => { e.preventDefault(); execCmd('insertOrderedList') }}>1. List</button>
        </div>
      )}

      {/* Editor */}
      <div className={`${styles.editorWrap} ${isEmpty ? styles.empty : ''}`}>
        {isEmpty ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>✉️</span>
            <p>Your generated email will appear here</p>
            <p className={styles.emptyHint}>Fill in the form and click Generate</p>
          </div>
        ) : (
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            className={styles.editor}
            spellCheck
          />
        )}
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <button
          className={`${styles.actionBtn} ${copied ? styles.copied : ''}`}
          onClick={handleCopy}
          disabled={isEmpty || loading}
        >
          {copied ? '✓ Copied!' : '⎘ Copy email'}
        </button>
        <span className={styles.hint}>You can edit the email above before copying</span>
      </div>
    </div>
  )
}
