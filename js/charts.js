const DashboardCharts = (() => {
  const colorScale = [
    '#7a9e9f', '#c8956c', '#9fb7a8', '#b0aac0', '#c4a882',
    '#8fb5b5', '#d4b5a0', '#a8c4b8', '#c8b8a8', '#b8c8c8',
    '#d4a898', '#a0b8b0', '#c8a8a8', '#b0c0a8', '#d0b8a0',
    '#a8b8c0', '#c0a8b0', '#b8c0a8',
  ];

  function progTotal(prog, dataCols) {
    return dataCols.reduce((s, c) => s + (prog[c] || 0), 0);
  }

  function renderProgramBars(container, programs, dataCols, headers) {
    if (!programs || programs.length === 0) {
      container.innerHTML = noDataMsg();
      return;
    }
    const sorted = programs.slice().sort((a, b) => progTotal(b, dataCols) - progTotal(a, dataCols));

    const trace = {
      x: sorted.map((p) => progTotal(p, dataCols)),
      y: sorted.map((p) => p.name),
      type: 'bar',
      orientation: 'h',
      marker: {
        color: sorted.map((_, i) => colorScale[i % colorScale.length]),
        line: { color: 'rgba(0,0,0,0.2)', width: 1 },
      },
      text: sorted.map((p) => String(progTotal(p, dataCols))),
      textposition: 'outside',
      hovertemplate: '<b>%{y}</b><br>Всего: %{x}<br><extra></extra>',
    };

    const maxNameLen = Math.max(...sorted.map((p) => p.name.length));
    const layout = {
      title: { text: 'Сумма по строкам (программам)' },
      xaxis: { title: 'Сумма значений' },
      yaxis: { title: '', automargin: true, tickfont: { size: 10 } },
      margin: { l: Math.min(250, maxNameLen * 7 + 20), r: 40, t: 40, b: 40 },
      height: Math.max(300, sorted.length * 28),
      plot_bgcolor: 'rgba(0,0,0,0)',
      paper_bgcolor: 'rgba(0,0,0,0)',
      font: { family: 'Segoe UI, Arial, sans-serif' },
      hovermode: 'closest',
    };

    const config = chartConfig();
    Plotly.newPlot(container, [trace], layout, config);

    container.on('plotly_click', (data) => {
      if (data.points && data.points.length > 0) {
        const pt = data.points[0];
        const prog = sorted[pt.pointIndex];
        fire('program-selected', { program: prog.name, data: prog });
      }
    });
  }

  function renderTerritoryChart(container, programs, dataCols, headers) {
    if (!programs || programs.length === 0 || !dataCols || dataCols.length === 0) {
      container.innerHTML = noDataMsg();
      return;
    }

    const tTotals = DashboardKPI.colTotals(programs, dataCols, headers);
    const entries = Object.entries(tTotals)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1]);

    if (entries.length === 0) {
      container.innerHTML = noDataMsg('Нет данных с ненулевыми значениями');
      return;
    }

    const top5 = entries.slice(0, 5);
    const otherSum = entries.slice(5).reduce((s, [, v]) => s + v, 0);

    const labels = top5.map(([n]) => n);
    const values = top5.map(([, v]) => Math.round(v));
    if (otherSum > 0 && entries.length > 5) {
      labels.push('Прочие');
      values.push(Math.round(otherSum));
    }

    const trace = {
      labels, values, type: 'pie',
      marker: {
        colors: labels.map((l, i) =>
          l === 'Прочие' ? '#bdbdbd' : colorScale[i % colorScale.length]
        ),
        line: { color: '#fff', width: 2 },
      },
      textinfo: 'label+percent',
      hovertemplate: '<b>%{label}</b><br>Значение: %{value:,.0f}<br>Доля: %{percent}<extra></extra>',
    };

    const layout = {
      title: { text: 'Распределение по колонкам' },
      margin: { l: 20, r: 20, t: 40, b: 20 },
      plot_bgcolor: 'rgba(0,0,0,0)',
      paper_bgcolor: 'rgba(0,0,0,0)',
      font: { family: 'Segoe UI, Arial, sans-serif' },
      showlegend: true,
      legend: { orientation: 'v', y: 0.5 },
    };

    Plotly.newPlot(container, [trace], layout, chartConfig());

    container.on('plotly_click', (data) => {
      if (data.points && data.points.length > 0) {
        const label = data.points[0].label;
        if (label && label !== 'Прочие') {
          fire('territory-selected', { territory: label });
        }
      }
    });
  }

  function renderStackedBar(container, programs, dataCols, headers, selectedCol) {
    if (!programs || programs.length === 0 || !dataCols || dataCols.length === 0) {
      container.innerHTML = noDataMsg();
      return;
    }

    const colLabel = selectedCol !== null ? (headers?.[selectedCol] ?? String(selectedCol)) : null;

    if (!colLabel) {
      container.innerHTML = `<div class="chart-placeholder">Выберите колонку на диаграмме или вкладках ниже</div>`;
      return;
    }

    const progData = DashboardKPI.rowBreakdownForCol(programs, selectedCol);
    const nonZero = progData.filter((d) => d.value > 0);

    if (nonZero.length === 0) {
      container.innerHTML =
        `<div class="chart-placeholder">Нет данных по колонке "${colLabel}"</div>`;
      return;
    }

    const trace = {
      x: nonZero.map((d) => d.name),
      y: nonZero.map((d) => d.value),
      type: 'bar',
      marker: { color: nonZero.map((_, i) => colorScale[i % colorScale.length]) },
      text: nonZero.map((d) => String(d.value)),
      textposition: 'outside',
      hovertemplate: '<b>%{x}</b><br>%{y}<extra></extra>',
    };

    const layout = {
      title: { text: `Значения по строкам: ${colLabel}` },
      xaxis: { title: '', tickangle: -45, tickfont: { size: 9 } },
      yaxis: { title: 'Значение' },
      margin: { l: 50, r: 20, t: 40, b: 100 },
      height: Math.max(300, nonZero.length * 25),
      plot_bgcolor: 'rgba(0,0,0,0)',
      paper_bgcolor: 'rgba(0,0,0,0)',
      font: { family: 'Segoe UI, Arial, sans-serif' },
    };

    Plotly.newPlot(container, [trace], layout, chartConfig());

    container.on('plotly_click', (data) => {
      if (data.points && data.points.length > 0) {
        fire('program-selected', { program: data.points[0].x });
      }
    });
  }

  function renderHeatmap(container, programs, dataCols, headers) {
    if (!programs || programs.length === 0 || !dataCols || dataCols.length === 0) {
      container.innerHTML = noDataMsg();
      return;
    }

    const progNames = programs.map((p) => p.name);
    const colLabels = dataCols.map((c) => headers?.[c] ?? String(c));
    const zData = programs.map((p) => dataCols.map((c) => p[c] || 0));
    const maxVal = Math.max(...zData.flat(), 1);

    const trace = {
      z: zData, x: colLabels, y: progNames, type: 'heatmap',
      colorscale: [
        [0, '#f7f5f0'], [0.15, '#dce8e5'], [0.35, '#b5d0d1'],
        [0.55, '#7a9e9f'], [0.75, '#5c7d7e'], [1, '#3d5f60'],
      ],
      zmin: 0, zmax: maxVal, hoverongaps: false,
      hovertemplate: '<b>%{y}</b><br><b>%{x}</b><br>Значение: %{z}<extra></extra>',
      text: zData, texttemplate: '%{text}', textfont: { size: 9, color: 'black' },
    };

    const layout = {
      title: { text: 'Тепловая матрица: строки vs колонки' },
      xaxis: { tickangle: -45, tickfont: { size: 10 } },
      yaxis: { tickfont: { size: 9 }, automargin: true },
      margin: { l: Math.min(200, Math.max(...progNames.map((n) => n.length)) * 7), r: 20, t: 40, b: 80 },
      height: Math.max(300, progNames.length * 22),
      plot_bgcolor: 'rgba(0,0,0,0)',
      paper_bgcolor: 'rgba(0,0,0,0)',
      font: { family: 'Segoe UI, Arial, sans-serif' },
    };

    Plotly.newPlot(container, [trace], layout, chartConfig());

    container.on('plotly_click', (data) => {
      if (data.points && data.points.length > 0) {
        const pt = data.points[0];
        fire('cell-clicked', { program: pt.y, territory: pt.x, value: pt.z });
      }
    });
  }

  function chartConfig() {
    return {
      responsive: true,
      displayModeBar: true,
      modeBarButtonsToRemove: ['lasso2d', 'select2d', 'toImage'],
      displaylogo: false,
    };
  }

  function noDataMsg(msg) {
    const text = msg || 'Нет данных';
    return `<div class="chart-placeholder">${text}</div>`;
  }

  function fire(name, detail) {
    document.dispatchEvent(new CustomEvent(name, { detail, bubbles: true }));
  }

  function resizeAll() {
    document.querySelectorAll('.chart-container .js-plotly-plot')
      .forEach((g) => Plotly.Plots.resize(g));
  }

  return { renderProgramBars, renderTerritoryChart, renderStackedBar, renderHeatmap, resizeAll };
})();
