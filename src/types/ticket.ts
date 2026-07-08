export interface Ticket {
  Date: string;
  'Ticket No.': string;
  'Issue Discription': string;
  'Ticket Type': string;
  'Resolution Code': string;
  Category: string;
  'Sub Category': string;
  Status: 'Pending' | 'Resolved' | string;
  ownership?: 'Autovyn' | 'Third Party';
}

export interface CategoryMaster {
  'Resolution Code': string;
  Category: string;
  'Sub Category': string;
}

export interface SummaryRow {
  Date: string;
  'Dealer CRM Application issue'?: number;
  'DPS Data Related'?: number;
  'Revert back to L1'?: number;
  'Service Request '?: number;
  'Third Party Dependency'?: number;
  'User Guidance'?: number;
  'Grand Total': number;
  Pending: number;
  Resolved: number;
}

export interface FallbackData {
  CATEGORY_MASTER: CategoryMaster[];
  DUMP: Ticket[];
  SUMMARY: SummaryRow[];
}
