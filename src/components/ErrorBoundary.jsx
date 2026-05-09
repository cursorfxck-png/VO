import { Component } from 'react'

/**
 * Error Boundary - Catches and displays React errors gracefully
 * Prevents white screen of death and shows helpful error messages
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    console.error('[v0] Error caught by boundary:', error)
    console.error('[v0] Error info:', errorInfo)
    
    this.setState(prevState => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1
    }))

    // Auto-recover after 5 seconds
    if (this.state.errorCount < 3) {
      setTimeout(() => {
        this.setState({ hasError: false, error: null, errorInfo: null })
      }, 5000)
    }
  }

  resetError = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorCount: 0
    })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          width: '100%',
          minHeight: '100vh',
          background: '#000',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          color: '#fff',
          fontFamily: 'Inter, sans-serif'
        }}>
          <div style={{
            maxWidth: '500px',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '48px',
              marginBottom: '20px'
            }}>⚠️</div>
            
            <h1 style={{
              fontSize: '24px',
              fontWeight: '700',
              marginBottom: '12px',
              letterSpacing: '-0.5px'
            }}>
              Oops! Something went wrong
            </h1>
            
            <p style={{
              fontSize: '15px',
              color: '#aaa',
              marginBottom: '24px',
              lineHeight: '1.6'
            }}>
              We're sorry for the inconvenience. The app encountered an error and is attempting to recover.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div style={{
                background: 'rgba(255, 0, 0, 0.1)',
                border: '1px solid rgba(255, 0, 0, 0.3)',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '24px',
                textAlign: 'left',
                fontSize: '12px',
                fontFamily: 'monospace',
                overflowX: 'auto',
                maxHeight: '200px',
                overflowY: 'auto'
              }}>
                <p style={{ margin: '0 0 8px 0', color: '#ff6b6b', fontWeight: 'bold' }}>
                  Error: {this.state.error.toString()}
                </p>
                {this.state.errorInfo && (
                  <pre style={{
                    margin: '0',
                    color: '#888',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}>
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            <div style={{
              display: 'flex',
              gap: '12px',
              flexDirection: 'column'
            }}>
              <button
                onClick={this.resetError}
                style={{
                  width: '100%',
                  padding: '12px 24px',
                  background: '#d946ef',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseOver={(e) => e.target.style.background = '#c414d4'}
                onMouseOut={(e) => e.target.style.background = '#d946ef'}
              >
                Try Again
              </button>
              
              <button
                onClick={() => window.location.href = '/'}
                style={{
                  width: '100%',
                  padding: '12px 24px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: '#fff',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseOver={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.15)'}
                onMouseOut={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.1)'}
              >
                Go Home
              </button>
            </div>

            {this.state.errorCount >= 3 && (
              <p style={{
                fontSize: '12px',
                color: '#888',
                marginTop: '24px'
              }}>
                Multiple errors detected. Please refresh the page or contact support.
              </p>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
