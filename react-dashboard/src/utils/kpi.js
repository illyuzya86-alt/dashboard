export function progTotal(p, cols) {
  return cols.reduce((s, c) => s + (p[c] || 0), 0);
}

export function colTotal(col, programs) {
  return programs.reduce((s, p) => s + (p[col] || 0), 0);
}

export function grandTotal(programs, cols) {
  return programs.reduce((s, p) => s + progTotal(p, cols), 0);
}

export function topPrograms(programs, cols, n = 3) {
  return programs.slice().sort((a, b) => progTotal(b, cols) - progTotal(a, cols)).slice(0, n);
}

export function topColumns(programs, dataCols, colNames, n = 3) {
  return dataCols
    .map((c, i) => ({ name: colNames[i], value: colTotal(c, programs) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, n);
}
