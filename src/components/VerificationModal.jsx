import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { X, Upload, ChevronDown } from 'lucide-react'
import './VerificationModal.css'

export default function VerificationModal({ session, onClose }) {
    const [formData, setFormData] = useState({
        fullName: '',
        username: '',
        email: '',
        phoneNumber: '',
        category: '',
        country: '',
        document: null
    })
    const [agreeTerms, setAgreeTerms] = useState(false)
    const [loading, setLoading] = useState(false)
    const [showCancelConfirm, setShowCancelConfirm] = useState(false)
    const [dontShowAgain, setDontShowAgain] = useState(false)

    const categories = ['Creator', 'Artist', 'Musician', 'Athlete', 'Business', 'Public Figure', 'Other']
    const countries = ['United States', 'United Kingdom', 'Canada', 'Australia', 'India', 'Other']

    const handleFileChange = (e) => {
        const file = e.target.files[0]
        if (file) {
            setFormData({ ...formData, document: file })
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        
        if (!agreeTerms) {
            alert('Please agree to the Terms and Conditions')
            return
        }

        if (!formData.document) {
            alert('Please upload a verification document')
            return
        }

        setLoading(true)
        try {
            // Upload document to Supabase storage
            const fileExt = formData.document.name.split('.').pop()
            const fileName = `${session.user.id}-${Date.now()}.${fileExt}`
            
            const { error: uploadError } = await supabase.storage
                .from('verification-documents')
                .upload(fileName, formData.document)

            if (uploadError) throw uploadError

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('verification-documents')
                .getPublicUrl(fileName)

            // Insert verification request
            const { error: insertError } = await supabase
                .from('verification_requests')
                .insert({
                    user_id: session.user.id,
                    full_name: formData.fullName,
                    username: formData.username,
                    email: formData.email,
                    phone_number: formData.phoneNumber,
                    category: formData.category,
                    country: formData.country,
                    document_url: publicUrl,
                    status: 'pending',
                    created_at: new Date().toISOString()
                })

            if (insertError) throw insertError

            alert('Verification request submitted successfully! We will review your application.')
            onClose()
        } catch (error) {
            console.error('Error submitting verification:', error)
            alert('Failed to submit verification request. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const handleCancel = () => {
        setShowCancelConfirm(true)
    }

    const confirmCancel = () => {
        if (dontShowAgain) {
            localStorage.setItem('hideVerificationModal', 'true')
        }
        onClose()
    }

    if (showCancelConfirm) {
        return (
            <div className="logout-modal-overlay" onClick={() => setShowCancelConfirm(false)}>
                <div className="logout-modal-container" onClick={(e) => e.stopPropagation()}>
                    <div className="logout-modal-content">
                        <div className="logout-modal-header">
                            <div className="logout-icon">
                                <i className="ri-error-warning-line"></i>
                            </div>
                            <h3>Cancel Verification</h3>
                            <p>Are you sure you want to cancel?</p>
                        </div>
                        
                        <div style={{ padding: '0 24px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input
                                type="checkbox"
                                id="dontShowAgain"
                                checked={dontShowAgain}
                                onChange={(e) => setDontShowAgain(e.target.checked)}
                                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                            />
                            <label htmlFor="dontShowAgain" style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}>
                                Don't show me later
                            </label>
                        </div>

                        <div className="logout-modal-actions">
                            <button className="logout-btn-confirm" onClick={confirmCancel}>
                                Yes, Cancel
                            </button>
                            <button className="logout-btn-cancel" onClick={() => setShowCancelConfirm(false)}>
                                Continue
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="verification-modal-overlay" onClick={(e) => e.target === e.currentTarget && handleCancel()}>
            <div className="verification-modal-container">
                <div className="verification-modal-content">
                    {/* Header */}
                    <div className="verification-header">
                        <span className="join-link">JOIN</span>
                        <div className="help-section">
                            <span className="help-text">Help</span>
                            <span className="help-icon">?</span>
                        </div>
                        <button className="cancel-button" onClick={handleCancel}>
                            <X size={20} />
                        </button>
                    </div>

                    {/* Title Section */}
                    <div className="verification-title-section">
                        <h1 className="voguex-title">VOGUEX</h1>
                        <h2 className="verification-subtitle">Verification Account</h2>
                        <p className="verification-description">
                            Get your profile verified and unlock premium features.
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="verification-form">
                        {/* Full Name */}
                        <div className="form-group">
                            <label>Full Name</label>
                            <input
                                type="text"
                                placeholder="Full Name"
                                value={formData.fullName}
                                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                required
                            />
                        </div>

                        {/* Username */}
                        <div className="form-group">
                            <label>Username</label>
                            <input
                                type="text"
                                placeholder="Username"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                required
                            />
                        </div>

                        {/* Email */}
                        <div className="form-group">
                            <label>Email</label>
                            <input
                                type="email"
                                placeholder="Phone Number"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                required
                            />
                        </div>

                        {/* Category and Country Row */}
                        <div className="form-row">
                            <div className="form-group half">
                                <label>Category</label>
                                <div className="select-wrapper">
                                    <select
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        required
                                    >
                                        <option value="">Creator</option>
                                        {categories.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="select-icon" size={14} />
                                </div>
                            </div>

                            <div className="form-group half">
                                <label>Country</label>
                                <div className="select-wrapper">
                                    <select
                                        value={formData.country}
                                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                                        required
                                    >
                                        <option value="">Public Figure</option>
                                        {countries.map(country => (
                                            <option key={country} value={country}>{country}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="select-icon" size={14} />
                                </div>
                            </div>
                        </div>

                        {/* Upload Document */}
                        <div className="upload-section">
                            <input
                                type="file"
                                id="document-upload"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={handleFileChange}
                                style={{ display: 'none' }}
                            />
                            <label htmlFor="document-upload" className="upload-label">
                                <div className="upload-text">
                                    Upload<br />Verification Document
                                </div>
                                <Upload className="upload-icon" size={20} />
                            </label>
                            {formData.document && (
                                <div className="file-name">{formData.document.name}</div>
                            )}
                        </div>

                        {/* Terms Checkbox */}
                        <div className="terms-section">
                            <input
                                type="checkbox"
                                id="terms"
                                checked={agreeTerms}
                                onChange={(e) => setAgreeTerms(e.target.checked)}
                                className="terms-checkbox"
                            />
                            <label htmlFor="terms" className="terms-label">
                                I agree to the <span className="terms-link">Terms and Conditions</span>
                            </label>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            className="submit-button"
                            disabled={loading || !agreeTerms}
                        >
                            {loading ? 'Submitting...' : 'Apply for Verification'}
                        </button>

                        {/* Already Verified Link */}
                        <div className="already-verified">
                            Already verified? Sign in
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}