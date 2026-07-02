import { useState, useCallback, useMemo } from 'react';
import { loadFile } from '../utils/parser';
import { grandTotal, topPrograms, topColumns, colTotal, progTotal } from '../utils/kpi';

const SAMPLE_DATA = {
  headers: ['Программа', 'Когалым', 'Лангепас', 'Покачи', 'Урай'],
  rows: [
    ['Охрана труда (16 ч)', 12, 8, 5, 14],
    ['Пожарная безопасность (24 ч)', 9, 6, 3, 11],
    ['Первая помощь (8 ч)', 18, 12, 7, 20],
    ['Электробезопасность (40 ч)', 6, 4, 2, 8],
    ['Работа на высоте (16 ч)', 8, 5, 3, 9],
    ['ГО и ЧС (24 ч)', 5, 3, 2, 7],
    ['Противодействие коррупции (16 ч)', 7, 4, 2, 8],
    ['Информ. безопасность (16 ч)', 10, 6, 3, 11],
  ],
};

export default function useDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ programs: [], cols: [] });
  const [selectedCol, setSelectedCol] = useState(null);

  const loadSample = useCallback(() => {
    setLoading(true);
    setError(null);
    setTimeout(() => {
      try {
        const rows = SAMPLE_DATA.rows;
        const headerRow = [SAMPLE_DATA.headers];
        const raw = [...headerRow, ...rows];
        const hr = 0;
        const headers = SAMPLE_DATA.headers;
        const dataCols = [];
        for (let c = 1; c < headers.length; c++) {
          if (!headers[c]) continue;
          dataCols.push(c);
        }
        const programs = rows.map((row) => {
          const name = String(row[0] || '').trim();
          const entry = { name, hours: null };
          let total = 0;
          for (const c of dataCols) {
            const v = typeof row[c] === 'number' && isFinite(row[c]) ? row[c] : 0;
            entry[c] = v;
            total += v;
          }
          entry.total = total;
          return entry;
        });
        const d = { programs, dataCols, colNames: headers.slice(1), headers };
        setData(d);
        setSelectedCol(d.dataCols[0] || null);
        setFilters({ programs: d.programs.map((p) => p.name), cols: d.dataCols.slice() });
      } catch (e) {
        setError(e.message);
      }
      setLoading(false);
    }, 200);
  }, []);

  const uploadFile = useCallback(async (file) => {
    setLoading(true);
    setError(null);
    try {
      const d = await loadFile(file);
      setData(d);
      setSelectedCol(d.dataCols[0] || null);
      setFilters({ programs: d.programs.map((p) => p.name), cols: d.dataCols.slice() });
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }, []);

  const filteredPrograms = useMemo(() => {
    if (!data) return [];
    if (!filters.programs.length) return data.programs;
    return data.programs.filter((p) => filters.programs.includes(p.name));
  }, [data, filters.programs]);

  const filteredCols = useMemo(() => {
    if (!data) return [];
    if (!filters.cols.length) return data.dataCols;
    return data.dataCols.filter((c) => filters.cols.includes(c));
  }, [data, filters.cols]);

  const kpiData = useMemo(() => {
    if (!filteredPrograms.length || !filteredCols.length) return null;
    return {
      total: grandTotal(filteredPrograms, filteredCols),
      topProgs: topPrograms(filteredPrograms, filteredCols, 3),
      topCols: topColumns(filteredPrograms, filteredCols, data.colNames, 3),
      count: filteredPrograms.length,
      colCount: filteredCols.length,
    };
  }, [filteredPrograms, filteredCols, data]);

  const toggleFilter = useCallback((type, value) => {
    setFilters((prev) => {
      const arr = type === 'program' ? 'programs' : 'cols';
      const current = prev[arr];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [arr]: next.length ? next : (type === 'program' ? prev.programs : prev.cols) };
    });
  }, []);

  return {
    data, loading, error,
    filters, setFilters,
    selectedCol, setSelectedCol,
    filteredPrograms, filteredCols,
    kpiData,
    loadSample, uploadFile, toggleFilter,
  };
}
