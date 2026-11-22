import React, { useState } from 'react';
import { Scissors } from 'lucide-react';

const detectPaperFormat = (widthPt, heightPt) => {
  if (!widthPt || !heightPt) return 'Custom';
  const min = Math.min(widthPt, heightPt);
  const max = Math.max(widthPt, heightPt);
  const isLandscape = widthPt > heightPt;
  let name = 'Custom';
  if (Math.abs(min - 595.3) < 10 && Math.abs(max - 841.9) < 10) name = 'A4';
  else if (Math.abs(min - 612) < 10 && Math.abs(max - 792) < 10) name = 'Letter';
  else if (Math.abs(min - 612) < 10 && Math.abs(max - 1008) < 10) name = 'Legal';
  else if (Math.abs(min - 841.9) < 10 && Math.abs(max - 1190.6) < 10) name = 'A3';
  else if (Math.abs(min - 419.5) < 10 && Math.abs(max - 595.3) < 10) name = 'A5';
  else if (Math.abs(min - 792) < 10 && Math.abs(max - 1224) < 10) name = 'Tabloid';
  return isLandscape ? `${name} (L)` : name;
};

const formatDim = (pt, unit = 'mm') => {
  if (!pt && pt !== 0) return '0';
  if (unit === 'in') return `${(pt / 72).toFixed(2)} in`;
  if (unit === 'pt') return `${Math.round(pt)} pt`;
  return `${(pt * 25.4 / 72).toFixed(1)} mm`;
};

const PageDimensionAxis = ({
  widthPt = 595,
  heightPt = 842,
  children,
  mode = 'default', // 'split' | 'crop' | 'default'
  splitDirection = 'vertical', // 'vertical' | 'horizontal'
  splitRatio = 0.5,
  cutBands = [],
  className = '',
}) => {
  const [unit, setUnit] = useState('mm'); // 'mm' | 'pt' | 'in'

  const toggleUnit = (e) => {
    e.stopPropagation();
    setUnit(current => (current === 'mm' ? 'pt' : current === 'pt' ? 'in' : 'mm'));
  };

  const paperFormat = detectPaperFormat(widthPt, heightPt);
  const widthFormatted = formatDim(widthPt, unit);
  const widthAlt = unit === 'mm' ? `${Math.round(widthPt)} pt` : `${(widthPt * 25.4 / 72).toFixed(0)} mm`;

  // Split-specific calculations
  const isSplitVertical = mode === 'split' && splitDirection === 'vertical';
  const isSplitHorizontal = mode === 'split' && splitDirection === 'horizontal';
  const part1WidthPt = widthPt * splitRatio;
  const part2WidthPt = widthPt * (1 - splitRatio);
  const part1HeightPt = heightPt * splitRatio;
  const part2HeightPt = heightPt * (1 - splitRatio);

  // Crop-specific calculations
  const totalCutFraction = mode === 'crop' && cutBands.length > 0
    ? cutBands.reduce((sum, b) => sum + Math.max(0, b.height || 0), 0)
    : 0;
  const remainingFraction = Math.max(0, 1 - totalCutFraction);
  const remainingHeightPt = heightPt * remainingFraction;

  // Active displayed height (reflects real-time remaining height when cuts are drawn or pending)
  const isCropWithCuts = mode === 'crop' && totalCutFraction > 0.001;
  const displayHeightPt = isCropWithCuts ? remainingHeightPt : heightPt;
  const heightFormatted = formatDim(displayHeightPt, unit);
  const heightAlt = unit === 'mm' ? `${Math.round(displayHeightPt)} pt` : `${(displayHeightPt * 25.4 / 72).toFixed(0)} mm`;
  const cutAmountFormatted = formatDim(heightPt * totalCutFraction, unit);

  return (
    <div className={`pdf-axis-frame ${className}`}>
      {/* Top Bar: (0,0) Corner Box + X-Axis */}
      <div className="pdf-axis-header-row">
        <button
          type="button"
          className="pdf-axis-corner-box"
          onClick={toggleUnit}
          title={`Click to switch unit: current ${unit.toUpperCase()} (A4/Letter detected: ${paperFormat})`}
        >
          <span className="pdf-axis-corner-coords">(0, 0)</span>
          <span className="pdf-axis-corner-badge">{paperFormat}</span>
          <span className="pdf-axis-unit-switch">{unit.toUpperCase()} ▾</span>
        </button>

        <div className="pdf-axis-x-track">
          {/* Main Dimension Line with Dual Arrowheads */}
          <div className="pdf-axis-dim-line horizontal">
            <span className="pdf-axis-arrow">◀</span>
            <div className="pdf-axis-tag horizontal">
              <span className="pdf-axis-primary-val">X: {widthFormatted}</span>
              <span className="pdf-axis-sec-val">({widthAlt})</span>
            </div>
            <span className="pdf-axis-arrow">▶</span>
          </div>

          {/* Sub Tick Marks */}
          <div className="pdf-axis-ticks-row">
            <span className="pdf-axis-tick-mark tick-0" style={{ left: '0%' }}>
              <span className="pdf-axis-tick-line" />
              <span className="pdf-axis-tick-num">0</span>
            </span>
            <span className="pdf-axis-tick-mark tick-25" style={{ left: '25%' }}>
              <span className="pdf-axis-tick-line" />
              <span className="pdf-axis-tick-num">25%</span>
            </span>
            <span className="pdf-axis-tick-mark tick-50" style={{ left: '50%' }}>
              <span className="pdf-axis-tick-line major" />
              <span className="pdf-axis-tick-num major">50%</span>
            </span>
            <span className="pdf-axis-tick-mark tick-75" style={{ left: '75%' }}>
              <span className="pdf-axis-tick-line" />
              <span className="pdf-axis-tick-num">75%</span>
            </span>
            <span className="pdf-axis-tick-mark tick-100" style={{ left: '100%' }}>
              <span className="pdf-axis-tick-line" />
              <span className="pdf-axis-tick-num">{formatDim(widthPt, unit)}</span>
            </span>
          </div>

          {/* Split indicator on X-Axis */}
          {isSplitVertical && (
            <div className="pdf-axis-split-pin horizontal" style={{ left: `${splitRatio * 100}%` }}>
              <div className="pdf-axis-split-pin-bubble">
                <Scissors size={11} />
                <span>P1: {formatDim(part1WidthPt, unit)} | P2: {formatDim(part2WidthPt, unit)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Middle Row: Y-Axis + Center Canvas */}
      <div className="pdf-axis-body-row">
        <div className="pdf-axis-y-track">
          {/* Main Dimension Line with Dual Arrowheads */}
          <div className="pdf-axis-dim-line vertical">
            <span className="pdf-axis-arrow">▲</span>
            <div className="pdf-axis-tag vertical">
              <span className="pdf-axis-primary-val">Y: {heightFormatted}</span>
              {isCropWithCuts ? (
                <span className="pdf-axis-cut-indicator">✂ -{cutAmountFormatted}</span>
              ) : (
                <span className="pdf-axis-sec-val">({heightAlt})</span>
              )}
            </div>
            <span className="pdf-axis-arrow">▼</span>
          </div>

          {/* Sub Tick Marks */}
          <div className="pdf-axis-ticks-col">
            <span className="pdf-axis-tick-mark-y tick-0" style={{ top: '0%' }}>
              <span className="pdf-axis-tick-line-y" />
              <span className="pdf-axis-tick-num-y">0</span>
            </span>
            <span className="pdf-axis-tick-mark-y tick-25" style={{ top: '25%' }}>
              <span className="pdf-axis-tick-line-y" />
              <span className="pdf-axis-tick-num-y">25%</span>
            </span>
            <span className="pdf-axis-tick-mark-y tick-50" style={{ top: '50%' }}>
              <span className="pdf-axis-tick-line-y major" />
              <span className="pdf-axis-tick-num-y major">50%</span>
            </span>
            <span className="pdf-axis-tick-mark-y tick-75" style={{ top: '75%' }}>
              <span className="pdf-axis-tick-line-y" />
              <span className="pdf-axis-tick-num-y">75%</span>
            </span>
            <span className="pdf-axis-tick-mark-y tick-100" style={{ top: '100%' }}>
              <span className="pdf-axis-tick-line-y" />
              <span className="pdf-axis-tick-num-y">{heightFormatted}</span>
            </span>
          </div>

          {/* Split indicator on Y-Axis */}
          {isSplitHorizontal && (
            <div className="pdf-axis-split-pin vertical" style={{ top: `${splitRatio * 100}%` }}>
              <div className="pdf-axis-split-pin-bubble vertical">
                <Scissors size={11} />
                <span>Top: {formatDim(part1HeightPt, unit)} | Btm: {formatDim(part2HeightPt, unit)}</span>
              </div>
            </div>
          )}

          {/* Crop Cut Markers on Y-Axis */}
          {mode === 'crop' && cutBands.map((band) => {
            if (!band.height || band.height < 0.005) return null;
            const bandHeightPt = heightPt * band.height;
            return (
              <div
                key={band.id}
                className="pdf-axis-crop-zone"
                style={{
                  top: `${band.y * 100}%`,
                  height: `${band.height * 100}%`,
                }}
                title={`Cutting out ${(band.height * 100).toFixed(1)}% (${formatDim(bandHeightPt, unit)})`}
              >
                <div className="pdf-axis-crop-zone-label">
                  <Scissors size={10} />
                  <span>-{formatDim(bandHeightPt, unit)}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* The child canvas/content */}
        <div className="pdf-axis-content-slot">
          {children}
        </div>
      </div>

      {/* Bottom Summary Bar */}
      <div className="pdf-axis-footer-bar">
        <div className="pdf-axis-footer-left">
          <span className="pdf-axis-footer-chip">
            <strong>Size:</strong> {widthFormatted} × {heightFormatted}
          </span>
          <span className="pdf-axis-footer-chip subtle">
            {paperFormat} · {Math.round(widthPt)} × {Math.round(heightPt)} pt
          </span>
        </div>

        <div className="pdf-axis-footer-right">
          {mode === 'split' && (
            <span className="pdf-axis-footer-result-badge split">
              {isSplitVertical
                ? `Part 1: ${formatDim(part1WidthPt, unit)} × ${heightFormatted}  |  Part 2: ${formatDim(part2WidthPt, unit)} × ${heightFormatted}`
                : `Part 1: ${widthFormatted} × ${formatDim(part1HeightPt, unit)}  |  Part 2: ${widthFormatted} × ${formatDim(part2HeightPt, unit)}`}
            </span>
          )}

          {mode === 'crop' && (
            <span className={`pdf-axis-footer-result-badge crop ${totalCutFraction > 0 ? 'has-cuts' : ''}`}>
              {totalCutFraction > 0
                ? `✂ Cut: -${cutAmountFormatted} (-${(totalCutFraction * 100).toFixed(1)}%) ➔ Remaining: ${widthFormatted} × ${heightFormatted}`
                : `Current Size: ${widthFormatted} × ${heightFormatted}`}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default PageDimensionAxis;
