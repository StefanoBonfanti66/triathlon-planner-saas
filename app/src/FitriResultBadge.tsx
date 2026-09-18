import React, { useState } from 'react';
import { Trophy, Timer, ChevronDown } from 'lucide-react';
import { FitriResult } from './fitri';

interface FitriResultBadgeProps {
  result?: FitriResult | null;
  accentColor?: string;
  className?: string;
}

const FitriResultBadge: React.FC<FitriResultBadgeProps> = ({ result, accentColor = '#2563eb', className = '' }) => {
  const [open, setOpen] = useState(false);
  if (!result) return null;

  return (
    <div className={`relative ${className}`}>
      <div className="flex flex-wrap items-center gap-1.5">
        <span
          className="inline-flex items-center gap-1 text-[9px] font-black text-white px-2 py-1 rounded-md uppercase tracking-widest"
          style={{ backgroundColor: accentColor }}
          title={`Posizione ${result.posizione}° della distanza ${result.distanza.replace(/^Triathlon\./, '')}`}
        >
          <Trophy className="w-3 h-3" /> {result.posizione}°
        </span>
        {result.posizione_categoria > 0 && (
          <span className="inline-flex items-center gap-1 text-[9px] font-black text-slate-700 bg-slate-200/70 px-2 py-1 rounded-md uppercase tracking-widest" title={`Posizione di categoria ${result.posizione_categoria}° (${result.categoria})`}>
            {result.posizione_categoria}° cat
          </span>
        )}
        <span className="inline-flex items-center gap-1 text-[9px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-md uppercase tracking-widest" title="Tempo totale ufficiale">
          <Timer className="w-3 h-3" /> {result.tempo}
        </span>
        {result.splits.length > 0 && (
          <button
            onClick={() => setOpen(o => !o)}
            className={`inline-flex items-center gap-0.5 text-[9px] font-black text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-1 rounded-md uppercase tracking-widest hover:bg-slate-200 transition-colors ${open ? 'bg-slate-200' : ''}`}
            title="Mostra/nascondi le frazioni"
          >
            <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
            Fraz.
          </button>
        )}
      </div>
      {open && result.splits.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {result.splits.map(s => (
            <span key={s.name} className="inline-flex items-center gap-1 text-[9px] font-bold text-slate-600 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
              <span className="text-slate-400 font-black">{s.name}</span>
              <span className="font-black">{s.value}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default FitriResultBadge;