import Papa from 'papaparse';
import { ColumnMapping, Coordinates, ProcessedRecord, RawDataRow, TeamTicketSummary, ConsultantGrouping, SupportMemberInfo, DedicatedSupportMember, SpvL2L1Grouping, SpvL2Group, SpvL1Member, MasterDataTeamItem } from '../types';

export const DEFAULT_COLUMN_MAPPING: ColumnMapping = {
  ticketId: 'Ticket ID',
  title: 'Title',
  status: 'Status',
  createdAt: 'Created At',
  visitType: 'Visit Type',
  bookType: 'Book Type',
  supervisor: 'Supervisor',
  agendaSchedule: 'Jadwal Agenda',
  outletAddress: 'Alamat Outlet',
  picName: 'PIC Name',
  picNumber: 'PIC Number',
  approachNotes: 'Approach Notes',
  checkInTime: 'Check In Time',
  checkInLocation: 'Check In Location',
  checkOutTime: 'Check Out Time',
  checkOutLocation: 'Check Out Location',
  csatLink: 'CSAT Link',
  supportName: 'Nama Support',
  consultantName: 'Nama Consultant',
  companyName: 'Nama Company',
  outletName: 'Nama Outlet',
  meetingParticipants: 'Meeting Participants',
  cancelNotes: 'Cancel Notes',
};

// Helper to auto-match CSV headers flexibly (e.g. "Nama Konsulting" vs "Nama Consultant")
export function resolveColumnMapping(headers: string[], existingMapping?: Partial<ColumnMapping>): ColumnMapping {
  const findHeader = (patterns: (string | RegExp)[]): string => {
    for (const pattern of patterns) {
      const found = headers.find((h) => {
        if (typeof pattern === 'string') {
          return h.trim().toLowerCase() === pattern.toLowerCase();
        }
        return pattern.test(h.trim());
      });
      if (found) return found;
    }
    return '';
  };

  return {
    ticketId: existingMapping?.ticketId || findHeader(['Ticket ID', 'TicketId', 'ID Tiket', 'No Tiket', /ticket.*id/i]) || 'Ticket ID',
    title: existingMapping?.title || findHeader(['Title', 'Judul', 'Penugasan']) || 'Title',
    status: existingMapping?.status || findHeader(['Status', 'Status Visit', 'Status Kunjungan']) || 'Status',
    createdAt: existingMapping?.createdAt || findHeader(['Created At', 'Tanggal Dibuat', 'Waktu Dibuat']) || 'Created At',
    visitType: existingMapping?.visitType || findHeader(['Visit Type', 'Tipe Visit', 'Jenis Kunjungan']) || 'Visit Type',
    bookType: existingMapping?.bookType || findHeader(['Book Type', 'Tipe Booking', 'Booking Type']) || 'Book Type',
    supervisor: existingMapping?.supervisor || findHeader(['Supervisor', 'Supervisior', 'SPV', 'Nama SPV', 'Nama Supervisor', 'Nama Supervisior']) || 'Supervisor',
    agendaSchedule: existingMapping?.agendaSchedule || findHeader(['Jadwal Agenda', 'Agenda Schedule', 'Waktu Agenda', 'Tanggal Agenda']) || 'Jadwal Agenda',
    outletAddress: existingMapping?.outletAddress || findHeader(['Alamat Outlet', 'Outlet Address', 'Alamat', 'Address']) || 'Alamat Outlet',
    picName: existingMapping?.picName || findHeader(['PIC Name', 'Nama PIC', 'Kontak PIC', 'PIC']) || 'PIC Name',
    picNumber: existingMapping?.picNumber || findHeader(['PIC Number', 'Nomor PIC', 'No Telp PIC', 'Phone PIC']) || 'PIC Number',
    approachNotes: existingMapping?.approachNotes || findHeader(['Approach Notes', 'Catatan Pendekatan', 'Approach Note']) || 'Approach Notes',
    checkInTime: existingMapping?.checkInTime || findHeader(['Check In Time', 'Waktu Check In', 'CheckIn Time', 'Jam Masuk']) || 'Check In Time',
    checkInLocation: existingMapping?.checkInLocation || findHeader(['Check In Location', 'Lokasi Check In', 'CheckIn Coords']) || 'Check In Location',
    checkOutTime: existingMapping?.checkOutTime || findHeader(['Check Out Time', 'Waktu Check Out', 'CheckOut Time', 'Jam Keluar']) || 'Check Out Time',
    checkOutLocation: existingMapping?.checkOutLocation || findHeader(['Check Out Location', 'Lokasi Check Out', 'CheckOut Coords']) || 'Check Out Location',
    csatLink: existingMapping?.csatLink || findHeader(['CSAT Link', 'Link CSAT', 'CSAT']) || 'CSAT Link',
    supportName: existingMapping?.supportName || findHeader(['Nama Support', 'Support Name', 'Support', 'Nama Staff', 'L1', 'Support L1', 'Nama Support L1', 'Line 1', 'Support Utama']) || 'Nama Support',
    consultantName: existingMapping?.consultantName || findHeader(['Nama Consultant', 'Nama Konsulting', 'Nama Konsultan', 'Consultant Name', 'Consultant', 'Konsultan', /konsult/i]) || 'Nama Consultant',
    companyName: existingMapping?.companyName || findHeader(['Nama Company', 'Company Name', 'Perusahaan', 'Nama PT']) || 'Nama Company',
    outletName: existingMapping?.outletName || findHeader(['Nama Outlet', 'Outlet Name', 'Outlet', 'Cabang']) || 'Nama Outlet',
    meetingParticipants: existingMapping?.meetingParticipants || findHeader(['Meeting Participants', 'Meeting Participant', 'Peserta Meeting', 'Team Support', 'Support Team', 'L2', 'Support L2', 'Nama Support L2', 'Line 2', 'Pendamping', /participant/i]) || 'Meeting Participants',
    cancelNotes: existingMapping?.cancelNotes || findHeader(['Cancel Notes', 'Catatan Batal', 'Alasan Batal', 'Cancel Reason']) || 'Cancel Notes',
  };
}

// Format participant email or string to human-friendly display name
export function formatParticipantName(raw: string): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (trimmed.includes('@')) {
    const userPart = trimmed.split('@')[0];
    const words = userPart.split(/[._-]/).filter(Boolean);
    const capitalized = words
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
    return capitalized || trimmed;
  }
  return trimmed;
}

// Parse DD/MM/YYYY HH:mm:ss or ISO
export function parseCustomDate(dateStr: string | undefined): Date | null {
  if (!dateStr || dateStr.trim() === '-' || dateStr.trim() === '') return null;
  const trimmed = dateStr.trim();

  // Format: DD/MM/YYYY HH:mm:ss or DD/MM/YYYY HH:mm
  const parts = trimmed.split(' ');
  if (parts.length >= 1 && parts[0].includes('/')) {
    const dateParts = parts[0].split('/');
    if (dateParts.length === 3) {
      const day = parseInt(dateParts[0], 10);
      const month = parseInt(dateParts[1], 10) - 1;
      const year = parseInt(dateParts[2], 10);
      let hours = 0;
      let minutes = 0;
      let seconds = 0;

      if (parts[1]) {
        const timeParts = parts[1].split(':');
        hours = parseInt(timeParts[0] || '0', 10);
        minutes = parseInt(timeParts[1] || '0', 10);
        seconds = parseInt(timeParts[2] || '0', 10);
      }
      const d = new Date(year, month, day, hours, minutes, seconds);
      if (!isNaN(d.getTime())) return d;
    }
  }

  const standardDate = new Date(trimmed);
  return isNaN(standardDate.getTime()) ? null : standardDate;
}

export function formatDateToDMY(date: Date | null): string {
  if (!date) return '-';
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

export function formatDateToYMD(date: Date | null): string {
  if (!date) return '';
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${y}-${m}-${d}`;
}

export const INDONESIAN_MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export function getMonthKeyFromDate(date: Date | null): string {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function formatMonthKeyToLabel(monthKey: string): string {
  if (!monthKey) return '';
  const parts = monthKey.split('-');
  if (parts.length !== 2) return monthKey;
  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const monthName = INDONESIAN_MONTH_NAMES[monthIdx] || parts[1];
  return `${monthName} ${year}`;
}

export interface AvailableMonthInfo {
  key: string;       // "2025-02"
  label: string;     // "Februari 2025"
  shortLabel: string;// "Feb 2025"
  year: number;
  monthIndex: number;
  startDate: string; // "2025-02-01"
  endDate: string;   // "2025-02-28"
  recordCount: number;
  visitCount: number;
}

export function getAvailableMonthsFromRecords(records: ProcessedRecord[]): AvailableMonthInfo[] {
  const map = new Map<string, { key: string; year: number; monthIndex: number; recordCount: number; visitKeys: Set<string> }>();
  
  records.forEach((r) => {
    if (r.agendaDateObj) {
      const key = getMonthKeyFromDate(r.agendaDateObj);
      if (key) {
        if (!map.has(key)) {
          map.set(key, {
            key,
            year: r.agendaDateObj.getFullYear(),
            monthIndex: r.agendaDateObj.getMonth(),
            recordCount: 0,
            visitKeys: new Set<string>(),
          });
        }
        const item = map.get(key)!;
        item.recordCount += 1;
        item.visitKeys.add(r.primaryVisitKey);
      }
    }
  });

  return Array.from(map.values())
    .filter((month) => month.key >= '2026-08')
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((item) => {
      const monthName = INDONESIAN_MONTH_NAMES[item.monthIndex] || String(item.monthIndex + 1);
      const shortName = monthName.slice(0, 3);
      const lastDay = new Date(item.year, item.monthIndex + 1, 0).getDate();
      const mStr = String(item.monthIndex + 1).padStart(2, '0');
      return {
        key: item.key,
        label: `${monthName} ${item.year}`,
        shortLabel: `${shortName} ${item.year}`,
        year: item.year,
        monthIndex: item.monthIndex,
        startDate: `${item.year}-${mStr}-01`,
        endDate: `${item.year}-${mStr}-${String(lastDay).padStart(2, '0')}`,
        recordCount: item.recordCount,
        visitCount: item.visitKeys.size,
      };
    });
}

export function parseCoordinates(locStr: string | undefined): Coordinates | null {
  if (!locStr || locStr.trim() === '' || locStr.trim() === '-') return null;
  try {
    let clean = locStr.trim();
    // Handle double-quoted JSON string common in CSV
    if (clean.startsWith('"{') && clean.endsWith('}"')) {
      clean = clean.slice(1, -1).replace(/""/g, '"');
    }
    const parsed = JSON.parse(clean);
    if (typeof parsed === 'object' && parsed !== null && ('lat' in parsed || 'lng' in parsed)) {
      return {
        lat: Number(parsed.lat),
        lng: Number(parsed.lng),
        accuracy: parsed.accuracy ? Number(parsed.accuracy) : undefined,
        timestamp: parsed.timestamp,
        address: parsed.address,
      };
    }
  } catch {
    // If not JSON, try regex
    const latMatch = locStr.match(/lat["']?\s*:\s*(-?\d+(\.\d+)?)/i);
    const lngMatch = locStr.match(/lng["']?\s*:\s*(-?\d+(\.\d+)?)/i);
    if (latMatch && lngMatch) {
      return {
        lat: parseFloat(latMatch[1]),
        lng: parseFloat(lngMatch[1]),
      };
    }
  }
  return null;
}

// Derive Area from address, outlet name, coordinates, or text
export function detectArea(address: string, outlet: string, coords: Coordinates | null): string {
  const combined = `${address} ${outlet}`.toLowerCase();

  if (
    combined.includes('bali') ||
    combined.includes('badung') ||
    combined.includes('denpasar') ||
    combined.includes('kuta') ||
    combined.includes('seminyak') ||
    combined.includes('canggu') ||
    combined.includes('pererenan') ||
    combined.includes('ubud') ||
    combined.includes('sanur') ||
    combined.includes('uluwatu') ||
    combined.includes('kerobokan') ||
    combined.includes('timbis') ||
    combined.includes('umalas') ||
    combined.includes('mezcal') ||
    combined.includes('smokemart') ||
    combined.includes('gihon') ||
    combined.includes('maf coffee') ||
    combined.includes('2080 burger') ||
    combined.includes('boesa') ||
    combined.includes('taliwang') ||
    combined.includes('vivamas') ||
    combined.includes('butter health') ||
    combined.includes('sports bar 88') ||
    combined.includes('prolific') ||
    combined.includes('sate taichan sl') ||
    combined.includes('statement coffee')
  ) {
    return 'Bali';
  }
  if (combined.includes('surabaya') || combined.includes('ngagel') || combined.includes('klampis') || combined.includes('kertajaya') || combined.includes('dharmahusada') || combined.includes('manyar') || combined.includes('tunjungan')) {
    return 'Surabaya';
  }
  if (combined.includes('sidoarjo') || combined.includes('lemahputro') || combined.includes('jemursari')) {
    return 'Sidoarjo';
  }
  if (combined.includes('malang') || combined.includes('batu') || combined.includes('nganjuk') || combined.includes('mojokerto') || combined.includes('tuban') || combined.includes('gresik') || combined.includes('tulungagung')) {
    return 'Jawa Timur (Luar Sby)';
  }
  if (combined.includes('jogja') || combined.includes('yogyakarta') || combined.includes('sleman') || combined.includes('bantul') || combined.includes('seturan') || combined.includes('jakal')) {
    return 'Yogyakarta';
  }
  if (combined.includes('solo') || combined.includes('surakarta') || combined.includes('sukoharjo') || combined.includes('kartasura') || combined.includes('boyolali') || combined.includes('sragen') || combined.includes('klaten')) {
    return 'Solo Raya';
  }
  if (combined.includes('semarang') || combined.includes('pekalongan') || combined.includes('kendal') || combined.includes('purwokerto')) {
    return 'Semarang & Sekitarnya';
  }
  if (combined.includes('bandung') || combined.includes('lembang') || combined.includes('tasikmalaya') || combined.includes('garut') || combined.includes('cirebon') || combined.includes('cimahi') || combined.includes('soreang')) {
    return 'Bandung & Jabar';
  }
  if (combined.includes('medan') || combined.includes('binjai')) {
    return 'Medan & Sumut';
  }
  if (combined.includes('pekanbaru') || combined.includes('riau')) {
    return 'Riau';
  }
  if (combined.includes('batam')) {
    return 'Batam';
  }
  if (combined.includes('jambi') || combined.includes('palembang') || combined.includes('bukittinggi') || combined.includes('padang') || combined.includes('lampung') || combined.includes('bangka') || combined.includes('aceh')) {
    return 'Sumatera Lainnya';
  }
  if (combined.includes('makassar') || combined.includes('sulawesi')) {
    return 'Makassar';
  }
  if (combined.includes('jakarta') || combined.includes('jaksel') || combined.includes('jakbar') || combined.includes('jaktim') || combined.includes('jakpus') || combined.includes('jakut') || combined.includes('pik') || combined.includes('kuningan') || combined.includes('sudirman') || combined.includes('menteng') || combined.includes('senopati') || combined.includes('kemang') || combined.includes('senayan') || combined.includes('pluit') || combined.includes('puri') || combined.includes('kelapa gading')) {
    return 'DKI Jakarta';
  }
  if (combined.includes('tangerang') || combined.includes('bsd') || combined.includes('gading serpong') || combined.includes('serpong') || combined.includes('bintaro') || combined.includes('ciputat') || combined.includes('karawaci') || combined.includes('alam sutera')) {
    return 'Tangerang Raya';
  }
  if (combined.includes('bekasi') || combined.includes('cikarang') || combined.includes('tambun')) {
    return 'Bekasi';
  }
  if (combined.includes('bogor') || combined.includes('cibinong') || combined.includes('depok') || combined.includes('sentul') || combined.includes('cibubur') || combined.includes('cinere')) {
    return 'Bogor & Depok';
  }

  // Lat / Lng estimation if available
  if (coords) {
    const { lat, lng } = coords;
    if (lat < -8.4 && lat > -8.9 && lng > 115.0 && lng < 115.6) return 'Bali';
    if (lat < -7.1 && lat > -7.5 && lng > 112.5 && lng < 112.9) return 'Surabaya';
    if (lat < -7.6 && lat > -8.0 && lng > 110.2 && lng < 110.6) return 'Yogyakarta';
    if (lat < -6.8 && lat > -7.1 && lng > 107.4 && lng < 107.8) return 'Bandung & Jabar';
    if (lat < -6.0 && lat > -6.4 && lng > 106.6 && lng < 107.0) return 'Jabodetabek';
    if (lat > 3.0 && lat < 4.0 && lng > 98.0 && lng < 99.0) return 'Medan & Sumut';
    if (lat < -5.0 && lat > -5.3 && lng > 119.3 && lng < 119.6) return 'Makassar';
  }

  return 'Lainnya / Online';
}

export function formatDuration(minutes: number | null): string {
  if (minutes === null || isNaN(minutes)) return '-';
  if (minutes < 0) return 'Format Waktu Anomali';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}j`;
  return `${h}j ${m}m`;
}

// Canonical mapping of Consultant (L2) to Supervisor (SPV)
export const CONSULTANT_TO_SPV_MAP: Record<string, string> = {
  'Ayu Febrina Sianturi': 'Jane Margareth Widjaja',
  'Tri Hastuti Wulandari': 'Jane Margareth Widjaja',
  'Dika Anugerah Pratama': 'Jane Margareth Widjaja',
  'Rezi Rizki Raedini': 'Jane Margareth Widjaja',
  'David Prima Putra': 'Muhamad Rimaduddin',
  'Kiki Tri Utari': 'Muhamad Rimaduddin',
  'Cherly Vitaloka': 'Muhamad Rimaduddin',
  'Airlangga Aziz': 'M. Iriansyah Suhendar',
  'Agung Setiawan': 'M. Iriansyah Suhendar',
  'ERP Advisor': 'ERP Advisor (Tim Khusus)',
};

// Sheet Master Data Team: Mapping lengkap tim operasional per SPV -> L2 -> L1 serta Tim Khusus ERP Advisor
export const MASTER_DATA_TEAM: MasterDataTeamItem[] = [
  // SPV 1: Jane Margareth Widjaja (4 Konsultan Lead)
  { no: 1, spv: 'Jane Margareth Widjaja', l2: 'Ayu Febrina Sianturi', l1FullName: 'Fera Eka Waty N', l1Nickname: 'Fera', role: 'L1 Support', status: 'Aktif' },
  { no: 3, spv: 'Jane Margareth Widjaja', l2: 'Ayu Febrina Sianturi', l1FullName: 'Rafi Mahasin', l1Nickname: 'Rafi', role: 'L1 Support', status: 'Aktif' },
  { no: 4, spv: 'Jane Margareth Widjaja', l2: 'Ayu Febrina Sianturi', l1FullName: 'Nabila Aprilia Nugrahany', l1Nickname: 'Nabila', role: 'L1 Support', status: 'Aktif' },

  { no: 5, spv: 'Jane Margareth Widjaja', l2: 'Tri Hastuti Wulandari', l1FullName: 'Margaretha Agrivani', l1Nickname: 'Margaretha', role: 'L1 Support', status: 'Aktif' },
  { no: 6, spv: 'Jane Margareth Widjaja', l2: 'Tri Hastuti Wulandari', l1FullName: 'Bintang Guntoro', l1Nickname: 'Bintang', role: 'L1 Support', status: 'Aktif' },
  { no: 7, spv: 'Jane Margareth Widjaja', l2: 'Tri Hastuti Wulandari', l1FullName: 'Teddi Ari Tama', l1Nickname: 'Teddi', role: 'L1 Support', status: 'Aktif' },
  { no: 8, spv: 'Jane Margareth Widjaja', l2: 'Tri Hastuti Wulandari', l1FullName: 'Larezza Murda Gaharni', l1Nickname: 'Larezza', role: 'L1 Support', status: 'Aktif' },

  { no: 9, spv: 'Jane Margareth Widjaja', l2: 'Dika Anugerah Pratama', l1FullName: 'Imam Wicaksono', l1Nickname: 'Imam', role: 'L1 Support', status: 'Aktif' },
  { no: 10, spv: 'Jane Margareth Widjaja', l2: 'Dika Anugerah Pratama', l1FullName: 'Agita Putri Kusumaningtyas', l1Nickname: 'Agita', role: 'L1 Support', status: 'Aktif' },
  { no: 11, spv: 'Jane Margareth Widjaja', l2: 'Dika Anugerah Pratama', l1FullName: 'Syahrul Zulvan', l1Nickname: 'Syahrul', role: 'L1 Support', status: 'Aktif' },
  { no: 12, spv: 'M. Iriansyah Suhendar', l2: 'Agung Setiawan', l1FullName: 'Tegar Rangga', l1Nickname: 'Tegar', role: 'L1 Support', status: 'Aktif', notes: 'Efektif 01/08/2026; sebelumnya under Dika' },
  { no: 13, spv: 'Jane Margareth Widjaja', l2: 'Dika Anugerah Pratama', l1FullName: 'Fauzi Yuda Ariyanto', l1Nickname: 'Fauzi', role: 'L1 Support', status: 'Aktif' },

  { no: 14, spv: 'Jane Margareth Widjaja', l2: 'Rezi Rizki Raedini', l1FullName: 'Yoga Astita Ade', l1Nickname: 'Yoga', role: 'L1 Support', status: 'Aktif' },
  { no: 15, spv: 'Jane Margareth Widjaja', l2: 'Rezi Rizki Raedini', l1FullName: 'Noviyanti Nadia', l1Nickname: 'Nadia', role: 'L1 Support', status: 'Aktif' },
  { no: 16, spv: 'Jane Margareth Widjaja', l2: 'Rezi Rizki Raedini', l1FullName: 'Kevin Reynaldi', l1Nickname: 'Kevin', role: 'L1 Support', status: 'Aktif' },
  { no: 17, spv: 'Jane Margareth Widjaja', l2: 'Rezi Rizki Raedini', l1FullName: 'Abi Muhammad Alfarezy', l1Nickname: 'Abi', role: 'L1 Support', status: 'Aktif' },
  { no: 18, spv: 'Jane Margareth Widjaja', l2: 'Rezi Rizki Raedini', l1FullName: 'Teddi Ari Tama', l1Nickname: 'Teddi', role: 'L1 Support', status: 'Aktif' },

  // SPV 2: Muhamad Rimaduddin (3 Konsultan Lead)
  { no: 19, spv: 'Muhamad Rimaduddin', l2: 'David Prima Putra', l1FullName: 'Yessi Tiyastanti', l1Nickname: 'Yessi', role: 'L1 Support', status: 'Aktif' },
  { no: 20, spv: 'Muhamad Rimaduddin', l2: 'David Prima Putra', l1FullName: 'Febrianto Puji Waskito', l1Nickname: 'Febrianto', role: 'L1 Support', status: 'Aktif' },
  { no: 21, spv: 'Muhamad Rimaduddin', l2: 'David Prima Putra', l1FullName: 'Syafiz Amiero', l1Nickname: 'Syafiz', role: 'L1 Support', status: 'Aktif' },
  { no: 22, spv: 'Muhamad Rimaduddin', l2: 'David Prima Putra', l1FullName: 'Nika Rullyta Khairunnisa', l1Nickname: 'Nika', role: 'L1 Support', status: 'Aktif' },
  { no: 23, spv: 'Muhamad Rimaduddin', l2: 'David Prima Putra', l1FullName: 'Muhammad Rimaduddin', l1Nickname: 'Rimad', role: 'L1 Support', status: 'Aktif' },
  { no: 24, spv: 'Muhamad Rimaduddin', l2: 'David Prima Putra', l1FullName: 'Yoan Fefi Berliani', l1Nickname: 'Yoan', role: 'L1 Support', status: 'Aktif' },

  { no: 25, spv: 'Muhamad Rimaduddin', l2: 'Kiki Tri Utari', l1FullName: 'Ardiansyah Hendardi', l1Nickname: 'Ardi', role: 'L1 Support', status: 'Aktif' },
  { no: 26, spv: 'Muhamad Rimaduddin', l2: 'Kiki Tri Utari', l1FullName: 'Rafi Mahasin', l1Nickname: 'Rafi', role: 'L1 Support', status: 'Aktif' },
  { no: 27, spv: 'Muhamad Rimaduddin', l2: 'Kiki Tri Utari', l1FullName: 'Nurul Huda', l1Nickname: 'Nurul', role: 'L1 Support', status: 'Aktif' },
  { no: 28, spv: 'Muhamad Rimaduddin', l2: 'Kiki Tri Utari', l1FullName: 'Melati Cantika', l1Nickname: 'Melati', role: 'L1 Support', status: 'Aktif' },
  { no: 29, spv: 'Muhamad Rimaduddin', l2: 'Kiki Tri Utari', l1FullName: 'Yoan Fefi Berliani', l1Nickname: 'Yoan', role: 'L1 Support', status: 'Aktif' },

  { no: 30, spv: 'Muhamad Rimaduddin', l2: 'Cherly Vitaloka', l1FullName: 'Vinna Maharani', l1Nickname: 'Vinna', role: 'L1 Support', status: 'Aktif' },
  { no: 31, spv: 'Muhamad Rimaduddin', l2: 'Cherly Vitaloka', l1FullName: 'Alif Izzuddin Ramadhan', l1Nickname: 'Alif', role: 'L1 Support', status: 'Aktif' },
  { no: 32, spv: 'Muhamad Rimaduddin', l2: 'Cherly Vitaloka', l1FullName: 'Melati Cantika', l1Nickname: 'Melati', role: 'L1 Support', status: 'Aktif' },
  { no: 33, spv: 'Muhamad Rimaduddin', l2: 'Cherly Vitaloka', l1FullName: 'Nurul Huda', l1Nickname: 'Nurul', role: 'L1 Support', status: 'Aktif' },
  { no: 34, spv: 'Muhamad Rimaduddin', l2: 'Cherly Vitaloka', l1FullName: 'Rafi Mahasin', l1Nickname: 'Rafi', role: 'L1 Support', status: 'Aktif' },

  // SPV 3: M. Iriansyah Suhendar (2 Konsultan Lead)
  { no: 35, spv: 'M. Iriansyah Suhendar', l2: 'Airlangga Aziz', l1FullName: 'Alian Alfin Nuha', l1Nickname: 'Alfin', role: 'L1 Support', status: 'Aktif' },
  { no: 36, spv: 'M. Iriansyah Suhendar', l2: 'Airlangga Aziz', l1FullName: 'Febri Dwi Putra', l1Nickname: 'Febri', role: 'L1 Support', status: 'Aktif' },

  { no: 37, spv: 'M. Iriansyah Suhendar', l2: 'Agung Setiawan', l1FullName: 'Anisa Lucky', l1Nickname: 'Anisa', role: 'L1 Support', status: 'Aktif' },
  { no: 38, spv: 'M. Iriansyah Suhendar', l2: 'Agung Setiawan', l1FullName: 'Christopher Patrick Djuanda', l1Nickname: 'Patrick', role: 'L1 Support', status: 'Aktif' },
  { no: 39, spv: 'M. Iriansyah Suhendar', l2: 'Agung Setiawan', l1FullName: 'Risky Ramadhan', l1Nickname: 'Risky', role: 'L1 Support', status: 'Aktif' },
  { no: 40, spv: 'M. Iriansyah Suhendar', l2: 'Agung Setiawan', l1FullName: 'Yayang Putri Suwondo', l1Nickname: 'Yayang', role: 'L1 Support', status: 'Aktif' },

  // Tim Khusus: ERP Advisor (Tanpa SPV, L2, L1 - Non-Hierarki)
  { no: 41, spv: 'ERP Advisor (Tim Khusus)', l2: 'ERP Advisor', l1FullName: 'Pernandes Paindo Tua', l1Nickname: 'Pernandes', role: 'ERP Advisor', status: 'Aktif', notes: 'Tim Khusus ERP Advisor (Non-Hierarki, Tanpa SPV/L2/L1)' },
  { no: 42, spv: 'ERP Advisor (Tim Khusus)', l2: 'ERP Advisor', l1FullName: 'Irma Laura Siregar', l1Nickname: 'Irma', role: 'ERP Advisor', status: 'Aktif', notes: 'Tim Khusus ERP Advisor (Non-Hierarki, Tanpa SPV/L2/L1)' },
];

// Resolve consultant ownership strictly: explicit source value first, then uniquely mapped roster.
// Never assign a default consultant or choose the first match for shared support members.
// Master Data Team is the single source of truth for SPV / L2 / L1 membership.
const normalizeTeamName = (value: string): string =>
  (value || '').trim().replace(/\s+/g, ' ').toLowerCase();

const normalizeSpvName = (value: string): string => {
  const normalized = normalizeTeamName(value);
  if (normalized === 'muhammad rimaduddin') return 'Muhamad Rimaduddin';
  if (normalized === 'erp advisor') return 'ERP Advisor (Tim Khusus)';
  return (value || '').trim();
};

const primarySupportName = (value: string): string =>
  (value || '').split(/[,;\n\r/]+/).map((name) => name.trim()).find(Boolean) || '';

const masterConsultants = Array.from(new Set(MASTER_DATA_TEAM.map((row) => row.l2)));
const masterSupervisors = Array.from(new Set(MASTER_DATA_TEAM.map((row) => row.spv)));

// These are verified Master Data Team group labels, not invented L2 owners.
export const SHARED_L2_TEAM_PREFIX = 'Tim Bersama L2: ';
export const DIRECT_SPV_VISIT_PREFIX = 'Visit SPV: ';

const canonicalConsultantName = (value: string): string | null =>
  masterConsultants.find((name) => normalizeTeamName(name) === normalizeTeamName(value)) || null;

// One person may explicitly appear in more than one team. Return all roster matches.
export function getMasterAssignmentsForSupport(personName: string): Array<{ supervisor: string; consultantName: string; supportName: string }> {
  const key = normalizeTeamName(personName);
  if (!key) return [];
  const assignments = MASTER_DATA_TEAM.filter((item) =>
    normalizeTeamName(item.l1FullName) === key || normalizeTeamName(item.l1Nickname) === key
  ).map((item) => ({
    supervisor: item.spv,
    consultantName: item.l2,
    supportName: item.l1FullName,
  }));
  if (assignments.length > 0) return assignments;
  const directL2 = canonicalConsultantName(personName);
  if (directL2) {
    const owner = MASTER_DATA_TEAM.find((item) => item.l2 === directL2);
    return owner ? [{ supervisor: owner.spv, consultantName: directL2, supportName: directL2 }] : [];
  }
  return [];
}

export function findMasterMappingForSupport(supportName: string): MasterDataTeamItem | null {
  const key = normalizeTeamName(primarySupportName(supportName));
  if (!key) return null;
  const candidates = MASTER_DATA_TEAM.filter((item) =>
    normalizeTeamName(item.l1FullName) === key || normalizeTeamName(item.l1Nickname) === key
  );
  return new Set(candidates.map((item) => item.l2)).size === 1 ? candidates[0] : null;
}

export function isSameSupportMember(person: string, selectedName: string): boolean {
  const left = normalizeTeamName(person);
  const right = normalizeTeamName(selectedName);
  if (!left || !right) return false;
  if (left === right) return true;
  const candidates = MASTER_DATA_TEAM.filter((item) =>
    normalizeTeamName(item.l1FullName) === right || normalizeTeamName(item.l1Nickname) === right
  );
  const uniqueFullNames = [...new Set(candidates.map((item) => normalizeTeamName(item.l1FullName)))];
  return uniqueFullNames.length === 1 && uniqueFullNames[0] === left;
}

export function resolveSpvAndConsultant(
  supportRaw: string,
  consultantRaw?: string,
  supervisorRaw?: string,
  visitDate?: Date | null
): { supervisor: string; consultantName: string } {
  const primarySupport = primarySupportName(supportRaw);
  // Historical assignment: through July 2026 Tegar belongs to Dika;
  // from August 2026 onward the master assignment is Agung.
  // Explicit ticket L2 ownership remains authoritative.
  const isHistoricalTegar = !!visitDate && visitDate.getTime() < new Date(2026, 7, 1).getTime()
    && normalizeTeamName(primarySupport) === 'tegar rangga';
  const rawConsultant = (consultantRaw || '').trim();
  const rawSpv = normalizeSpvName(supervisorRaw || '');

  // Raw consultant is authoritative ONLY if it is a registered L2 in Master Team.
  // Cross-team visitor attendance does not change the registered L2 owner.
  const explicitL2 = canonicalConsultantName(rawConsultant);
  if (explicitL2) {
    return {
      consultantName: explicitL2,
      supervisor: MASTER_DATA_TEAM.find((row) => row.l2 === explicitL2)?.spv || 'Belum Terpetakan',
    };
  }

  // SPV doing the visit themself is recognized through Master SPV hierarchy,
  // without inventing an L2 consultant for their attendance.
  const listedSpv = masterSupervisors.find((spv) =>
    normalizeTeamName(spv) === normalizeTeamName(rawConsultant)
  );
  const visitingSpv = masterSupervisors.find((spv) =>
    normalizeTeamName(spv) === normalizeTeamName(primarySupport)
  );
  if (visitingSpv && (!rawConsultant || listedSpv)) {
    return {
      consultantName: DIRECT_SPV_VISIT_PREFIX + visitingSpv,
      supervisor: visitingSpv,
    };
  }

  // If raw consultant is an L1, use its master memberships. Otherwise use
  // the actual primary support to resolve consultant ownership.
  const exactMember = getMasterAssignmentsForSupport(rawConsultant);
  const historicalAssignment = [{ supervisor: 'Jane Margareth Widjaja', consultantName: 'Dika Anugerah Pratama', supportName: 'Tegar Rangga' }];
  const candidates = isHistoricalTegar && (!rawConsultant || normalizeTeamName(rawConsultant) === 'tegar rangga') ? historicalAssignment : (!listedSpv && exactMember.length)
    ? exactMember
    : getMasterAssignmentsForSupport(primarySupport);
  const selectedSpv = masterSupervisors.find((spv) =>
    normalizeTeamName(spv) === normalizeTeamName(rawSpv)
  ) || listedSpv || '';
  const matching = selectedSpv
    ? candidates.filter((item) => normalizeTeamName(item.supervisor) === normalizeTeamName(selectedSpv))
    : candidates;
  const narrowed = matching.length ? matching : candidates;
  const possible = [...new Set(narrowed.map((item) => item.consultantName))];
  const possibleSpvs = [...new Set(narrowed.map((item) => item.supervisor))];

  // A support registered under multiple L2s remains a shared master group
  // only when the source ticket has no explicit consultant owner.
  // This is not an attribution of the same visit to either L2 individually.
  const consultantName = possible.length === 1
    ? possible[0]
    : possible.length > 1
      ? SHARED_L2_TEAM_PREFIX + possible.join(' / ')
      : 'Belum Terpetakan';
  const supervisor = possibleSpvs.length === 1
    ? possibleSpvs[0]
    : selectedSpv || 'Belum Terpetakan';

  return { supervisor, consultantName };
}

// Operational exclusion requested: Jane's direct SPV visit only.
// Preserve the immutable raw CSV and all Jane SPV team memberships.
const EXCLUDED_DIRECT_VISIT_TICKET_IDS = new Set(['ESB-S28QBG']);
export function isIncludedDashboardVisit(record: Pick<ProcessedRecord, 'ticketId'>): boolean {
  return !EXCLUDED_DIRECT_VISIT_TICKET_IDS.has(record.ticketId.trim().toUpperCase());
}

export function processRawData(
  rawData: RawDataRow[],
  mapping: ColumnMapping = DEFAULT_COLUMN_MAPPING
): ProcessedRecord[] {
  // Step 1: Initial parsing of rows
  const parsedRecords: ProcessedRecord[] = rawData.map((row, index) => {
    const ticketId = (row[mapping.ticketId] || `TICKET-${index + 1}`).trim();
    const title = (row[mapping.title] || row[mapping.companyName] || '').trim();
    const status = (row[mapping.status] || 'UNKNOWN').trim();
    const createdAt = (row[mapping.createdAt] || row['Date Visit'] || '').trim();
    const visitType = (row[mapping.visitType] || '-').trim();
    const bookType = (row[mapping.bookType] || (row[mapping.visitType] && row[mapping.visitType] !== '-' ? row[mapping.visitType] : '-')).trim();

    const rawSupport = (row[mapping.supportName] || '').trim();
    const rawConsultant = (row[mapping.consultantName] || '').trim();
    const rawSupervisor = (row[mapping.supervisor] || '').trim();

    // Resolve ownership using the visit date, not today's roster for historical visits.
    const visitDateForMapping = parseCustomDate((row[mapping.agendaSchedule] || row['Date Visit'] || createdAt).trim());
    const resolved = resolveSpvAndConsultant(rawSupport, rawConsultant, rawSupervisor, visitDateForMapping);
    const supervisor = resolved.supervisor;
    const consultantName = resolved.consultantName;

    const agendaRaw = (row[mapping.agendaSchedule] || row['Date Visit'] || '').trim();
    const agendaDateObj = parseCustomDate(agendaRaw) || parseCustomDate(createdAt);
    const agendaDate = formatDateToDMY(agendaDateObj);
    const agendaTime = agendaDateObj
      ? `${String(agendaDateObj.getHours()).padStart(2, '0')}:${String(agendaDateObj.getMinutes()).padStart(2, '0')}`
      : '-';

    const outletAddress = (row[mapping.outletAddress] || '').trim();
    const companyName = (row[mapping.companyName] || '').trim();
    const outletName = (row[mapping.outletName] || companyName || title || 'Outlet Unnamed').trim();
    const picName = (row[mapping.picName] || '').trim();
    const picNumber = (row[mapping.picNumber] || '').trim();
    const approachNotes = (row[mapping.approachNotes] || '').trim();
    const csatLink = (row[mapping.csatLink] || '').trim();
    const cancelNotes = (row[mapping.cancelNotes] || '').trim();

    // Meeting Participants extraction
    const meetingRaw = (row[mapping.meetingParticipants] || '').trim();
    const meetingParts = meetingRaw
      ? meetingRaw
          .split(/[,;]/)
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    const meetingParticipantsList = meetingParts.map(formatParticipantName);

    // Parsing "Nama Support" column:
    // If multiple names exist in one row (e.g. "Dika Anugerah Pratama, Tegar Rangga"):
    // Take line depan as primary supportName, and line ke-2 onwards as Support Team
    let supportName = rawSupport || 'Support Unnamed';
    let supportTeam = '-';
    let supportTeamList: string[] = [];
    let hasSupportTeam = false;

    if (rawSupport) {
      const splitSupport = rawSupport
        .split(/[,;\n\r/]+/)
        .map((s) => s.trim())
        .filter(Boolean);

      if (splitSupport.length > 1) {
        supportName = splitSupport[0];
        const teamFromSupport = splitSupport.slice(1);
        supportTeamList = [...teamFromSupport];
        supportTeam = teamFromSupport.join(', ');
        hasSupportTeam = true;
      } else {
        supportName = splitSupport[0] || 'Support Unnamed';
      }
    }

    // Merge any additional meeting participants into support team
    meetingParticipantsList.forEach((p) => {
      if (
        p &&
        p.toLowerCase() !== supportName.toLowerCase() &&
        !supportTeamList.some((s) => s.toLowerCase() === p.toLowerCase())
      ) {
        supportTeamList.push(p);
      }
    });

    if (supportTeamList.length > 0) {
      supportTeam = supportTeamList.join(', ');
      hasSupportTeam = true;
    }

    // Combine main support with support team to form full team participants
    const rawTeamSet = new Set<string>();
    if (supportName && supportName !== 'Support Unnamed') {
      rawTeamSet.add(supportName);
    }
    supportTeamList.forEach((tm) => rawTeamSet.add(tm));
    const teamParticipants = Array.from(rawTeamSet);
    const teamSize = teamParticipants.length || 1;

    const checkInRaw = (row[mapping.checkInTime] || '').trim();
    const checkOutRaw = (row[mapping.checkOutTime] || '').trim();

    const checkInDateObj = parseCustomDate(checkInRaw);
    const checkOutDateObj = parseCustomDate(checkOutRaw);

    const checkInCoords = parseCoordinates(row[mapping.checkInLocation]);
    const checkOutCoords = parseCoordinates(row[mapping.checkOutLocation]);

    // Calculate duration in minutes
    let durationMinutes: number | null = null;
    let durationCategory: ProcessedRecord['durationCategory'] = 'no_checkin';

    if (checkInDateObj && checkOutDateObj) {
      const diffMs = checkOutDateObj.getTime() - checkInDateObj.getTime();
      const diffMins = diffMs / (1000 * 60);

      if (diffMins < 0) {
        durationMinutes = null;
        durationCategory = 'overnight';
      } else if (diffMins > 24 * 60) {
        durationMinutes = Math.round(diffMins);
        durationCategory = 'overnight';
      } else {
        durationMinutes = Math.round(diffMins);
        if (diffMins < 30) durationCategory = 'less_30m';
        else if (diffMins <= 60) durationCategory = '30m_to_1h';
        else if (diffMins <= 120) durationCategory = '1h_to_2h';
        else if (diffMins <= 240) durationCategory = '2h_to_4h';
        else durationCategory = 'more_4h';
      }
    } else if (checkInDateObj && !checkOutDateObj) {
      durationCategory = 'missing_checkout';
    } else {
      durationCategory = 'no_checkin';
    }

    // Punctuality comparison (agenda vs checkIn)
    let punctualityMinutes: number | null = null;
    let punctualityStatus: ProcessedRecord['punctualityStatus'] = 'not_checked_in';

    if (agendaDateObj && checkInDateObj) {
      const pDiffMs = checkInDateObj.getTime() - agendaDateObj.getTime();
      punctualityMinutes = Math.round(pDiffMs / (1000 * 60));
      if (punctualityMinutes < -15) punctualityStatus = 'early';
      else if (punctualityMinutes <= 15) punctualityStatus = 'on_time';
      else punctualityStatus = 'late';
    }

    const area = detectArea(outletAddress, outletName, checkInCoords);

    // Check explicit Date Visit column if present in row
    const explicitDateVisit = (row['Date Visit'] || row['date_visit'] || row['Tanggal Visit'] || '').trim();

    // Primary Key: "tiket id" dan "date visit" sebagai count dari total visit
    const dateVisit =
      explicitDateVisit && explicitDateVisit !== '-'
        ? explicitDateVisit
        : agendaDate && agendaDate !== '-'
        ? agendaDate
        : formatDateToDMY(checkInDateObj) !== '-'
        ? formatDateToDMY(checkInDateObj)
        : formatDateToDMY(parseCustomDate(createdAt));
    const primaryVisitKey = `${ticketId}_${dateVisit}`;
    const uniqueVisitKey = primaryVisitKey;

    return {
      id: ticketId || `REC-${index}`,
      ticketId,
      title,
      status,
      createdAt,
      visitType,
      bookType,
      supervisor,
      agendaDate,
      agendaTime,
      agendaFull: agendaRaw,
      agendaDateObj,
      outletAddress,
      area,
      picName,
      picNumber,
      approachNotes,
      checkInTime: checkInRaw,
      checkInDateObj,
      checkInCoords,
      checkOutTime: checkOutRaw,
      checkOutDateObj,
      checkOutCoords,
      durationMinutes,
      durationFormatted: formatDuration(durationMinutes),
      durationCategory,
      punctualityMinutes,
      punctualityStatus,
      csatLink,
      supportName,
      supportTeam,
      supportTeamList,
      hasSupportTeam,
      rawSupportName: rawSupport,
      consultantName,
      companyName,
      outletName,
      meetingParticipantsRaw: meetingRaw,
      meetingParticipantsList,
      teamParticipants,
      teamSize,
      cancelNotes,
      primaryVisitKey,
      dateVisit,
      uniqueVisitKey,
      isDuplicateOnSameDay: false,
      jointSupportNames: [supportName],
      raw: row,
    };
  });

  // Step 2: Merge across rows having the exact same Primary Key (Ticket ID + Date Visit)
  const primaryVisitMap = new Map<string, ProcessedRecord[]>();
  parsedRecords.forEach((rec) => {
    if (!primaryVisitMap.has(rec.primaryVisitKey)) {
      primaryVisitMap.set(rec.primaryVisitKey, []);
    }
    primaryVisitMap.get(rec.primaryVisitKey)!.push(rec);
  });

  primaryVisitMap.forEach((group) => {
    const allSupports = Array.from(new Set(group.map((g) => g.supportName).filter(Boolean)));
    const allTeams = Array.from(new Set(group.flatMap((g) => g.supportTeamList).filter(Boolean)));
    const allTeamMembers = Array.from(new Set([...allSupports, ...allTeams]));

    group.forEach((rec, idx) => {
      rec.jointSupportNames = allSupports;
      // First record for this (Ticket ID + Date Visit) primary key is counted; subsequent rows are duplicate records
      rec.isDuplicateOnSameDay = idx > 0;
      if (allTeams.length > 0) {
        rec.supportTeam = allTeams.join(', ');
        rec.supportTeamList = allTeams;
        rec.hasSupportTeam = true;
      }
      rec.teamParticipants = allTeamMembers;
      rec.teamSize = allTeamMembers.length || 1;
    });
  });

  return parsedRecords;
}

export function parseCsvString(csvString: string): { data: RawDataRow[]; headers: string[] } {
  const result = Papa.parse<RawDataRow>(csvString, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (header) => header.trim(),
  });

  const headers = result.meta.fields || [];
  const filteredData = result.data.filter((row) => {
    return Object.values(row).some((val) => val && String(val).trim().length > 0);
  });

  return {
    data: filteredData,
    headers,
  };
}

// Map Indonesian support staff full names to their familiar nicknames
export function getSupportNickname(name: string): string {
  const low = name.toLowerCase();
  if (low.includes('febri dwi')) return 'Febri';
  if (low.includes('alian alfin') || low.includes('alfin')) return 'Alfin';
  if (low.includes('agung setiawan')) return 'Agung';
  if (low.includes('anisa lucky')) return 'Anisa';
  if (low.includes('christopher')) return 'Patrick';
  if (low.includes('imam wicaksono')) return 'Imam';
  if (low.includes('agita')) return 'Agita';
  if (low.includes('syahrul')) return 'Syahrul';
  if (low.includes('fera eka') || low.includes('fera')) return 'Fera';
  if (low.includes('tegar')) return 'Tegar';
  if (low.includes('yessi')) return 'Yessi';
  if (low.includes('febrianto')) return 'Febrianto';
  if (low.includes('syafiz')) return 'Syafiz';
  if (low.includes('margaretha')) return 'Margaretha';
  if (low.includes('bintang')) return 'Bintang';
  if (low.includes('yoga')) return 'Yoga';
  if (low.includes('noviyanti')) return 'Nadia';
  if (low.includes('kevin')) return 'Kevin';
  if (low.includes('ardiansyah')) return 'Ardi';
  if (low.includes('vinna')) return 'Vinna';
  if (low.includes('alif izzuddin')) return 'Alif';
  if (low.includes('melati')) return 'Melati';
  if (low.includes('nurul huda')) return 'Nurul';
  if (low.includes('rezi')) return 'Rezi';
  if (low.includes('tri hastuti')) return 'Tri';
  if (low.includes('david prima')) return 'David';
  if (low.includes('kiki tri')) return 'Kiki';
  if (low.includes('dika anugerah')) return 'Dika';
  return '';
}

// Dedicated support teams assigned to each consultant
// Keep dropdown membership synchronized with the one authoritative MASTER_DATA_TEAM.
export const CONSULTANT_DEDICATED_TEAMS: Record<string, DedicatedSupportMember[]> =
  MASTER_DATA_TEAM.reduce<Record<string, DedicatedSupportMember[]>>((teams, row) => {
    if (!teams[row.l2]) teams[row.l2] = [];
    if (!teams[row.l2].some((person) => person.fullName === row.l1FullName)) {
      teams[row.l2].push({
        fullName: row.l1FullName,
        nickname: row.l1Nickname,
        displayName: row.l1Nickname + ' (' + row.l1FullName + ')',
      });
    }
    return teams;
  }, {});

// Retrieve support team members for a consultant
export function getDedicatedSupportTeamsForConsultant(
  consultant: string,
  records: ProcessedRecord[] = []
): DedicatedSupportMember[] {
  if (!consultant) return [];
  // A shared L2 label maps ONLY to support members registered under every
  // candidate L2. Do not add all of Ayu/Dika's staff or a fictional L2 visitor.
  if (consultant.startsWith(SHARED_L2_TEAM_PREFIX)) {
    const names = consultant.slice(SHARED_L2_TEAM_PREFIX.length).split(' / ');
    const matchingRows = MASTER_DATA_TEAM.filter((row) => names.includes(row.l2));
    const byMember = new Map<string, { row: MasterDataTeamItem; l2: Set<string> }>();
    matchingRows.forEach((row) => {
      const key = normalizeTeamName(row.l1FullName);
      if (!byMember.has(key)) byMember.set(key, { row, l2: new Set() });
      byMember.get(key)!.l2.add(row.l2);
    });
    return [...byMember.values()]
      .filter((member) => names.every((name) => member.l2.has(name)))
      .map(({ row }) => ({
        fullName: row.l1FullName,
        nickname: row.l1Nickname,
        displayName: row.l1Nickname + ' (' + row.l1FullName + ')',
      }));
  }

  if (consultant.startsWith(DIRECT_SPV_VISIT_PREFIX)) {
    const name = consultant.slice(DIRECT_SPV_VISIT_PREFIX.length);
    if (!masterSupervisors.some((spv) => normalizeTeamName(spv) === normalizeTeamName(name))) return [];
    return [{ fullName: name, nickname: name.split(' ')[0], displayName: name + ' (SPV)' }];
  }


  // Direct exact match from predefined mapping
  for (const [cName, members] of Object.entries(CONSULTANT_DEDICATED_TEAMS)) {
    if (cName.toLowerCase() === consultant.toLowerCase()) {
      return members;
    }
  }

  // Partial match fallback (e.g. "airlangga" in consultant name)
  const low = consultant.toLowerCase();
  for (const [cName, members] of Object.entries(CONSULTANT_DEDICATED_TEAMS)) {
    if (low.includes(cName.toLowerCase()) || cName.toLowerCase().includes(low)) {
      return members;
    }
  }

  // Dynamic fallback from records if not in predefined list
  const memberCounts = new Map<string, number>();
  records.forEach((rec) => {
    if (rec.consultantName.toLowerCase() === low) {
      if (rec.supportName && rec.supportName.toLowerCase() !== 'unname') {
        memberCounts.set(rec.supportName, (memberCounts.get(rec.supportName) || 0) + 1);
      }
      rec.supportTeamList.forEach((m) => {
        if (m && m.toLowerCase() !== 'unname') {
          memberCounts.set(m, (memberCounts.get(m) || 0) + 1);
        }
      });
    }
  });

  return Array.from(memberCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([fullName]) => {
      const nickname = getSupportNickname(fullName);
      return {
        fullName,
        nickname: nickname || fullName.split(' ')[0],
        displayName: nickname ? `${nickname} (${fullName})` : fullName,
      };
    });
}

// Find which consultant a support member belongs to
// Ambiguous support members must not be silently assigned to the first roster.
export function findConsultantForSupportMember(memberName: string): string | null {
  const primary = normalizeTeamName(memberName);
  if (!primary) return null;
  const consultants = [...new Set(
    MASTER_DATA_TEAM.filter((item) =>
      normalizeTeamName(item.l1FullName) === primary || normalizeTeamName(item.l1Nickname) === primary
    ).map((item) => item.l2)
  )];
  return consultants.length === 1 ? consultants[0] : null;
}

// Build structured grouping of Nama Consulting -> Area -> Support Team
export function buildConsultantTeamGroupings(records: ProcessedRecord[]): ConsultantGrouping[] {
  const consultantMap = new Map<
    string,
    {
      areas: Map<string, number>;
      supports: Map<string, Set<string>>;
      visitKeys: Set<string>;
      totalVisits: number;
    }
  >();

  records.forEach((rec) => {
    let c = (rec.consultantName || '').trim();
    if (!c || c === '-' || c.toLowerCase() === 'unname') {
      const resolved = resolveSpvAndConsultant(rec.supportName, c, rec.supervisor);
      c = resolved.consultantName;
    }
    if (!consultantMap.has(c)) {
      consultantMap.set(c, {
        areas: new Map(),
        supports: new Map(),
        visitKeys: new Set(),
        totalVisits: 0,
      });
    }
    const data = consultantMap.get(c)!;
    data.totalVisits += 1;
    data.visitKeys.add(rec.primaryVisitKey);

    // Tally area
    const area = rec.area || 'Lainnya';
    data.areas.set(area, (data.areas.get(area) || 0) + 1);

    // Tally support members (main support & team members)
    const members = new Set<string>();
    if (rec.supportName && rec.supportName.toLowerCase() !== 'unname') {
      members.add(rec.supportName);
    }
    rec.supportTeamList.forEach((m) => {
      if (m && m.toLowerCase() !== 'unname') members.add(m);
    });

    members.forEach((m) => {
      if (!data.supports.has(m)) data.supports.set(m, new Set());
      data.supports.get(m)!.add(rec.primaryVisitKey);
    });
  });

  const groupings: ConsultantGrouping[] = [];

  consultantMap.forEach((data, consultant) => {
    // Primary area determination
    let primaryArea = 'Lainnya';
    let maxAreaCount = -1;
    data.areas.forEach((count, area) => {
      if (count > maxAreaCount) {
        maxAreaCount = count;
        primaryArea = area;
      }
    });

    const allAreas = Array.from(data.areas.keys()).filter(Boolean);

    // Use dedicated team definition if available for this consultant
    const dedicated = getDedicatedSupportTeamsForConsultant(consultant, records);
    let supportMembers: SupportMemberInfo[] = [];

    if (dedicated.length > 0) {
      supportMembers = dedicated.map((d) => {
        const cnt = data.supports.get(d.fullName)?.size || 0;
        return {
          fullName: d.fullName,
          displayName: d.displayName,
          nickname: d.nickname,
          count: cnt,
        };
      });
    } else {
      supportMembers = Array.from(data.supports.entries())
        .filter(([fullName, visitKeys]) => visitKeys.size >= 2 && fullName.toLowerCase() !== consultant.toLowerCase())
        .map(([fullName, visitKeys]) => {
          const nickname = getSupportNickname(fullName);
          const displayName = nickname ? `${fullName} (${nickname})` : fullName;
          return {
            fullName,
            displayName,
            nickname,
            count: visitKeys.size,
          };
        })
        .sort((a, b) => b.count - a.count);
    }

    // Ticket ID + Date Visit is the unique visit count; personnel participation is separate.
    const visitTotal = data.visitKeys.size;

    groupings.push({
      consultant,
      primaryArea,
      allAreas,
      supportMembers,
      totalVisits: visitTotal,
    });
  });

  // Sort consultant groups by totalVisits descending
  groupings.sort((a, b) => b.totalVisits - a.totalVisits);

  return groupings;
}

// Build Hierarchical Grouping for Supervisor -> L2 (Line 2 / Support Team) -> L1 (Line 1 / Support Utama)
export function buildSpvL2L1Groupings(records: ProcessedRecord[]): SpvL2L1Grouping[] {
  const spvMap = new Map<
    string,
    {
      totalVisits: number;
      soloVisits: number;
      teamVisits: number;
      l2Map: Map<string, { isSolo: boolean; count: number; l1Map: Map<string, number> }>;
      allL1Map: Map<string, number>;
    }
  >();

  records.forEach((rec) => {
    let spv = (rec.supervisor || '').trim();
    if (!spv || spv === '-' || spv.toLowerCase() === 'unname') {
      const resolved = resolveSpvAndConsultant(rec.supportName, rec.consultantName, spv);
      spv = resolved.supervisor;
    } else if (spv.toLowerCase() === 'muhammad rimaduddin') {
      spv = 'Muhamad Rimaduddin';
    }

    if (!spvMap.has(spv)) {
      spvMap.set(spv, {
        totalVisits: 0,
        soloVisits: 0,
        teamVisits: 0,
        l2Map: new Map(),
        allL1Map: new Map(),
      });
    }

    const spvEntry = spvMap.get(spv)!;
    spvEntry.totalVisits += 1;

    const l1Name = rec.supportName && rec.supportName !== 'Support Unnamed' && rec.supportName.toLowerCase() !== 'unname'
      ? rec.supportName
      : rec.consultantName || 'Support Lapangan';
    spvEntry.allL1Map.set(l1Name, (spvEntry.allL1Map.get(l1Name) || 0) + 1);

    const l2List = rec.supportTeamList.filter((m) => m && m.trim().length > 0 && m.toLowerCase() !== 'unname');

    if (l2List.length === 0) {
      spvEntry.soloVisits += 1;
      const soloKey = 'Solo (Tanpa L2)';
      if (!spvEntry.l2Map.has(soloKey)) {
        spvEntry.l2Map.set(soloKey, { isSolo: true, count: 0, l1Map: new Map() });
      }
      const l2Entry = spvEntry.l2Map.get(soloKey)!;
      l2Entry.count += 1;
      l2Entry.l1Map.set(l1Name, (l2Entry.l1Map.get(l1Name) || 0) + 1);
    } else {
      spvEntry.teamVisits += 1;
      l2List.forEach((l2) => {
        if (!spvEntry.l2Map.has(l2)) {
          spvEntry.l2Map.set(l2, { isSolo: false, count: 0, l1Map: new Map() });
        }
        const l2Entry = spvEntry.l2Map.get(l2)!;
        l2Entry.count += 1;
        l2Entry.l1Map.set(l1Name, (l2Entry.l1Map.get(l1Name) || 0) + 1);
      });
    }
  });

  const groupings: SpvL2L1Grouping[] = [];

  spvMap.forEach((entry, supervisor) => {
    const l2Groups: SpvL2Group[] = Array.from(entry.l2Map.entries())
      .map(([l2Name, l2Data]) => {
        const l1Members: SpvL1Member[] = Array.from(l2Data.l1Map.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([fullName, count]) => {
            const nickname = getSupportNickname(fullName);
            return {
              fullName,
              nickname: nickname || fullName.split(' ')[0],
              displayName: nickname ? `${nickname} (${fullName})` : fullName,
              count,
            };
          });

        const nickname = l2Data.isSolo ? 'Solo' : getSupportNickname(l2Name);

        return {
          l2Name,
          l2Nickname: nickname || l2Name.split(' ')[0],
          isSolo: l2Data.isSolo,
          totalVisits: l2Data.count,
          l1Members,
        };
      })
      .sort((a, b) => {
        if (a.isSolo && !b.isSolo) return 1;
        if (!a.isSolo && b.isSolo) return -1;
        return b.totalVisits - a.totalVisits;
      });

    const allL1Members: SpvL1Member[] = Array.from(entry.allL1Map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([fullName, count]) => {
        const nickname = getSupportNickname(fullName);
        return {
          fullName,
          nickname: nickname || fullName.split(' ')[0],
          displayName: nickname ? `${nickname} (${fullName})` : fullName,
          count,
        };
      });

    groupings.push({
      supervisor,
      totalVisits: entry.totalVisits,
      soloVisits: entry.soloVisits,
      teamVisits: entry.teamVisits,
      l2Groups,
      allL1Members,
    });
  });

  // Sort supervisors: named SPVs first by totalVisits descending
  return groupings.sort((a, b) => b.totalVisits - a.totalVisits);
}

