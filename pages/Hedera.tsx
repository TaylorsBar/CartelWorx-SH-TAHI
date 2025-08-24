
import React, { useState } from 'react';
import { HederaRecord, HederaEventType } from '../types';

const MOCK_INITIAL_RECORDS: HederaRecord[] = [
    { id: '1', timestamp: '2024-07-22 14:35:12', eventType: HederaEventType.Diagnostic, vin: 'JN1AZ00Z9ZT000123', summary: 'Critical alert: ABS Modulator Failure Predicted.', hederaTxId: '0.0.12345@1658498112.123456789', dataHash: 'a1b2c3d4...' },
    { id: '2', timestamp: '2024-07-22 11:15:45', eventType: HederaEventType.Tuning, vin: 'JN1AZ00Z9ZT000123', summary: "AI tune 'Track Day' simulated.", hederaTxId: '0.0.12345@1658486145.987654321', dataHash: 'e5f6g7h8...' },
    { id: '3', timestamp: '2024-07-15 09:00:00', eventType: HederaEventType.Maintenance, vin: 'JN1AZ00Z9ZT000123', summary: 'Oil & Filter Change (Verified)', hederaTxId: '0.0.12345@1657875600.555555555', dataHash: 'i9j0k1l2...' },
];

const Hedera: React.FC = () => {
    const [records, setRecords] = useState<HederaRecord[]>(MOCK_INITIAL_RECORDS);
    const [vin, setVin] = useState('JN1AZ00Z9ZT000123');
    const [eventType, setEventType] = useState<HederaEventType>(HederaEventType.Maintenance);
    const [summary, setSummary] = useState('');
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submissionResult, setSubmissionResult] = useState<{ success: boolean; txId: string; error?: string } | null>(null);
    
    const [verifyingRecordId, setVerifyingRecordId] = useState<string | null>(null);
    const [verificationStatus, setVerificationStatus] = useState<{ [key: string]: 'success' | 'fail' }>({});

    const handleLogEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!summary.trim()) return;

        setIsSubmitting(true);
        setSubmissionResult(null);

        // Simulate API call to log data and get Hedera Tx ID
        await new Promise(resolve => setTimeout(resolve, 1500));

        const newRecord: HederaRecord = {
            id: (records.length + 1).toString(),
            timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
            eventType,
            vin,
            summary,
            hederaTxId: `0.0.12345@${Date.now() / 1000 | 0}.${Math.floor(Math.random() * 1e9)}`,
            dataHash: 'f4a5b6c7...' // a new mock hash
        };
        
        setRecords(prev => [newRecord, ...prev]);
        setSubmissionResult({ success: true, txId: newRecord.hederaTxId });
        setSummary('');
        setIsSubmitting(false);
    };
    
    const handleVerify = async (recordId: string) => {
        setVerifyingRecordId(recordId);
        // Simulate hash check against DLT
        await new Promise(resolve => setTimeout(resolve, 1000));
        setVerificationStatus(prev => ({ ...prev, [recordId]: 'success' }));
        setVerifyingRecordId(null);
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-100 font-display">Hedera DLT Integration</h1>
                <p className="text-gray-400 mt-1">Creating an immutable, tamper-proof audit trail for your vehicle's history.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-black text-center p-4 rounded-lg border border-brand-cyan/30 shadow-lg">
                    <p className="text-sm text-gray-400">Network Status</p>
                    <p className="font-semibold text-green-400">Connected to Mainnet</p>
                </div>
                <div className="bg-black text-center p-4 rounded-lg border border-brand-cyan/30 shadow-lg">
                    <p className="text-sm text-gray-400">Account ID</p>
                    <p className="font-mono text-gray-200">0.0.12345</p>
                </div>
                <div className="bg-black text-center p-4 rounded-lg border border-brand-cyan/30 shadow-lg">
                    <p className="text-sm text-gray-400">Balance</p>
                    <p className="font-mono text-gray-200">4,501.2345 HBAR</p>
                </div>
            </div>

            {/* Log New Event */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-2 bg-black p-6 rounded-lg border border-brand-cyan/30 shadow-lg">
                    <h2 className="text-lg font-semibold border-b border-brand-cyan/30 pb-2 mb-4 font-display">Log a New Immutable Record</h2>
                    <form onSubmit={handleLogEvent} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Vehicle (VIN)</label>
                            <input type="text" value={vin} onChange={e => setVin(e.target.value)} className="w-full bg-base-800 border border-base-700 rounded-md px-3 py-2 text-gray-200" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Event Type</label>
                            <select value={eventType} onChange={e => setEventType(e.target.value as HederaEventType)} className="w-full bg-base-800 border border-base-700 rounded-md px-3 py-2 text-gray-200">
                                {Object.values(HederaEventType).map(type => <option key={type} value={type}>{type}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Summary / Notes</label>
                            <textarea value={summary} onChange={e => setSummary(e.target.value)} className="w-full bg-base-800 border border-base-700 rounded-md px-3 py-2 text-gray-200" rows={3} placeholder="e.g., Replaced spark plugs and ignition coils." required></textarea>
                        </div>
                        <button type="submit" disabled={isSubmitting} className="w-full bg-brand-blue text-white font-semibold py-2 rounded-md hover:bg-blue-600 transition-colors shadow-glow-blue disabled:bg-base-700">
                            {isSubmitting ? 'Submitting to Hedera...' : 'Log Event to Hedera'}
                        </button>
                    </form>
                    {submissionResult && (
                        <div className={`mt-4 p-3 rounded-md text-sm ${submissionResult.success ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'}`}>
                            {submissionResult.success ? (
                                <>
                                    <strong>Success!</strong> Transaction ID: <a href="#" className="underline font-mono break-all">{submissionResult.txId}</a>
                                </>
                            ) : (
                                <><strong>Error:</strong> {submissionResult.error}</>
                            )}
                        </div>
                    )}
                </div>

                {/* Recent Records */}
                <div className="lg:col-span-3 bg-black rounded-lg border border-brand-cyan/30 shadow-lg">
                    <div className="p-4 border-b border-brand-cyan/30">
                        <h2 className="text-lg font-semibold text-gray-100 font-display">Recent Immutable Records</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-base-700/50">
                            <thead className="bg-base-800/50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Timestamp</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Event</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Summary</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Verification</th>
                                </tr>
                            </thead>
                            <tbody className="bg-black divide-y divide-base-700/50">
                                {records.map(rec => (
                                    <tr key={rec.id} className="hover:bg-base-800/40">
                                        <td className="px-4 py-4 whitespace-nowrap text-sm font-mono text-gray-400">{rec.timestamp}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-200">{rec.eventType}</td>
                                        <td className="px-4 py-4 text-sm text-gray-300 max-w-xs truncate" title={rec.summary}>{rec.summary}</td>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            {verificationStatus[rec.id] === 'success' ? (
                                                 <span className="inline-flex items-center text-green-400">
                                                    <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                                                    Verified
                                                </span>
                                            ) : (
                                                <button onClick={() => handleVerify(rec.id)} disabled={verifyingRecordId === rec.id} className="bg-base-700 text-gray-200 px-3 py-1 text-xs font-semibold rounded-md hover:bg-base-600 disabled:opacity-50">
                                                    {verifyingRecordId === rec.id ? 'Verifying...' : 'Verify'}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Hedera;