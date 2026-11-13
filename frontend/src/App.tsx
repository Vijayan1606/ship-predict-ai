import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { OverviewPage } from './pages/OverviewPage';
import { MonitoringPage } from './pages/MonitoringPage';
import { ShipmentDetailPage } from './pages/ShipmentDetailPage';
import { PredictionCenterPage } from './pages/PredictionCenterPage';
import { ModelPerformancePage } from './pages/ModelPerformancePage';
import { DataSourcesPage } from './pages/DataSourcesPage';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>('SHP-1001');

  const handleSelectShipment = (id: string) => {
    setSelectedShipmentId(id);
    setActiveTab('details');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        selectedShipmentId={selectedShipmentId} 
      />

      <main className="flex-1">
        {activeTab === 'overview' && (
          <OverviewPage 
            onNavigateToMonitoring={() => setActiveTab('monitoring')} 
            onSelectShipment={handleSelectShipment} 
          />
        )}
        {activeTab === 'monitoring' && (
          <MonitoringPage 
            onSelectShipment={handleSelectShipment} 
          />
        )}
        {activeTab === 'details' && selectedShipmentId && (
          <ShipmentDetailPage 
            shipmentId={selectedShipmentId} 
            onBack={() => setActiveTab('monitoring')} 
          />
        )}
        {activeTab === 'prediction' && (
          <PredictionCenterPage />
        )}
        {activeTab === 'model' && (
          <ModelPerformancePage />
        )}
        {activeTab === 'datasources' && (
          <DataSourcesPage />
        )}
      </main>

      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>ShipPredict AI &copy; 2026</span>
          <div className="flex items-center gap-4 text-slate-400">
            <span>SHAP Explainability</span>
            <span>&bull;</span>
            <span>Open-Meteo Integration</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
