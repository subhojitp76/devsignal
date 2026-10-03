import React from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function Toast() {
  const { toast } = useApp();

  if (!toast.show) return null;

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
    error: <AlertCircle className="w-5 h-5 text-rose-400" />,
    info: <Info className="w-5 h-5 text-sky-400" />
  };

  const bgStyles = {
    success: 'bg-emerald-950/90 border-emerald-500/40 text-emerald-100',
    error: 'bg-rose-950/90 border-rose-500/40 text-rose-100',
    info: 'bg-slate-900/90 border-sky-500/40 text-sky-100'
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '12px 18px',
      borderRadius: '10px',
      border: '1px solid',
      backdropFilter: 'blur(10px)',
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.6)',
      fontSize: '14px',
      maxWidth: '420px',
      animation: 'slideIn 0.2s ease-out'
    }} className={`no-print ${bgStyles[toast.type] || bgStyles.info}`}>
      {icons[toast.type] || icons.info}
      <span style={{ flex: 1, fontWeight: 500 }}>{toast.message}</span>
    </div>
  );
}
