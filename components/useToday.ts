"use client";

import { useEffect, useState } from "react";
import { todayISO } from "@/lib/schedule";

/** Today's local date (YYYY-MM-DD), updated across midnight and when the tab regains focus. */
export function useToday(): string {
  const [today, setToday] = useState(todayISO);

  useEffect(() => {
    const update = () => setToday(todayISO());
    const timer = setInterval(update, 60_000);
    document.addEventListener("visibilitychange", update);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  return today;
}
