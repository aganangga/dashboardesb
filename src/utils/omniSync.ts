import type { RawDataRow } from '../types';
import { parseCsvString } from './dataProcessor';

export interface OmniSyncDataset {
  data: RawDataRow[];
  headers: string[];
  fetchedAt: string;
}

const fieldAliases: Record<string, string> = {
  ticketid: 'Ticket ID', idtiket: 'Ticket ID', notiket: 'Ticket ID',
  datevisit: 'Date Visit', visitdate: 'Date Visit', tanggalvisit: 'Date Visit',
  status: 'Status', visitstatus: 'Status',
  visittype: 'Visit Type', booktype: 'Book Type',
  supervisor: 'Supervisor', namaspv: 'Supervisor',
  jadwalagenda: 'Jadwal Agenda', agendaschedule: 'Jadwal Agenda',
  checkintime: 'Check In Time', checkouttime: 'Check Out Time',
  checkinlocation: 'Check In Location', checkoutlocation: 'Check Out Location',
  namasupport: 'Nama Support', supportname: 'Nama Support',
  namaconsultant: 'Nama Consultant', namakonsulting: 'Nama Consultant',
  companyname: 'Nama Company', namacompany: 'Nama Company',
  namaoutlet: 'Nama Outlet', outletname: 'Nama Outlet',
  alamatoutlet: 'Alamat Outlet', meetingparticipants: 'Meeting Participants',
  cancelnotes: 'Cancel Notes',
};
const canonicalHeader = (name: string): string => fieldAliases[name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()] || name;

const toVisitDate = (input: string): string => {
  const iso = input.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/);
  return iso ? [iso[3], iso[2], iso[1]].join('/') : input.trim();
};

function extractRows(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') throw Error('Omni tidak mengembalikan daftar visit.');
  const item = payload as Record<string, unknown>;
  if (item.hasMore === true || item.has_more === true || item.next ||
      item.nextPage || item.next_page || item.pagination && typeof item.pagination === 'object' &&
      (item.pagination as Record<string, unknown>).hasNext === true) {
    throw Error('Omni mengembalikan hasil berpaginasi. Konfigurasi endpoint full export/pagination diperlukan.');
  }
  for (const key of ['records', 'rows', 'visits', 'items', 'results', 'data']) {
    if (!(key in item)) continue;
    return extractRows(item[key]);
  }
  throw Error('Struktur JSON Omni belum dikenali. Diperlukan contoh respons endpoint visit.');
}

export function parseOmniSyncResponse(message: unknown): OmniSyncDataset {
  if (!message || typeof message !== 'object') throw Error('Respons sinkronisasi Omni kosong.');
  const response = message as Record<string, unknown>;
  const fetchedAt = typeof response.fetchedAt === 'string' ? response.fetchedAt : '';
  let rows: RawDataRow[];
  let headers: string[];

  if (response.format === 'csv') {
    if (typeof response.payload !== 'string') throw Error('CSV Omni tidak valid.');
    ({ data: rows, headers } = parseCsvString(response.payload));
  } else if (response.format === 'json') {
    const raw = extractRows(response.payload);
    if (raw.length > 20000) throw Error('Respons Omni terlalu banyak untuk satu sinkronisasi (maks. 20.000 baris).');
    if (raw.some(item => !item || typeof item !== 'object' || Array.isArray(item))) {
      throw Error('Data Omni harus berupa JSON array berisi objek visit.');
    }
    rows = raw.map((item) => {
      const out: RawDataRow = {};
      for (const [key, value] of Object.entries(item as Record<string, unknown>)) {
        // Skip nested structures until the Omni schema is supplied and explicitly mapped.
        if (value !== null && typeof value === 'object') {
          throw Error('Field Omni "' + key + '" berbentuk objek. Perlu mapping API khusus.');
        }
        const column = canonicalHeader(key);
        const normalized = value === null || value === undefined ? '' : String(value);
        // Prefer existing canonical field over a duplicate alias.
        if (!Object.prototype.hasOwnProperty.call(out, column) || !out[column]) {
          out[column] = column === 'Date Visit' ? toVisitDate(normalized) : normalized;
        }
      }
      return out;
    });
    headers = [...new Set(rows.flatMap((item) => Object.keys(item)))];
  } else {
    throw Error('Format Omni belum didukung. Gunakan endpoint JSON atau CSV.');
  }

  if (rows.length === 0) throw Error('Endpoint Omni tidak mengembalikan visit; data dashboard tidak diubah.');
  // Fail closed: missing operational columns would silently corrupt check-in,
  // anomaly, punctuality, consultant support and status-based analytics.
  const mandatory = ['Ticket ID', 'Date Visit', 'Status', 'Nama Support',
    'Jadwal Agenda', 'Check In Time', 'Check Out Time'];
  const missing = mandatory.filter((header) => !headers.includes(header));
  if (missing.length) {
    throw Error('Kolom Omni belum lengkap: ' + missing.join(', ') +
      '. Sesuaikan mapping API sebelum menerapkan data.');
  }
  if (rows.some((row) => !row['Ticket ID']?.trim() || !row['Date Visit']?.trim() ||
      !/^\d{2}\/\d{2}\/\d{4}$/.test(row['Date Visit'] || ''))) {
    throw Error('Beberapa visit tidak memiliki Ticket ID / Date Visit yang valid (dd/mm/yyyy). Sinkronisasi dibatalkan.');
  }
  return { data: rows, headers, fetchedAt };
}
