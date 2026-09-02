import type { InputHTMLAttributes } from 'react'
import { useEditableNumberInput } from '../hooks/useEditableNumberInput'

interface EditableNumberInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value: number
  onValueChange: (value: number) => void
  emptyFallback?: number
}

export function EditableNumberInput({
  value,
  onValueChange,
  emptyFallback,
  onBlur,
  onFocus,
  ...props
}: EditableNumberInputProps) {
  const editable = useEditableNumberInput({
    value,
    onChange: onValueChange,
    emptyFallback,
  })

  return (
    <input
      {...props}
      type="number"
      value={editable.value}
      onChange={editable.onChange}
      onFocus={(event) => {
        editable.onFocus()
        onFocus?.(event)
      }}
      onBlur={(event) => {
        editable.onBlur()
        onBlur?.(event)
      }}
    />
  )
}
