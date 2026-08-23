import "server-only";

import ExcelJS from "exceljs";

export interface ParsedSheet {
  headers: string[];
  rows: { rowNumber: number; values: Record<string, string> }[];
}

/**
 * .xlsx is parsed via exceljs (the vetted, actively-maintained dependency
 * added for this feature — see the bulk-import report for why the `xlsx`
 * npm package was rejected: unpatched high-severity prototype-pollution/
 * ReDoS advisories, directly in the code path that would parse untrusted
 * uploads). .csv is parsed with a small hand-rolled parser below rather
 * than exceljs's stream-based CSV reader, to avoid Readable-stream
 * plumbing for a straightforward quoted-comma-separated format.
 */
export async function parseSpreadsheet(file: File): Promise<ParsedSheet> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const name = file.name.toLowerCase();

  if (name.endsWith(".csv")) {
    return parseCsv(buffer.toString("utf-8"));
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) return { headers: [], rows: [] };

  const headerRow = worksheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    headers[colNumber - 1] = String(cell.value ?? "").trim();
  });

  const rows: { rowNumber: number; values: Record<string, string> }[] = [];
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    const values: Record<string, string> = {};
    let hasContent = false;
    headers.forEach((header, i) => {
      if (!header) return;
      const v = cellToString(row.getCell(i + 1).value);
      values[header] = v;
      if (v) hasContent = true;
    });
    if (hasContent) rows.push({ rowNumber, values });
  });

  return { headers: headers.filter(Boolean), rows };
}

function cellToString(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") {
    if ("text" in value) return String(value.text ?? "").trim();
    if ("richText" in value) return value.richText.map((r) => r.text).join("").trim();
    if ("result" in value) return String(value.result ?? "").trim();
  }
  return String(value).trim();
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function parseCsv(text: string): ParsedSheet {
  const lines = text.split(/\r\n|\n|\r/).filter((l) => l.length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = parseCsvLine(lines[0]);
  const rows: { rowNumber: number; values: Record<string, string> }[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    const values: Record<string, string> = {};
    let hasContent = false;
    headers.forEach((h, idx) => {
      if (!h) return;
      const v = cells[idx] ?? "";
      values[h] = v;
      if (v) hasContent = true;
    });
    if (hasContent) rows.push({ rowNumber: i + 1, values });
  }
  return { headers: headers.filter(Boolean), rows };
}
