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
        if (suggestion.isPersonal && suggestion.manualUnitPrice !== undefined) {
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
  const [ingredientSearchQuery, setIngredientSearchQuery] = useState<string | undefined>()
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState(DEFAULT_UNIT)
  const [manualTotalPrice, setManualTotalPrice] = useState('')
  const [isManualMode, setIsManualMode] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const {
    value: manualIngredientName,
    setValueFromInput: setManualIngredientName,
    setExternalValue: setManualIngredientNameExternal,
    handleFocus: handleManualNameFocus,
    handleBlur: handleManualNameBlur,
  } = useEditableFieldValue('')

  function resetAddForm() {
    ingredientNameDraftRef.current = ''
    selectedPersonalUnitPriceRef.current = undefined
    setIngredientNameSeed('')
    setIngredientSearchQuery(undefined)
    setManualIngredientNameExternal('')
    setManualTotalPrice('')
    setQuantity('')
    setUnit(DEFAULT_UNIT)
    setFormError(null)
  }

  function handleSuggestionSelect(suggestion: IngredientSuggestion, searchQuery: string) {
    ingredientNameDraftRef.current = suggestion.name
    setIngredientNameSeed(suggestion.name)
    setIngredientSearchQuery(searchQuery.trim() || undefined)
    if (suggestion.isPersonal && suggestion.manualUnitPrice !== undefined) {
      selectedPersonalUnitPriceRef.current = suggestion.manualUnitPrice
    } else {
      selectedPersonalUnitPriceRef.current = undefined
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
        return
      }

      onAdd(name, parsedQuantity, unit, undefined, parsedPrice)
      resetAddForm()
      return
    }

    if (selectedPersonalUnitPriceRef.current !== undefined) {
      onAdd(
        name,
        parsedQuantity,
        unit,
        undefined,
        selectedPersonalUnitPriceRef.current * parsedQuantity,
      )
      resetAddForm()
      return
    }

    onAdd(name, parsedQuantity, unit, ingredientSearchQuery)
    resetAddForm()
  }

  return (
    <section className="panel recipe-panel">
      <div className="panel-header">
        <h2>Ingredientes</h2>
        <p>
          {isManualMode
            ? 'Cargá el ingrediente y el precio total que pagaste, sin buscar en supermercados.'
            : 'Al agregar un ingrediente calculamos el costo al instante con el precio promedio de todas las marcas.'}
        </p>
      </div>

      <div className={`add-ingredient-section${isManualMode ? ' add-ingredient-section--manual' : ''}`}>
        <div className="ingredient-mode-switch" role="group" aria-label="Modo de precio">
          <button
            type="button"
            className={`ingredient-mode-switch__option${!isManualMode ? ' ingredient-mode-switch__option--active' : ''}`}
            onClick={() => {
              setIsManualMode(false)
              setIngredientSearchQuery(undefined)
              setManualTotalPrice('')
              setFormError(null)
            }}
          >
            Supermercado
          </button>
          <button
            type="button"
            className={`ingredient-mode-switch__option${isManualMode ? ' ingredient-mode-switch__option--active' : ''}`}
            onClick={() => {
              setIsManualMode(true)
              setIngredientSearchQuery(undefined)
              setManualTotalPrice('')
              setFormError(null)
            }}
          >
            Precio manual
          </button>
        </div>

        <form
          className={`add-ingredient-form${isManualMode ? ' add-ingredient-form--manual' : ''}`}
          onSubmit={handleSubmit}
        >
          <label>
            <span>Ingrediente</span>
            {isManualMode ? (
              <input
                className="recipe-form-input"
                value={manualIngredientName}
                onChange={(event) => setManualIngredientName(event.target.value, event.target)}
                onFocus={handleManualNameFocus}
                onBlur={handleManualNameBlur}
                placeholder="Ej: manteca, esencia de vainilla..."
                required
              />
            ) : (
              <IngredientAutocomplete
                value={ingredientNameSeed}
                onChange={(next) => {
                  ingredientNameDraftRef.current = next
                  selectedPersonalUnitPriceRef.current = undefined
                }}
                onSelect={handleSuggestionSelect}
                placeholder="Ej: harina, huevos, manteca..."
                required
              />
            )}
          </label>
          <label>
            <span>Cantidad</span>
            <input
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              type="number"
              min={0}
              step="any"
              placeholder="500"
              required
            />
          </label>
          <label>
            <span>Unidad</span>
            <UnitSelect value={unit} onChange={setUnit} />
          </label>
          {isManualMode ? (
            <label>
              <span>Precio total ($)</span>
              <input
                value={manualTotalPrice}
                onChange={(event) => setManualTotalPrice(event.target.value)}
                type="number"
                min={0}
                step="any"
                placeholder="0"
                required
              />
            </label>
          ) : null}
          <button type="submit" className="primary-button">
            Agregar
          </button>
        </form>
      </div>

      {formError && <p className="status error">{formError}</p>}

      {ingredients.length === 0 ? (
        <p className="empty-state">
          Agregá los ingredientes de tu receta. El costo se calcula solo al agregar cada uno.
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
                      Precio cargado manualmente · $
                      {ingredient.averageUnitPrice.toLocaleString('es-AR', {
                        maximumFractionDigits: 2,
                      })}{' '}
                      / {ingredient.unit}
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
                  {!ingredient.isManual && ingredient.status === 'ready' && (
                    <span>
                      Promedio de {ingredient.brandCount ?? 0} marca
                      {(ingredient.brandCount ?? 0) === 1 ? '' : 's'} · $
                      {ingredient.averageUnitPrice.toLocaleString('es-AR', {
                        maximumFractionDigits: 2,
                      })}{' '}
                      / {ingredient.unit}
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
                  <button type="button" onClick={() => onRemove(ingredient.id)}>
                    Quitar
                  </button>
                </div>

                <div className="ingredient-cost">
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
