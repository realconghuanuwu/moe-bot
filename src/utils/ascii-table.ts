export function renderAsciiTable(headers: string[], rows: string[][]): string {
  const colWidths = headers.map((h, i) => {
    let max = h.length;
    for (const row of rows) {
      if (row[i] && row[i].length > max) {
        max = row[i].length;
      }
    }
    return max + 2;
  });

  const top = `╔` + colWidths.map((w) => `═`.repeat(w)).join(`╦`) + `╗`;
  const headerRow =
    `║` + headers.map((h, i) => padCenter(h, colWidths[i])).join(`║`) + `║`;
  const headerSep = `╠` + colWidths.map((w) => `═`.repeat(w)).join(`╬`) + `╣`;
  const midSep = `╟` + colWidths.map((w) => `─`.repeat(w)).join(`╫`) + `╢`;
  const bottom = `╚` + colWidths.map((w) => `═`.repeat(w)).join(`╩`) + `╝`;

  let result = `${top}\n${headerRow}\n${headerSep}\n`;

  for (let i = 0; i < rows.length; i++) {
    const rowData = rows[i];
    const rowStr =
      `║` +
      rowData
        .map((d, colIdx) => " " + padRight(d || "", colWidths[colIdx] - 1))
        .join(`║`) +
      `║`;
    result += rowStr + "\n";
    if (i < rows.length - 1) {
      result += midSep + "\n";
    }
  }
  result += bottom;
  return result;
}

function padCenter(str: string, width: number) {
  const spaces = width - str.length;
  const left = Math.floor(spaces / 2);
  const right = spaces - left;
  return " ".repeat(Math.max(0, left)) + str + " ".repeat(Math.max(0, right));
}

function padRight(str: string, width: number) {
  return str + " ".repeat(Math.max(0, width - str.length));
}
