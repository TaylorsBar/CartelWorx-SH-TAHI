
import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  className?: string;
  children?: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, unit, className, children }) => {
  return (
    <div className={`bg-black p-4 rounded-lg shadow-lg border border-brand-cyan/50 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-400">{title}</h3>
        {children}
      </div>
      <div>
        <span className="text-2xl md:text-3xl font-bold text-gray-100 font-display">{value}</span>
        {unit && <span className="ml-1 text-base text-gray-400">{unit}</span>}
      </div>
    </div>
  );
};

export default StatCard;
