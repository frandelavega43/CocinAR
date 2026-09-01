export function normalizeRecipeSteps(steps: string | string[] | undefined): string[] {
  if (!steps) return []

  if (Array.isArray(steps)) {
    return steps.map((step) => step.trim()).filter(Boolean)
  }

  return steps
    .split(/\n+/)
    .map((step) => step.trim())
    .filter(Boolean)
}

export function serializeRecipeSteps(steps: string[]): string[] {
  return steps.map((step) => step.trim()).filter(Boolean)
}
