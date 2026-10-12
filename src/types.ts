export interface RawDataRow {
  [key: string]: string | undefined;
}

export interface Coordinates {
  lat: number;
  lng: number;
  accuracy?: number;
  timestamp?: string;
  address?: string;
}

export interface ColumnMapping {
  ticketId: string;
  title: string;
  status: string;
  createdAt: string;
  visitType: string;
  bookType: string;
  supervisor: string;
  agendaSchedule: string;
  outletAddress: string;
  picName: string;
  picNumber: string;
  approachNotes: string;
  checkInTime: string;
  checkInLocation: string;
  checkOutTime: string;
  checkOutLocation: string;
  csatLink: string;
  supportName: string;
  consultantName: string; // Nama Consultant / Nama Konsulting
  companyName: string;
  outletName: string;
  meetingParticipants: string; // Team support yang datang 2-3 orang dalam 1 visit tiket ID
  cancelNotes: string;
}

export interface ProcessedRecord {
  id: string;
  ticketId: string;
  title: string;
  status: string;
  createdAt: string;
  visitType: string;
  bookType: string;
  supervisor: string; // fallback to 'unname' if empty
  agendaDate: string; // formatted DD/MM/YYYY
  agendaTime: string; // HH:mm:ss
  agendaFull: string;
  agendaDateObj: Date | null;
  outletAddress: string;
  area: string; // Derived or extracted
  picName: string;
  picNumber: string;
  approachNotes: string;
  checkInTime: string;
  checkInDateObj: Date | null;
  checkInCoords: Coordinates | null;
  checkOutTime: string;
  checkOutDateObj: Date | null;
  checkOutCoords: Coordinates | null;
  durationMinutes: number | null; // checkOut - checkIn in minutes
  durationFormatted: string;
  durationCategory: 'less_30m' | '30m_to_1h' | '1h_to_2h' | '2h_to_4h' | 'more_4h' | 'missing_checkout' | 'no_checkin' | 'overnight';
  punctualityMinutes: number | null; // checkIn - agenda in minutes
  punctualityStatus: 'early' | 'on_time' | 'late' | 'not_checked_in';
  csatLink: string;
  supportName: string; // Line depan (1st person)
  supportTeam: string; // Line ke-2 (separator: "Tegar Rangga", etc.) or '-' if solo
  supportTeamList: string[]; // List of names in support team
  hasSupportTeam: boolean; // true if line ke-2 / team exists
  rawSupportName: string; // original row content
  consultantName: string; // fallback to 'unname' if empty
  companyName: string;
  outletName: string;
  meetingParticipantsRaw: string;
  meetingParticipantsList: string[]; // Parsed meeting participants from CSV
  teamParticipants: string[]; // All team support who came for this Ticket ID
  teamSize: number; // 1, 2, or 3+ orang
  cancelNotes: string;
  primaryVisitKey: string; // Primary Key: ticketId + '_' + dateVisit
  dateVisit: string; // formatted DD/MM/YYYY
  uniqueVisitKey: string; // primary key for visit deduplication
  isDuplicateOnSameDay: boolean; // if duplicate visit on same day under primary key
  jointSupportNames: string[]; // support agents involved
  isErpAdvisor?: boolean; // Pernandes & Irma (ERP Advisor)
  isTandemVisit?: boolean; // Tandem dalam 1 visit
  tandemPartner?: string; // Nama rekan tandem dalam 1 visit
  tandemNote?: string;
  raw: RawDataRow;
}

export interface SupportMemberInfo {
  fullName: string;
  displayName: string;
  nickname: string;
  count: number;
}

export interface DedicatedSupportMember {
  fullName: string;
  nickname: string;
  displayName: string;
}

export interface ConsultantGrouping {
  consultant: string;
  primaryArea: string;
  allAreas: string[];
  supportMembers: SupportMemberInfo[];
  totalVisits: number;
}

export interface SpvL1Member {
  fullName: string;
  nickname: string;
  displayName: string;
  count: number;
}

export interface SpvL2Group {
  l2Name: string;
  l2Nickname: string;
  isSolo: boolean;
  totalVisits: number;
  l1Members: SpvL1Member[];
}

export interface SpvL2L1Grouping {
  supervisor: string;
  totalVisits: number;
  soloVisits: number;
  teamVisits: number;
  l2Groups: SpvL2Group[];
  allL1Members: SpvL1Member[];
}

export interface MasterDataTeamItem {
  no: number;
  spv: string;
  l2: string; // Consultant Lead
  l1FullName: string;
  l1Nickname: string;
  role: 'Supervisor' | 'L2 Consultant' | 'L1 Support' | 'ERP Advisor';
  notes?: string;
  status: 'Aktif';
}

export interface FilterState {
  search: string;
  dateRangeStart: string; // YYYY-MM-DD
  dateRangeEnd: string;   // YYYY-MM-DD
  selectedMonth?: string; // YYYY-MM (e.g. '2025-02') or '' for all months
  areas: string[];
  supervisors: string[];
  consultants: string[]; // "Nama Konsulting" filter option like SPV
  bookTypes: string[];
  statuses: string[];
  visitTypes: string[];
  supportTeamFilter: 'all' | 'with_team' | 'solo'; // Filter pengganti Team Support Tiket
  supportTeamMembers: string[]; // Filter specific support team member (e.g. "Febri Dwi Putra" or "CONS_ALL:Airlangga Aziz")
  selectedSupportTeam?: string; // Dropdown value for grouped support team
  teamSizeFilter?: 'all' | 'solo' | 'team_multi' | 'team_3'; // Optional compatibility
  durationCategories: string[];
  punctualityFilter: string;
  deduplicateVisits: boolean; // true by default
}

export interface UniqueVisitSummary {
  visitKey: string;
  outletName: string;
  date: string;
  area: string;
  bookType: string;
  supervisor: string;
  supportNames: string[];
  recordCount: number;
  records: ProcessedRecord[];
  totalDurationMinutes: number;
}

export interface TeamTicketSummary {
  ticketId: string;
  outletName: string;
  companyName: string;
  date: string;
  time: string;
  supervisor: string;
  consultantName: string;
  mainSupport: string;
  meetingParticipants: string[];
  allTeamMembers: string[];
  teamSize: number;
  status: string;
  durationFormatted: string;
  records: ProcessedRecord[];
}
