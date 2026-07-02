import React, { useState, useMemo } from 'react';

export default function DataTable({ programs, dataCols, colNames }) {
  const [sortCol, setSortCol] = useState(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let list = [...programs];
    if (search) list = list.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
    if (sortCol !== null) {
      list.sort((a, b) => {
        const va = sortCol === -1 ? a.name : (a[sortCol] || 0);
        const vb = sortCol === -1 ? b.name : (b[sortCol] || 0);
        if (typeof va === 'number') return sortAsc ? va - vb : vb - va;
        return sortAsc ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
      });
    }
    return list;
  }, [programs, search, sortCol, sortAsc]);

  const handleSort = (colIdx) => {
    if (sortCol === colIdx) setSortAsc(!sortAsc);
    else { setSortCol(colIdx); setSortAsc(true); }
  };

  const exportCSV = () => {
    const BOM = '\uFEFF';
    const h = ['Наименование', ...colNames, 'Сумма'];
    const rows = filtered.map((p) => {
      const sum = dataCols.reduce((s, c) => s + (p[c] || 0), 0);
      return [p.name, ...dataCols.map((c) => p[c] || 0), sum];
    });
    const csv = BOM + h.map((h) => `"${h}"`).join(',') + '\n' +
      rows.map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'dashboard.csv';
    a.click();
  };

  return (
    <div className="table-card">
      <div className="table-toolbar">
        <input placeholder="Поиск по названию..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <button className="btn btn-outline" onClick={exportCSV}>CSV</button>
      </div>
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th onClick={() => handleSort(-1)}>
                Наименование {sortCol === -1 ? (sortAsc ? '▲' : '▼') : ''}
              </th>
              {dataCols.map((c, i) => (
                <th key={c} className="right" onClick={() => handleSort(c)}>
                  {colNames[i]} {sortCol === c ? (sortAsc ? '▲' : '▼') : ''}
                </th>
              ))}
              <th className="right">Сумма</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const sum = dataCols.reduce((s, c) => s + (p[c] || 0), 0);
              return (
                <tr key={p.name}>
                  <td>{p.name}</td>
                  {dataCols.map((c) => <td key={c} className="right">{(p[c] || 0).toLocaleString()}</td>)}
                  <td className="right"><b>{sum.toLocaleString()}</b></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{ textAlign: 'right', fontSize: '0.8rem', color: '#999', marginTop: 6 }}>
        Показано: {filtered.length} из {programs.length}
      </div>
    </div>
  );
}
