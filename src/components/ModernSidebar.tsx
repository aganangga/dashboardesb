import React, { useEffect, useRef, useState } from 'react';
import { LayoutDashboard, CalendarDays, ChartNoAxesCombined, Clock3, Table2, Star, Menu, X, Ticket, Users } from 'lucide-react';

type DashboardTab = 'overview' | 'monthly' | 'breakdowns' | 'comparison' | 'table' | 'csat';
interface ModernSidebarProps {
  activeTab: DashboardTab;
  onSelect: (tab: DashboardTab) => void;
  selectedWorksheet?: string;
  onSelectWorksheet?: (id: string) => void;
}
const modules = [
  {id:'visit',label:'Data Visit',short:'Visit',Icon:LayoutDashboard},
  {id:'ticket',label:'Data Tiket',short:'Tiket',Icon:Ticket},
  {id:'team',label:'Team Master',short:'Tim',Icon:Users},
  {id:'csat',label:'CSAT',short:'CSAT',Icon:Star},
];
const navigation: Array<{id:DashboardTab;label:string;Icon:React.ComponentType<{className?:string}>}> = [
  {id:'overview',label:'Ringkasan',Icon:LayoutDashboard},
  {id:'monthly',label:'Bulanan',Icon:CalendarDays},
  {id:'breakdowns',label:'Breakdown',Icon:ChartNoAxesCombined},
  {id:'comparison',label:'Check-in/out',Icon:Clock3},
  {id:'table',label:'Rincian',Icon:Table2},
];
export const ModernSidebar: React.FC<ModernSidebarProps> = ({ activeTab, onSelect, selectedWorksheet='visit', onSelectWorksheet }) => {
  const [isOpen,setIsOpen]=useState(false);
  const triggerRef=useRef<HTMLButtonElement>(null);
  const closeRef=useRef<HTMLButtonElement>(null);
  const panelRef=useRef<HTMLElement>(null);
  const module=modules.find(item=>item.id===selectedWorksheet)||modules[0];
  useEffect(()=>{
    if(!isOpen)return;
    closeRef.current?.focus();
    const onKey=(event:KeyboardEvent)=>{
      if(event.key==='Escape')setIsOpen(false);
      if(event.key==='Tab'){
        const buttons=panelRef.current?.querySelectorAll<HTMLButtonElement>('button:not([disabled])');
        if(!buttons?.length)return;
        const first=buttons[0];const last=buttons[buttons.length-1];
        if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
        else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
      }
    };
    document.addEventListener('keydown',onKey);
    return ()=>{document.removeEventListener('keydown',onKey);triggerRef.current?.focus();};
  },[isOpen]);
  return <>
    {!isOpen&&<button ref={triggerRef} type="button" className="modern-floating-toggle" onClick={()=>setIsOpen(true)} aria-label="Buka menu navigasi dashboard" aria-expanded={false} aria-controls="esb-navigation-panel" title={'Menu dashboard · '+module.label}>
      <Menu className="h-4 w-4"/><span>Menu · {module.short}</span>
    </button>}
    {isOpen&&<>
      <button className="modern-sidebar-backdrop" aria-label="Tutup menu navigasi" onClick={()=>setIsOpen(false)}/>
      <aside ref={panelRef} id="esb-navigation-panel" className="modern-sidebar" role="dialog" aria-modal="true" aria-label="Navigasi Dashboard Consultant">
        <div className="modern-sidebar-brand"><span className="modern-sidebar-brandmark">ESB</span><div className="modern-sidebar-brandcopy"><span className="modern-sidebar-brandname">Dashboard</span><span className="modern-sidebar-brandsub">Aktif: {module.label}</span></div><button ref={closeRef} className="modern-sidebar-close" aria-label="Sembunyikan menu navigasi" onClick={()=>setIsOpen(false)}><X className="h-4 w-4"/></button></div>
        <nav className="modern-sidebar-nav modern-module-grid" aria-label="Pilih subdashboard">{modules.map(({id,label,Icon})=><button key={id} className="modern-sidebar-link" data-active={selectedWorksheet===id} aria-current={selectedWorksheet===id?'page':undefined} onClick={()=>{onSelectWorksheet?.(id);setIsOpen(false);}}><Icon className="modern-sidebar-icon"/><span>{label}</span></button>)}</nav>
        {selectedWorksheet==='visit'&&<><div className="modern-sidebar-label">Analisis visit</div><nav className="modern-sidebar-nav modern-analysis-grid" aria-label="Menu analisis">{navigation.map(({id,label,Icon})=><button key={id} className="modern-sidebar-link" data-active={activeTab===id} aria-current={activeTab===id?'page':undefined} onClick={()=>{onSelect(id);setIsOpen(false);}}><Icon className="modern-sidebar-icon"/><span>{label}</span></button>)}</nav></>}
      </aside>
    </>}
  </>;
};
