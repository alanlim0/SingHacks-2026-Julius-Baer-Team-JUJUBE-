import React from "react";
import { Shield, AlertTriangle, CheckCircle2, TrendingUp } from "lucide-react";

interface ClientRiskGaugeProps {
  score: number; // 1 to 10
  riskProfile: string; // e.g., "Balanced Growth", "Conservative", etc.
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

/**
 * Semi-circle visual Risk Meter for Client Risk Profile & Tolerance
 */
export const ClientRiskGauge: React.FC<ClientRiskGaugeProps> = ({
  score,
  riskProfile,
  size = "md",
  showLabel = true,
}) => {
  // Normalize score to 0 - 100%
  const clampedScore = Math.max(1, Math.min(10, score));
  const pct = (clampedScore - 1) / 9; // 0 to 1
  const rotationAngle = -90 + pct * 180; // -90 to +90 degrees

  // Visual dimensions
  const dims = {
    sm: { width: 90, height: 50, stroke: 7, radius: 36, cx: 45, cy: 45 },
    md: { width: 140, height: 80, stroke: 10, radius: 55, cx: 70, cy: 70 },
    lg: { width: 180, height: 100, stroke: 12, radius: 72, cx: 90, cy: 90 },
  }[size];

  // Color selection based on risk profile/score
  const getRiskColor = (s: number) => {
    if (s <= 3) return "#2D8A39"; // Conservative (Green)
    if (s <= 6) return "#C5A059"; // Moderate (Gold)
    if (s <= 8) return "#D97706"; // Growth (Amber)
    return "#DC2626"; // Dynamic / Aggressive (Red)
  };

  const activeColor = getRiskColor(clampedScore);

  return (
    <div className="flex flex-col items-center select-none">
      <div className="relative" style={{ width: dims.width, height: dims.height }}>
        <svg
          width={dims.width}
          height={dims.height + 5}
          viewBox={`0 0 ${dims.width} ${dims.height + 5}`}
          className="overflow-visible"
        >
          <defs>
            <linearGradient id="riskMeterGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#2D8A39" />
              <stop offset="35%" stopColor="#C5A059" />
              <stop offset="70%" stopColor="#D97706" />
              <stop offset="100%" stopColor="#DC2626" />
            </linearGradient>
          </defs>

          {/* Background Arc */}
          <path
            d={`M ${dims.cx - dims.radius} ${dims.cy} A ${dims.radius} ${dims.radius} 0 0 1 ${
              dims.cx + dims.radius
            } ${dims.cy}`}
            fill="none"
            stroke="#E5E5E1"
            strokeWidth={dims.stroke}
            strokeLinecap="round"
          />

          {/* Colored Gradient Arc */}
          <path
            d={`M ${dims.cx - dims.radius} ${dims.cy} A ${dims.radius} ${dims.radius} 0 0 1 ${
              dims.cx + dims.radius
            } ${dims.cy}`}
            fill="none"
            stroke="url(#riskMeterGrad)"
            strokeWidth={dims.stroke - 2}
            strokeLinecap="round"
            opacity="0.85"
          />

          {/* Center Pivot Point */}
          <circle cx={dims.cx} cy={dims.cy} r={size === "sm" ? 3 : 4} fill="#1A1A1A" />

          {/* Needle */}
          <g transform={`rotate(${rotationAngle}, ${dims.cx}, ${dims.cy})`}>
            <line
              x1={dims.cx}
              y1={dims.cy}
              x2={dims.cx}
              y2={dims.cy - dims.radius + (size === "sm" ? 3 : 5)}
              stroke="#1A1A1A"
              strokeWidth={size === "sm" ? 2 : 2.5}
              strokeLinecap="round"
            />
            <circle
              cx={dims.cx}
              cy={dims.cy - dims.radius + (size === "sm" ? 3 : 5)}
              r={size === "sm" ? 2 : 3}
              fill={activeColor}
            />
          </g>
        </svg>

        {/* Floating Value pill */}
        <div
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-sm bg-white border border-[#E5E5E1] shadow-2xs text-[10px] font-mono font-bold leading-none"
          style={{ color: activeColor }}
        >
          {(score ?? 0).toFixed(1)}/10
        </div>
      </div>

      {showLabel && (
        <div className="mt-2 text-center">
          <span
            className="text-[10px] font-semibold uppercase tracking-wider block"
            style={{ color: activeColor }}
          >
            {riskProfile}
          </span>
          <span className="text-[9px] text-[#70706B]">Risk Profile</span>
        </div>
      )}
    </div>
  );
};

interface LombardLtvMeterProps {
  currentLtv: number; // e.g. 68.5%
  marginCallThreshold: number; // e.g. 75%
  size?: "sm" | "md";
  headroomUsd?: number;
}

/**
 * Semi-circle visual Risk Meter for Lombard Credit Facility & LTV
 */
export const LombardLtvMeter: React.FC<LombardLtvMeterProps> = ({
  currentLtv,
  marginCallThreshold,
  size = "md",
  headroomUsd,
}) => {
  // Cap at 100%
  const clampedLtv = Math.max(0, Math.min(100, currentLtv));
  const pct = clampedLtv / 100;
  const rotationAngle = -90 + pct * 180;

  const thresholdPct = Math.min(100, marginCallThreshold) / 100;
  const thresholdAngle = -90 + thresholdPct * 180;

  const isMarginBreach = currentLtv >= marginCallThreshold;
  const isWarning = currentLtv >= marginCallThreshold - 10;

  const statusColor = isMarginBreach ? "#DC2626" : isWarning ? "#D97706" : "#2D8A39";

  const dims = size === "sm"
    ? { width: 90, height: 50, stroke: 7, radius: 36, cx: 45, cy: 45 }
    : { width: 130, height: 75, stroke: 9, radius: 52, cx: 65, cy: 65 };

  return (
    <div className="flex flex-col items-center select-none">
      <div className="relative" style={{ width: dims.width, height: dims.height }}>
        <svg
          width={dims.width}
          height={dims.height + 5}
          viewBox={`0 0 ${dims.width} ${dims.height + 5}`}
          className="overflow-visible"
        >
          {/* Background Arc */}
          <path
            d={`M ${dims.cx - dims.radius} ${dims.cy} A ${dims.radius} ${dims.radius} 0 0 1 ${
              dims.cx + dims.radius
            } ${dims.cy}`}
            fill="none"
            stroke="#F0F0EE"
            strokeWidth={dims.stroke}
            strokeLinecap="round"
          />

          {/* Safe Zone Arc (Green) */}
          <path
            d={`M ${dims.cx - dims.radius} ${dims.cy} A ${dims.radius} ${dims.radius} 0 0 1 ${
              dims.cx
            } ${dims.cy - dims.radius}`}
            fill="none"
            stroke="#CEEAD6"
            strokeWidth={dims.stroke}
          />

          {/* Warning / Call Zone Arc (Amber to Red) */}
          <path
            d={`M ${dims.cx} ${dims.cy - dims.radius} A ${dims.radius} ${dims.radius} 0 0 1 ${
              dims.cx + dims.radius
            } ${dims.cy}`}
            fill="none"
            stroke="#FECACA"
            strokeWidth={dims.stroke}
            strokeLinecap="round"
          />

          {/* Margin Call Threshold Tick */}
          <g transform={`rotate(${thresholdAngle}, ${dims.cx}, ${dims.cy})`}>
            <line
              x1={dims.cx}
              y1={dims.cy - dims.radius - 2}
              x2={dims.cx}
              y2={dims.cy - dims.radius + dims.stroke + 2}
              stroke="#B91C1C"
              strokeWidth="2"
            />
          </g>

          {/* Needle */}
          <g transform={`rotate(${rotationAngle}, ${dims.cx}, ${dims.cy})`}>
            <line
              x1={dims.cx}
              y1={dims.cy}
              x2={dims.cx}
              y2={dims.cy - dims.radius + (size === "sm" ? 3 : 5)}
              stroke="#1A1A1A"
              strokeWidth={size === "sm" ? 2 : 2.5}
              strokeLinecap="round"
            />
            <circle
              cx={dims.cx}
              cy={dims.cy - dims.radius + (size === "sm" ? 3 : 5)}
              r={size === "sm" ? 2 : 3}
              fill={statusColor}
            />
          </g>

          {/* Center Pivot */}
          <circle cx={dims.cx} cy={dims.cy} r={size === "sm" ? 3 : 4} fill="#1A1A1A" />
        </svg>

        {/* Floating LTV pill */}
        <div
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-sm bg-white border border-[#E5E5E1] shadow-2xs text-[10px] font-mono font-bold leading-none whitespace-nowrap"
          style={{ color: statusColor }}
        >
          {(currentLtv ?? 0).toFixed(1)}% LTV
        </div>
      </div>

      <div className="mt-2 text-center">
        <div className="flex items-center justify-center space-x-1">
          {isMarginBreach ? (
            <span className="text-[10px] font-bold text-[#DC2626] uppercase tracking-wider">
              Margin Call
            </span>
          ) : isWarning ? (
            <span className="text-[10px] font-bold text-[#D97706] uppercase tracking-wider">
              Buffer Warning
            </span>
          ) : (
            <span className="text-[10px] font-semibold text-[#2D8A39] uppercase tracking-wider">
              Safe Buffer
            </span>
          )}
        </div>
        {headroomUsd !== undefined && headroomUsd !== null && (
          <span className="text-[9px] font-mono text-[#70706B] block">
            Headroom: ${(headroomUsd / 1e6).toFixed(2)}M
          </span>
        )}
      </div>
    </div>
  );
};

interface CompactRiskBarProps {
  score: number;
  profile: string;
}

/**
 * Compact visual horizontal bar meter for table rows or dense cards
 */
export const CompactRiskBar: React.FC<CompactRiskBarProps> = ({ score, profile }) => {
  const safeScore = score ?? 0;
  const pct = Math.min(100, Math.max(10, (safeScore / 10) * 100));
  const color =
    safeScore <= 3 ? "#2D8A39" : safeScore <= 6 ? "#C5A059" : safeScore <= 8 ? "#D97706" : "#DC2626";

  return (
    <div className="w-24">
      <div className="flex items-center justify-between text-[9px] mb-0.5">
        <span className="font-semibold text-[#1A1A1A] truncate">{profile}</span>
        <span className="font-mono text-[#70706B]">{safeScore.toFixed(1)}</span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-[#E5E5E1] overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
};
