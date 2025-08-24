
import React from 'react';
import { DiagnosticAlert, AlertLevel } from '../types';

export const MOCK_ALERTS: DiagnosticAlert[] = [
  { id: '1', level: AlertLevel.Warning, component: 'O2 Sensor (Bank 1)', message: 'Sensor response time is 15% below optimal. Potential fuel efficiency loss.', timestamp: '2 minutes ago', isFaultRelated: true },
  { id: '2', level: AlertLevel.Info, component: 'Tire Pressure (RR)', message: 'Pressure is 2 PSI low. Recommend inflating soon.', timestamp: '1 hour ago' },
  { id: '3', level: AlertLevel.Critical, component: 'MAP Sensor', message: 'Erratic readings detected under load. Risk of engine stalling. Immediate inspection required.', timestamp: '5 seconds ago', isFaultRelated: true },
];

const alertStyles = {
  [AlertLevel.Critical]: 'border-brand-red bg-red-900/20',
  [AlertLevel.Warning]: 'border-yellow-500 bg-yellow-900/20',
  [AlertLevel.Info]: 'border-blue-500 bg-blue-900/20',
};

const iconStyles = {
    [AlertLevel.Critical]: 'text-brand-red',
    [AlertLevel.Warning]: 'text-yellow-500',
    [AlertLevel.Info]: 'text-blue-500',
};

const AlertIcon: React.FC<{level: AlertLevel}> = ({level}) => {
    const className = `w-6 h-6 mr-3 ${iconStyles[level]}`;
    if (level === AlertLevel.Critical) {
        return <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
    }
    if (level === AlertLevel.Warning) {
        return <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    }
    return <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
}

const Alerts: React.FC = () => {
  return (
    <div className="bg-base-900 p-4 rounded-lg shadow-lg border border-base-700">
      <h3 className="text-lg font-semibold text-gray-200 mb-4">Predictive Alerts</h3>
      <div className="space-y-3">
        {MOCK_ALERTS.sort((a,b) => Object.values(AlertLevel).indexOf(b.level) - Object.values(AlertLevel).indexOf(a.level)).map((alert) => (
          <div key={alert.id} className={`p-3 rounded-md border-l-4 ${alertStyles[alert.level]}`}>
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertIcon level={alert.level} />
              </div>
              <div className="ml-3">
                <p className="text-sm font-semibold text-gray-100">{alert.component}</p>
                <p className="text-sm text-base-400 mt-1">{alert.message}</p>
                <p className="text-xs text-base-500 mt-2">{alert.timestamp}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Alerts;