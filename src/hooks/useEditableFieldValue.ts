import { useEffect, useLayoutEffect, useRef, useState } from 'react'

export function useEditableFieldValue(externalValue: string) {
  const [value, setValue] = useState(externalValue)
  const isEditingRef = useRef(false)
  const isDirtyRef = useRef(false)
  const selectionRef = useRef<{ start: number; end: number } | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!isEditingRef.current && !isDirtyRef.current) {
      setValue(externalValue)
    }
  }, [externalValue])

  useLayoutEffect(() => {
    const input = inputRef.current
    const selection = selectionRef.current
    if (!input || selection === null) return

    const length = input.value.length
    const start = Math.min(selection.start, length)
    const end = Math.min(selection.end, length)
    input.setSelectionRange(start, end)
    selectionRef.current = null
  }, [value])

  function rememberSelection(element: HTMLInputElement) {
    inputRef.current = element
    selectionRef.current = {
      start: element.selectionStart ?? element.value.length,
      end: element.selectionEnd ?? element.value.length,
    }
  }

  function handleFocus() {
    isEditingRef.current = true
  }

  function handleBlur() {
    isEditingRef.current = false
  }

  function setValueFromInput(next: string, element: HTMLInputElement) {
    rememberSelection(element)
    isEditingRef.current = true
    isDirtyRef.current = true
    setValue(next)
  }

  function setExternalValue(next: string) {
    isEditingRef.current = false
    isDirtyRef.current = false
    selectionRef.current = null
    setValue(next)
  }

  function commitValue(next: string) {
    isEditingRef.current = false
    isDirtyRef.current = false
    selectionRef.current = null
    setValue(next)
  }

  return {
    value,
    setValueFromInput,
    setExternalValue,
    commitValue,
    inputRef,
    handleFocus,
    handleBlur,
  }
}
