import { DEFAULT_UNIT, UNIT_OPTIONS } from '../constants/units'

interface UnitSelectProps {
  name?: string
  value?: string
  disabled?: boolean
  onChange?: (unit: string) => void
  onBlur?: () => void
}

export function UnitSelect({ name, value, disabled, onChange, onBlur }: UnitSelectProps) {
  const selected = value ?? DEFAULT_UNIT

  return (
    <select
      name={name}
      className="unit-select"
      value={selected}
      disabled={disabled}
      onChange={(event) => onChange?.(event.target.value)}
      onBlur={onBlur}
    >
      {UNIT_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}
