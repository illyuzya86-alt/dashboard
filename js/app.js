(() => {
  'use strict';

  let allData = null;
  let allPrograms = [];
  let allDataCols = [];
  let allHeaders = [];
  let thresholdValue = 50;
  let selectedCol = null;
  let dataLabel = 'Колонки данных';

  const DOM = {
    kpiBar: document.getElementById('kpi-bar'),
    chart1: document.getElementById('chart-programs'),
    chart2: document.getElementById('chart-territories'),
    chart3: document.getElementById('chart-stacked'),
    chart4: document.getElementById('chart-heatmap'),
    tableContainer: document.getElementById('table-container'),
    filterPanel: document.getElementById('filter-panel'),
    fileInput: document.getElementById('file-input'),
    loadSampleBtn: document.getElementById('load-sample'),
    pdfExport: document.getElementById('pdf-export'),
  };

  function init() {
    setupEventListeners();
    showWelcome();
  }

  function setupEventListeners() {
    if (DOM.fileInput) DOM.fileInput.addEventListener('change', handleFileUpload);
    if (DOM.loadSampleBtn) DOM.loadSampleBtn.addEventListener('click', loadSampleData);
    if (DOM.pdfExport) DOM.pdfExport.addEventListener('click', exportPDF);

    document.addEventListener('program-selected', (e) => {
      showToast(`Выбрано: ${e.detail.program}`, 'info');
    });

    document.addEventListener('territory-selected', (e) => {
      const label = e.detail.territory;
      const colIdx = allDataCols.find((c) => (allHeaders[c] ?? String(c)) === label);
      if (colIdx !== undefined) {
        selectedCol = colIdx;
        updateStackedChart();
        updateColTabs();
      }
    });

    document.addEventListener('cell-clicked', (e) => {
      const { program, territory, value } = e.detail;
      const colIdx = allDataCols.find((c) => (allHeaders[c] ?? String(c)) === territory);
      if (colIdx !== undefined) {
        selectedCol = colIdx;
        updateStackedChart();
        updateColTabs();
      }
      showToast(`${program} → ${territory}: ${value}`, 'info');
    });
  }

  function showToast(msg, type) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = `toast ${type || 'info'}`;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  function showWelcome() {
    const msg = `<div style="padding:40px;text-align:center;color:#757575;">
      <p style="font-size:1.1rem;margin-bottom:12px;">Загрузите Excel-файл (.xlsx)</p>
      <p style="font-size:0.85rem;">Дашборд автоматически определит структуру таблицы и построит визуализации</p>
      <p style="margin-top:12px;font-size:0.85rem;">Первая колонка = названия строк, остальные числовые колонки = данные</p>
    </div>`;
    DOM.chart1.innerHTML = msg;
    DOM.kpiBar.innerHTML =
      `<div class="kpi-card"><div class="kpi-label">Ожидание данных</div><div class="kpi-value">—</div><div class="kpi-sub">Загрузите Excel-файл</div></div>`;
    DOM.tableContainer.innerHTML =
      `<p class="text-muted text-center" style="padding:20px;">Загрузите Excel-файл для отображения таблицы</p>`;
  }

  function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    DashboardParser.loadFile(file)
      .then((data) => {
        applyData(data);
        showToast(
          `Загружено: ${file.name} — ${data.programs.length} строк, ${data.territories.length} колонок данных`,
          'success'
        );
      })
      .catch((err) => {
        showToast('Ошибка: ' + err.message, 'error');
      });
  }

  function loadSampleData() {
    showToast('Загрузка демо-данных...', 'info');
    fetch('data/sample.json')
      .then((r) => {
        if (!r.ok) throw new Error('sample.json не найден');
        return r.json();
      })
      .then((json) => {
        const data = DashboardParser.fromJSON(json);
        applyData(data);
        showToast('Загружены демонстрационные данные', 'success');
      })
      .catch((err) => {
        showToast('Ошибка загрузки демо-данных: ' + err.message, 'error');
        showWelcome();
      });
  }

  function applyData(data) {
    allData = data;
    allPrograms = data.programs;
    allDataCols = data.dataCols || [];
    allHeaders = data.headers || data.territories || [];

    selectedCol = allDataCols.length > 0 ? allDataCols[0] : null;

    const filterPanel = DOM.filterPanel;
    filterPanel.innerHTML = '';
    DashboardFilters.init(filterPanel, allPrograms, allDataCols, allHeaders);
    DashboardFilters.onFilterChange(() => updateAll());

    updateAll();
  }

  function updateAll() {
    const fState = DashboardFilters.getState();
    const filteredProgs = DashboardFilters.filterData(allPrograms, fState);
    const filteredCols = DashboardFilters.filterDataCols(allDataCols, fState);

    if (selectedCol !== null && !filteredCols.includes(selectedCol)) {
      selectedCol = filteredCols.length > 0 ? filteredCols[0] : null;
    }

    updateKPI(filteredProgs, filteredCols);
    updateCharts(filteredProgs, filteredCols);
    updateTable(filteredProgs, filteredCols);
  }

  function updateKPI(programs, cols) {
    const kpi = DashboardKPI.computeAll(programs, cols, allHeaders, thresholdValue);
    const total = kpi.total;

    DOM.kpiBar.innerHTML = `
      <div class="kpi-card">
        <div class="kpi-label">Общая сумма</div>
        <div class="kpi-value">${total.toLocaleString()}</div>
        <div class="kpi-sub">по всем строкам и колонкам</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Топ-3 строк</div>
        ${kpi.topPrograms.map((p) =>
          `<div class="kpi-sub"><strong>${esc(p.name)}</strong>: ${p.value.toLocaleString()}</div>`
        ).join('')}
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Топ-3 колонок</div>
        ${kpi.topColumns.map((t) =>
          `<div class="kpi-sub"><strong>${esc(t.name)}</strong>: ${t.value.toLocaleString()}</div>`
        ).join('')}
      </div>

    `;

    const threshInput = DOM.kpiBar.querySelector('#threshold-input');
    if (threshInput) {
      threshInput.addEventListener('change', () => {
        thresholdValue = parseInt(threshInput.value) || 50;
        updateAll();
      });
    }
  }

  function updateCharts(programs, cols) {
    DashboardCharts.renderProgramBars(DOM.chart1, programs, cols, allHeaders);
    DashboardCharts.renderTerritoryChart(DOM.chart2, programs, cols, allHeaders);
    updateStackedChart(programs, cols);
    DashboardCharts.renderHeatmap(DOM.chart4, programs, cols, allHeaders);
  }

  function updateStackedChart(programs, cols) {
    const progs = programs || DashboardFilters.filterData(allPrograms, DashboardFilters.getState());
    const colList = cols || DashboardFilters.filterDataCols(allDataCols, DashboardFilters.getState());
    DashboardCharts.renderStackedBar(DOM.chart3, progs, colList, allHeaders, selectedCol);

    let tabsContainer = DOM.chart3.querySelector('.col-tabs');
    if (!tabsContainer) {
      tabsContainer = document.createElement('div');
      tabsContainer.className = 'col-tabs';
      DOM.chart3.insertBefore(tabsContainer, DOM.chart3.firstChild);
    }
    updateColTabs(progs, colList);
  }

  function updateColTabs(programs, cols) {
    const progs = programs || DashboardFilters.filterData(allPrograms, DashboardFilters.getState());
    const colList = cols || DashboardFilters.filterDataCols(allDataCols, DashboardFilters.getState());

    const tabsContainer = DOM.chart3.querySelector('.col-tabs');
    if (!tabsContainer) return;
    tabsContainer.innerHTML = '';
    for (const c of colList) {
      const label = allHeaders?.[c] ?? String(c);
      const tab = document.createElement('span');
      tab.className = 'col-tab' + (c === selectedCol ? ' active' : '');
      tab.textContent = label;
      tab.addEventListener('click', () => {
        selectedCol = c;
        updateColTabs(progs, colList);
        updateStackedChart(progs, colList);
      });
      tabsContainer.appendChild(tab);
    }
  }

  function updateTable(programs, cols) {
    const displayCols = ['name', ...cols];
    DashboardTable.renderTable(DOM.tableContainer, programs, displayCols, allHeaders);
  }

  function exportPDF() {
    const h2c = window.html2canvas;
    const { jsPDF } = window.jspdf || {};

    if (typeof h2c !== 'function' || typeof jsPDF !== 'function') {
      showToast('Библиотеки для PDF не загружены', 'error');
      return;
    }

    const el = document.querySelector('.main-content');
    h2c(el, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' })
      .then((canvas) => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('l', 'mm', 'a4');
        const pdfW = pdf.internal.pageSize.getWidth();
        const pdfH = (canvas.height * pdfW) / canvas.width;
        let heightLeft = pdfH;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, pdfW, pdfH);
        heightLeft -= pdf.internal.pageSize.getHeight();

        while (heightLeft > 0) {
          position = heightLeft - pdfH;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, pdfW, pdfH);
          heightLeft -= pdf.internal.pageSize.getHeight();
        }
        pdf.save('dashboard_export.pdf');
        showToast('PDF сохранён', 'success');
      })
      .catch((err) => showToast('Ошибка PDF: ' + err.message, 'error'));
  }

  function esc(str) {
    if (!str) return '';
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
