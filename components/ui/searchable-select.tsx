'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { ChevronDown, Search, X, Check } from 'lucide-react'

export interface SelectOption {
  value: string | number
  label: string
  sublabel?: string
  disabled?: boolean
}

export interface SearchableSelectProps {
  value?: string | number
  onChange: (value: string) => void
  options: (SelectOption | string)[]
  placeholder?: string
  searchPlaceholder?: string
  className?: string
  disabled?: boolean
  required?: boolean
  id?: string
  name?: string
}

function normalizeStr(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export default function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = 'Sélectionner...',
  searchPlaceholder = 'Rechercher...',
  className = '',
  disabled = false,
  required = false,
  id,
  name,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Normalize options array into SelectOption[]
  const normalizedOptions: SelectOption[] = useMemo(() => {
    return options.map((opt) => {
      if (typeof opt === 'string' || typeof opt === 'number') {
        return { value: String(opt), label: String(opt) }
      }
      return { ...opt, value: String(opt.value) }
    })
  }, [options])

  // Find currently selected option
  const selectedOption = useMemo(() => {
    if (value === undefined || value === null || value === '') return null
    return normalizedOptions.find((opt) => String(opt.value) === String(value)) || null
  }, [normalizedOptions, value])

  // Filter options based on search input
  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return normalizedOptions
    const term = normalizeStr(searchTerm)
    return normalizedOptions.filter((opt) => {
      const matchLabel = normalizeStr(opt.label).includes(term)
      const matchSublabel = opt.sublabel ? normalizeStr(opt.sublabel).includes(term) : false
      const matchVal = normalizeStr(String(opt.value)).includes(term)
      return matchLabel || matchSublabel || matchVal
    })
  }, [normalizedOptions, searchTerm])

  // Handle Outside Click to Close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchTerm('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle ESC key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
        setSearchTerm('')
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  // Focus search input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50)
    }
  }, [isOpen])

  const handleSelect = (opt: SelectOption) => {
    if (opt.disabled) return
    onChange(String(opt.value))
    setIsOpen(false)
    setSearchTerm('')
  }

  return (
    <div ref={containerRef} className={`relative inline-block w-full text-left ${className}`}>
      {/* Hidden native input for form compatibility */}
      {name && (
        <input
          type="hidden"
          name={name}
          id={id}
          value={value !== undefined && value !== null ? String(value) : ''}
          required={required}
        />
      )}

      {/* Select trigger button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
          disabled
            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
            : isOpen
            ? 'bg-white text-slate-900 border-blue-600 ring-2 ring-blue-500/20 shadow-xs'
            : 'bg-white text-slate-800 border-slate-300 hover:border-slate-400 shadow-2xs'
        }`}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : <span className="text-slate-400">{placeholder}</span>}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-blue-600' : ''
          }`}
        />
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute z-50 mt-1.5 w-full min-w-[200px] bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100">
          {/* Search Header */}
          <div className="p-2 border-b border-slate-100 bg-slate-50/70">
            <div className="relative flex items-center">
              <Search className="absolute left-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 text-slate-400 hover:text-slate-600 p-0.5 rounded-md"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-56 overflow-y-auto p-1 divide-y divide-slate-50">
            {filteredOptions.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-400 font-medium">
                Aucun résultat trouvé
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = selectedOption && String(selectedOption.value) === String(opt.value)
                return (
                  <button
                    key={String(opt.value)}
                    type="button"
                    disabled={opt.disabled}
                    onClick={() => handleSelect(opt)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-colors cursor-pointer text-left ${
                      opt.disabled
                        ? 'opacity-40 cursor-not-allowed text-slate-400'
                        : isSelected
                        ? 'bg-blue-50 text-blue-800 font-bold'
                        : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-900 font-medium'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <div className="truncate">{opt.label}</div>
                      {opt.sublabel && (
                        <div className="text-[10px] text-slate-400 font-normal truncate mt-0.5">
                          {opt.sublabel}
                        </div>
                      )}
                    </div>
                    {isSelected && <Check className="h-3.5 w-3.5 text-blue-600 shrink-0 ml-1" />}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
