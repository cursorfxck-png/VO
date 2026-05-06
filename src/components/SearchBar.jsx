import { Search } from 'lucide-react'
import './SearchBar.css'

export default function SearchBar({ value, onChange, placeholder = "Search", autoFocus = false }) {
  return (
    <div className="search-bar-container">
      <div className="search-icon-wrapper">
        <Search size={20} color="#71767b" strokeWidth={2} />
      </div>
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="search-input"
      />
    </div>
  )
}