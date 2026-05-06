// Material Design Icons Component

export const ImageIcon = ({ size = 24, className = "" }) => (
    <svg 
        className={className}
        style={{ 
            width: size, 
            height: size, 
            color: '#5f6368',
            transition: 'color 0.2s ease-in-out',
            cursor: 'pointer'
        }}
        viewBox="0 0 24 24" 
        fill="currentColor" 
        xmlns="http://www.w3.org/2000/svg"
        onMouseEnter={(e) => e.currentTarget.style.color = '#1a73e8'}
        onMouseLeave={(e) => e.currentTarget.style.color = '#5f6368'}
    >
        <path d="M0 0h24v24H0V0z" fill="none"/>
        <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
    </svg>
)

export const VideoIcon = ({ size = 24, className = "" }) => (
    <svg 
        className={className}
        style={{ 
            width: size, 
            height: size, 
            color: '#5f6368',
            transition: 'color 0.2s ease-in-out',
            cursor: 'pointer'
        }}
        viewBox="0 0 24 24" 
        fill="currentColor" 
        xmlns="http://www.w3.org/2000/svg"
        onMouseEnter={(e) => e.currentTarget.style.color = '#1a73e8'}
        onMouseLeave={(e) => e.currentTarget.style.color = '#5f6368'}
    >
        <path d="M0 0h24v24H0V0z" fill="none"/>
        <path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 14H3V5h18v12zm-5-6l-7 4V7z"/>
    </svg>
)

export const LocationIcon = ({ size = 24, className = "" }) => (
    <svg 
        className={className}
        style={{ 
            width: size, 
            height: size, 
            color: '#5f6368',
            transition: 'color 0.2s ease-in-out',
            cursor: 'pointer'
        }}
        viewBox="0 0 24 24" 
        fill="currentColor" 
        xmlns="http://www.w3.org/2000/svg"
        onMouseEnter={(e) => e.currentTarget.style.color = '#1a73e8'}
        onMouseLeave={(e) => e.currentTarget.style.color = '#5f6368'}
    >
        <path d="M0 0h24v24H0V0z" fill="none"/>
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>
)
