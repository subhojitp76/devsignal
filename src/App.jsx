import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Navbar from './components/Navigation/Navbar';
import MarketRadarTab from './components/MarketRadar/MarketRadarTab';
import DevJournalTab from './components/DevJournal/DevJournalTab';
import ResumeBuilderTab from './components/ResumeBuilder/ResumeBuilderTab';
import ProfileModal from './components/Profile/ProfileModal';
import AIConfigModal from './components/AIConfig/AIConfigModal';
import Toast from './components/Common/Toast';

function MainLayout() {
  const { activeTab } = useApp();

  return (
    <div className="app-container">
      {/* Sticky Global Navigation */}
      <Navbar />

      {/* Main Tab Viewport */}
      <main style={{ flex: 1, position: 'relative' }}>
        {activeTab === 'marketRadar' && <MarketRadarTab />}
        {activeTab === 'devJournal' && <DevJournalTab />}
        {activeTab === 'resumeBuilder' && <ResumeBuilderTab />}
      </main>

      {/* Global Modals & Notifications */}
      <ProfileModal />
      <AIConfigModal />
      <Toast />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
