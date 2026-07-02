const DashboardKPI = (() => {

  function totalSum(programs, dataCols) {
    return programs.reduce((sum, p) => {
      return sum + dataCols.reduce((s, c) => s + (p[c] || 0), 0);
    }, 0);
  }

  function topPrograms(programs, dataCols, n) {
    return programs
      .slice()
      .map((p) => ({
        name: p.name,
        value: dataCols.reduce((s, c) => s + (p[c] || 0), 0),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, n);
  }

  function topDataCols(programs, dataCols, headers, n) {
    const totals = {};
    for (const c of dataCols) {
      const label = headers?.[c] ?? String(c);
      totals[label] = 0;
      for (const p of programs) {
        totals[label] += p[c] || 0;
      }
    }
    return Object.entries(totals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([name, value]) => ({ name, value }));
  }

  function avgPerProgram(programs, dataCols) {
    if (programs.length === 0) return 0;
    return totalSum(programs, dataCols) / programs.length;
  }

  function medianPerProgram(programs, dataCols) {
    if (programs.length === 0) return 0;
    const values = programs
      .map((p) => dataCols.reduce((s, c) => s + (p[c] || 0), 0))
      .sort((a, b) => a - b);
    const mid = Math.floor(values.length / 2);
    return values.length % 2 === 0 ? (values[mid - 1] + values[mid]) / 2 : values[mid];
  }

  function stdDev(programs, dataCols) {
    if (programs.length < 2) return 0;
    const mean = avgPerProgram(programs, dataCols);
    const sqDiffs = programs.map((p) => {
      const diff = dataCols.reduce((s, c) => s + (p[c] || 0), 0) - mean;
      return diff * diff;
    });
    return Math.sqrt(sqDiffs.reduce((s, v) => s + v, 0) / programs.length);
  }

  function programsAboveThreshold(programs, dataCols, threshold) {
    return programs.filter((p) => dataCols.reduce((s, c) => s + (p[c] || 0), 0) > threshold).length;
  }

  function computeAll(programs, dataCols, headers, threshold) {
    const total = totalSum(programs, dataCols);
    const topProgs = topPrograms(programs, dataCols, 3);
    const topCols = topDataCols(programs, dataCols, headers, 3);
    const avg = avgPerProgram(programs, dataCols);
    const median = medianPerProgram(programs, dataCols);
    const std = stdDev(programs, dataCols);
    const aboveThreshold = programsAboveThreshold(programs, dataCols, threshold);

    return { total, topPrograms: topProgs, topColumns: topCols, avg, median, stdDeviation: std, aboveThreshold };
  }

  function colTotals(programs, dataCols, headers) {
    const result = {};
    for (const c of dataCols) {
      const label = headers?.[c] ?? String(c);
      result[label] = 0;
      for (const p of programs) {
        result[label] += p[c] || 0;
      }
    }
    return result;
  }

  function rowBreakdownForCol(programs, colIdx) {
    return programs.map((p) => ({
      name: p.name,
      value: p[colIdx] || 0,
    }));
  }

  return { computeAll, colTotals, rowBreakdownForCol, totalSum, topPrograms, topDataCols };
})();
