import { CategoryDef } from '../../lib/categories';

interface CategoryPickerProps {
  categories: CategoryDef[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}

// Grid of category buttons (used for expense + group categories).
export function CategoryPicker({ categories, value, onChange, disabled }: CategoryPickerProps) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {categories.map(cat => {
        const Icon = cat.icon;
        const selected = value === cat.id;
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onChange(cat.id)}
            disabled={disabled}
            className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-colors ${
              selected
                ? `${cat.bg} border-current ${cat.color}`
                : 'bg-slate-800 border-slate-700 hover:border-slate-600'
            } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            <Icon size={18} className={selected ? cat.color : 'text-slate-500'} />
            <span className={`text-xs leading-tight text-center ${selected ? 'text-white font-medium' : 'text-slate-500'}`}>
              {cat.labelAr}
            </span>
          </button>
        );
      })}
    </div>
  );
}
