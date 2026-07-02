/**
 * Google Sheets Apps Script — Dashboard
 *
 * Как установить:
 * 1. Откройте Google Sheets с вашими данными
 * 2. Расширения → Apps Script
 * 3. Вставьте этот файл как Code.gs
 * 4. Создайте файл Index.html (в Apps Script: Файл → Новый → HTML)
 * 5. Сохраните и нажмите "Выполнить" → showDashboard
 * 6. Разрешите доступ при первом запуске
 *
 * Структура таблицы:
 *   A1 = заголовок (наименование программы)
 *   B1, C1, ... = заголовки колонок (территории / показатели)
 *   A2:A = названия строк (программы)
 *   B2:... = числовые данные
 *   Последняя строка с "Итого"/"Всего" игнорируется
 */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('📊 Дашборд')
    .addItem('Открыть дашборд', 'showDashboard')
    .addToUi();
}

function showDashboard() {
  const html = HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('📊 Дашборд — Анализ данных')
    .setWidth(1200)
    .setHeight(800);
  SpreadsheetApp.getUi().showSidebar(html);
}

function getSheetData() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const range = sheet.getDataRange();
  const values = range.getValues();

  if (!values || values.length < 2) {
    return { error: 'Таблица должна содержать заголовок и хотя бы одну строку данных' };
  }

  // Заголовки — первая строка
  const headers = values[0].map(h => String(h).trim());
  const rows = values.slice(1);

  // Определяем числовые колонки (индексы, где заголовки не пусты и не "Итого")
  const dataCols = [];
  for (let c = 1; c < headers.length; c++) {
    const h = headers[c];
    if (!h) continue;
    if (/итог|всего|сумма|total/i.test(h)) continue;
    dataCols.push(c);
  }

  // Собираем программы (строки)
  const programs = [];
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    const name = String(row[0] || '').trim();
    if (!name) continue;
    if (/итог|всего|сумма|total/i.test(name)) continue;

    const prog = { name: name };
    let sum = 0;
    for (const c of dataCols) {
      const val = typeof row[c] === 'number' && isFinite(row[c]) ? row[c] : 0;
      prog[c] = val;
      sum += val;
    }
    prog.total = sum;
    programs.push(prog);
  }

  // Имена колонок для отображения
  const colNames = dataCols.map(c => headers[c]);

  return {
    programs: programs,
    dataCols: dataCols,
    colNames: colNames,
    headers: headers,
    totalPrograms: programs.length,
    totalCols: dataCols.length,
  };
}
