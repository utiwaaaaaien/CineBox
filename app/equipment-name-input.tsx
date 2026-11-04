"use client";

import { useId, useMemo, useRef, useState } from "react";
import { suggestEquipment, type SuggestionEquipment } from "./equipment-suggestions";

export function EquipmentNameInput<T extends SuggestionEquipment>({ id, label, value, category, catalog, onChange, onSelect, required = false }: {
  id?: string; label: string; value: string; category: string; catalog: readonly T[];
  onChange: (value: string) => void; onSelect: (item: T) => void; required?: boolean;
}) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const composing = useRef(false);
  const options = useMemo(() => suggestEquipment(catalog, category, value), [catalog, category, value]);
  const expanded = open && options.length > 0;
  const choose = (item: T) => { setOpen(false); setActive(-1); onSelect(item); };
  return <span className="equipment-name-input" onBlur={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
  }}>
    <input id={id} aria-label={label} role="combobox" aria-autocomplete="list" aria-expanded={expanded}
      aria-controls={expanded ? listId : undefined} aria-activedescendant={expanded && active >= 0 && active < options.length ? `${listId}-${active}` : undefined}
      autoComplete="off" required={required} maxLength={240} value={value} placeholder="填写器材名或选择联想"
      onFocus={() => { setOpen(true); setActive(-1); }}
      onCompositionStart={() => { composing.current = true; setOpen(false); }}
      onCompositionEnd={() => { composing.current = false; setActive(-1); setOpen(true); }}
      onChange={(event) => { onChange(event.target.value); setActive(-1); setOpen(!composing.current); }}
      onKeyDown={(event) => {
        if (composing.current || event.nativeEvent.isComposing) return;
        if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); setOpen(false); setActive(-1); }
        else if ((event.key === "ArrowDown" || event.key === "ArrowUp") && options.length) {
          event.preventDefault(); setOpen(true);
          setActive((current) => event.key === "ArrowDown" ? (current + 1) % options.length : (current <= 0 ? options.length - 1 : current - 1));
        } else if (event.key === "Enter" && expanded && active >= 0 && options[active]) {
          event.preventDefault(); choose(options[active]);
        }
      }} />
    {expanded && <span id={listId} role="listbox" aria-label={`${label}联想候选`} className="equipment-name-suggestions">
      {options.map((item, index) => <button key={item.id} id={`${listId}-${index}`} type="button" role="option" aria-selected={index === active}
        title={item.name} onMouseDown={(event) => event.preventDefault()} onClick={() => choose(item)} onPointerMove={() => setActive(index)}>{item.name}</button>)}
    </span>}
  </span>;
}
