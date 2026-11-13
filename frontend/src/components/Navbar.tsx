import React from 'react';
import { 
  Ship, 
  BarChart3, 
  ListFilter, 
  Cpu, 
  Database, 
  Activity,
  Layers
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedShipmentId?: string | null;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, selectedShipmentId }) => {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'monitoring', label: 'Shipment Monitoring', icon: ListFilter },
    { id: 'details', label: selectedShipmentId ? `Shipment ${selectedShipmentId}` : 'Journey Timeline', icon: Layers },
    { id: 'prediction', label: 'Prediction Center', icon: Activity },
    { id: 'model', label: 'Model Performance', icon: Cpu },
    { id: 'datasources', label: 'Data Sources & Dict', icon: Database },
  ];

  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('overview')}>
            <div className="p-2 bg-gradient-to-tr from-cyan-600 to-indigo-600 rounded-lg shadow-md shadow-indigo-500/20">
              <Ship className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-white tracking-tight">ShipPredict</span>
                <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">AI</span>
              </div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">ETA & Delay Propagation Engine</p>
            </div>
          </div>

          <nav className="flex items-center space-x-1 sm:space-x-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-slate-800 text-cyan-400 border border-cyan-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                  <span className="hidden md:inline">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="hidden sm:flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              FastAPI Live
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
