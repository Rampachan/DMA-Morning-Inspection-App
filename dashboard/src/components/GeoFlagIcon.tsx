interface GeoFlagIconProps {
  /** Additional CSS classes */
  className?: string;
}

/**
 * Small visual indicator shown when a submission has geo_flagged = true.
 * Shows a tooltip on hover.
 */
export default function GeoFlagIcon({ className = '' }: GeoFlagIconProps) {
  return (
    <span
      title="Photo location flagged — coordinates outside expected ULB boundary"
      className={`inline-flex items-center cursor-help ${className}`}
      aria-label="Geo-location flagged"
    >
      <span className="text-base leading-none">📍⚠️</span>
    </span>
  );
}
