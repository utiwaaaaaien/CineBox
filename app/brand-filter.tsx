"use client";

import { useEffect, useRef, useState } from "react";

export function BrandFilter({ brands, labels, category, selected, onSelect }: {
  brands: string[];
  labels: Record<string, string>;
  category: string;
  selected: string;
  onSelect: (brand: string) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(4);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setColumns(Math.max(1, Math.floor((entry.contentRect.width + 8) / 148)));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const limit = columns * 2;
  // A collapsed filter must still reveal the current choice.
  const preview = brands.slice(0, limit);
  const shown = expanded ? brands : selected !== "全部" && !preview.includes(selected)
    ? [...preview.slice(0, -1), selected] : preview;
  return <div ref={container} className="brand-filter" role="group" aria-label={`${category}品牌筛选`}>
    <div className="brand-filter-heading">
      <span>品牌</span>
      {brands.length > limit && <button type="button" aria-expanded={expanded} aria-controls="brand-options" onClick={() => setExpanded(!expanded)}>{expanded ? "收起品牌" : `展开全部品牌 · ${brands.length - 1}`}</button>}
    </div>
    <div id="brand-options" className="brand-options" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
      {shown.map((name) => {
        const label = labels[name] ?? name;
        const chinese = label.match(/^[\u3400-\u9fff]+/)?.[0];
        const english = chinese ? label.slice(chinese.length).trim() : label;
        return <button type="button" key={name} aria-label={name === "全部" ? "全部品牌" : label} aria-pressed={selected === name} className={selected === name ? "brand-filter-button active" : "brand-filter-button"} onClick={() => onSelect(name)}>
          <strong>{name === "全部" ? "全部品牌" : chinese || english}</strong>
          {name !== "全部" && chinese && english && <span lang="en">{english}</span>}
        </button>;
      })}
    </div>
  </div>;
}
