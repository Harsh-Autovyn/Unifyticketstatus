import type { Ticket, CategoryMaster, SummaryRow } from '../types/ticket';
import fallbackData from './fallbackData.json';

// Google Sheet ID
const SHEET_ID = '1rSD_Y7DWo0MHPv60TTTr_-ycGKDZKJdvr1BQYkAW1as';

export const CSV_URLS = {
  DUMP: `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=DUMP`,
  SUMMARY: `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=SUMMARY`,
  CATEGORY_MASTER: `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=CATEGORY+MASTER`
};

export interface DashboardData {
  tickets: Ticket[];
  categories: CategoryMaster[];
  summaries: SummaryRow[];
  isFallback: boolean;
}

async function fetchCSV(url: string): Promise<any[]> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const text = await response.text();
    return parseCSVText(text);
  } catch (error) {
    console.error(`Error fetching CSV from ${url}:`, error);
    throw error;
  }
}

function parseCSVText(text: string): any[] {
  const lines: string[] = [];
  let currentLine = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      currentLine += char; // KEEP the quote so parseCSVLine can handle it
    } else if (char === '\n' && !inQuotes) {
      lines.push(currentLine);
      currentLine = '';
    } else if (char === '\r') {
      // skip carriage returns
    } else {
      currentLine += char;
    }
  }
  if (currentLine) lines.push(currentLine);

  if (lines.length === 0) return [];

  const headers = parseCSVLine(lines[0]);
  const records: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0 || (values.length === 1 && values[0] === '')) continue;

    const record: any = {};
    headers.forEach((header, index) => {
      const val = values[index] !== undefined ? values[index] : '';
      record[header.trim()] = val.trim();
    });
    records.push(record);
  }
  return records;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let currentVal = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      // Don't add the quote character itself to the value
    } else if (char === ',' && !inQuotes) {
      result.push(currentVal);
      currentVal = '';
    } else {
      currentVal += char;
    }
  }
  result.push(currentVal);
  return result;
}


/**
 * Classifies a ticket as Autovyn or Third Party using Sub Category.
 *
 * Autovyn Sub Categories (from the TEST sheet):
 *   User Guidance, Dealer CRM Related, Service Request,
 *   Revert back to L1, Revert back to L2, Revert back to L3, Revert back to L4
 *
 * Third Party Sub Categories (from the TEST sheet):
 *   DPS Related, Business Requirment, User Not Responding,
 *   TCL Dialer, Common Microservice, Clear Quote,
 *   Webiste Issues, AMIE & KARA, Firewall, AWS
 *
 * Classification is by EXACT match on trimmed, lower-cased Sub Category.
 * Unknown subcategories default to Autovyn (internal team handles it).
 */
export function getTicketOwnership(subCategory: string): 'Autovyn' | 'Third Party' {
  const sub = (subCategory || '').trim().toLowerCase();

  // Explicit Third Party sub-categories (exact match)
  const THIRD_PARTY_SUBS = new Set([
    'dps related',
    'business requirment',
    'user not responding',
    'tcl dialer',
    'common microservice',
    'clear quote',
    'webiste issues',
    'amie & kara',
    'firewall',
    'aws',
  ]);

  if (THIRD_PARTY_SUBS.has(sub)) {
    return 'Third Party';
  }

  return 'Autovyn';
}

export async function getDashboardData(): Promise<DashboardData> {
  try {
    const [dumpRows, catRows, summaryRows] = await Promise.all([
      fetchCSV(CSV_URLS.DUMP),
      fetchCSV(CSV_URLS.CATEGORY_MASTER),
      fetchCSV(CSV_URLS.SUMMARY)
    ]);

    // Map DUMP rows to Ticket objects
    const tickets: Ticket[] = dumpRows.map(row => {
      const ticketNo = (row['Ticket No.'] || row['Ticket No'] || '').trim();
      const desc = (row['Issue Discription'] || row['Issue Description'] || row['Description'] || '').trim();
      const ttype = (row['Ticket Type'] || '').trim();
      // The header in the sheet has a trailing space: "Resolution Code "
      const resCode = (row['Resolution Code'] || row['Resolution Code '] || '').trim();
      const cat = (row['Category'] || '').trim();
      const subCat = (row['Sub Category'] || '').trim();
      const status = (row['Status'] || '').trim();
      const dateRaw = (row['Date'] || '').trim();

      return {
        Date: cleanDate(dateRaw),
        'Ticket No.': ticketNo,
        'Issue Discription': desc,
        'Ticket Type': ttype,
        'Resolution Code': resCode,
        Category: cat,
        'Sub Category': subCat,
        Status: status,
        ownership: getTicketOwnership(subCat),
      };
    }).filter(t => t['Ticket No.'] !== '');

    const categories: CategoryMaster[] = catRows.map(row => ({
      'Resolution Code': (row['Resolution Code'] || '').trim(),
      Category: (row['Category'] || '').trim(),
      'Sub Category': (row['Sub Category'] || '').trim(),
    }));

    const summaries: SummaryRow[] = summaryRows.map(row => ({
      Date: cleanDate(row['Date'] || ''),
      'Dealer CRM Application issue': parseNum(row['Dealer CRM Application issue']),
      'DPS Data Related': parseNum(row['DPS Data Related']),
      'Revert back to L1': parseNum(row['Revert back to L1']),
      'Service Request ': parseNum(row['Service Request ']) ?? parseNum(row['Service Request']),
      'Third Party Dependency': parseNum(row['Third Party Dependency']),
      'User Guidance': parseNum(row['User Guidance']),
      'Grand Total': parseNum(row['Grand Total']) ?? 0,
      Pending: parseNum(row['Pending']) ?? 0,
      Resolved: parseNum(row['Resolved']) ?? 0,
    })).filter(s => s.Date && s.Date !== 'Grand Total');

    return { tickets, categories, summaries, isFallback: false };

  } catch (error) {
    console.warn('Using local fallback data:', error);
    return {
      tickets: (fallbackData.DUMP as Ticket[]).map(t => ({
        ...t,
        Date: cleanDate(t.Date),
        ownership: getTicketOwnership(t['Sub Category']),
      })),
      categories: fallbackData.CATEGORY_MASTER as CategoryMaster[],
      summaries: (fallbackData.SUMMARY as SummaryRow[]).filter(s => s.Date !== 'Grand Total'),
      isFallback: true,
    };
  }
}

function cleanDate(dateStr: string): string {
  if (!dateStr) return '';
  if (dateStr.toLowerCase().includes('grand')) return 'Grand Total';

  let clean = dateStr.replace(/"/g, '').trim();

  // Handle Date(2026,6,1) style from Google Visualization API
  if (clean.startsWith('Date(')) {
    const matches = clean.match(/\d+/g);
    if (matches && matches.length >= 3) {
      const year = matches[0];
      const month = String(Number(matches[1]) + 1).padStart(2, '0');
      const day = matches[2].padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }

  // DD-MM-YYYY
  const dmyMatch = clean.match(/^(\d{2})-(\d{2})-(\d{4})/);
  if (dmyMatch) {
    return `${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}`;
  }

  // DD/MM/YYYY
  const dmySlash = clean.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (dmySlash) {
    return `${dmySlash[3]}-${dmySlash[2]}-${dmySlash[1]}`;
  }

  // YYYY-MM-DD or anything else — take first 10 chars
  return clean.split(' ')[0];
}

function parseNum(val: any): number | undefined {
  if (val === undefined || val === null || val === '') return undefined;
  const num = Number(String(val).replace(/,/g, ''));
  return isNaN(num) ? undefined : num;
}
