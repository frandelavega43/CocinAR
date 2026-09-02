import { useEffect, useRef, useState } from 'react'

interface UseEditableNumberInputOptions {
  /** Valor numérico externo (fuente de verdad). */
  value: number
  /** Se llama solo cuando el texto parsea a un número finito. */
  onChange: (value: number) => void
  /** Si el campo queda vacío al salir, restaura este valor (por defecto el externo). */
  emptyFallback?: number
}

/**
 * Permite vaciar un input numérico controlado mientras se edita,
 * sin forzar un dígito con `Number('') || 1`.
 */
export function useEditableNumberInput({
  value,
  onChange,
  emptyFallback,
}: UseEditableNumberInputOptions) {
  const [draft, setDraft] = useState(() => String(value))
  const isEditingRef = useRef(false)

  useEffect(() => {
    if (!isEditingRef.current) {
      setDraft(String(value))
    }
  }, [value])

  function handleChange(raw: string) {
    isEditingRef.current = true
    setDraft(raw)

    if (raw.trim() === '') return

    const parsed = Number(raw)
    if (Number.isFinite(parsed)) {
      onChange(parsed)
    }
  }

  function handleFocus() {
    isEditingRef.current = true
  }

  function handleBlur() {
    isEditingRef.current = false

    if (draft.trim() === '') {
      const fallback = emptyFallback ?? value
      setDraft(String(fallback))
      if (fallback !== value) {
        onChange(fallback)
      }
      return
    }

    const parsed = Number(draft)
    if (Number.isFinite(parsed)) {
      setDraft(String(parsed))
      if (parsed !== value) {
        onChange(parsed)
      }
    } else {
      setDraft(String(value))
    }
  }

  return {
    value: draft,
    onChange: (event: { target: { value: string } }) => handleChange(event.target.value),
    onFocus: handleFocus,
    onBlur: handleBlur,
  }
}
