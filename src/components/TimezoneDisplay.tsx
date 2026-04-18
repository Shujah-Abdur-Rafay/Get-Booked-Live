import { useMemo } from "react";
import { Clock } from "lucide-react";

type Props = {
  utcTime: string; // HH:mm or full ISO
  date: string; // YYYY-MM-DD
  timezone1?: string;
  timezone2?: string;
  label?: string;
  className?: string;
};

function formatTimeInZone(date: string, time: string, tz: string): string {
  try {
    const iso = time.includes("T") ? time : `${date}T${time}:00`;
    const d = new Date(iso);
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: tz,
      timeZoneName: "short",
    });
  } catch {
    return time;
  }
}

function getShortTz(tz: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "short" }).formatToParts(new Date());
    return parts.find((p) => p.type === "timeZoneName")?.value ?? tz;
  } catch {
    return tz;
  }
}

export default function TimezoneDisplay({ utcTime, date, timezone1, timezone2, label, className }: Props) {
  const display = useMemo(() => {
    if (!utcTime) return null;
    const tz1 = timezone1 ?? "America/New_York";
    const tz2 = timezone2;

    const t1 = formatTimeInZone(date, utcTime, tz1);
    const t2 = tz2 && tz2 !== tz1 ? formatTimeInZone(date, utcTime, tz2) : null;

    return { t1, t2 };
  }, [utcTime, date, timezone1, timezone2]);

  if (!display) return null;

  return (
    <span className={`inline-flex items-center gap-1 text-xs ${className ?? ""}`}>
      <Clock className="w-3 h-3 text-muted-foreground" />
      {label && <span className="text-muted-foreground">{label}:</span>}
      <span className="font-medium">{display.t1}</span>
      {display.t2 && (
        <>
          <span className="text-muted-foreground">/</span>
          <span className="font-medium">{display.t2}</span>
        </>
      )}
    </span>
  );
}

export { formatTimeInZone, getShortTz };
