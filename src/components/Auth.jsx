import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Auth() {
    const [loading, setLoading] = useState(false)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isSignUp, setIsSignUp] = useState(false)
    const [message, setMessage] = useState('')

    const handleAuth = async (e) => {
        e.preventDefault()
        setLoading(true)
        setMessage('')

        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                })
                if (error) throw error
                setMessage('Check your email for the login link!')
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                })
                if (error) throw error
            }
        } catch (error) {
            setMessage(error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="vogue-auth-container">
            <div className="vogue-auth-content">
                <div className="vogue-logo-section">
                    <img src="/vogue-logo.svg" alt="Vogue X Logo" className="vogue-logo-image" />
                    <h1 className="vogue-title">VOGUE X</h1>
                </div>

                {isSignUp && (
                    <h2 className="vogue-auth-heading">Sign up</h2>
                )}

                <form onSubmit={handleAuth} className="vogue-auth-form">
                    <div className="vogue-input-wrapper">
                        <input
                            type="email"
                            placeholder="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="vogue-input"
                            required
                        />
                    </div>
                    
                    <div className="vogue-input-wrapper">
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="vogue-input"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="vogue-login-button"
                    >
                        {loading ? 'Loading...' : isSignUp ? 'Sign up' : 'Log in'}
                    </button>
                </form>

                {message && (
                    <div className={`vogue-message ${message.includes('Check your email') ? 'success' : 'error'}`}>
                        {message}
                    </div>
                )}

                <p className="vogue-signup-text">
                    {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                    <button
                        type="button"
                        onClick={() => {
                            setIsSignUp(!isSignUp)
                            setMessage('')
                        }}
                        className="vogue-signup-link"
                    >
                        {isSignUp ? 'Log in.' : 'Sign up.'}
                    </button>
                </p>

                <p className="vogue-footer-text">A  VOGUE X  PRESENTS</p>
            </div>
        </div>
    )
}
