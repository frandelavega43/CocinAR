import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CostSummary } from './components/CostSummary'
import { CostTotalBar } from './components/CostTotalBar'
import { RecipeBuilder } from './components/RecipeBuilder'
import { RecipeStepsEditor } from './components/RecipeStepsEditor'
import { SavedRecipesPanel } from './components/SavedRecipesPanel'
import { isUsingMockData } from './services/api'
import { calculateIngredientCostSafe, calculateRecipeCost } from './services/costCalculator'
import { countUniqueBrands } from './services/marketPrice'
import {
  createLoadingIngredient,
  createManualIngredient,
  fetchPricesForIngredients,
  recalculateManualIngredient,
  resolveIngredientFromCache,
  restoreManualIngredient,
} from './services/ingredientResolver'
import {
  downloadRecipesBackup,
  mergeImportedRecipes,
  parseRecipesBackup,
} from './services/recipeBackup'
import {
  deleteRecipe,
  duplicateRecipe,
  getLastActiveRecipeId,
  getSavedRecipes,
  saveAllRecipes,
  saveRecipe,
  setLastActiveRecipeId,
  toSavedIngredients,
} from './services/recipeStorage'
import { normalizeRecipeSteps, serializeRecipeSteps } from './services/recipeSteps'
import type { RecipeIngredient, SavedRecipe } from './types'
import './index.css'

function toSavedRecipe(
  id: string | null,
  name: string,
  steps: string[],
  servings: number,
  ingredients: RecipeIngredient[],
): SavedRecipe {
  const savedSteps = serializeRecipeSteps(steps)

  return {
    id: id ?? crypto.randomUUID(),
    name: name.trim(),
    steps: savedSteps.length > 0 ? savedSteps : undefined,
    servings,
    ingredients: toSavedIngredients(
      ingredients.map((ingredient) => ({
        id: ingredient.id,
        name: ingredient.name,
        searchQuery: ingredient.searchQuery,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        isManual: ingredient.isManual,
        manualUnitPrice: ingredient.manualUnitPrice,
      })),
    ),
    updatedAt: new Date().toISOString(),
  }
}

type AppView = 'editor' | 'recipes'

function App() {
  const [activeView, setActiveView] = useState<AppView>('editor')
  const [recipeName, setRecipeName] = useState('')
  const [recipeSteps, setRecipeSteps] = useState<string[]>([])
  const [activeRecipeId, setActiveRecipeId] = useState<string | null>(null)
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([])
  const [servings, setServings] = useState(4)
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>(() => getSavedRecipes())
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'pending' | 'saved' | 'error'>(
    'idle',
  )
  const [autosaveError, setAutosaveError] = useState<string | null>(null)
  const [isFetchingPrices, setIsFetchingPrices] = useState(false)
  const skipAutosaveRef = useRef(true)
  const draftRecipeIdRef = useRef<string | null>(null)
  const hasRestoredRecipeRef = useRef(false)

  const canAutosave =
    recipeName.trim().length > 0 &&
    (ingredients.length > 0 || activeRecipeId !== null || draftRecipeIdRef.current !== null)

  const recipeSnapshot = useMemo(
    () =>
      JSON.stringify({
        name: recipeName.trim(),
        steps: serializeRecipeSteps(recipeSteps),
        servings,
        ingredients: ingredients.map((ingredient) => ({
          id: ingredient.id,
          name: ingredient.name,
          searchQuery: ingredient.searchQuery,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          isManual: ingredient.isManual,
          manualUnitPrice: ingredient.manualUnitPrice,
        })),
      }),
    [recipeName, recipeSteps, servings, ingredients],
  )

  const breakdown = useMemo(
    () => calculateRecipeCost(ingredients, servings),
    [ingredients, servings],
  )

  const fetchPrices = useCallback(async (items: RecipeIngredient[]) => {
    if (items.length === 0) return

    const targets = items.map((ingredient) => ({
      id: ingredient.id,
      name: ingredient.name,
      searchQuery: ingredient.searchQuery,
      quantity: ingredient.quantity,
      unit: ingredient.unit,
    }))

    setIsFetchingPrices(true)
    setIngredients((current) =>
      current.map((ingredient) => {
        if (!targets.some((target) => target.id === ingredient.id)) return ingredient
        return createLoadingIngredient(
          ingredient.name,
          ingredient.quantity,
          ingredient.unit,
          ingredient.searchQuery,
          ingredient.id,
        )
      }),
    )

    const resolved = await fetchPricesForIngredients(targets)

    setIngredients((current) =>
      current.map((ingredient) => {
        const match = resolved.find((item) => item.id === ingredient.id)
        return match ?? ingredient
      }),
    )
    setIsFetchingPrices(false)
  }, [])

  const loadRecipe = useCallback(async (recipe: SavedRecipe) => {
    skipAutosaveRef.current = true
    draftRecipeIdRef.current = recipe.id
    setRecipeName(recipe.name)
    setRecipeSteps(normalizeRecipeSteps(recipe.steps))
    setActiveRecipeId(recipe.id)
    setServings(recipe.servings)
    setLastActiveRecipeId(recipe.id)

    const restored = recipe.ingredients.map((ingredient) => {
      if (ingredient.isManual) {
        return restoreManualIngredient(ingredient)
      }

      return resolveIngredientFromCache(
        ingredient.name,
        ingredient.quantity,
        ingredient.unit,
        ingredient.searchQuery,
        ingredient.id,
      )
    })
    setIngredients(restored)

    const needsPrices = restored.filter((ingredient) => ingredient.status !== 'ready')
    if (needsPrices.length > 0) {
      await fetchPrices(needsPrices)
    }

    skipAutosaveRef.current = false
  }, [fetchPrices])

  useEffect(() => {
    if (hasRestoredRecipeRef.current) return
    hasRestoredRecipeRef.current = true

    const lastId = getLastActiveRecipeId()
    if (!lastId) {
      skipAutosaveRef.current = false
      return
    }

    const recipe = getSavedRecipes().find((item) => item.id === lastId)
    if (!recipe) {
      setLastActiveRecipeId(null)
      skipAutosaveRef.current = false
      return
    }

    void loadRecipe(recipe)
  }, [loadRecipe])

  useEffect(() => {
    if (skipAutosaveRef.current || !canAutosave) {
      setAutosaveStatus('idle')
      setAutosaveError(null)
      return
    }

    setAutosaveStatus('pending')
    setAutosaveError(null)

    const timer = window.setTimeout(() => {
      try {
        const recipeId = activeRecipeId ?? draftRecipeIdRef.current ?? crypto.randomUUID()
        draftRecipeIdRef.current = recipeId

        const recipe = toSavedRecipe(
          recipeId,
          recipeName,
          recipeSteps,
          servings,
          ingredients,
        )
        const next = saveRecipe(recipe)
        setSavedRecipes(next)
        setActiveRecipeId(recipe.id)
        setLastActiveRecipeId(recipe.id)
        setAutosaveStatus('saved')
      } catch (error) {
        setAutosaveStatus('error')
        setAutosaveError(
          error instanceof Error ? error.message : 'No se pudo guardar la receta.',
        )
      }
    }, 600)

    return () => window.clearTimeout(timer)
  }, [recipeSnapshot, canAutosave, activeRecipeId, recipeName, recipeSteps, servings, ingredients])

  useEffect(() => {
    if (autosaveStatus !== 'saved') return

    const timer = window.setTimeout(() => {
      setAutosaveStatus('idle')
    }, 2500)

    return () => window.clearTimeout(timer)
  }, [autosaveStatus])

  const pendingCount = ingredients.filter(
    (ingredient) => ingredient.status === 'pending' || ingredient.status === 'loading',
  ).length

  const fetchIngredientPrices = useCallback(
    async (item: {
      id: string
      name: string
      searchQuery?: string
      quantity: number
      unit: string
    }) => {
      setIsFetchingPrices(true)

      const [resolved] = await fetchPricesForIngredients([item])

      setIngredients((current) =>
        current.map((ingredient) => (ingredient.id === item.id ? resolved : ingredient)),
      )
      setIsFetchingPrices(false)
    },
    [],
  )

  async function handleAdd(
    name: string,
    quantity: number,
    unit: string,
    searchQuery?: string,
    manualTotalPrice?: number,
  ) {
    const id = crypto.randomUUID()

    if (manualTotalPrice !== undefined) {
      setIngredients((current) => [
        ...current,
        createManualIngredient(name, quantity, unit, manualTotalPrice, id),
      ])
      return
    }

    const cached = resolveIngredientFromCache(name, quantity, unit, searchQuery, id)

    if (cached.status === 'ready') {
      setIngredients((current) => [...current, cached])
      return
    }

    setIngredients((current) => [
      ...current,
      createLoadingIngredient(name, quantity, unit, searchQuery, id),
    ])

    await fetchIngredientPrices({ id, name, searchQuery, quantity, unit })
  }

  function handleQuantityChange(id: string, quantity: number) {
    setIngredients((current) =>
      current.map((ingredient) => {
        if (ingredient.id !== id) return ingredient

        if (ingredient.isManual) {
          return recalculateManualIngredient(ingredient, quantity, ingredient.unit)
        }

        if (ingredient.status === 'ready') {
          const calculated = calculateIngredientCostSafe(
            ingredient.name,
            quantity,
            ingredient.unit,
            ingredient.matchedPrices,
            ingredient.id,
          )

          if (!calculated.ok) {
            return {
              ...ingredient,
              quantity,
              averageUnitPrice: 0,
              lineCost: 0,
              status: 'error',
              errorMessage: calculated.errorMessage,
            }
          }

          return {
            ...calculated.ingredient,
            status: 'ready',
            brandCount: countUniqueBrands(calculated.ingredient.matchedPrices),
            priceFetchedAt: ingredient.priceFetchedAt,
          }
        }

        return { ...ingredient, quantity }
      }),
    )
  }

  function handleUnitChange(id: string, unit: string) {
    setIngredients((current) =>
      current.map((ingredient) => {
        if (ingredient.id !== id) return ingredient

        if (ingredient.isManual) {
          return recalculateManualIngredient(ingredient, ingredient.quantity, unit)
        }

        if (ingredient.status === 'ready') {
          const calculated = calculateIngredientCostSafe(
            ingredient.name,
            ingredient.quantity,
            unit,
            ingredient.matchedPrices,
            ingredient.id,
          )

          if (!calculated.ok) {
            return {
              ...ingredient,
              unit,
              averageUnitPrice: 0,
              lineCost: 0,
              status: 'error',
              errorMessage: calculated.errorMessage,
            }
          }

          return {
            ...calculated.ingredient,
            status: 'ready',
            brandCount: countUniqueBrands(calculated.ingredient.matchedPrices),
            priceFetchedAt: ingredient.priceFetchedAt,
          }
        }

        return { ...ingredient, unit }
      }),
    )
  }

  async function handleNameChange(
    id: string,
    name: string,
    suggestedUnit?: string,
    searchQuery?: string,
  ) {
    const current = ingredients.find((ingredient) => ingredient.id === id)
    if (!current || (current.name === name && current.searchQuery === searchQuery)) return

    if (current.isManual) {
      setIngredients((list) =>
        list.map((ingredient) =>
          ingredient.id === id ? { ...ingredient, name: name.trim() } : ingredient,
        ),
      )
      return
    }

    const unit = suggestedUnit ?? current.unit
    const cached = resolveIngredientFromCache(name, current.quantity, unit, searchQuery, id)

    if (cached.status === 'ready') {
      setIngredients((list) =>
        list.map((ingredient) => (ingredient.id === id ? cached : ingredient)),
      )
      return
    }

    setIngredients((list) =>
      list.map((ingredient) =>
        ingredient.id === id
          ? createLoadingIngredient(name, current.quantity, unit, searchQuery, id)
          : ingredient,
      ),
    )

    await fetchIngredientPrices({
      id,
      name,
      searchQuery,
      quantity: current.quantity,
      unit,
    })
  }

  function handleRemove(id: string) {
    setIngredients((current) => current.filter((ingredient) => ingredient.id !== id))
  }

  function handleDeleteRecipe(id: string) {
    const next = deleteRecipe(id)
    setSavedRecipes(next)
    if (activeRecipeId === id) {
      handleNewRecipe()
    }
  }

  function handleDuplicateRecipe(id: string) {
    try {
      const duplicate = duplicateRecipe(id)
      setSavedRecipes(getSavedRecipes())
      void loadRecipe(duplicate)
      setActiveView('editor')
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : 'No se pudo duplicar la receta.',
      )
    }
  }

  function handleExportBackup() {
    downloadRecipesBackup()
  }

  async function handleImportBackup(file: File, mode: 'merge' | 'replace') {
    const raw = await file.text()
    const backup = parseRecipesBackup(raw)
    const next =
      mode === 'replace'
        ? saveAllRecipes(backup.recipes)
        : saveAllRecipes(mergeImportedRecipes(getSavedRecipes(), backup.recipes))

    setSavedRecipes(next)

    const activeStillExists = activeRecipeId
      ? next.some((recipe) => recipe.id === activeRecipeId)
      : false

    if (activeRecipeId && !activeStillExists) {
      handleNewRecipe()
    }
  }

  function handleNewRecipe() {
    skipAutosaveRef.current = true
    draftRecipeIdRef.current = null
    setRecipeName('')
    setRecipeSteps([])
    setActiveRecipeId(null)
    setIngredients([])
    setServings(4)
    setLastActiveRecipeId(null)
    setAutosaveStatus('idle')
    skipAutosaveRef.current = false
  }

  function handleLoadRecipe(recipe: SavedRecipe) {
    void loadRecipe(recipe)
    setActiveView('editor')
  }

  const autosaveMessage = !recipeName.trim()
    ? 'Agregá un nombre para guardar'
    : !canAutosave
      ? 'Agregá ingredientes para guardar'
      : autosaveStatus === 'pending'
      ? 'Guardando...'
      : autosaveStatus === 'saved'
        ? 'Guardado'
        : autosaveStatus === 'error'
          ? autosaveError ?? 'Error al guardar'
          : 'Se guarda automáticamente'

  const isUpdatingCost = isFetchingPrices || pendingCount > 0

  return (
    <div className="app">
      <header className="hero">
        <div>
          <p className="eyebrow">Calculadora de costos</p>
          <h1>CocinaAR</h1>
        </div>
        <div className="hero-actions">
          {isUsingMockData() ? (
            <span className="badge">Modo demo · datos de ejemplo</span>
          ) : (
            <span className="badge">Precio promedio de mercado</span>
          )}
        </div>
      </header>

      <nav className="app-tabs" aria-label="Secciones">
        <button
          type="button"
          className={`app-tab${activeView === 'editor' ? ' app-tab--active' : ''}`}
          onClick={() => setActiveView('editor')}
          aria-current={activeView === 'editor' ? 'page' : undefined}
        >
          Receta
        </button>
        <button
          type="button"
          className={`app-tab${activeView === 'recipes' ? ' app-tab--active' : ''}`}
          onClick={() => setActiveView('recipes')}
          aria-current={activeView === 'recipes' ? 'page' : undefined}
        >
          Mis recetas
          {savedRecipes.length > 0 ? (
            <span className="app-tab__count">{savedRecipes.length}</span>
          ) : null}
        </button>
      </nav>

      {activeView === 'editor' ? (
        <>
      <section className="recipe-title-bar">
        <div className="recipe-title-row">
          <label className="recipe-name-field recipe-name-field--top">
            <span>Nombre de la receta</span>
            <input
              value={recipeName}
              onChange={(event) => setRecipeName(event.target.value)}
              placeholder="Ej: Torta de chocolate"
            />
          </label>
          <label className="recipe-servings-field">
            <span>Porciones</span>
            <input
              type="number"
              min={1}
              value={servings}
              onChange={(event) => setServings(Number(event.target.value) || 1)}
            />
          </label>
          <div className="recipe-actions">
            <span
              className={`autosave-status autosave-status--${autosaveStatus}${canAutosave ? '' : ' autosave-status--muted'}`}
              aria-live="polite"
            >
              {autosaveMessage}
            </span>
          </div>
        </div>
        <RecipeStepsEditor steps={recipeSteps} onChange={setRecipeSteps} />
      </section>

      <main className="layout layout-two-cols">
        <RecipeBuilder
          ingredients={ingredients}
          onAdd={handleAdd}
          onNameCommit={handleNameChange}
          onQuantityChange={handleQuantityChange}
          onUnitChange={handleUnitChange}
          onRemove={handleRemove}
        />

        <div className="sidebar">
          <CostSummary breakdown={breakdown} />
        </div>
      </main>

      <CostTotalBar
        totalCost={breakdown.totalCost}
        costPerServing={breakdown.costPerServing}
        isUpdating={isUpdatingCost}
        hasIngredients={ingredients.length > 0}
      />
        </>
      ) : (
        <main className="layout layout-recipes">
          <SavedRecipesPanel
            recipes={savedRecipes}
            activeRecipeId={activeRecipeId}
            onLoad={handleLoadRecipe}
            onDelete={handleDeleteRecipe}
            onDuplicate={handleDuplicateRecipe}
            onNewRecipe={() => {
              handleNewRecipe()
              setActiveView('editor')
            }}
            onExportBackup={handleExportBackup}
            onImportBackup={handleImportBackup}
          />
        </main>
      )}
    </div>
  )
}

export default App
