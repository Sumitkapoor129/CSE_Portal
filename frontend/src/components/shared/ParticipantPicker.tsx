interface ParticipantOption {
  id: string;
  name: string;
  rollNumber: string;
  department: string;
}

interface ParticipantPickerProps {
  label?: string;
  options: ParticipantOption[];
  selected: string[];
  loading?: boolean;
  onToggle: (id: string) => void;
}

export function ParticipantPicker({
  label = 'Participants',
  options,
  selected,
  loading = false,
  onToggle,
}: ParticipantPickerProps) {
  return (
    <div>
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">{label}</span>
      {loading ? (
        <p className="text-sm text-gray-500">Loading students…</p>
      ) : (
        <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border border-gray-300 p-3">
          {options.map((option) => {
            const isChecked = selected.includes(option.id);
            return (
              <label key={option.id} className="flex items-center gap-3 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => onToggle(option.id)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="min-w-0">
                  <span className="block truncate font-medium text-gray-900">{option.name}</span>
                  <span className="block text-xs text-gray-500">
                    {option.rollNumber} · {option.department}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ParticipantPicker;