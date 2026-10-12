import React from 'react';
import { LayoutDashboard, CalendarDays, ChartNoAxesCombined, Clock3, Table2 } from 'lucide-react';

type DashboardTab = 'overview' | 'monthly' | 'breakdowns' | 'comparison' | 'table';

interface ModernSidebarProps {
  activeTab: DashboardTab;
  onSelect: (tab: DashboardTab) => void;
}

const navigation: Array<{ id: DashboardTab; label: string; Icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'overview', label: 'Dashboard', Icon: LayoutDashboard },
  { id: 'monthly', label: 'Analisis Bulanan', Icon: CalendarDays },
  { id: 'breakdowns', label: 'Breakdown & Konsultan', Icon: ChartNoAxesCombined },
  { id: 'comparison', label: 'Check In / Check Out', Icon: Clock3 },
  { id: 'table', label: 'Rincian Data', Icon: Table2 },
];

export const ModernSidebar: React.FC<ModernSidebarProps> = ({ activeTab, onSelect }) => (
  <aside className="modern-sidebar" aria-label="Navigasi Dashboard Consultant">
    <div className="modern-sidebar-brand">
      <span className="modern-sidebar-brandmark">ESB</span>
      <span>
        <span className="modern-sidebar-brandname">ESB Consultant</span>
        <span className="modern-sidebar-brandsub">Field Operations Analytics</span>
      </span>
    </div>

    <div className="modern-sidebar-label">WORKSPACE</div>
    <nav className="modern-sidebar-nav" aria-label="Menu analisis">
      {navigation.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          className="modern-sidebar-link"
          data-active={activeTab === id}
          aria-current={activeTab === id ? 'page' : undefined}
          onClick={() => onSelect(id)}
        >
          <Icon className="modern-sidebar-icon" />
          <span>{label}</span>
        </button>
      ))}
    </nav>

    <div className="modern-sidebar-footer">
      <span className="modern-sidebar-footer-icon">ESB</span>
      <span>
        <span className="modern-sidebar-footer-title block">Consultant Dashboard</span>
        <span className="modern-sidebar-footer-sub block">Monitoring Workspace</span>
      </span>
    </div>
  </aside>
);
