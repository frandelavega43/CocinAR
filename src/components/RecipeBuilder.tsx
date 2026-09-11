import { useEffect, useRef, useState } from 'react'
import { DEFAULT_UNIT } from '../constants/units'
import type { RecipeIngredient } from '../types'
import { useEditableFieldValue } from '../hooks/useEditableFieldValue'
import { EditableNumberInput } from './EditableNumberInput'
import { IngredientAutocomplete, type IngredientSuggestion } from './IngredientAutocomplete'
import { UnitSelect } from './UnitSelect'

interface RecipeBuilderProps {
  ingredients: RecipeIngredient[]
  onAdd: (
    name: string,
    quantity: number,
    unit: string,
    searchQuery?: string,
    manualTotalPrice?: number,
    priceSource?: 'manual' | 'mercado-central',
  ) => void
  onNameCommit: (id: string, name: string, suggestedUnit?: string, searchQuery?: string) => void
  onPersonalIngredientApply: (
    id: string,
    name: string,
    unit: string,
    manualUnitPrice: number,
  ) => void
  onQuantityChange: (id: string, quantity: number) => void
  onUnitChange: (id: string, unit: string) => void
  onRemove: (id: string) => void
}

function IngredientNameField({
  ingredient,
  onCommit,
  onPersonalApply,
}: {
  ingredient: RecipeIngredient
  onCommit: (name: string, suggestedUnit?: string, searchQuery?: string) => void
  onPersonalApply: (name: string, unit: string, manualUnitPrice: number) => void
}) {
  const draftRef = useRef(ingredient.name)
  const {
    value,
    setValueFromInput,
    commitValue,
    handleFocus,
    handleBlur,
  } = useEditableFieldValue(ingredient.name)

  useEffect(() => {
    draftRef.current = ingredient.name
  }, [ingredient.id, ingredient.name])

  if (ingredient.isManual) {
    return (
      <input
        className="ingredient-manual-name"
        value={value}
        onChange={(event) => {
          setValueFromInput(event.target.value, event.target)
          draftRef.current = event.target.value
        }}
        onFocus={handleFocus}
        onBlur={() => {
          const trimmed = draftRef.current.trim()
          if (trimmed && trimmed !== ingredient.name) {
            onCommit(trimmed)
            commitValue(trimmed)
          } else {
            handleBlur()
            commitValue(ingredient.name)
          }
        }}
      />
    )
  }

  return (
    <IngredientAutocomplete
      key={ingredient.id}
      className="ingredient-name-autocomplete"
      value={ingredient.name}
      disabled={ingredient.status === 'loading'}
      onlySearchWhileTyping
      onChange={(next) => {
        draftRef.current = next
      }}
      onSelect={(suggestion, searchQuery) => {
        draftRef.current = suggestion.name
        if (
          (suggestion.isPersonal || suggestion.isFreshReference) &&
          suggestion.manualUnitPrice !== undefined
        ) {
          onPersonalApply(
            suggestion.name,
            suggestion.suggestedUnit ?? ingredient.unit,
            suggestion.manualUnitPrice,
          )
          return
        }
        onCommit(suggestion.name, suggestion.suggestedUnit, searchQuery || undefined)
      }}
      onBlur={() => {
        window.setTimeout(() => {
          const trimmed = draftRef.current.trim()
          if (trimmed && trimmed !== ingredient.name) {
            onCommit(trimmed)
          }
        }, 150)
      }}
    />
  )
}

function formatFetchedAt(value?: string): string | null {
  if (!value) return null
  return new Date(value).toLocaleString('es-AR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function RecipeBuilder({
  ingredients,
  onAdd,
  onNameCommit,
  onPersonalIngredientApply,
  onQuantityChange,
  onUnitChange,
  onRemove,
}: RecipeBuilderProps) {
  const [ingredientNameSeed, setIngredientNameSeed] = useState('')
  const ingredientNameDraftRef = useRef('')
  const selectedPersonalUnitPriceRef = useRef<number | undefined>(undefined)
  const selectedPriceSourceRef = useRef<'manual' | 'mercado-central' | undefined>(undefined)
  const [ingredientSearchQuery, setIngredientSearchQuery] = useState<string | undefined>()
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState(DEFAULT_UNIT)
  const [manualTotalPrice, setManualTotalPrice] = useState('')
  const [isManualMode, setIsManualMode] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const ingredientInputRef = useRef<HTMLInputElement>(null)
  const manualNameInputRef = useRef<HTMLInputElement>(null)
  const quantityInputRef = useRef<HTMLInputElement>(null)
  const priceInputRef = useRef<HTMLInputElement>(null)
  const {
    value: manualIngredientName,
    setValueFromInput: setManualIngredientName,
    setExternalValue: setManualIngredientNameExternal,
    handleFocus: handleManualNameFocus,
    handleBlur: handleManualNameBlur,
  } = useEditableFieldValue('')

  function focusField(ref: { current: HTMLInputElement | HTMLSelectElement | null }, select = false) {
    window.requestAnimationFrame(() => {
      const el = ref.current
      if (!el) return
      el.focus()
      if (select && 'select' in el) {
        el.select()
      }
    })
  }

  function focusQuantity() {
    focusField(quantityInputRef, true)
  }

  function focusIngredientName() {
    if (isManualMode) {
      focusField(manualNameInputRef, true)
    } else {
      focusField(ingredientInputRef, true)
    }
  }

  function resetAddForm() {
    ingredientNameDraftRef.current = ''
    selectedPersonalUnitPriceRef.current = undefined
    selectedPriceSourceRef.current = undefined
    setIngredientNameSeed('')
    setIngredientSearchQuery(undefined)
    setManualIngredientNameExternal('')
    setManualTotalPrice('')
    setQuantity('')
    setUnit(DEFAULT_UNIT)
    setFormError(null)
    if (ingredientInputRef.current) {
      ingredientInputRef.current.value = ''
    }
  }

  function handleSuggestionSelect(suggestion: IngredientSuggestion, searchQuery: string) {
    ingredientNameDraftRef.current = suggestion.name
    setIngredientNameSeed(suggestion.name)
    setIngredientSearchQuery(searchQuery.trim() || undefined)
    if (
      (suggestion.isPersonal || suggestion.isFreshReference) &&
      suggestion.manualUnitPrice !== undefined
    ) {
      selectedPersonalUnitPriceRef.current = suggestion.manualUnitPrice
      selectedPriceSourceRef.current = suggestion.isFreshReference
        ? 'mercado-central'
        : 'manual'
    } else {
      selectedPersonalUnitPriceRef.current = undefined
      selectedPriceSourceRef.current = undefined
    }
    if (suggestion.suggestedUnit) {
      setUnit(suggestion.suggestedUnit)
    }
    setFormError(null)
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = (isManualMode ? manualIngredientName : ingredientNameDraftRef.current).trim()
    const parsedQuantity = Number(quantity)

    if (!name || !unit || Number.isNaN(parsedQuantity) || parsedQuantity <= 0) {
      setFormError('Completá ingrediente, cantidad y unidad.')
      if (!name) {
        focusIngredientName()
      } else {
        focusQuantity()
      }
      return
    }

    if (isManualMode) {
      const trimmedPrice = manualTotalPrice.trim()
      const parsedPrice = Number(trimmedPrice)
      if (
        trimmedPrice === '' ||
        Number.isNaN(parsedPrice) ||
        parsedPrice < 0
      ) {
        setFormError('Ingresá un precio total válido (0 si es gratis).')
        focusField(priceInputRef, true)
        return
      }

      onAdd(name, parsedQuantity, unit, undefined, parsedPrice, 'manual')
      resetAddForm()
      focusIngredientName()
      return
    }

    if (selectedPersonalUnitPriceRef.current !== undefined) {
      onAdd(
        name,
        parsedQuantity,
        unit,
        undefined,
        selectedPersonalUnitPriceRef.current * parsedQuantity,
        selectedPriceSourceRef.current ?? 'manual',
      )
      resetAddForm()
      focusIngredientName()
      return
    }

    onAdd(name, parsedQuantity, unit, ingredientSearchQuery)
    resetAddForm()
    focusIngredientName()
  }

  function handleNameKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return
    const name = (isManualMode ? manualIngredientName : ingredientNameDraftRef.current).trim()
    if (!name) return
    if (!quantity.trim()) {
      event.preventDefault()
      focusQuantity()
    }
  }

  function handleQuantityKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return
    if (!quantity.trim()) return
    if (isManualMode && !manualTotalPrice.trim()) {
      event.preventDefault()
      focusField(priceInputRef, true)
    }
  }

  return (
    <section className="panel recipe-panel">
      <div className="panel-header panel-header-row">
        <div>
          <h2>Ingredientes</h2>
          <p>
            {isManualMode
              ? 'Nombre, cantidad y lo que pagaste. Sin buscar en el súper.'
              : 'Elegí un producto, cargá la cantidad y agregalo. El costo se calcula al instante.'}
          </p>
        </div>
        <div className="ingredient-mode-switch" role="group" aria-label="Modo de precio">
          <button
            type="button"
            className={`ingredient-mode-switch__option${!isManualMode ? ' ingredient-mode-switch__option--active' : ''}`}
            onClick={() => {
              setIsManualMode(false)
              setIngredientSearchQuery(undefined)
              setManualTotalPrice('')
              setFormError(null)
              window.requestAnimationFrame(() => focusField(ingredientInputRef, true))
            }}
          >
            Buscar precio
          </button>
          <button
            type="button"
            className={`ingredient-mode-switch__option${isManualMode ? ' ingredient-mode-switch__option--active' : ''}`}
            onClick={() => {
              setIsManualMode(true)
              setIngredientSearchQuery(undefined)
              setManualTotalPrice('')
              setFormError(null)
              window.requestAnimationFrame(() => focusField(manualNameInputRef, true))
            }}
          >
            Precio manual
          </button>
        </div>
      </div>

      <div className={`add-ingredient-section${isManualMode ? ' add-ingredient-section--manual' : ''}`}>
        <form
          className={`add-ingredient-form${isManualMode ? ' add-ingredient-form--manual' : ''}`}
          onSubmit={handleSubmit}
        >
          <label className="add-ingredient-form__field add-ingredient-form__field--name">
            <span>Ingrediente</span>
            {isManualMode ? (
              <input
                ref={manualNameInputRef}
                className="recipe-form-input"
                value={manualIngredientName}
                onChange={(event) => setManualIngredientName(event.target.value, event.target)}
                onFocus={handleManualNameFocus}
                onBlur={handleManualNameBlur}
                onKeyDown={handleNameKeyDown}
                placeholder="Ej: nalga, manteca..."
                required
              />
            ) : (
              <IngredientAutocomplete
                value={ingredientNameSeed}
                inputRef={ingredientInputRef}
                onChange={(next) => {
                  ingredientNameDraftRef.current = next
                  // Al escribir (no al elegir sugerencia), se invalida el precio sticky.
                  selectedPersonalUnitPriceRef.current = undefined
                  selectedPriceSourceRef.current = undefined
                  setIngredientSearchQuery(undefined)
                }}
                onSelect={handleSuggestionSelect}
                onAfterSelect={focusQuantity}
                placeholder="Ej: harina, huevos, cebolla..."
                required
              />
            )}
          </label>
          <label className="add-ingredient-form__field add-ingredient-form__field--qty">
            <span>Cantidad</span>
            <input
              ref={quantityInputRef}
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              onFocus={(event) => event.currentTarget.select()}
              onKeyDown={handleQuantityKeyDown}
              type="number"
              min={0}
              step="any"
              inputMode="decimal"
              placeholder="500"
              required
            />
          </label>
          <label className="add-ingredient-form__field add-ingredient-form__field--unit">
            <span>Unidad</span>
            <UnitSelect value={unit} onChange={setUnit} />
          </label>
          {isManualMode ? (
            <label className="add-ingredient-form__field add-ingredient-form__field--price">
              <span>Precio total ($)</span>
              <input
                ref={priceInputRef}
                value={manualTotalPrice}
                onChange={(event) => setManualTotalPrice(event.target.value)}
                onFocus={(event) => event.currentTarget.select()}
                type="number"
                min={0}
                step="any"
                inputMode="decimal"
                placeholder="0"
                required
              />
            </label>
          ) : null}
          <button type="submit" className="primary-button add-ingredient-form__submit">
            Agregar
          </button>
        </form>
      </div>

      {formError && <p className="status error">{formError}</p>}

      {ingredients.length === 0 ? (
        <p className="empty-state">
          Empezá buscando un ingrediente arriba. Podés mezclar precios de súper, Mercado Central y
          precios manuales en la misma receta.
        </p>
      ) : (
        <ul className="ingredient-list">
          {ingredients.map((ingredient) => {
            const fetchedAt = formatFetchedAt(ingredient.priceFetchedAt)

            return (
              <li key={ingredient.id} className="ingredient-row">
                <div className="ingredient-info">
                  <IngredientNameField
                    ingredient={ingredient}
                    onCommit={(name, suggestedUnit, searchQuery) =>
                      onNameCommit(ingredient.id, name, suggestedUnit, searchQuery)
                    }
                    onPersonalApply={(name, unit, manualUnitPrice) =>
                      onPersonalIngredientApply(ingredient.id, name, unit, manualUnitPrice)
                    }
                  />
                  {ingredient.isManual && (
                    <span className="ingredient-status ingredient-status--manual">
                      Manual · $
                      {ingredient.averageUnitPrice.toLocaleString('es-AR', {
                        maximumFractionDigits: 2,
                      })}{' '}
                      / {ingredient.unit}
                    </span>
                  )}
                  {!ingredient.isManual &&
                    ingredient.priceSource === 'mercado-central' &&
                    ingredient.status === 'ready' && (
                      <span className="ingredient-status ingredient-status--fresh">
                        Mercado Central · estimado verdulería · $
                        {ingredient.averageUnitPrice.toLocaleString('es-AR', {
                          maximumFractionDigits: 2,
                        })}{' '}
                        / {ingredient.unit}
                        {fetchedAt ? ` · ${fetchedAt}` : ''}
                      </span>
                    )}
                  {ingredient.status === 'loading' && (
                    <span className="ingredient-status">Buscando precios...</span>
                  )}
                  {ingredient.status === 'error' && (
                    <span className="ingredient-status error">
                      {ingredient.errorMessage ?? 'No se pudo calcular el costo.'}
                    </span>
                  )}
                  {!ingredient.isManual &&
                    ingredient.priceSource !== 'mercado-central' &&
                    ingredient.status === 'ready' && (
                    <span className="ingredient-status">
                      {`Promedio de ${ingredient.brandCount ?? 0} marca${
                        (ingredient.brandCount ?? 0) === 1 ? '' : 's'
                      } · $`}
                      {ingredient.averageUnitPrice.toLocaleString('es-AR', {
                        maximumFractionDigits: 2,
                      })}
                      {` / ${ingredient.unit}`}
                      {fetchedAt ? ` · ${fetchedAt}` : ''}
                    </span>
                  )}
                </div>

                <div className="ingredient-controls">
                  <EditableNumberInput
                    min={0}
                    step="any"
                    value={ingredient.quantity}
                    emptyFallback={0}
                    disabled={ingredient.status === 'loading'}
                    onValueChange={(next) => onQuantityChange(ingredient.id, Math.max(0, next))}
                    aria-label={`Cantidad de ${ingredient.name}`}
                  />
                  <UnitSelect
                    value={ingredient.unit}
                    disabled={ingredient.status === 'loading'}
                    onChange={(nextUnit) => onUnitChange(ingredient.id, nextUnit)}
                  />
                  <button
                    type="button"
                    className="ingredient-remove"
                    onClick={() => onRemove(ingredient.id)}
                    aria-label={`Quitar ${ingredient.name}`}
                  >
                    Quitar
                  </button>
                </div>

                <div className="ingredient-cost" aria-label={`Costo de ${ingredient.name}`}>
                  {ingredient.status === 'ready'
                    ? `$${ingredient.lineCost.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`
                    : '—'}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

