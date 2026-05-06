const CHUNK_SIZE = 512 * 1024 // 512KB per chunk
const CACHE_PREFIX = 'voguex_cache_'
const META_KEY = 'voguex_cache_meta'
const DEFAULT_TTL = 5 * 60 * 1000 // 5 minutes

function getMeta() {
  try {
    return JSON.parse(localStorage.getItem(META_KEY) || '{}')
  } catch {
    return {}
  }
}

function setMeta(meta) {
  localStorage.setItem(META_KEY, JSON.stringify(meta))
}

function clearExpired() {
  const meta = getMeta()
  const now = Date.now()
  Object.keys(meta).forEach(key => {
    if (meta[key].expires < now) {
      removeCache(key)
    }
  })
}

function removeCache(key) {
  const meta = getMeta()
  const entry = meta[key]
  if (entry) {
    for (let i = 0; i < entry.chunks; i++) {
      localStorage.removeItem(`${CACHE_PREFIX}${key}_chunk_${i}`)
    }
    delete meta[key]
    setMeta(meta)
  }
}

export function setCache(key, data, ttl = DEFAULT_TTL) {
  try {
    clearExpired()
    const serialized = JSON.stringify(data)
    const numChunks = Math.ceil(serialized.length / CHUNK_SIZE)
    
    // Store chunks
    for (let i = 0; i < numChunks; i++) {
      const chunk = serialized.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)
      localStorage.setItem(`${CACHE_PREFIX}${key}_chunk_${i}`, chunk)
    }

    // Update metadata
    const meta = getMeta()
    meta[key] = {
      chunks: numChunks,
      expires: Date.now() + ttl,
      size: serialized.length
    }
    setMeta(meta)
    return true
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      evictOldest()
      return false
    }
    console.error('Cache write error:', e)
    return false
  }
}

export function getCache(key) {
  try {
    const meta = getMeta()
    const entry = meta[key]
    if (!entry) return null
    if (entry.expires < Date.now()) {
      removeCache(key)
      return null
    }

    let serialized = ''
    for (let i = 0; i < entry.chunks; i++) {
      const chunk = localStorage.getItem(`${CACHE_PREFIX}${key}_chunk_${i}`)
      if (chunk === null) {
        removeCache(key)
        return null
      }
      serialized += chunk
    }

    return JSON.parse(serialized)
  } catch {
    return null
  }
}

export function invalidateCache(key) {
  removeCache(key)
}

export function invalidatePrefix(prefix) {
  const meta = getMeta()
  Object.keys(meta).forEach(key => {
    if (key.startsWith(prefix)) {
      removeCache(key)
    }
  })
}

function evictOldest() {
  const meta = getMeta()
  const sorted = Object.entries(meta).sort((a, b) => a[1].expires - b[1].expires)
  if (sorted.length > 0) {
    removeCache(sorted[0][0])
  }
}

// Preload and warm cache for user feed
export async function warmCache(supabase, userId) {
  try {
    // Cache user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (profile) setCache(`profile_${userId}`, profile, 10 * 60 * 1000)

    // Cache recent posts
    const { data: posts } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)
    if (posts) setCache('feed_posts', posts, 2 * 60 * 1000)

    // Cache verified users list
    const { data: verified } = await supabase
      .from('verified_users')
      .select('username')
    if (verified) setCache('verified_users', verified, 15 * 60 * 1000)
  } catch (e) {
    console.error('Cache warm error:', e)
  }
}
