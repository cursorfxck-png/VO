import { useState, useEffect } from 'react'
import MusicPlayer from './MusicPlayer'
import './Music.css'

const YOUTUBE_API_KEY = 'AIzaSyBzsUNIl2FFI9oniAvwhAlKvHawpb8EA-8'

export default function Music({ onBack }) {
  const [songs, setSongs] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentSong, setCurrentSong] = useState(null)
  const [isSearchExpanded, setIsSearchExpanded] = useState(false)
  const [apiLimitReached, setApiLimitReached] = useState(false)
  const [nextPageToken, setNextPageToken] = useState(null)
  const [loadingMore, setLoadingMore] = useState(false)

  useEffect(() => {
    fetchHindiSongs()
  }, [])

  const fetchHindiSongs = async (pageToken = null) => {
    if (!pageToken) {
      setLoading(true)
      setSongs([])
    } else {
      setLoadingMore(true)
    }
    setError(null)
    try {
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=20&q=hindi+songs+2024&type=video&videoCategoryId=10&key=${YOUTUBE_API_KEY}${pageToken ? `&pageToken=${pageToken}` : ''}`
      const response = await fetch(url)
      
      if (response.status === 403) {
        setApiLimitReached(true)
        setLoading(false)
        setLoadingMore(false)
        return
      }

      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error.message)
      }

      const formattedSongs = data.items.map(item => ({
        id: item.id.videoId,
        title: item.snippet.title,
        artist: item.snippet.channelTitle,
        thumbnail: item.snippet.thumbnails.medium.url,
        videoId: item.id.videoId
      }))
      
      setSongs(prev => pageToken ? [...prev, ...formattedSongs] : formattedSongs)
      setNextPageToken(data.nextPageToken || null)
    } catch (err) {
      console.error('Error fetching songs:', err)
      setError(err.message)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const searchSongs = async (query, pageToken = null) => {
    if (!query.trim()) {
      fetchHindiSongs()
      return
    }

    if (!pageToken) {
      setLoading(true)
      setSongs([])
    } else {
      setLoadingMore(true)
    }
    setError(null)
    try {
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=20&q=${encodeURIComponent(query)}+songs&type=video&videoCategoryId=10&key=${YOUTUBE_API_KEY}${pageToken ? `&pageToken=${pageToken}` : ''}`
      const response = await fetch(url)
      
      if (response.status === 403) {
        setApiLimitReached(true)
        setLoading(false)
        setLoadingMore(false)
        return
      }

      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error.message)
      }

      const formattedSongs = data.items.map(item => ({
        id: item.id.videoId,
        title: item.snippet.title,
        artist: item.snippet.channelTitle,
        thumbnail: item.snippet.thumbnails.medium.url,
        videoId: item.id.videoId
      }))
      
      setSongs(prev => pageToken ? [...prev, ...formattedSongs] : formattedSongs)
      setNextPageToken(data.nextPageToken || null)
    } catch (err) {
      console.error('Error searching songs:', err)
      setError(err.message)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const handleSearchChange = (e) => {
    const value = e.target.value
    setSearchQuery(value)
    
    // Debounce search
    if (value.trim()) {
      const timeoutId = setTimeout(() => {
        searchSongs(value)
      }, 500)
      return () => clearTimeout(timeoutId)
    } else {
      fetchHindiSongs()
    }
  }

  const handleSearchClick = () => {
    setIsSearchExpanded(true)
  }

  const handleSearchBlur = () => {
    if (!searchQuery.trim()) {
      setIsSearchExpanded(false)
    }
  }

  const handlePlaySong = (song) => {
    setCurrentSong(song)
  }

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target
    if (scrollHeight - scrollTop <= clientHeight * 1.5 && !loadingMore && nextPageToken) {
      if (searchQuery.trim()) {
        searchSongs(searchQuery, nextPageToken)
      } else {
        fetchHindiSongs(nextPageToken)
      }
    }
  }

  const handleCloseApiLimitModal = () => {
    setApiLimitReached(false)
    onBack()
  }

  if (apiLimitReached) {
    return (
      <div className="api-limit-modal">
        <div className="api-limit-content">
          <div className="api-limit-icon">
            <i className="ri-time-line"></i>
          </div>
          <h2>Music Time Reached</h2>
          <p>Today's music time has been reached. Please try again later!</p>
          <button className="api-limit-button" onClick={handleCloseApiLimitModal}>
            OK
          </button>
        </div>
      </div>
    )
  }

  return (
    <main className="main-feed music-view" onScroll={handleScroll}>
      <header className="feed-header music-header">
        <div className="music-header-content">
          <button className="back-button" onClick={onBack}>
            <i className="ri-arrow-left-line"></i>
          </button>
          <h1 className="music-title">Music</h1>
          <div className={`search-container ${isSearchExpanded ? 'expanded' : ''}`}>
            {!isSearchExpanded ? (
              <button className="search-icon-button" onClick={handleSearchClick}>
                <i className="ri-search-line"></i>
              </button>
            ) : (
              <input
                type="text"
                className="music-search-input"
                placeholder="Search songs..."
                value={searchQuery}
                onChange={handleSearchChange}
                onBlur={handleSearchBlur}
                autoFocus
              />
            )}
          </div>
        </div>
      </header>

      <div className="music-content">
        {loading ? (
          <div className="music-loading">
            <div className="ios-spinner"></div>
          </div>
        ) : error ? (
          <div className="music-error">
            <i className="ri-error-warning-line"></i>
            <p>{error}</p>
          </div>
        ) : songs.length === 0 ? (
          <div className="music-empty">
            <i className="ri-music-2-line"></i>
            <p>No songs found</p>
          </div>
        ) : (
          <div className="songs-list">
            {songs.map((song) => (
              <div key={song.id} className="song-item">
                <div 
                  className="song-thumbnail"
                  style={{ backgroundImage: `url(${song.thumbnail})` }}
                ></div>
                <div className="song-info">
                  <p className="song-title">{song.title}</p>
                  <p className="song-artist">{song.artist}</p>
                </div>
                <button 
                  className="play-button"
                  onClick={() => handlePlaySong(song)}
                >
                  <i className={currentSong?.id === song.id ? "ri-pause-fill" : "ri-play-fill"}></i>
                </button>
              </div>
            ))}
            {loadingMore && (
              <div className="loading-more">
                <div className="ios-spinner"></div>
              </div>
            )}
          </div>
        )}
      </div>

      {currentSong && (
        <MusicPlayer 
          song={currentSong} 
          onClose={() => setCurrentSong(null)}
        />
      )}
    </main>
  )
}