"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";

export type CatalogOption = { value: string; label: string };

export function CatalogChoice({ kind, options, selected, onSelect }: {
  kind: "品牌" | "系列";
  options: readonly CatalogOption[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  const id = useId();
  const measure = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const preview = useRef<HTMLDivElement>(null);
  const [previewValues, setPreviewValues] = useState(() => options.slice(0, 1).map((option) => option.value));
  const [expanded, setExpanded] = useState(false);

  useLayoutEffect(() => {
    const ruler = measure.current;
    if (!ruler) return;
    let active = true;

    function fit() {
      if (!ruler || !active) return;
      const gap = parseFloat(getComputedStyle(ruler).columnGap) || 0;
      const available = ruler.clientWidth;
      const widths = Array.from(ruler.children, (chip) => chip.getBoundingClientRect().width);
      const fitIndexes = (indexes: number[]) => {
        let occupied = 0;
        return indexes.filter((index) => {
          const width = widths[index] + (occupied > 0 ? gap : 0);
          if (occupied + width > available) return false;
          occupied += width;
          return true;
        });
      };

      const indexes = options.map((_, index) => index);
      const selectedIndex = options.findIndex((option) => option.value === selected);
      let visible = fitIndexes(indexes);
      if (selectedIndex > 0 && widths[selectedIndex] <= available && !visible.includes(selectedIndex)) {
        const remaining = indexes.filter((index) => index !== 0 && index !== selectedIndex);
        const bothFit = widths[0] + gap + widths[selectedIndex] <= available;
        visible = fitIndexes(bothFit ? [0, selectedIndex, ...remaining] : [selectedIndex, 0, ...remaining]);
      }
      const next = visible.map((index) => options[index].value);
      setPreviewValues((current) => next.length === current.length && next.every((value, index) => value === current[index]) ? current : next);
    }

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(ruler);
    void document.fonts.ready.then(fit);
    return () => { active = false; observer.disconnect(); };
  }, [options, selected]);

  const visible = previewValues.flatMap((value) => {
    const option = options.find((item) => item.value === value);
    return option ? [option] : [];
  });
  const remaining = options.filter((option) => !previewValues.includes(option.value));

  function selectFromExpansion(value: string) {
    onSelect(value);
    setExpanded(false);
    requestAnimationFrame(() => {
      const target = preview.current?.querySelector<HTMLButtonElement>('button[aria-pressed="true"]') ?? toggle.current;
      target?.focus({ preventScroll: true });
    });
  }

  return <section className="catalog-choice" aria-labelledby={`${id}-title`}>
    <div className="catalog-choice-head">
      <h3 id={`${id}-title`}>按{kind}选择</h3>
      <div className="catalog-choice-actions">
        <span>{options.length - 1} 个</span>
        {remaining.length > 0 && <button type="button" ref={toggle} className="catalog-choice-toggle"
          aria-label={`${expanded ? "收起" : "展开全部"}${kind}`} aria-expanded={expanded} aria-controls={`${id}-more`}
          onClick={() => setExpanded((open) => !open)}>{expanded ? "收起" : "展开"}</button>}
      </div>
    </div>
    <div className="catalog-choice-row" ref={preview}>
      {visible.map((option) => <button type="button" key={option.value} className="catalog-chip"
        aria-pressed={selected === option.value} onClick={() => onSelect(option.value)}>{option.label}</button>)}
    </div>
    <div className="catalog-choice-measure" ref={measure} aria-hidden="true">
      {options.map((option) => <span className="catalog-chip" key={option.value}>{option.label}</span>)}
    </div>
    <div id={`${id}-more`} className="catalog-choice-more" hidden={!expanded || !remaining.length}>
      {expanded && remaining.map((option) => <button type="button" key={option.value} className="catalog-chip"
        aria-pressed={selected === option.value} onClick={() => selectFromExpansion(option.value)}>{option.label}</button>)}
    </div>
  </section>;
}
