
import React, { useContext } from 'react';
import { AppearanceContext } from '../contexts/AppearanceContext';
import RallyThemeDashboard from './dashboards/RallyThemeDashboard';
import ModernThemeDashboard from './dashboards/ModernThemeDashboard';
import ClassicThemeDashboard from './dashboards/ClassicThemeDashboard';
import HaltechDashboard from './dashboards/HaltechDashboard';
import MinimalistDashboard from './dashboards/MinimalistDashboard';

const Dashboard: React.FC = () => {
  const { theme } = useContext(AppearanceContext);

  const renderDashboard = () => {
    switch (theme) {
      case 'rally':
        return <RallyThemeDashboard />;
      case 'modern':
        return <ModernThemeDashboard />;
      case 'classic':
        return <ClassicThemeDashboard />;
      case 'haltech':
        return <HaltechDashboard />;
      case 'minimalist':
        return <MinimalistDashboard />;
      default:
        return <RallyThemeDashboard />;
    }
  };

  return <div className="h-full w-full">{renderDashboard()}</div>;
};

export default Dashboard;