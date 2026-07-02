import React from 'react';
import Header from './components/Header';
import FilterPanel from './components/FilterPanel';
import KPIBar from './components/KPIBar';
import { ProgramBars, TerritoryPie, StackedBar, Heatmap } from './components/Charts';
import DataTable from './components/DataTable';
import useDashboard from './hooks/useDashboard';

export default function App() {
  const {
    data, loading, error, filters,
    selectedCol, setSelectedCol,
    filteredPrograms, filteredCols, kpiData,
    loadSample, uploadFile, toggleFilter,
  } = useDashboard();

  if (loading) return <div className="loading">Загрузка...</div>;

  if (!data) {
    return (
      <>
        <Header onUpload={uploadFile} onSample={loadSample} />
        <div className="app-layout">
          <div style={{
            gridColumn: '1 / -1',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            height: 400, color: '#999', gap: 16,
          }}>
            <div style={{ fontSize: '2rem', opacity: 0.3 }}>📊</div>
            <p>Загрузите Excel-файл или откройте демо-данные</p>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header onUpload={uploadFile} onSample={loadSample} />
        <div className="app-layout">
          <div style={{ gridColumn: '1 / -1', color: '#c62828', padding: 20 }}>
            Ошибка: {error}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header onUpload={uploadFile} onSample={loadSample} />
      <div className="app-layout">
        <FilterPanel
          programs={data.programs}
          dataCols={data.dataCols}
          colNames={data.colNames}
          selectedPrograms={filters.programs}
          selectedCols={filters.cols}
          onToggleProgram={(name) => toggleFilter('program', name)}
          onToggleCol={(c) => toggleFilter('col', c)}
        />
        <main>
          <KPIBar kpi={kpiData} />

          <div style={{ marginTop: 16 }}>
            <div className="col-tabs">
              {data.dataCols.map((c, i) => (
                <span
                  key={c}
                  className={'col-tab' + (selectedCol === c ? ' active' : '')}
                  onClick={() => setSelectedCol(c)}
                >
                  {data.colNames[i]}
                </span>
              ))}
            </div>
          </div>

          <div className="charts-grid" style={{ marginTop: 12 }}>
            <ProgramBars programs={filteredPrograms} dataCols={filteredCols} onSelect={() => {}} />
            <TerritoryPie programs={filteredPrograms} dataCols={filteredCols} colNames={
              data.colNames.filter((_, i) => filteredCols.includes(data.dataCols[i]))
            } onSelect={(label) => {
              const idx = data.colNames.indexOf(label);
              if (idx >= 0) setSelectedCol(data.dataCols[idx]);
            }} />
            <StackedBar
              programs={filteredPrograms}
              dataCols={filteredCols}
              colNames={data.colNames.filter((_, i) => filteredCols.includes(data.dataCols[i]))}
              selectedCol={filteredCols.includes(selectedCol) ? selectedCol : (filteredCols[0] ?? null)}
              onSelect={() => {}}
            />
            <Heatmap programs={filteredPrograms} dataCols={filteredCols} colNames={
              data.colNames.filter((_, i) => filteredCols.includes(data.dataCols[i]))
            } />
          </div>

          <div style={{ marginTop: 16 }}>
            <DataTable programs={filteredPrograms} dataCols={filteredCols} colNames={
              data.colNames.filter((_, i) => filteredCols.includes(data.dataCols[i]))
            } />
          </div>
        </main>
      </div>
    </>
  );
}
