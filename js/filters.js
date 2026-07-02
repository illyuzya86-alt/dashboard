const DashboardFilters = (() => {
  let state = {
    colFilters: {},
    programs: [],
    hoursMin: null,
    hoursMax: null,
  };

  let onChangeCallback = null;
  let allProgramsRef = [];
  let dataColsRef = [];
  let headersRef = [];

  function init(container, allPrograms, dataCols, headers) {
    container.innerHTML = '';
    allProgramsRef = allPrograms;
    dataColsRef = dataCols;
    headersRef = headers;

    state.colFilters = {};
    for (const c of dataCols) {
      state.colFilters[c] = true;
    }
    state.programs = allPrograms.map((p) => p.name);
    state.hoursMin = null;
    state.hoursMax = null;

    const title = document.createElement('h3');
    title.className = 'filter-title';
    title.textContent = 'Фильтры';
    container.appendChild(title);

    const hours = extractHoursRange(allPrograms);
    createMultiFilter(container, 'Колонки (данные)', dataCols, headers,
      (c) => state.colFilters[c] !== false,
      (c, checked) => { state.colFilters[c] = checked; },
      () => dataColsRef.slice().filter((c) => state.colFilters[c] !== false),
    );
    createMultiFilter(container, 'Строки (программы)', allPrograms.map((p) => p.name), null,
      (name) => state.programs.includes(name),
      (name, checked) => {
        if (checked) {
          if (!state.programs.includes(name)) state.programs.push(name);
        } else {
          state.programs = state.programs.filter((n) => n !== name);
        }
      },
      () => state.programs,
    );
    if (hours.min !== hours.max) {
      createHoursFilter(container, hours.min, hours.max);
    }

    const resetBtn = document.createElement('button');
    resetBtn.className = 'btn btn-sm btn-outline reset-filters';
    resetBtn.textContent = 'Сбросить фильтры';
    resetBtn.addEventListener('click', () => {
      resetFilters();
    });
    container.appendChild(resetBtn);
  }

  function extractHoursRange(programs) {
    let min = Infinity, max = -Infinity;
    for (const p of programs) {
      if (p.hours !== null && p.hours !== undefined) {
        if (p.hours < min) min = p.hours;
        if (p.hours > max) max = p.hours;
      }
    }
    return { min: min === Infinity ? 0 : min, max: max === -Infinity ? 0 : max };
  }

  function createMultiFilter(container, label, items, headers, getSelected, setSelected, getActive) {
    if (!items || items.length === 0) return;
    const group = document.createElement('div');
    group.className = 'filter-group';

    const lbl = document.createElement('label');
    lbl.className = 'filter-label';
    lbl.textContent = label;
    group.appendChild(lbl);

    const selectAll = document.createElement('label');
    selectAll.className = 'filter-checkbox select-all';
    const saInput = document.createElement('input');
    saInput.type = 'checkbox';
    saInput.checked = true;
    saInput.addEventListener('change', () => {
      for (const item of items) {
        setSelected(item, saInput.checked);
      }
      rebuildCheckboxes(scrollDiv, items, headers, getSelected, setSelected);
      notifyChange();
    });
    selectAll.appendChild(saInput);
    selectAll.append(' Выбрать все');
    group.appendChild(selectAll);

    const scrollDiv = document.createElement('div');
    scrollDiv.className = 'filter-scroll';

    rebuildCheckboxes(scrollDiv, items, headers, getSelected, setSelected);

    group.appendChild(scrollDiv);
    container.appendChild(group);
  }

  function rebuildCheckboxes(scrollDiv, items, headers, getSelected, setSelected) {
    scrollDiv.innerHTML = '';
    for (const item of items) {
      const display = headers ? (headers[item] ?? String(item)) : item;
      const cbLabel = document.createElement('label');
      cbLabel.className = 'filter-checkbox';
      cbLabel.dataset.value = item;
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = getSelected(item);
      cb.addEventListener('change', () => {
        setSelected(item, cb.checked);
        updateSelectAll(scrollDiv, items);
        notifyChange();
      });
      cbLabel.appendChild(cb);
      cbLabel.append(' ' + display);
      scrollDiv.appendChild(cbLabel);
    }
  }

  function updateSelectAll(scrollDiv, items) {
    const allCb = scrollDiv.parentElement.querySelector('.select-all input');
    if (!allCb) return;
    const checked = scrollDiv.querySelectorAll('input[type="checkbox"]');
    allCb.checked = checked.length > 0 && Array.from(checked).every((cb) => cb.checked);
  }

  function createHoursFilter(container, minVal, maxVal) {
    const group = document.createElement('div');
    group.className = 'filter-group';

    const label = document.createElement('label');
    label.className = 'filter-label';
    label.textContent = 'Длительность (часы)';
    group.appendChild(label);

    const rangeDiv = document.createElement('div');
    rangeDiv.className = 'filter-range';

    const minInput = document.createElement('input');
    minInput.type = 'number';
    minInput.className = 'range-input';
    minInput.min = minVal;
    minInput.max = maxVal;
    minInput.value = minVal;
    minInput.placeholder = 'От';

    const maxInput = document.createElement('input');
    maxInput.type = 'number';
    maxInput.className = 'range-input';
    maxInput.min = minVal;
    maxInput.max = maxVal;
    maxInput.value = maxVal;
    maxInput.placeholder = 'До';

    const sep = document.createElement('span');
    sep.className = 'range-sep';
    sep.textContent = '—';

    rangeDiv.appendChild(minInput);
    rangeDiv.appendChild(sep);
    rangeDiv.appendChild(maxInput);
    group.appendChild(rangeDiv);

    state.hoursMin = minVal;
    state.hoursMax = maxVal;

    minInput.addEventListener('change', () => {
      state.hoursMin = parseInt(minInput.value) || minVal;
      if (state.hoursMin > state.hoursMax) state.hoursMin = state.hoursMax;
      notifyChange();
    });
    maxInput.addEventListener('change', () => {
      state.hoursMax = parseInt(maxInput.value) || maxVal;
      if (state.hoursMax < state.hoursMin) state.hoursMax = state.hoursMin;
      notifyChange();
    });

    container.appendChild(group);
  }

  function resetFilters() {
    state.colFilters = {};
    for (const c of dataColsRef) state.colFilters[c] = true;
    state.programs = allProgramsRef.map((p) => p.name);
    state.hoursMin = null;
    state.hoursMax = null;
    const container = document.querySelector('.filter-panel');
    init(container, allProgramsRef, dataColsRef, headersRef);
    notifyChange();
  }

  function onFilterChange(callback) {
    onChangeCallback = callback;
  }

  function notifyChange() {
    if (onChangeCallback) onChangeCallback(getState());
  }

  function getState() {
    const activeCols = dataColsRef.filter((c) => state.colFilters[c] !== false);
    return {
      colFilters: { ...state.colFilters },
      activeCols,
      programs: [...state.programs],
      hoursMin: state.hoursMin,
      hoursMax: state.hoursMax,
    };
  }

  function filterData(programs, s) {
    if (!s) s = getState();
    return programs.filter((p) => {
      if (s.programs.length > 0 && !s.programs.includes(p.name)) return false;
      if (s.hoursMin !== null && p.hours !== null && p.hours < s.hoursMin) return false;
      if (s.hoursMax !== null && p.hours !== null && p.hours > s.hoursMax) return false;
      return true;
    });
  }

  function filterDataCols(dataCols, s) {
    if (!s) s = getState();
    if (s.activeCols && s.activeCols.length > 0) {
      return dataCols.filter((c) => s.activeCols.includes(c));
    }
    return dataCols;
  }

  return { init, onFilterChange, getState, filterData, filterDataCols };
})();
