"use client";

import { useEffect, useState } from "react";

const SERVER_OPTS: Intl.DateTimeFormatOptions = {
  weekday: "short",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/New_York",
  timeZoneName: "short",
};

const LOCAL_OPTS: Intl.DateTimeFormatOptions = {
  weekday: "short",
  hour: "numeric",
  minute: "2-digit",
  timeZoneName: "short",
};

/** Kickoff time in the viewer's own timezone. Renders Eastern until the browser takes over. */
export function LocalTime({ iso, className }: { iso: string; className?: string }) {
  const [text, setText] = useState(() => new Date(iso).toLocaleString("en-US", SERVER_OPTS));
  useEffect(() => {
    setText(new Date(iso).toLocaleString(undefined, LOCAL_OPTS));
  }, [iso]);
  return (
    <time dateTime={iso} className={className}>
      {text}
    </time>
  );
}
