import { useState, useRef, useEffect } from 'react'
import './StoryEditor.css'

export default function StoryEditor({ imageUrl, onSave, onCancel }) {
    const canvasRef = useRef(null)
    const [isDrawing, setIsDrawing] = useState(false)
    const [drawColor, setDrawColor] = useState('#007AFF')
    const [brushSize, setBrushSize] = useState(5)
    const [showColorPicker, setShowColorPicker] = useState(false)
    const [opacity, setOpacity] = useState(100)
    const [colorPickerTab, setColorPickerTab] = useState('grid') // 'grid', 'spectrum', 'slider'
    const [hue, setHue] = useState(200)
    const [saturation, setSaturation] = useState(100)
    const [lightness, setLightness] = useState(50)
    const [redValue, setRedValue] = useState(0)
    const [greenValue, setGreenValue] = useState(122)
    const [blueValue, setBlueValue] = useState(255)
    const [textElements, setTextElements] = useState([])
    const [currentText, setCurrentText] = useState('')
    const [showTextInput, setShowTextInput] = useState(false)
    const [textPosition, setTextPosition] = useState({ x: 50, y: 50 })
    const [selectedTextIndex, setSelectedTextIndex] = useState(null)
    const [mode, setMode] = useState('draw') // 'draw' or 'text'
    const [savedColors, setSavedColors] = useState([
        '#000000', '#FFAB01', '#B18CFE', '#FF8C82', 
        '#EE719E', '#FF4015', '#4D22B2', '#FE6250', '#D8C9FE'
    ])

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
            canvas.width = img.width
            canvas.height = img.height
            ctx.drawImage(img, 0, 0)
        }
        img.src = imageUrl
    }, [imageUrl])

    const startDrawing = (e) => {
        if (mode !== 'draw') return
        setIsDrawing(true)
        const canvas = canvasRef.current
        const rect = canvas.getBoundingClientRect()
        const scaleX = canvas.width / rect.width
        const scaleY = canvas.height / rect.height
        const x = (e.clientX - rect.left) * scaleX
        const y = (e.clientY - rect.top) * scaleY
        
        const ctx = canvas.getContext('2d')
        ctx.beginPath()
        ctx.moveTo(x, y)
    }

    const draw = (e) => {
        if (!isDrawing || mode !== 'draw') return
        
        const canvas = canvasRef.current
        const rect = canvas.getBoundingClientRect()
        const scaleX = canvas.width / rect.width
        const scaleY = canvas.height / rect.height
        const x = (e.clientX - rect.left) * scaleX
        const y = (e.clientY - rect.top) * scaleY
        
        const ctx = canvas.getContext('2d')
        ctx.lineTo(x, y)
        ctx.strokeStyle = drawColor
        ctx.globalAlpha = opacity / 100
        ctx.lineWidth = brushSize
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.stroke()
    }

    const stopDrawing = () => {
        setIsDrawing(false)
    }

    const handleTouchStart = (e) => {
        if (mode !== 'draw') return
        e.preventDefault()
        setIsDrawing(true)
        const canvas = canvasRef.current
        const rect = canvas.getBoundingClientRect()
        const scaleX = canvas.width / rect.width
        const scaleY = canvas.height / rect.height
        const touch = e.touches[0]
        const x = (touch.clientX - rect.left) * scaleX
        const y = (touch.clientY - rect.top) * scaleY
        
        const ctx = canvas.getContext('2d')
        ctx.beginPath()
        ctx.moveTo(x, y)
    }

    const handleTouchMove = (e) => {
        if (!isDrawing || mode !== 'draw') return
        e.preventDefault()
        
        const canvas = canvasRef.current
        const rect = canvas.getBoundingClientRect()
        const scaleX = canvas.width / rect.width
        const scaleY = canvas.height / rect.height
        const touch = e.touches[0]
        const x = (touch.clientX - rect.left) * scaleX
        const y = (touch.clientY - rect.top) * scaleY
        
        const ctx = canvas.getContext('2d')
        ctx.lineTo(x, y)
        ctx.strokeStyle = drawColor
        ctx.globalAlpha = opacity / 100
        ctx.lineWidth = brushSize
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.stroke()
    }

    const handleTouchEnd = () => {
        setIsDrawing(false)
    }

    const addText = () => {
        if (!currentText.trim()) return
        setTextElements([...textElements, {
            text: currentText,
            x: textPosition.x,
            y: textPosition.y,
            color: drawColor,
            size: 24
        }])
        setCurrentText('')
        setShowTextInput(false)
    }

    const handleCanvasClick = (e) => {
        if (mode !== 'text') return
        const canvas = canvasRef.current
        const rect = canvas.getBoundingClientRect()
        const x = ((e.clientX - rect.left) / rect.width) * 100
        const y = ((e.clientY - rect.top) / rect.height) * 100
        setTextPosition({ x, y })
        setShowTextInput(true)
    }

    const handleSave = () => {
        const canvas = canvasRef.current
        
        // Draw text elements onto canvas
        const ctx = canvas.getContext('2d')
        textElements.forEach(textEl => {
            ctx.font = `${textEl.size}px -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif`
            ctx.fillStyle = textEl.color
            ctx.fillText(textEl.text, (textEl.x / 100) * canvas.width, (textEl.y / 100) * canvas.height)
        })
        
        canvas.toBlob((blob) => {
            onSave(blob)
        }, 'image/jpeg', 0.95)
    }

    const hslToHex = (h, s, l) => {
        l /= 100
        const a = s * Math.min(l, 1 - l) / 100
        const f = n => {
            const k = (n + h / 30) % 12
            const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
            return Math.round(255 * color).toString(16).padStart(2, '0')
        }
        return `#${f(0)}${f(8)}${f(4)}`
    }

    const rgbToHex = (r, g, b) => {
        return '#' + [r, g, b].map(x => {
            const hex = Math.round(x).toString(16)
            return hex.length === 1 ? '0' + hex : hex
        }).join('')
    }

    const hexToRgb = (hex) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null
    }

    const ColorPicker = () => {
        const handleGridClick = (e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            const x = (e.clientX - rect.left) / rect.width
            const y = (e.clientY - rect.top) / rect.height
            
            // Calculate hue from x position (0-360)
            const newHue = Math.round(x * 360)
            // Calculate lightness from y position (100 at top, 0 at bottom)
            const newLightness = Math.round((1 - y) * 100)
            
            setHue(newHue)
            setLightness(newLightness)
            const color = hslToHex(newHue, saturation, newLightness)
            setDrawColor(color)
            
            // Update RGB values
            const rgb = hexToRgb(color)
            if (rgb) {
                setRedValue(rgb.r)
                setGreenValue(rgb.g)
                setBlueValue(rgb.b)
            }
        }

        const handleSpectrumClick = (e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            const x = (e.clientX - rect.left) / rect.width
            const y = (e.clientY - rect.top) / rect.height
            
            // x = saturation (0-100), y = lightness (100-0)
            const newSaturation = Math.round(x * 100)
            const newLightness = Math.round((1 - y) * 100)
            
            setSaturation(newSaturation)
            setLightness(newLightness)
            const color = hslToHex(hue, newSaturation, newLightness)
            setDrawColor(color)
            
            // Update RGB values
            const rgb = hexToRgb(color)
            if (rgb) {
                setRedValue(rgb.r)
                setGreenValue(rgb.g)
                setBlueValue(rgb.b)
            }
        }

        const updateColorFromRGB = () => {
            const color = rgbToHex(redValue, greenValue, blueValue)
            setDrawColor(color)
        }

        return (
            <div className="color-picker-overlay" onClick={() => setShowColorPicker(false)}>
                <div className="color-picker-modal" onClick={(e) => e.stopPropagation()}>
                    <div className="color-picker-header">
                        <img src="/icons/eyedropper.svg" alt="Color" className="color-picker-icon" />
                        <span className="color-picker-title">Colors</span>
                        <button onClick={() => setShowColorPicker(false)} className="color-picker-close">
                            <img src="/icons/xmark.svg" alt="Close" />
                        </button>
                    </div>
                    
                    <div className="color-picker-divider"></div>
                    
                    <div className="color-picker-tabs">
                        <div 
                            className={`color-tab ${colorPickerTab === 'grid' ? 'active' : ''}`}
                            onClick={() => setColorPickerTab('grid')}
                        >
                            Grid
                        </div>
                        <div 
                            className={`color-tab ${colorPickerTab === 'spectrum' ? 'active' : ''}`}
                            onClick={() => setColorPickerTab('spectrum')}
                        >
                            Spectrum
                        </div>
                        <div 
                            className={`color-tab ${colorPickerTab === 'slider' ? 'active' : ''}`}
                            onClick={() => setColorPickerTab('slider')}
                        >
                            Slider
                        </div>
                    </div>
                    
                    {/* Grid Tab */}
                    {colorPickerTab === 'grid' && (
                        <div className="color-grid">
                            <div 
                                className="color-grid-canvas"
                                onClick={handleGridClick}
                                style={{
                                    background: `linear-gradient(to bottom, 
                                        hsl(0, 100%, 100%) 0%,
                                        hsl(0, 100%, 50%) 50%,
                                        hsl(0, 100%, 0%) 100%
                                    ), linear-gradient(to right,
                                        hsl(0, 100%, 50%),
                                        hsl(60, 100%, 50%),
                                        hsl(120, 100%, 50%),
                                        hsl(180, 100%, 50%),
                                        hsl(240, 100%, 50%),
                                        hsl(300, 100%, 50%),
                                        hsl(360, 100%, 50%)
                                    )`,
                                    backgroundBlendMode: 'multiply'
                                }}
                            >
                                <div 
                                    className="color-picker-cursor"
                                    style={{
                                        left: `${(hue / 360) * 100}%`,
                                        top: `${(1 - lightness / 100) * 100}%`
                                    }}
                                ></div>
                            </div>
                        </div>
                    )}

                    {/* Spectrum Tab */}
                    {colorPickerTab === 'spectrum' && (
                        <div className="color-grid">
                            <div className="spectrum-controls">
                                <div className="hue-slider-container">
                                    <label>Hue</label>
                                    <input 
                                        type="range"
                                        min="0"
                                        max="360"
                                        value={hue}
                                        onChange={(e) => {
                                            const newHue = parseInt(e.target.value)
                                            setHue(newHue)
                                            const color = hslToHex(newHue, saturation, lightness)
                                            setDrawColor(color)
                                            const rgb = hexToRgb(color)
                                            if (rgb) {
                                                setRedValue(rgb.r)
                                                setGreenValue(rgb.g)
                                                setBlueValue(rgb.b)
                                            }
                                        }}
                                        className="hue-slider"
                                        style={{
                                            background: 'linear-gradient(to right, hsl(0, 100%, 50%), hsl(60, 100%, 50%), hsl(120, 100%, 50%), hsl(180, 100%, 50%), hsl(240, 100%, 50%), hsl(300, 100%, 50%), hsl(360, 100%, 50%))'
                                        }}
                                    />
                                    <span>{hue}°</span>
                                </div>
                            </div>
                            <div 
                                className="spectrum-canvas"
                                onClick={handleSpectrumClick}
                                style={{
                                    background: `linear-gradient(to bottom, 
                                        hsl(${hue}, 0%, 100%) 0%,
                                        hsl(${hue}, 50%, 50%) 50%,
                                        hsl(${hue}, 100%, 0%) 100%
                                    ), linear-gradient(to right,
                                        hsl(${hue}, 0%, 50%),
                                        hsl(${hue}, 100%, 50%)
                                    )`,
                                    backgroundBlendMode: 'multiply'
                                }}
                            >
                                <div 
                                    className="color-picker-cursor"
                                    style={{
                                        left: `${saturation}%`,
                                        top: `${(1 - lightness / 100) * 100}%`
                                    }}
                                ></div>
                            </div>
                        </div>
                    )}

                    {/* Slider Tab */}
                    {colorPickerTab === 'slider' && (
                        <div className="color-sliders">
                            <div className="slider-control">
                                <label>Red</label>
                                <input 
                                    type="range"
                                    min="0"
                                    max="255"
                                    value={redValue}
                                    onChange={(e) => {
                                        setRedValue(parseInt(e.target.value))
                                        updateColorFromRGB()
                                    }}
                                    onMouseUp={updateColorFromRGB}
                                    onTouchEnd={updateColorFromRGB}
                                    className="rgb-slider red-slider"
                                />
                                <span>{redValue}</span>
                            </div>
                            <div className="slider-control">
                                <label>Green</label>
                                <input 
                                    type="range"
                                    min="0"
                                    max="255"
                                    value={greenValue}
                                    onChange={(e) => {
                                        setGreenValue(parseInt(e.target.value))
                                        updateColorFromRGB()
                                    }}
                                    onMouseUp={updateColorFromRGB}
                                    onTouchEnd={updateColorFromRGB}
                                    className="rgb-slider green-slider"
                                />
                                <span>{greenValue}</span>
                            </div>
                            <div className="slider-control">
                                <label>Blue</label>
                                <input 
                                    type="range"
                                    min="0"
                                    max="255"
                                    value={blueValue}
                                    onChange={(e) => {
                                        setBlueValue(parseInt(e.target.value))
                                        updateColorFromRGB()
                                    }}
                                    onMouseUp={updateColorFromRGB}
                                    onTouchEnd={updateColorFromRGB}
                                    className="rgb-slider blue-slider"
                                />
                                <span>{blueValue}</span>
                            </div>
                            <div className="color-preview-large" style={{ background: drawColor }}></div>
                        </div>
                    )}
                
                <div className="opacity-section">
                    <div className="opacity-label">OPACITY</div>
                    <div className="opacity-slider-container">
                        <input 
                            type="range" 
                            min="0" 
                            max="100" 
                            value={opacity}
                            onChange={(e) => setOpacity(parseInt(e.target.value))}
                            className="opacity-slider"
                        />
                    </div>
                    <div className="opacity-value">{opacity}%</div>
                </div>
                
                <div className="color-picker-bottom-divider"></div>
                
                <div className="saved-colors">
                    <div className="swatch-preview" style={{ background: drawColor }}></div>
                    {savedColors.map((color, idx) => (
                        <div 
                            key={idx} 
                            className="saved-swatch" 
                            style={{ background: color }}
                            onClick={() => setDrawColor(color)}
                        ></div>
                    ))}
                    <button className="add-swatch" onClick={() => {
                        if (!savedColors.includes(drawColor)) {
                            setSavedColors([...savedColors.slice(0, 8), drawColor])
                        }
                    }}>
                        <img src="/icons/plus-icon.svg" alt="Add" />
                    </button>
                </div>
            </div>
        </div>
        )
    }

    return (
        <div className="story-editor-overlay">
            <div className="story-editor-container">
                {/* Header */}
                <div className="story-editor-header">
                    <button onClick={onCancel} className="story-editor-btn">Cancel</button>
                    <div className="story-editor-title">Edit Story</div>
                    <button onClick={handleSave} className="story-editor-btn primary">Done</button>
                </div>

                {/* Canvas */}
                <div className="story-editor-canvas-wrapper">
                    <canvas
                        ref={canvasRef}
                        className="story-editor-canvas"
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                        onClick={handleCanvasClick}
                    />
                    
                    {/* Text overlays */}
                    {textElements.map((textEl, idx) => (
                        <div
                            key={idx}
                            className="text-overlay"
                            style={{
                                left: `${textEl.x}%`,
                                top: `${textEl.y}%`,
                                color: textEl.color,
                                fontSize: `${textEl.size}px`
                            }}
                        >
                            {textEl.text}
                        </div>
                    ))}
                    
                    {/* Text input */}
                    {showTextInput && (
                        <div className="text-input-overlay" style={{ left: `${textPosition.x}%`, top: `${textPosition.y}%` }}>
                            <input
                                type="text"
                                value={currentText}
                                onChange={(e) => setCurrentText(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') addText()
                                    if (e.key === 'Escape') setShowTextInput(false)
                                }}
                                placeholder="Type text..."
                                autoFocus
                                className="text-input"
                                style={{ color: drawColor }}
                            />
                            <button onClick={addText} className="text-add-btn">Add</button>
                        </div>
                    )}
                </div>

                {/* Tools */}
                <div className="story-editor-tools">
                    <button 
                        className={`tool-btn ${mode === 'draw' ? 'active' : ''}`}
                        onClick={() => setMode('draw')}
                    >
                        <i className="ri-brush-line"></i>
                        <span>Draw</span>
                    </button>
                    
                    <button 
                        className={`tool-btn ${mode === 'text' ? 'active' : ''}`}
                        onClick={() => setMode('text')}
                    >
                        <i className="ri-text"></i>
                        <span>Text</span>
                    </button>
                    
                    <button 
                        className="tool-btn"
                        onClick={() => setShowColorPicker(true)}
                    >
                        <div className="color-preview" style={{ background: drawColor }}></div>
                        <span>Color</span>
                    </button>
                    
                    {mode === 'draw' && (
                        <div className="brush-size-control">
                            <i className="ri-pencil-line"></i>
                            <input
                                type="range"
                                min="1"
                                max="20"
                                value={brushSize}
                                onChange={(e) => setBrushSize(parseInt(e.target.value))}
                                className="brush-slider"
                            />
                            <span>{brushSize}px</span>
                        </div>
                    )}
                </div>
            </div>
            
            {showColorPicker && <ColorPicker />}
        </div>
    )
}