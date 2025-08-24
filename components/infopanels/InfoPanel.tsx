
import React from 'react';

interface InfoPanelProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

const InfoPanel: React.FC<InfoPanelProps> = ({ title, children, className }) => {
  return (
    <div 
        className={`h-full w-full p-4 flex flex-col rounded-2xl bg-[var(--theme-panel-bg)] border border-[var(--theme-panel-border)] shadow-lg backdrop-blur-sm ${className}`}
        style={{ boxShadow: '0 0 15px rgba(200, 200, 200, 0.05)'}}
    >
      <h3 
        className="font-sans text-sm font-bold uppercase tracking-widest text-left text-[var(--theme-text-secondary)]"
        style={{ textShadow: '0 0 5px rgba(255,255,255,0.5)' }}
      >
          {title}
      </h3>
      <div className="flex-grow relative">
        {children}
      </div>
    </div>
  );
};

export default InfoPanel;
