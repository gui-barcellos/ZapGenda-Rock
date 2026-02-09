import { Label } from "@/components/ui/label";

interface TagColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
}

const PRESET_COLORS = [
  "#3b82f6", // blue
  "#8b5cf6", // purple
  "#f59e0b", // amber
  "#10b981", // emerald
  "#ef4444", // red
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#84cc16", // lime
  "#f97316", // orange
  "#6366f1", // indigo
  "#14b8a6", // teal
  "#a855f7", // violet
];

export function TagColorPicker({
  value,
  onChange,
  label = "Cor da tag",
}: TagColorPickerProps) {
  return (
    <div className="space-y-3">
      <Label>{label}</Label>
      
      {/* Preset colors */}
      <div className="grid grid-cols-6 gap-2">
        {PRESET_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            className={`h-10 w-10 rounded-md border-2 transition-all hover:scale-110 ${
              value === color ? "border-primary ring-2 ring-primary ring-offset-2" : "border-border"
            }`}
            style={{ backgroundColor: color }}
            aria-label={`Selecionar cor ${color}`}
          />
        ))}
      </div>

      {/* Custom color input */}
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-20 rounded border cursor-pointer"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-3 py-2 border rounded bg-background"
          placeholder="#000000"
          pattern="^#[0-9A-Fa-f]{6}$"
        />
      </div>

      {/* Preview */}
      <div className="flex items-center gap-3 p-3 border rounded bg-muted/50">
        <span className="text-sm text-muted-foreground">Preview:</span>
        <div
          className="px-3 py-1 rounded text-white text-sm font-medium"
          style={{ backgroundColor: value }}
        >
          Tag de exemplo
        </div>
      </div>
    </div>
  );
}
