'use client';

import { useState } from 'react';
import type { DataSource, DataSourceType } from '@/types';

interface SourceBadgeProps {
  source: DataSource;
  field: string;
  size?: 'sm' | 'md';
  showLabel?: boolean;
  className?: string;
}

/**
 * Data Source Badge Component
 *
 * Phase 4: 데이터 출처와 신뢰도를 시각적으로 표시
 *
 * 사용 예:
 * <SourceBadge source={product.dataSources.weight} field="Weight" />
 */
export default function SourceBadge({
  source,
  field,
  size = 'sm',
  showLabel = false,
  className = ''
}: SourceBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const { icon, label, color, bgColor, borderColor } = getSourceStyle(source.type);
  const confidenceLevel = getConfidenceLevel(source.confidence);

  const sizeClasses = size === 'sm'
    ? 'text-xs px-1.5 py-0.5 gap-1'
    : 'text-sm px-2 py-1 gap-1.5';

  return (
    <div className={`relative inline-flex ${className}`}>
      <button
        type="button"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(!showTooltip)}
        className={`
          inline-flex items-center rounded-full font-medium
          ${sizeClasses}
          ${bgColor} ${color} ${borderColor} border
          hover:opacity-80 transition-opacity cursor-help
        `}
        aria-label={`${field} source: ${label}`}
      >
        <i className={`fas ${icon}`}></i>
        {showLabel && <span>{label}</span>}
        <ConfidenceDot level={confidenceLevel} size={size} />
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div
          className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-56"
          role="tooltip"
        >
          <div className="bg-gray-900 text-white text-xs rounded-lg shadow-lg p-3">
            <div className="font-semibold mb-2">{field} Source</div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Type:</span>
                <span className={`font-medium ${color}`}>
                  <i className={`fas ${icon} mr-1`}></i>
                  {label}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-400">Confidence:</span>
                <span className={`font-medium ${confidenceLevel.color}`}>
                  {Math.round(source.confidence * 100)}%
                </span>
              </div>

              {source.detail && (
                <div className="pt-1 border-t border-gray-700">
                  <span className="text-gray-400 block mb-0.5">Detail:</span>
                  <span className="text-gray-200">{source.detail}</span>
                </div>
              )}

              {source.url && (
                <div className="pt-1 border-t border-gray-700">
                  <span className="text-gray-400 block mb-0.5">Source:</span>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline truncate block"
                  >
                    {new URL(source.url).hostname}
                  </a>
                </div>
              )}
            </div>

            {/* Arrow */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
              <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-gray-900"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Confidence Level Dot Indicator
 */
function ConfidenceDot({ level, size }: { level: ConfidenceLevel; size: 'sm' | 'md' }) {
  const dotSize = size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2';

  return (
    <span
      className={`${dotSize} rounded-full ${level.bgColor}`}
      title={`${level.label} confidence`}
    />
  );
}

interface ConfidenceLevel {
  label: string;
  color: string;
  bgColor: string;
}

function getConfidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= 0.8) {
    return { label: 'High', color: 'text-green-400', bgColor: 'bg-green-500' };
  } else if (confidence >= 0.5) {
    return { label: 'Medium', color: 'text-yellow-400', bgColor: 'bg-yellow-500' };
  } else {
    return { label: 'Low', color: 'text-red-400', bgColor: 'bg-red-500' };
  }
}

interface SourceStyle {
  icon: string;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

function getSourceStyle(type: DataSourceType): SourceStyle {
  const styles: Record<DataSourceType, SourceStyle> = {
    extracted: {
      icon: 'fa-check-circle',
      label: 'Extracted',
      color: 'text-green-700',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
    },
    estimated: {
      icon: 'fa-calculator',
      label: 'Estimated',
      color: 'text-amber-700',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
    },
    enriched: {
      icon: 'fa-search',
      label: 'Enriched',
      color: 'text-blue-700',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
    },
    classified: {
      icon: 'fa-tags',
      label: 'Classified',
      color: 'text-purple-700',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
    },
    vision: {
      icon: 'fa-eye',
      label: 'Vision',
      color: 'text-indigo-700',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-200',
    },
    manual: {
      icon: 'fa-user-edit',
      label: 'Manual',
      color: 'text-gray-700',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
    },
    api: {
      icon: 'fa-plug',
      label: 'API',
      color: 'text-cyan-700',
      bgColor: 'bg-cyan-50',
      borderColor: 'border-cyan-200',
    },
  };

  return styles[type] || styles.estimated;
}

/**
 * Compact Source Badge for inline display
 * Shows only icon with color based on confidence
 */
export function SourceBadgeCompact({
  source,
  className = ''
}: {
  source: DataSource;
  className?: string;
}) {
  const { icon } = getSourceStyle(source.type);
  const confidenceLevel = getConfidenceLevel(source.confidence);

  return (
    <span
      className={`inline-flex items-center ${confidenceLevel.color} ${className}`}
      title={`${source.type} (${Math.round(source.confidence * 100)}% confidence)`}
    >
      <i className={`fas ${icon} text-xs`}></i>
    </span>
  );
}

/**
 * Source Badge Group for displaying multiple sources
 */
export function SourceBadgeGroup({
  sources,
  className = ''
}: {
  sources: { field: string; source: DataSource }[];
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {sources.map(({ field, source }) => (
        <SourceBadge
          key={field}
          source={source}
          field={field}
          size="sm"
        />
      ))}
    </div>
  );
}
