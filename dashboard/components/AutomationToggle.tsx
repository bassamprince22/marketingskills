'use client'

interface AutomationToggleProps {
  enabled: boolean
  onChange: (enabled: boolean) => void
}

export function AutomationToggle({ enabled, onChange }: AutomationToggleProps) {
  return (
    <div className="flex items-center gap-3">
      <button
        role="switch"
        aria-checked={enabled}
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 ${
          enabled ? 'bg-violet-600' : 'bg-slate-200'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
      <span className="text-sm text-slate-700">
        {enabled ? (
          <span className="font-medium text-green-700">Automation running</span>
        ) : (
          <span className="text-slate-500">Automation paused</span>
        )}
      </span>
    </div>
  )
}
