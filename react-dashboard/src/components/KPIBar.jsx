import React from 'react';

export default function KPIBar({ kpi }) {
  if (!kpi) return null;
  return (
    <div className="kpi-grid">
      <div className="kpi-card">
        <div className="label">Общая сумма</div>
        <div className="value">{kpi.total.toLocaleString()}</div>
        <div className="sub">по всем строкам и колонкам</div>
      </div>
      <div className="kpi-card">
        <div className="label">Топ-3 строк</div>
        {kpi.topProgs.map((p, i) => (
          <div key={i} className="sub">
            <strong>{p.name}</strong>: {progSum(p).toLocaleString()}
          </div>
        ))}
      </div>
      <div className="kpi-card">
        <div className="label">Топ-3 колонок</div>
        {kpi.topCols.map((c, i) => (
          <div key={i} className="sub">
            <strong>{c.name}</strong>: {c.value.toLocaleString()}
          </div>
        ))}
      </div>
      <div className="kpi-card">
        <div className="label">Строк × Колонок</div>
        <div className="value">{kpi.count} × {kpi.colCount}</div>
      </div>
    </div>
  );
}

function progSum(p) {
  let s = 0;
  for (const k in p) if (typeof p[k] === 'number' && k !== 'hours' && k !== 'total') s += p[k];
  return s;
}
