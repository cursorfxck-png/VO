import { supabase } from '../supabaseClient'
import './LogoutModal.css'

export default function LogoutModal({ onClose }) {
  const handleLogout = async () => {
    await supabase.auth.signOut()
    onClose()
  }

  return (
    <div className="logout-modal-overlay" onClick={onClose}>
      <div className="logout-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="logout-modal-content">
          <div className="logout-modal-header">
            <div className="logout-icon">
              <i className="ri-logout-box-line"></i>
            </div>
            <h3>Log Out</h3>
            <p>Are you sure you want to log out?</p>
          </div>
          
          <div className="logout-modal-actions">
            <button className="logout-btn-confirm" onClick={handleLogout}>
              Log Out
            </button>
            <button className="logout-btn-cancel" onClick={onClose}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}