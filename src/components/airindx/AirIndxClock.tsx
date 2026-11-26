'use client';

import { memo, useEffect, useState } from 'react';

const DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
});
const TIME_FORMATTER = new Intl.DateTimeFormat(undefined, {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

export const AirIndxClock = memo(function AirIndxClock() {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setDate(DATE_FORMATTER.format(now));
      setTime(TIME_FORMATTER.format(now));
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <>
      <p className="mt-3 text-sm text-slate-400">
        <span className="sr-only">Local date: </span>
        {date || 'Loading local date…'}
      </p>
      <p className="font-mono text-sm text-cyan-200">
        <span className="sr-only">Local time, 24-hour: </span>
        {time || '--:--:--'}
      </p>
    </>
  );
});
