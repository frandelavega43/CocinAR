import { useEffect, useId, useRef, useState, type RefObject } from 'react'
import {
  peekIngredientSuggestions,
  searchIngredientSuggestions,
} from '../services/api'
import type { IngredientSuggestion } from '../services/api'
import { searchPersonalIngredientSuggestions } from '../services/personalIngredientSearch'
import { formatPrice } from '../services/presentationParser'

const MIN_CHARS = 2
const DEBOUNCE_MS = 120
const RESULT_LIMIT = 18

interface IngredientAutocompleteProps {
  value: string
  onChange?: (value: string) => void
  onSelect?: (suggestion: IngredientSuggestion, searchQuery: string) => void
  /** Se llama después de elegir una sugerencia (útil para mover el foco). */
  onAfterSelect?: () => void
  onFocus?: () => void
  onBlur?: () => void
  name?: string
  placeholder?: string
  disabled?: boolean
  required?: boolean
  className?: string
  inputRef?: RefObject<HTMLInputElement | null>
  /** En ingredientes ya cargados: no buscar ni mostrar sugerencias hasta que el usuario escriba. */
  onlySearchWhileTyping?: boolean
}

export function IngredientAutocomplete({
  value,
  onChange,
  onSelect,
  onAfterSelect,
  onFocus,
  onBlur,
  name,
  placeholder,
  disabled,
  required,
  className,
  inputRef: inputRefProp,
  onlySearchWhileTyping = false,
}: IngredientAutocompleteProps) {
  const listId = useId()
  const containerRef = useRef<HTMLDivElement>(null)
  const localInputRef = useRef<HTMLInputElement>(null)
  const inputRef = inputRefProp ?? localInputRef
  const requestIdRef = useRef(0)
  const draftRef = useRef(value)
  const isFocusedRef = useRef(false)
  const [searchTerm, setSearchTerm] = useState(value)
  const [suggestions, setSuggestions] = useState<IngredientSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [hasSearched, setHasSearched] = useState(false)
  const [isTyping, setIsTyping] = useState(false)

  const skipNextSearchRef = useRef(false)

  useEffect(() => {
    if (value === '') {
      draftRef.current = ''
      setSearchTerm('')
      setIsTyping(false)
      if (inputRef.current) {
        inputRef.current.value = ''
      }
      return
    }

    if (isFocusedRef.current) return

    draftRef.current = value
    setSearchTerm(value)
    setIsTyping(false)
    if (inputRef.current) {
      inputRef.current.value = value
    }
  }, [value])

  useEffect(() => {
    if (skipNextSearchRef.current) {
      skipNextSearchRef.current = false
      setOpen(false)
      setSuggestions([])
      setLoading(false)
      setHasSearched(false)
      return
    }

    const trimmed = searchTerm.trim()
    const shouldSearch = !onlySearchWhileTyping || isTyping

    if (!shouldSearch || trimmed.length < MIN_CHARS) {
      setSuggestions([])
      setOpen(false)
      setLoading(false)
      setHasSearched(false)
      return
    }

    const controller = new AbortController()
    const currentRequest = ++requestIdRef.current
    const cached = peekIngredientSuggestions(trimmed, RESULT_LIMIT)
    const personal = searchPersonalIngredientSuggestions(trimmed, RESULT_LIMIT)

    setOpen(true)
    setActiveIndex(-1)

    if (cached && cached.length > 0) {
      setSuggestions(cached)
      setLoading(false)
      setHasSearched(true)
    } else {
      // Mantener resultados previos mientras carga; si no hay, mostrar personales.
      setSuggestions((current) => {
        if (personal.length > 0) {
          const names = new Set(personal.map((item) => item.name.toLowerCase()))
          const rest = current.filter((item) => !names.has(item.name.toLowerCase()))
          return [...personal, ...rest].slice(0, RESULT_LIMIT)
        }
        return current
      })
      setLoading(true)
      setHasSearched(personal.length > 0)
    }

    const delay = cached ? 0 : DEBOUNCE_MS
    const timeout = window.setTimeout(async () => {
      try {
        const results = await searchIngredientSuggestions(
          trimmed,
          RESULT_LIMIT,
          controller.signal,
        )

        if (currentRequest !== requestIdRef.current) return

        setSuggestions(results)
        setOpen(true)
        setActiveIndex(-1)
        setHasSearched(true)
      } catch (error) {
        if (controller.signal.aborted) return
        if (currentRequest !== requestIdRef.current) return

        setHasSearched(true)
      } finally {
        if (currentRequest === requestIdRef.current) {
          setLoading(false)
        }
      }
    }, delay)

    return () => {
      controller.abort()
      window.clearTimeout(timeout)
    }
  }, [searchTerm, onlySearchWhileTyping, isTyping])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function pickSuggestion(suggestion: IngredientSuggestion) {
    const searchQuery = draftRef.current.trim()
    draftRef.current = suggestion.name
    skipNextSearchRef.current = true
    setSearchTerm(suggestion.name)
    if (inputRef.current) {
      inputRef.current.value = suggestion.name
    }
    // No llamar onChange acá: en el padre limpia precio manual/fresco.
    // onSelect es quien aplica nombre + precio sticky.
    onSelect?.(suggestion, searchQuery)
    setIsTyping(false)
    setOpen(false)
    setSuggestions([])
    setHasSearched(false)
    window.requestAnimationFrame(() => {
      onAfterSelect?.()
    })
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape' && open) {
      event.preventDefault()
      setOpen(false)
      return
    }

    if (event.key === 'ArrowDown' && open && suggestions.length > 0) {
      event.preventDefault()
      setActiveIndex((current) => (current + 1) % suggestions.length)
      return
    }

    if (event.key === 'ArrowUp' && open && suggestions.length > 0) {
      event.preventDefault()
      setActiveIndex((current) => (current <= 0 ? suggestions.length - 1 : current - 1))
      return
    }

    if (event.key === 'Enter') {
      if (open && suggestions.length > 0 && activeIndex >= 0) {
        event.preventDefault()
        pickSuggestion(suggestions[activeIndex])
        return
      }

      // Sin ítem resaltado: no forzar la 1ª sugerencia (rompe carne a granel / texto libre).
      // Si ya hay nombre, pasar al siguiente campo.
      if (draftRef.current.trim()) {
        event.preventDefault()
        setOpen(false)
        window.requestAnimationFrame(() => {
          onAfterSelect?.()
        })
      }
    }
  }

  const showDropdown =
    open && searchTerm.trim().length >= MIN_CHARS && (!onlySearchWhileTyping || isTyping)

  return (
    <div className={`autocomplete ${className ?? ''}`} ref={containerRef}>
      <input
        ref={inputRef}
        name={name}
        type="text"
        defaultValue={value}
        disabled={disabled}
        required={required}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={showDropdown}
        aria-controls={listId}
        aria-autocomplete="list"
        onChange={(event) => {
          const next = event.target.value
          draftRef.current = next
          setSearchTerm(next)
          onChange?.(next)
          if (onlySearchWhileTyping) {
            setIsTyping(true)
          }
          setOpen(true)
        }}
        onFocus={() => {
          isFocusedRef.current = true
          onFocus?.()
          if (onlySearchWhileTyping) {
            setIsTyping(false)
            setOpen(false)
            return
          }
          if (draftRef.current.trim().length >= MIN_CHARS) setOpen(true)
        }}
        onBlur={() => {
          isFocusedRef.current = false
          setIsTyping(false)
          window.setTimeout(() => {
            setOpen(false)
            onBlur?.()
          }, 150)
        }}
        onKeyDown={handleKeyDown}
      />

      {showDropdown && (
        <ul className="autocomplete-list" id={listId} role="listbox">
          {loading && (
            <li className="autocomplete-status">Buscando en supermercados...</li>
          )}
          {!loading && hasSearched && suggestions.length === 0 && (
            <li className="autocomplete-status">No encontramos ese producto</li>
          )}
          {suggestions.map((suggestion, index) => (
            <li
              key={
                suggestion.personalIngredientId ??
                suggestion.productId ??
                `${suggestion.name}-${index}`
              }
            >
              <button
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                className={[
                  index === activeIndex ? 'active' : '',
                  suggestion.isPersonal ? 'personal' : '',
                  suggestion.isFreshReference ? 'fresh' : '',
                ]
                  .filter(Boolean)
                  .join(' ') || undefined}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => pickSuggestion(suggestion)}
              >
                <strong>{suggestion.name}</strong>
                <span>
                  {suggestion.isPersonal
                    ? [
                        suggestion.brand,
                        `$${(suggestion.manualUnitPrice ?? 0).toLocaleString('es-AR', {
                          maximumFractionDigits: 2,
                        })} / ${suggestion.suggestedUnit ?? 'u'}`,
                      ]
                        .filter(Boolean)
                        .join(' · ')
                    : suggestion.isFreshReference
                      ? [
                          'Mercado Central',
                          suggestion.priceMin
                            ? `~$${suggestion.priceMin.toLocaleString('es-AR', {
                                maximumFractionDigits: 0,
                              })} / ${suggestion.suggestedUnit ?? 'kg'}`
                            : null,
                          'estimado verdulería',
                        ]
                          .filter(Boolean)
                          .join(' · ')
                      : [
                        suggestion.brand,
                        suggestion.presentacion,
                        suggestion.priceMin
                          ? `desde ${formatPrice(suggestion.priceMin)}`
                          : null,
                        suggestion.storeCount
                          ? `${suggestion.storeCount} super${suggestion.storeCount === 1 ? '' : 's'}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(' · ') || 'Producto de supermercado'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export type { IngredientSuggestion }
