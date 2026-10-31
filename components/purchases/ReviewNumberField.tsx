interface NumberFieldProps { label: string; name: string; value?: number; min?: number; max?: number; step?: number; required?: boolean; }
export default function ReviewNumberField({ label, name, value, min = 0, max, step = 1, required = true }: NumberFieldProps) {
  return <label className="field">{label}<input type="number" name={name} required={required} min={min} max={max} step={step} defaultValue={value ?? ''} /></label>;
}
