import { Check } from 'lucide-react'

export function WizardSteps({
  steps,
  current,
}: {
  steps: readonly string[]
  current: number
}) {
  return (
    <nav aria-label="Progression du formulaire">
      <ol className="grid gap-2 sm:grid-flow-col sm:auto-cols-fr">
        {steps.map((label, index) => (
          <li
            key={label}
            aria-current={index === current ? 'step' : undefined}
            className={`flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold ${
              index === current
                ? 'border-blue-600 bg-blue-50 text-blue-800'
                : index < current
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-slate-200 bg-white text-slate-500'
            }`}
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-current/10">
              {index < current ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : index + 1}
            </span>
            <span>{label}</span>
          </li>
        ))}
      </ol>
    </nav>
  )
}
