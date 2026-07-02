const DashboardParser = (() => {
  const HOURS_REGEX = /\((\d+)\s*часов?\)/i;
  const TOTAL_PATTERNS = /итог|всего|сумма|total|итого/i;
  const NAME_INDICATORS = /наимен|програм|курс|назван|показател|мероприят|направлени/i;

  function parseHours(name) {
    if (!name) return null;
    const match = name.match(HOURS_REGEX);
    return match ? parseInt(match[1], 10) : null;
  }

  function isNumeric(val) {
    return typeof val === 'number' && isFinite(val);
  }

  function isTotalHeader(text) {
    return TOTAL_PATTERNS.test(String(text || ''));
  }

  function isNameHeader(text) {
    return NAME_INDICATORS.test(String(text || ''));
  }

  function classifyColumn(headers, colIdx, numRows) {
    const header = String(headers[colIdx] || '').trim();

    if (colIdx === 0 || isNameHeader(header)) {
      return 'name';
    }
    if (isTotalHeader(header)) {
      return 'total';
    }
    return 'data';
  }

  function findHeaderRow(rawData) {
    for (let r = 0; r < Math.min(rawData.length, 20); r++) {
      const row = rawData[r];
      if (!row || row.length === 0) continue;
      const first = String(row[0] || '').trim();
      if (!first) continue;
      const totalCells = row.length;
      const numericCount = row.filter((c) => isNumeric(c)).length;
      const textCount = row.filter((c) => c !== null && c !== undefined && typeof c === 'string' && String(c).trim().length > 0).length;
      const mostAreText = textCount > totalCells * 0.5;
      const mostAreNumeric = numericCount > totalCells * 0.5;
      if (isNameHeader(first) && !mostAreNumeric) return r;
      if (mostAreText && numericCount >= 1 && !mostAreNumeric) return r;
    }
    return 0;
  }

  function isSummaryRow(row, nameIdx) {
    const name = String(row[nameIdx] || '').trim();
    if (!name) return true;
    if (isTotalHeader(name)) return true;
    const vals = row.filter((c) => isNumeric(c));
    if (vals.length > 0 && vals.every((v) => v === 0)) return false;
    return false;
  }

  function fromExcel(workbook) {
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, blankrows: false });

    if (!raw || raw.length === 0) {
      throw new Error('Лист Excel пуст или не содержит данных');
    }

    const headerRow = findHeaderRow(raw);
    const headers = (raw[headerRow] || []).map((h) => String(h || '').trim());
    const effectiveHeaders = headers.filter((h) => h.length > 0);

    if (effectiveHeaders.length < 2) {
      throw new Error('Не удалось определить структуру таблицы. Убедитесь, что первый лист содержит таблицу с заголовками колонок.');
    }

    const colCount = headers.length;
    const colTypes = [];
    const nameCols = [];
    const dataCols = [];
    const totalCols = [];

    for (let c = 0; c < colCount; c++) {
      const type = classifyColumn(headers, c, raw.length);
      colTypes[c] = type;
      if (type === 'name') nameCols.push(c);
      else if (type === 'total') totalCols.push(c);
      else dataCols.push(c);
    }

    const nameColIdx = nameCols.length > 0 ? nameCols[0] : 0;

    const programs = [];

    for (let r = headerRow + 1; r < raw.length; r++) {
      const row = raw[r];
      if (!row || row.length === 0) continue;

      const name = String(row[nameColIdx] || '').trim();
      if (!name) continue;
      if (isTotalHeader(name)) continue;

      const hours = parseHours(name);
      const entry = { name, hours };
      let sumTotal = 0;

      for (const c of dataCols) {
        const val = isNumeric(row[c]) ? row[c] : 0;
        entry[c] = val;
        sumTotal += val;
      }

      entry.total = sumTotal;

      programs.push(entry);
    }

    const dataHeaders = dataCols.map((c) => headers[c]);

    return {
      programs,
      territories: dataHeaders,
      dataCols,
      totalLabel: 'total',
      headers,
    };
  }

  function loadFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const result = fromExcel(workbook);

          const errors = validateData(result);
          if (errors.length > 0) {
            reject(new Error(errors.join('; ')));
            return;
          }

          resolve(result);
        } catch (err) {
          reject(new Error('Ошибка чтения Excel: ' + err.message));
        }
      };
      reader.onerror = () => reject(new Error('Ошибка загрузки файла'));
      reader.readAsArrayBuffer(file);
    });
  }

  function validateData(data) {
    const errors = [];
    if (!data || !data.programs || data.programs.length === 0) {
      errors.push('Не найдено строк с данными');
    }
    if (!data.territories || data.territories.length === 0) {
      errors.push('Не найдено колонок с числовыми данными');
    }
    if (data.programs && data.programs.length > 0) {
      const emptyNames = data.programs.filter((p) => !p.name);
      if (emptyNames.length > 0) {
        errors.push('Обнаружены строки без названия');
      }
    }
    return errors;
  }

  function fromJSON(jsonData) {
    let headers = [];
    let rows = [];

    if (jsonData.headers && jsonData.rows) {
      headers = jsonData.headers;
      rows = jsonData.rows;
    } else if (jsonData.programs && Array.isArray(jsonData.programs)) {
      const meta = jsonData.meta || {};
      const allCols = [...(meta.territories || []), ...(meta.categories || [])];
      const totalLabel = meta.totalLabel || 'total';
      headers = ['Наименование', ...allCols, totalLabel];
      rows = jsonData.programs.map((prog) => {
        const row = [prog.name];
        for (const col of allCols) {
          row.push(prog[col] ?? prog.territories?.[col] ?? prog.categories?.[col] ?? 0);
        }
        row.push(row.slice(1).reduce((a, b) => a + b, 0));
        return row;
      });
    } else {
      throw new Error('Формат JSON должен содержать {headers: [...], rows: [...]}');
    }

    const nameIdx = 0;
    const dataCols = [];
    for (let i = 1; i < headers.length; i++) {
      if (isTotalHeader(headers[i])) continue;
      dataCols.push(i);
    }

    const programs = rows.map((row) => {
      const name = String(row[nameIdx] || '').trim();
      if (!name) return null;
      const hours = parseHours(name);
      const entry = { name, hours };
      let sum = 0;
      for (const c of dataCols) {
        const val = isNumeric(row[c]) ? row[c] : 0;
        entry[c] = val;
        sum += val;
      }
      entry.total = sum;
      return entry;
    }).filter(Boolean);

    return {
      programs,
      territories: dataCols.map((c) => headers[c]),
      dataCols,
      totalLabel: 'total',
      headers,
      categories: [],
    };
  }

  return { parseHours, fromExcel, fromJSON, loadFile, validateData };
})();
