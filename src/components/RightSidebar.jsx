import Stories from './Stories'

export default function RightSidebar({ session, width, onStartResize, onToggle, onViewingStoryChange, onEditorChange }) {
    const isCollapsed = width === 0

    return (
        <aside className="right-sidebar" style={{ width: isCollapsed ? '0' : 'auto', padding: isCollapsed ? '0' : '20px', overflow: 'visible' }}>
            {/* Resize Handle */}
            {!isCollapsed && (
                <div
                    className="resize-handle"
                    onMouseDown={onStartResize}
                    style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: '4px',
                        cursor: 'col-resize',
                        zIndex: 100,
                        background: 'transparent'
                    }}
                />
            )}

            {/* Toggle Button (Floating when collapsed, inside when expanded) */}
            <button
                onClick={onToggle}
                className="sidebar-toggle-btn"
                style={{
                    position: 'fixed',
                    right: isCollapsed ? '20px' : 'calc(var(--right-sidebar-width, 350px) + 10px)',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    zIndex: 10000,
                    background: 'linear-gradient(135deg, rgba(30,30,35,0.98) 0%, rgba(40,40,50,0.98) 100%)',
                    border: '2px solid rgba(255,255,255,0.2)',
                    borderRadius: '50%',
                    width: '48px',
                    height: '48px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'var(--text-main)',
                    boxShadow: '0 4px 25px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(10px)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)'
                    e.currentTarget.style.boxShadow = '0 6px 30px rgba(0,122,255,0.4), inset 0 1px 0 rgba(255,255,255,0.15)'
                    e.currentTarget.style.borderColor = 'rgba(0,122,255,0.6)'
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(-50%)'
                    e.currentTarget.style.boxShadow = '0 4px 25px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)'
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'
                }}
                title={isCollapsed ? "Show Sidebar" : "Hide Sidebar"}
            >
                <i className={isCollapsed ? "ri-arrow-left-s-line" : "ri-arrow-right-s-line"} style={{ fontSize: '24px' }}></i>
            </button>

            {!isCollapsed && (
                <div className="right-sidebar-content" style={{ marginLeft: '20px' }}>
                    <h3 className="section-title">Stories</h3>
                    <Stories session={session} mode="desktop" onViewingChange={onViewingStoryChange} onEditorChange={onEditorChange} />

                    <div className="footer-links">
                        <a href="#">Terms</a>
                        <a href="#">Privacy</a>
                        <a href="#">Cookies</a>
                        <span>© 2025 VogueX</span>
                    </div>
                </div>
            )}
        </aside>
    )
}
