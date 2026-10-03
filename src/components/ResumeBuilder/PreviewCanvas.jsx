import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import ModernTechTemplate from './Templates/ModernTechTemplate';
import TerminalSystemsTemplate from './Templates/TerminalSystemsTemplate';
import CleanAtsTemplate from './Templates/CleanAtsTemplate';
import { ZoomIn, ZoomOut, RotateCcw, Eye, Zap } from 'lucide-react';

export default function PreviewCanvas() {
  const { resumeData, updateResumeData, selectedTemplate, selectedColor, resumeDensity, setResumeDensity } = useApp();
  const [zoomLevel, setZoomLevel] = useState(0.95);
  const resumeRef = useRef(null);

  const [pageMetrics, setPageMetrics] = useState({
    pageCount: 1,
    isOverA4: false,
    scrollHeight: 0
  });

  const DENSITY_OPTIONS = [
    { id: 'compact', label: 'Compact', title: 'Optimized spacing & margins to fit onto a single A4 page' },
    { id: 'standard', label: 'Normal', title: 'Balanced professional spacing' },
    { id: 'relaxed', label: 'Spacious', title: 'Larger text and relaxed spacing (may span 2 pages)' }
  ];

  // Measure whether content overflows standard A4 height (297mm = 1122.52px at 96dpi)
  useEffect(() => {
    const el = resumeRef.current;
    if (!el) return;

    const checkHeight = () => {
      const A4_HEIGHT_PX = 1122.52;
      const h = el.scrollHeight;
      // Allow 4px tolerance for subpixel rounding
      const isOver = h > (A4_HEIGHT_PX + 4);
      const pages = isOver ? Math.max(2, Math.ceil(h / A4_HEIGHT_PX)) : 1;

      setPageMetrics({
        pageCount: pages,
        isOverA4: isOver,
        scrollHeight: h
      });
    };

    checkHeight();
    const observer = new ResizeObserver(checkHeight);
    observer.observe(el);
    return () => observer.disconnect();
  }, [resumeData, resumeDensity, selectedTemplate, selectedColor]);

  const renderTemplate = () => {
    switch (selectedTemplate) {
      case 'terminal_systems':
        return <TerminalSystemsTemplate resumeData={resumeData} accentColor={selectedColor} density={resumeDensity} />;
      case 'clean_ats':
        return <CleanAtsTemplate resumeData={resumeData} accentColor={selectedColor} density={resumeDensity} />;
      case 'modern_swe':
      default:
        return <ModernTechTemplate resumeData={resumeData} accentColor={selectedColor} density={resumeDensity} />;
    }
  };

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'rgba(15, 23, 42, 0.4)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden'
    }}>
      {/* Top Preview Controls Bar */}
      <div style={{
        padding: '10px 18px',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'rgba(9, 13, 22, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px'
      }} className="no-print">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Eye className="w-4 h-4 text-sky-400" />
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#f8fafc' }}>
            A4 Live Print Canvas
          </span>

          {/* Dynamic Page Count & Auto-Fit Badge */}
          {pageMetrics.isOverA4 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#fbbf24',
                background: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                padding: '2px 8px',
                borderRadius: '4px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                ⚠ {pageMetrics.pageCount} Pages (A4)
              </span>
              <button
                type="button"
                onClick={() => setResumeDensity('compact')}
                style={{
                  fontSize: '10.5px',
                  fontWeight: 700,
                  padding: '2px 9px',
                  borderRadius: '4px',
                  background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
                  color: '#090d16',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  boxShadow: '0 2px 6px rgba(2, 132, 199, 0.3)'
                }}
                title="Automatically adjust spacing to fit your resume onto 1 page"
              >
                <Zap className="w-3 h-3" />
                Auto-Fit to 1 Page
              </button>
            </div>
          ) : (
            <span style={{
              fontSize: '11px',
              fontWeight: 600,
              color: '#34d399',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              padding: '2px 8px',
              borderRadius: '4px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              ✓ 1 Page (A4 Fit)
            </span>
          )}

          <span className="badge badge-cyan" style={{ fontSize: '10px' }}>
            100% Vector PDF Safe
          </span>
        </div>

        {/* Density / Spacing Control */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Spacing:</span>
          <div style={{ display: 'flex', background: 'rgba(15, 23, 42, 0.8)', padding: '2px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
            {DENSITY_OPTIONS.map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setResumeDensity(opt.id)}
                title={opt.title}
                style={{
                  padding: '3px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 600,
                  background: resumeDensity === opt.id ? 'var(--accent-primary)' : 'transparent',
                  color: resumeDensity === opt.id ? '#090d16' : 'var(--text-secondary)',
                  transition: 'all 0.15s ease'
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Bottom Section Layout (2-Col vs Stacked) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Bottom:</span>
          <div style={{ display: 'flex', background: 'rgba(15, 23, 42, 0.8)', padding: '2px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
            <button
              type="button"
              onClick={() => updateResumeData(prev => ({ ...prev, bottomLayout: 'grid' }))}
              title="Side-by-Side 2-column layout (ideal for 1-page fit)"
              style={{
                padding: '3px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 600,
                background: (resumeData.bottomLayout || 'grid') === 'grid' ? 'var(--accent-primary)' : 'transparent',
                color: (resumeData.bottomLayout || 'grid') === 'grid' ? '#090d16' : 'var(--text-secondary)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              2-Col Grid
            </button>
            <button
              type="button"
              onClick={() => updateResumeData(prev => ({ ...prev, bottomLayout: 'stacked' }))}
              title="Full-width stacked layout for Education & Certifications"
              style={{
                padding: '3px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 600,
                background: (resumeData.bottomLayout || 'grid') === 'stacked' ? 'var(--accent-primary)' : 'transparent',
                color: (resumeData.bottomLayout || 'grid') === 'stacked' ? '#090d16' : 'var(--text-secondary)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              Stacked
            </button>
          </div>
        </div>

        {/* Zoom Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            onClick={() => setZoomLevel(prev => Math.max(0.65, prev - 0.1))}
            style={{ padding: '4px 8px', borderRadius: 'var(--radius-sm)', background: 'rgba(30, 41, 59, 0.6)', color: 'var(--text-secondary)' }}
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', minWidth: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoomLevel(prev => Math.min(1.3, prev + 0.1))}
            style={{ padding: '4px 8px', borderRadius: 'var(--radius-sm)', background: 'rgba(30, 41, 59, 0.6)', color: 'var(--text-secondary)' }}
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoomLevel(0.95)}
            style={{ padding: '4px 8px', borderRadius: 'var(--radius-sm)', background: 'rgba(30, 41, 59, 0.6)', color: 'var(--text-secondary)' }}
            title="Reset Zoom"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Canvas Viewport */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '32px 20px 80px 20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: '#090d16'
      }}>
        {/* Printable Resume Container */}
        <div
          ref={resumeRef}
          id="printable-resume"
          className={`density-${resumeDensity}`}
          style={{
            position: 'relative',
            width: '210mm',
            minHeight: '297mm',
            height: 'auto',
            flexShrink: 0,
            background: '#ffffff',
            color: '#1e293b',
            padding: resumeDensity === 'compact' ? '8mm 12mm' : resumeDensity === 'relaxed' ? '15mm 18mm' : '10mm 14mm',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
            borderRadius: '2px',
            transform: `scale(${zoomLevel})`,
            transformOrigin: 'top center',
            transition: 'transform 0.15s ease-out, padding 0.15s ease-out',
            boxSizing: 'border-box'
          }}
        >
          {renderTemplate()}

          {/* Visual Page 1 Divider if content exceeds A4 */}
          {pageMetrics.isOverA4 && (
            <div
              className="no-print"
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: '297mm',
                borderTop: '2px dashed #f59e0b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
                zIndex: 20
              }}
            >
              <span style={{
                background: '#f59e0b',
                color: '#090d16',
                fontSize: '10px',
                fontWeight: 700,
                padding: '3px 12px',
                borderRadius: '12px',
                transform: 'translateY(-50%)',
                letterSpacing: '0.4px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
              }}>
                ✂ Page 1 End (297mm A4) • Page 2 Starts Below
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
