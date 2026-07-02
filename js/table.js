const DashboardTable = (() => {
  let currentData = [];
  let displayCols = [];
  let sortCol = null;
  let sortAsc = true;
  let searchTerm = '';
  let totalOverall = 0;

  function exportToCSV(data, columns, headers, filename) {
    const BOM = '\uFEFF';
    const colNames = columns.map((c) => getColName(c, headers));
    const header = colNames.map((h) => `"${h}"`).join(',');
    const rows = data.map((row) =>
      columns.map((c) => {
        const val = row[c] !== undefined ? row[c] : (c === 'name' ? row.name : '');
        return `"${val}"`;
      }).join(',')
    );
    const csv = BOM + header + '\n' + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename || 'dashboard_export.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function exportToExcel(data, columns, headers, filename) {
    const colNames = columns.map((c) => getColName(c, headers));
    const wsData = [colNames];
    for (const row of data) {
      wsData.push(columns.map((c) => {
        return c === 'name' ? row.name : (row[c] !== undefined ? row[c] : '');
      }));
    }
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data');
    XLSX.writeFile(wb, filename || 'dashboard_export.xlsx');
  }

  function getColName(c, headers) {
    if (c === 'name') return 'Наименование';
    return headers?.[c] !== undefined ? String(headers[c]) : String(c);
  }

  function renderTable(container, data, columns, headers) {
    currentData = data;
    displayCols = columns;

    const totalCols = columns.filter((c) => c !== 'name' && c !== '_dataCols' && c !== 'total' && typeof c === 'number');
    totalOverall = data.reduce((s, row) => {
      return s + totalCols.reduce((s2, c) => s2 + (row[c] || 0), 0);
    }, 0);

    const wrapper = container;
    wrapper.innerHTML = '';

    const toolbar = document.createElement('div');
    toolbar.className = 'table-toolbar';

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'table-search';
    searchInput.placeholder = 'Поиск по названию...';
    searchInput.value = searchTerm;
    searchInput.addEventListener('input', (e) => {
      searchTerm = e.target.value.toLowerCase();
      renderTableBody(headers);
    });

    const expCsvBtn = document.createElement('button');
    expCsvBtn.className = 'btn btn-sm btn-outline';
    expCsvBtn.textContent = 'CSV';
    expCsvBtn.addEventListener('click', () => {
      exportToCSV(getFilteredData(), displayCols, headers, 'dashboard_export.csv');
    });

    const expXlsxBtn = document.createElement('button');
    expXlsxBtn.className = 'btn btn-sm btn-outline';
    expXlsxBtn.textContent = 'Excel';
    expXlsxBtn.addEventListener('click', () => {
      exportToExcel(getFilteredData(), displayCols, headers, 'dashboard_export.xlsx');
    });

    const exportGroup = document.createElement('div');
    exportGroup.className = 'export-group';
    exportGroup.appendChild(expCsvBtn);
    exportGroup.appendChild(expXlsxBtn);

    toolbar.appendChild(searchInput);
    toolbar.appendChild(exportGroup);
    wrapper.appendChild(toolbar);

    const scrollWrap = document.createElement('div');
    scrollWrap.className = 'table-scroll';

    const table = document.createElement('table');
    table.className = 'data-table';

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');

    for (const c of columns) {
      const th = document.createElement('th');
      th.textContent = getColName(c, headers);
      th.dataset.col = c;
      if (c === sortCol) th.classList.add('sorted', sortAsc ? 'asc' : 'desc');
      th.addEventListener('click', () => {
        if (sortCol === c) sortAsc = !sortAsc;
        else { sortCol = c; sortAsc = true; }
        renderTableBody(headers);
      });
      headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    tbody.id = 'table-body';
    table.appendChild(tbody);
    scrollWrap.appendChild(table);
    wrapper.appendChild(scrollWrap);

    renderTableBody(headers);

    const countInfo = document.createElement('div');
    countInfo.className = 'table-count';
    scrollWrap.after(countInfo);
    updateCountInfo();
  }

  function getFilteredData() {
    let filtered = currentData.slice();
    if (searchTerm) {
      filtered = filtered.filter((r) => (r.name || '').toLowerCase().includes(searchTerm));
    }
    if (sortCol !== null) {
      filtered.sort((a, b) => {
        const va = sortCol === 'name' ? a.name : (a[sortCol] !== undefined ? a[sortCol] : '');
        const vb = sortCol === 'name' ? b.name : (b[sortCol] !== undefined ? b[sortCol] : '');
        if (typeof va === 'number' && typeof vb === 'number') {
          return sortAsc ? va - vb : vb - va;
        }
        return sortAsc
          ? String(va).localeCompare(String(vb))
          : String(vb).localeCompare(String(va));
      });
    }
    return filtered;
  }

  function renderTableBody(headers) {
    const tbody = document.getElementById('table-body');
    if (!tbody) return;

    const filtered = getFilteredData();
    tbody.innerHTML = '';

    for (const row of filtered) {
      const tr = document.createElement('tr');
      for (const c of displayCols) {
        const td = document.createElement('td');
        let val;
        if (c === 'name') {
          val = row.name || '';
          td.style.textAlign = 'left';
        } else {
          val = row[c] !== undefined ? row[c] : 0;
          td.style.textAlign = 'right';
          if (totalOverall > 0 && val > 0) {
            td.title = `${((val / totalOverall) * 100).toFixed(2)}% от общего`;
          }
        }
        td.textContent = typeof val === 'number' ? val.toLocaleString() : val;
        tr.appendChild(td);
      }
      tr.addEventListener('click', () => {
        fire('program-selected', { program: row.name, data: row });
      });
      tbody.appendChild(tr);
    }

    updateCountInfo(filtered.length);
  }

  function updateCountInfo(filteredCount) {
    const el = document.querySelector('.table-count');
    if (!el) return;
    el.textContent = `Показано: ${filteredCount ?? currentData.length} из ${currentData.length} записей`;
  }

  function fire(name, detail) {
    document.dispatchEvent(new CustomEvent(name, { detail, bubbles: true }));
  }

  return { renderTable, exportToCSV, exportToExcel };
})();
