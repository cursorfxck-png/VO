// Content Moderation - Block abusive words in Hindi and English
// Also blocks NSFW/18+ content

const ABUSIVE_WORDS = [
  // English abusive words
  'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'damn', 'hell', 'crap',
  'dick', 'pussy', 'cock', 'penis', 'vagina', 'sex', 'porn', 'nude', 'naked',
  'rape', 'kill', 'murder', 'die', 'death', 'suicide', 'terrorist', 'bomb',
  'drug', 'cocaine', 'heroin', 'weed', 'marijuana', 'alcohol', 'drunk',
  'slut', 'whore', 'prostitute', 'pimp', 'nigger', 'nigga', 'faggot', 'retard',
  'idiot', 'stupid', 'dumb', 'moron', 'loser', 'ugly', 'fat', 'gay',
  
  // Hindi abusive words (Romanized)
  'chutiya', 'chutiye', 'madarchod', 'bhenchod', 'behen chod', 'bhen chod',
  'behenchod', 'mc', 'bc', 'gandu', 'gand', 'gaandu', 'lund', 'loda', 'lode',
  'chut', 'choot', 'bhosdike', 'bhosdi ke', 'bsdk', 'randi', 'raand', 'kutte',
  'kutta', 'kuttiya', 'harami', 'haramzada', 'kamina', 'kamini', 'saala',
  'saali', 'sala', 'sali', 'chinal', 'chinaal', 'hijra', 'chakka',
  'bhosda', 'bhosadi', 'lauda', 'lawda', 'lawde', 'teri maa', 'teri ma',
  'maa ki', 'ma ki', 'baap ki', 'behen ki', 'beti ki', 'biwi ki',
  
  // Hindi abusive words (Devanagari)
  'चूतिया', 'मादरचोद', 'भेनचोद', 'बहनचोद', 'गांडू', 'लंड', 'लौड़ा', 'चूत',
  'भोसड़ीके', 'रंडी', 'रांड', 'कुत्ता', 'कुत्ती', 'हरामी', 'हरामज़ादा',
  'कमीना', 'कमीनी', 'साला', 'साली', 'चिनाल', 'हिजड़ा', 'चक्का',
  
  // NSFW/18+ words
  'xxx', 'nsfw', 'adult', 'explicit', 'erotic', 'sexual', 'orgasm',
  'masturbate', 'masturbation', 'blowjob', 'handjob', 'anal', 'oral',
  'boobs', 'tits', 'breast', 'nipple', 'ass', 'butt', 'butthole',
  
  // Variations and common misspellings
  'fuk', 'fck', 'sht', 'btch', 'dck', 'psy', 'cck', 'fk', 'stfu',
  'wtf', 'omfg', 'lmfao', 'milf', 'dilf', 'thot', 'hoe', 'ho'
]

/**
 * Check if text contains abusive or NSFW content
 * @param {string} text - Text to check
 * @returns {boolean} - True if abusive content found
 */
export function containsAbusiveContent(text) {
  if (!text || typeof text !== 'string') return false
  
  const normalizedText = text.toLowerCase().trim()
  
  // Check against all words (simple substring match)
  for (const word of ABUSIVE_WORDS) {
    // Create a regex that matches the word with word boundaries
    const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
    if (regex.test(normalizedText)) {
      return true
    }
  }
  
  return false
}

/**
 * Get the first abusive word found in text
 * @param {string} text - Text to check
 * @returns {string|null} - First abusive word found or null
 */
export function getAbusiveWord(text) {
  if (!text || typeof text !== 'string') return null
  
  const normalizedText = text.toLowerCase().trim()
  
  for (const word of ABUSIVE_WORDS) {
    const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
    if (regex.test(normalizedText)) {
      return word
    }
  }
  
  return null
}

/**
 * Clean text by replacing abusive words with asterisks
 * @param {string} text - Text to clean
 * @returns {string} - Cleaned text
 */
export function cleanAbusiveContent(text) {
  if (!text || typeof text !== 'string') return text
  
  let cleanedText = text
  
  for (const word of ABUSIVE_WORDS) {
    const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi')
    cleanedText = cleanedText.replace(regex, (match) => {
      return '*'.repeat(match.length)
    })
  }
  
  return cleanedText
}

/**
 * Validate content before posting
 * @param {string} text - Text to validate
 * @returns {object} - {isValid: boolean, message: string}
 */
export function validateContent(text) {
  if (!text || typeof text !== 'string') {
    return { isValid: false, message: 'Content cannot be empty' }
  }
  
  if (text.trim().length === 0) {
    return { isValid: false, message: 'Content cannot be empty' }
  }
  
  if (containsAbusiveContent(text)) {
    return { 
      isValid: false, 
      message: `⚠️ Inappropriate content detected. Please remove offensive language and try again.`
    }
  }
  
  return { isValid: true, message: '' }
}
