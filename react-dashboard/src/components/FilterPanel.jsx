import React from 'react';

export default function FilterPanel({
  programs, dataCols, colNames,
  selectedPrograms, selectedCols,
  onToggleProgram, onToggleCol,
}) {
  return (
    <aside className="filter-panel">
      <h3 style={{ fontSize: '1rem', marginBottom: 12, borderBottom: '2px solid #1565c0', paddingBottom: 8 }}>
        Фильтры
      </h3>

      <FilterGroup
        label="Колонки"
        items={dataCols}
        display={(c) => colNames[dataCols.indexOf(c)]}
        selected={selectedCols}
        onToggle={onToggleCol}
      />

      <FilterGroup
        label="Строки"
        items={programs}
        display={(p) => p.name}
        selected={selectedPrograms}
        onToggle={onToggleProgram}
      />
    </aside>
  );
}

function FilterGroup({ label, items, display, selected, onToggle }) {
  const allSelected = items.every((item) => selected.includes(typeof item === 'object' ? item.name : item));

  const handleSelectAll = () => {
    if (allSelected) {
      items.forEach((item) => onToggle(typeof item === 'object' ? item.name : item));
    } else {
      const missing = items.filter((item) => {
        const key = typeof item === 'object' ? item.name : item;
        return !selected.includes(key);
      });
      missing.forEach((item) => onToggle(typeof item === 'object' ? item.name : item));
    }
  };

  return (
    <div className="filter-group">
      <label className="block">{label}</label>
      <label className="filter-checkbox" style={{ fontWeight: 600, color: '#1565c0' }}>
        <input type="checkbox" checked={allSelected} onChange={handleSelectAll} />
        Выбрать все
      </label>
      <div className="filter-scroll">
        {items.map((item, i) => {
          const key = typeof item === 'object' ? item.name : item;
          return (
            <label key={key} className="filter-checkbox">
              <input
                type="checkbox"
                checked={selected.includes(key)}
                onChange={() => onToggle(key)}
              />
              {display(item)}
            </label>
          );
        })}
      </div>
    </div>
  );
}
