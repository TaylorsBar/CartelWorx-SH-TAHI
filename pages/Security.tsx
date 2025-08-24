
import React from 'react';
import { AuditLogEntry, AuditEvent } from '../types';

const MOCK_AUDIT_LOGS: AuditLogEntry[] = [
    { id: '1', timestamp: '2024-07-22 14:35:12 UTC', event: AuditEvent.AiAnalysis, description: 'Predictive analysis run on live OBD-II data stream.', ipAddress: '192.168.1.1 (Local)', status: 'Success' },
    { id: '2', timestamp: '2024-07-22 14:30:05 UTC', event: AuditEvent.Login, description: 'User authenticated successfully via biometrics.', ipAddress: '203.0.113.25', status: 'Success' },
    { id: '3', timestamp: '2024-07-22 11:15:45 UTC', event: AuditEvent.TuningChange, description: "AI tuning suggestion 'Track Day' applied to sandbox.", ipAddress: '192.168.1.1 (Local)', status: 'Success' },
    { id: '4', timestamp: '2024-07-22 11:14:20 UTC', event: AuditEvent.DiagnosticQuery, description: "User asked: 'Why is my idle rough?'", ipAddress: '192.168.1.1 (Local)', status: 'Success' },
    { id: '5', timestamp: '2024-07-22 08:00:01 UTC', event: AuditEvent.DataSync, description: 'Encrypted vehicle health report synced to cloud backup.', ipAddress: 'System', status: 'Success' },
    { id: '6', timestamp: '2024-07-21 18:05:11 UTC', event: AuditEvent.Login, description: 'User authenticated successfully.', ipAddress: '203.0.113.25', status: 'Success' },
];

const Security: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-100 font-display">Security & Privacy</h1>
        <p className="text-gray-400 mt-1">Your data integrity and privacy are our top priority.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Encryption Status */}
        <div className="bg-black p-6 rounded-lg border border-brand-cyan/30 shadow-lg">
          <div className="flex items-center mb-3">
            <svg className="w-6 h-6 mr-3 text-brand-green" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
            <h2 className="text-lg font-semibold text-gray-100 font-display">End-to-End Encryption</h2>
          </div>
          <p className="text-gray-400 text-sm mb-4">
            All data streams, including live sensor data, cloud synchronization, and account information, are protected with AES-256 end-to-end encryption.
          </p>
          <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-900/50 text-green-300 border border-green-700">
            Status: ACTIVE
          </div>
        </div>

        {/* Data Residency */}
        <div className="bg-black p-6 rounded-lg border border-brand-cyan/30 shadow-lg">
          <div className="flex items-center mb-3">
            <svg className="w-6 h-6 mr-3 text-brand-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2h8a2 2 0 002-2v-1a2 2 0 012-2h1.945M7.885 5.105a.5.5 0 01.115-.665l2.25-1.5a.5.5 0 01.666 0l2.25 1.5a.5.5 0 01.115.665l-2.617 3.926a.5.5 0 01-.88 0L7.885 5.105zM12 21a9 9 0 100-18 9 9 0 000 18z"></path></svg>
            <h2 className="text-lg font-semibold text-gray-100 font-display">Data Residency</h2>
          </div>
          <p className="text-gray-400 text-sm">
            To comply with New Zealand's Privacy Act 2020 and ensure the highest level of data protection, all your personal and vehicle data is securely hosted on servers located within New Zealand.
          </p>
        </div>
      </div>

      {/* Audit Trail */}
      <div className="bg-black rounded-lg border border-brand-cyan/30 shadow-lg">
        <div className="p-4 border-b border-brand-cyan/30">
            <h2 className="text-lg font-semibold text-gray-100 font-display">System Access Audit Trail</h2>
            <p className="text-sm text-gray-400">A transparent, immutable log of all significant actions within the system.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-base-700/50">
            <thead className="bg-base-800/50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Timestamp</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Event</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Description</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Source IP</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-black divide-y divide-base-700/50">
              {MOCK_AUDIT_LOGS.map((log) => (
                <tr key={log.id} className="hover:bg-base-800/40">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-400">{log.timestamp}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-200">{log.event}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{log.description}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-400">{log.ipAddress}</td>
                   <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {log.status === 'Success' ? (
                      <span className="text-green-400">{log.status}</span>
                    ) : (
                      <span className="text-red-400">{log.status}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Security;
