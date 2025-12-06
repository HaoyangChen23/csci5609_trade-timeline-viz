/**
 * Unified professional chart styling system
 * Provides consistent colors, typography, and spacing across all D3 charts
 */

export const chartColors = {
  // Primary data series colors
  primary: {
    blue: '#2563eb',      // Modern blue
    teal: '#0d9488',     // Teal
    indigo: '#6366f1',    // Indigo
    purple: '#7c3aed',   // Purple
  },
  
  // Secondary/accent colors
  secondary: {
    orange: '#f97316',   // Orange
    pink: '#ec4899',     // Pink
    green: '#10b981',    // Green
    amber: '#f59e0b',    // Amber
  },
  
  // Semantic colors
  semantic: {
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#3b82f6',
  },
  
  // Neutral colors
  neutral: {
    gray50: '#f9fafb',
    gray100: '#f3f4f6',
    gray200: '#e5e7eb',
    gray300: '#d1d5db',
    gray400: '#9ca3af',
    gray500: '#6b7280',
    gray600: '#4b5563',
    gray700: '#374151',
    gray800: '#1f2937',
    gray900: '#111827',
  },
  
  // Chart-specific color palettes
  palettes: {
    tariff: {
      chineseUS: '#ef4444',      // Red for Chinese → US
      usChinese: '#3b82f6',      // Blue for US → Chinese
      chineseROW: '#f59e0b',     // Amber for Chinese → ROW
      usROW: '#ec4899',          // Pink for US → ROW
      // Legacy names for compatibility
      chinese_us: '#ef4444',
      us_chinese: '#3b82f6',
      chinese_row: '#f59e0b',
      us_row: '#ec4899',
    },
    ports: {
      longBeach: '#2563eb',      // Blue
      losAngeles: '#0d9488',     // Teal
      nyNj: '#6366f1',           // Indigo
    },
    inflation: {
      importPrice: '#10b981',    // Green
      inflationRate: '#3b82f6',  // Blue
      corePCE: '#f97316',        // Orange
    },
  },
};

export const chartTypography = {
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
  fontSize: {
    xs: '11px',
    sm: '12px',
    base: '13px',
    md: '14px',
    lg: '16px',
    xl: '18px',
    '2xl': '20px',
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
};

export const chartSpacing = {
  margin: {
    top: 50,
    right: 140,
    bottom: 70,
    left: 90,
  },
  padding: {
    tooltip: { x: 12, y: 10 },
    legend: { x: 20, y: 15 },
  },
};

export const chartStyles = {
  // Line styles
  line: {
    strokeWidth: 3,
    strokeWidthThick: 3.5,
    strokeWidthThin: 2.5,
    strokeDasharray: {
      solid: 'none',
      dashed: '5,5',
      dotted: '2,4',
    },
    transition: {
      duration: 150,
      ease: 'easeLinear',
    },
  },
  
  // Point/circle styles
  point: {
    radius: 5,
    radiusHover: 7,
    strokeWidth: 2,
    strokeColor: '#ffffff',
  },
  
  // Axis styles
  axis: {
    strokeWidth: 1.5,
    strokeColor: chartColors.neutral.gray300,
    tickSize: 6,
    tickLineColor: chartColors.neutral.gray400,
    labelFontSize: chartTypography.fontSize.base,
    labelFontWeight: chartTypography.fontWeight.semibold,
    labelColor: chartColors.neutral.gray700,
    tickFontSize: chartTypography.fontSize.sm,
    tickColor: chartColors.neutral.gray600,
  },
  
  // Grid styles
  grid: {
    strokeWidth: 1,
    strokeColor: chartColors.neutral.gray200,
    strokeDasharray: '3,3',
    opacity: 0.6,
  },
  
  // Tooltip styles
  tooltip: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderColor: chartColors.neutral.gray300,
    borderRadius: '8px',
    padding: `${chartSpacing.padding.tooltip.y}px ${chartSpacing.padding.tooltip.x}px`,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    fontSize: chartTypography.fontSize.sm,
    fontFamily: chartTypography.fontFamily,
    minWidth: '140px',
  },
  
  // Legend styles
  legend: {
    fontSize: chartTypography.fontSize.sm,
    fontFamily: chartTypography.fontFamily,
    itemHeight: 22,
    itemSpacing: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderColor: chartColors.neutral.gray200,
    borderRadius: '6px',
    padding: `${chartSpacing.padding.legend.y}px ${chartSpacing.padding.legend.x}px`,
  },
};

// Helper function to create smooth transitions
export function createTransition(selection: any, duration: number = chartStyles.line.transition.duration) {
  return selection
    .transition()
    .duration(duration)
    .ease(d3.easeLinear);
}

// Import d3 for ease function
import * as d3 from 'd3';

