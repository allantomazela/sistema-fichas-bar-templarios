interface FiltroSelectProps {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
}

export function FiltroSelect({ label, value, onChange, options }: FiltroSelectProps) {
  return (
    <label className="flex flex-col text-[11px] font-bold uppercase text-muted-foreground gap-1">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-md border border-input bg-background px-2 text-sm font-normal normal-case text-foreground"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}
