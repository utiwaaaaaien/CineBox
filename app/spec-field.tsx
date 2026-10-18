"use client";
import { useState } from "react";
import type { SpecOption } from "./project-specs";

export function SpecField({ label, value, options, onChange, numeric, min, max, placeholder, pattern }: {
  label: string; value: string | number; options: SpecOption[]; onChange: (value: string | number) => void;
  numeric?: boolean; min?: number; max?: number; placeholder?: string; pattern?: string;
}) {
  const [custom, setCustom] = useState(!options.some(option => option.value === value));
  const groups = [...new Set(options.map(option => option.group).filter(Boolean))];
  const option = (item: SpecOption) => <option key={item.value} value={item.value}>{item.label}</option>;
  return <label className="spec-field"><span>{label}</span>
    <select aria-label={label} value={custom ? "custom" : value} onChange={event => {
      const selected = event.target.value;
      setCustom(selected === "custom");
      if (selected !== "custom") onChange(numeric ? Number(selected) : selected);
    }}>
      {groups.length ? groups.map(group => <optgroup key={group} label={group}>{options.filter(item => item.group === group).map(option)}</optgroup>) : options.map(option)}
      <option value="custom">自定义…</option>
    </select>
    {custom && <input aria-label={`自定义${label}`} type={numeric ? "number" : "text"} required min={min} max={max} step={numeric ? "0.001" : undefined} maxLength={numeric ? undefined : 80} pattern={pattern} defaultValue={value || ""} placeholder={placeholder ?? "输入帧率（fps）"} onChange={event => {
      if (event.currentTarget.validity.valid && event.target.value.trim()) onChange(numeric ? Number(event.target.value) : event.target.value.trim());
    }} />}
  </label>;
}
