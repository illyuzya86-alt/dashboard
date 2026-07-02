import React, { useRef, useEffect } from 'react';
import Plot from 'react-plotly.js';

const COLORS = ['#0d47a1','#1565c0','#1976d2','#1e88e5','#2196f3','#42a5f5','#ef5350','#ab47bc','#26a69a','#66bb6a','#ff7043'];

function progSum(p, cols) {
  return cols.reduce((s, c) => s + (p[c] || 0), 0);
}

export function ProgramBars({ programs, dataCols, onSelect }) {
  const sorted = [...programs].sort((a, b) => progSum(b, dataCols) - progSum(a, dataCols));
  const totalCols = dataCols.length;

  return (
    <div className="chart-card">
      <h3>Сумма по строкам</h3>
      <Plot
        data={[{
          x: sorted.map((p) => progSum(p, dataCols)),
          y: sorted.map((p) => p.name),
          type: 'bar',
          orientation: 'h',
          marker: { color: sorted.map((_, i) => COLORS[i % COLORS.length]) },
          text: sorted.map((p) => String(progSum(p, dataCols))),
          textposition: 'outside',
          hovertemplate: '<b>%{y}</b><br>Всего: %{x}<extra></extra>',
        }]}
        layout={{
          xaxis: { title: 'Сумма' },
          yaxis: { automargin: true, tickfont: { size: 10 } },
          margin: { l: 180, r: 20, t: 10, b: 30 },
          height: Math.max(200, sorted.length * 28),
          paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
          font: { family: 'Segoe UI, sans-serif' },
        }}
        config={{ responsive: true, displaylogo: false }}
        useResizeHandler
        style={{ width: '100%' }}
        onClick={(d) => {
          if (d?.points?.[0]) onSelect?.(sorted[d.points[0].pointIndex]);
        }}
      />
    </div>
  );
}

export function TerritoryPie({ programs, dataCols, colNames, onSelect }) {
  const totals = dataCols.map((c, i) => ({ name: colNames[i], v: programs.reduce((s, p) => s + (p[c] || 0), 0) }))
    .sort((a, b) => b.v - a.v);

  const top5 = totals.slice(0, 5);
  const otherSum = totals.slice(5).reduce((s, c) => s + c.v, 0);
  const labels = top5.map((c) => c.name);
  const values = top5.map((c) => c.v);
  if (otherSum > 0 && totals.length > 5) { labels.push('Прочие'); values.push(Math.round(otherSum)); }

  return (
    <div className="chart-card">
      <h3>Топ-5 колонок</h3>
      <Plot
        data={[{
          labels, values, type: 'pie',
          marker: { colors: [...COLORS.slice(0, 5), '#bdbdbd'] },
          textinfo: 'label+percent',
          hovertemplate: '<b>%{label}</b><br>%{value:,.0f}<extra></extra>',
        }]}
        layout={{
          height: 240,
          margin: { l: 10, r: 10, t: 10, b: 10 },
          paper_bgcolor: 'transparent',
          font: { family: 'Segoe UI, sans-serif' },
          showlegend: true,
          legend: { orientation: 'v', y: 0.5 },
        }}
        config={{ responsive: true, displaylogo: false }}
        useResizeHandler
        style={{ width: '100%' }}
        onClick={(d) => {
          const label = d?.points?.[0]?.label;
          if (label && label !== 'Прочие') onSelect?.(label);
        }}
      />
    </div>
  );
}

export function StackedBar({ programs, dataCols, colNames, selectedCol, onSelect }) {
  if (selectedCol === null || selectedCol === undefined) {
    return (
      <div className="chart-card full">
        <h3>Детализация колонки</h3>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: '#999' }}>
          Выберите колонку
        </div>
      </div>
    );
  }

  const idx = dataCols.indexOf(selectedCol);
  const label = idx >= 0 ? colNames[idx] : String(selectedCol);
  const items = programs.filter((p) => p[selectedCol] > 0);

  return (
    <div className="chart-card full">
      <h3>Значения по строкам: {label}</h3>
      <Plot
        data={[{
          x: items.map((p) => p.name),
          y: items.map((p) => p[selectedCol]),
          type: 'bar',
          marker: { color: items.map((_, i) => COLORS[i % COLORS.length]) },
          text: items.map((p) => String(p[selectedCol])),
          textposition: 'outside',
          hovertemplate: '<b>%{x}</b><br>%{y}<extra></extra>',
        }]}
        layout={{
          xaxis: { tickangle: -40, tickfont: { size: 9 } },
          yaxis: { title: 'Значение' },
          margin: { l: 40, r: 20, t: 10, b: 90 },
          height: Math.max(200, items.length * 25),
          paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
          font: { family: 'Segoe UI, sans-serif' },
        }}
        config={{ responsive: true, displaylogo: false }}
        useResizeHandler
        style={{ width: '100%' }}
        onClick={(d) => onSelect?.(d?.points?.[0]?.x)}
      />
    </div>
  );
}

export function Heatmap({ programs, dataCols, colNames }) {
  const zData = programs.map((p) => dataCols.map((c) => p[c] || 0));
  const maxVal = Math.max(...zData.flat(), 1);

  return (
    <div className="chart-card full">
      <h3>Тепловая матрица</h3>
      <Plot
        data={[{
          z: zData, x: colNames, y: programs.map((p) => p.name),
          type: 'heatmap',
          colorscale: [[0,'#f5f5f5'],[0.2,'#bbdefb'],[0.4,'#64b5f6'],[0.6,'#1e88e5'],[0.8,'#1565c0'],[1,'#0d47a1']],
          zmin: 0, zmax: maxVal,
          hovertemplate: '<b>%{y}</b><br><b>%{x}</b><br>%{z}<extra></extra>',
          text: zData, texttemplate: '%{text}', textfont: { size: 8 },
        }]}
        layout={{
          xaxis: { tickangle: -45, tickfont: { size: 9 } },
          yaxis: { tickfont: { size: 8 }, automargin: true },
          margin: { l: 160, r: 10, t: 10, b: 70 },
          height: Math.max(200, programs.length * 20),
          paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
          font: { family: 'Segoe UI, sans-serif' },
        }}
        config={{ responsive: true, displaylogo: false }}
        useResizeHandler
        style={{ width: '100%' }}
      />
    </div>
  );
}
