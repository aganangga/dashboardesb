import React, { useEffect, useRef, useState } from 'react';
import {
  LayoutDashboard,
  CalendarDays,
  ChartNoAxesCombined,
  Clock3,
  Table2,
  Star,
  Menu,
  X,
} from 'lucide-react';

type DashboardTab = 'overview' | 'monthly' | 'breakdowns' | 'comparison' | 'table' | 'csat';

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
  { id: 'csat', label: 'CSAT · Penilaian Client', Icon: Star },
];

export const ModernSidebar: React.FC<ModernSidebarProps> = ({ activeTab, onSelect }) => {
  // Keep sidebar as an overlay on desktop and mobile, not a permanent layout column.
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', onEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onEscape);
      triggerRef.current?.focus();
    };
  }, [isOpen]);

  const selectTab = (tab: DashboardTab) => {
    onSelect(tab);
    setIsOpen(false);
  };

  return (
    <>
      {!isOpen && (
        <button
          ref={triggerRef}
          type="button"
          className="modern-floating-toggle"
          onClick={() => setIsOpen(true)}
          aria-label="Buka menu navigasi dashboard"
          aria-expanded={false}
          aria-controls="esb-navigation-panel"
          title="Buka navigasi dashboard"
        >
          <Menu className="w-5 h-5 shrink-0" aria-hidden="true" />
          <span>Menu Dashboard</span>
        </button>
      )}

      {isOpen && (
        <>
          <button
            type="button"
            className="modern-sidebar-backdrop"
            aria-label="Tutup menu navigasi"
            onClick={() => setIsOpen(false)}
          />
          <aside
            id="esb-navigation-panel"
            className="modern-sidebar"
            role="dialog"
            aria-modal="true"
            aria-label="Navigasi Dashboard Consultant"
          >
            <div className="modern-sidebar-brand">
              <span className="modern-sidebar-brandmark">ESB</span>
              <span className="modern-sidebar-brandcopy">
                <span className="modern-sidebar-brandname">ESB Consultant</span>
                <span className="modern-sidebar-brandsub">Field Operations Analytics</span>
              </span>
              <button
                ref={closeRef}
                type="button"
                className="modern-sidebar-close"
                onClick={() => setIsOpen(false)}
                aria-label="Sembunyikan menu navigasi"
                title="Tutup menu"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
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
                  onClick={() => selectTab(id)}
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
        </>
      )}
    </>
  );
};
