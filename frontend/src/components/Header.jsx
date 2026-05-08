import styles from './Header.module.css'

export default function Header({ user, onLogout }) {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>✉</span>
          <span className={styles.logoText}>MailCraft <span className={styles.badge}>AI</span></span>
        </div>
        {user && (
          <div className={styles.userRow}>
            <div className={styles.avatar}>{user.name?.[0]?.toUpperCase() || '?'}</div>
            <div className={styles.userInfo}>
              <span className={styles.userName}>{user.name}</span>
              <span className={styles.userEmail}>{user.email}</span>
            </div>
            <button className={styles.logoutBtn} onClick={onLogout}>Sign out</button>
          </div>
        )}
      </div>
    </header>
  )
}
