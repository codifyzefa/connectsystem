// app/(root)/page.tsx  (or components/Home.tsx — place where you import it)
'use client';

import React, { useEffect, useState } from 'react';
import MeetingTypeList from '@/components/MeetingTypeList';

const PKT_TZ = 'Asia/Karachi';

function formatTimePKT(date: Date) {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: PKT_TZ,
  });
}

function formatDatePKT(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'full',
    timeZone: PKT_TZ,
  }).format(date);
}

const Home: React.FC = () => {
  const [now, setNow] = useState<Date>(() => new Date());

  // update every 30 seconds so clock stays current
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const time = formatTimePKT(now);
  const date = formatDatePKT(now);

  return (
    <section className="flex size-full flex-col gap-5 text-white">
      <div className="h-[303px] w-full rounded-[20px] bg-hero bg-cover">
        <div className="flex h-full flex-col justify-between max-md:px-5 max-md:py-8 lg:p-11">
          <h2 className="glassmorphism max-w-[273px] rounded py-2 text-center text-base font-normal">
            Upcoming Meeting at: 12:30 PM
          </h2>
          <div className="flex flex-col gap-2">
            <h1 className="text-4xl font-extrabold lg:text-7xl">{time}</h1>
            <p className="text-lg font-medium text-sky-1 lg:text-2xl">{date}</p>
          </div>
        </div>
      </div>

      <MeetingTypeList />
    </section>
  );
};

export default Home;
