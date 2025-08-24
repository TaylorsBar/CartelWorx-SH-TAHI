import React from 'react';
import { MaintenanceRecord } from '../types';
import VerifiedIcon from '../components/icons/VerifiedIcon';

export const MOCK_LOGS: MaintenanceRecord[] = [
  { id: '1', date: '2024-07-15', service: 'Oil & Filter Change', notes: 'Performed by KC SpeedShop. Used Mobil 1 5W-30.', verified: true, isAiRecommendation: false },
  { id: '2', date: '2024-06-28', service: 'Replace Air Filter', notes: 'Airflow sensor detected reduced intake. Recommended replacement.', verified: true, isAiRecommendation: true },
  { id: '3', date: '2024-06-01', service: 'Tire Rotation', notes: 'Standard 5,000-mile service.', verified: true, isAiRecommendation: false },
  { id: '4', date: '2024-05-20', service: 'Inspect O2 Sensor', notes: 'System predicted potential O2 sensor degradation based on response times.', verified: false, isAiRecommendation: true },
  { id: '5', date: '2024-03-10', service: 'Brake Fluid Flush', notes: 'Completed at dealer.', verified: false, isAiRecommendation: false },
];


const MaintenanceLog: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold text-gray-100 font-display">Maintenance Logbook</h1>
            <p className="text-gray-400 mt-1">An immutable record of your vehicle's service history.</p>
        </div>
        <button className="bg-brand-cyan text-black font-semibold px-4 py-2 rounded-md hover:bg-cyan-300 transition-colors shadow-glow-cyan">
            Add New Record
        </button>
      </div>
      
      <div className="bg-black rounded-lg border border-brand-cyan/30 shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-base-700/50">
            <thead className="bg-base-800/50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Service / Recommendation</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Notes</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-black divide-y divide-base-700/50">
              {MOCK_LOGS.map((log) => (
                <tr key={log.id} className="hover:bg-base-800/40">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-300">{log.date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">
                    <div className="flex items-center">
                      {log.isAiRecommendation && <span className="text-brand-cyan mr-2 font-mono text-xs">[AI]</span>}
                      {log.isAiRecommendation ? <span className="text-brand-cyan">{log.service}</span> : log.service}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{log.notes}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {log.verified ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900/50 text-green-400 border border-green-700">
                        <VerifiedIcon className="w-4 h-4 mr-1.5 text-green-400" />
                        Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-900/50 text-yellow-400 border border-yellow-700">
                        Pending
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
       <div className="text-center mt-4">
        <button className="text-brand-cyan font-semibold hover:underline">
            Generate Vehicle Health Report
        </button>
      </div>
    </div>
  );
};

export default MaintenanceLog;