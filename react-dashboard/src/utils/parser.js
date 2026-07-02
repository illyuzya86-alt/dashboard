import * as XLSX from 'xlsx';

const HOURS_RE = /\((\d+)\s*часов?\)/i;
const TOTAL_RE = /итог|всего|сумма|total|итого/i;
const NAME_RE = /наимен|програм|курс|назван/i;

export function parseHours(name) {
  if (!name) return null;
  const m = name.match(HOURS_RE);
  return m ? +m[1] : null;
}

export function findHeaderRow(data) {
  for (let r = 0; r < Math.min(data.length, 20); r++) {
    const row = data[r];
    if (!row || !row.length) continue;
    const first = String(row[0] || '').trim();
    if (!first) continue;
    const total = row.length;
    const nums = row.filter((c) => typeof c === 'number' && isFinite(c)).length;
    const texts = row.filter((c) => c !== null && c !== undefined && typeof c === 'string' && c.trim().length > 0).length;
    if (NAME_RE.test(first) && nums <= total * 0.5) return r;
    if (texts > total * 0.5 && nums >= 1 && nums <= total * 0.5) return r;
  }
  return 0;
}

export function parseSheet(data) {
  const hr = findHeaderRow(data);
  const headers = (data[hr] || []).map((h) => String(h || '').trim());

  const dataCols = [];
  for (let c = 1; c < headers.length; c++) {
    if (!headers[c] || TOTAL_RE.test(headers[c])) continue;
    dataCols.push(c);
  }

  const programs = [];
  for (let r = hr + 1; r < data.length; r++) {
    const row = data[r];
    if (!row) continue;
    const name = String(row[0] || '').trim();
    if (!name || TOTAL_RE.test(name)) continue;

    const hours = parseHours(name);
    const entry = { name, hours };
    let total = 0;
    for (const c of dataCols) {
      const v = typeof row[c] === 'number' && isFinite(row[c]) ? row[c] : 0;
      entry[c] = v;
      total += v;
    }
    entry.total = total;
    programs.push(entry);
  }

  return {
    programs,
    dataCols,
    colNames: dataCols.map((c) => headers[c]),
    headers,
  };
}

export function loadFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, blankrows: false });
        if (!raw || raw.length < 2) return reject(new Error('Таблица должна содержать заголовок и данные'));
        resolve(parseSheet(raw));
      } catch (err) {
        reject(new Error('Ошибка чтения Excel: ' + err.message));
      }
    };
    reader.onerror = () => reject(new Error('Ошибка загрузки файла'));
    reader.readAsArrayBuffer(file);
  });
}
