'use client';

import { Call, CallRecording } from '@stream-io/video-react-sdk';

import Loader from './Loader';
import { useGetCalls } from '@/hooks/useGetCalls';
import MeetingCard from './MeetingCard';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const CallList = ({ type }: { type: 'ended' | 'upcoming' | 'recordings' }) => {
  const router = useRouter();
  const { endedCalls, upcomingCalls, callRecordings, isLoading } =
    useGetCalls();
  const [recordings, setRecordings] = useState<CallRecording[]>([]);

  const getCalls = () => {
    switch (type) {
      case 'ended':
        return endedCalls;
      case 'recordings':
        return recordings;
      case 'upcoming':
        return upcomingCalls;
      default:
        return [];
    }
  };

  const getNoCallsMessage = () => {
    switch (type) {
      case 'ended':
        return 'No Previous Calls';
      case 'upcoming':
        return 'No Upcoming Calls';
      case 'recordings':
        return 'No Recordings';
      default:
        return '';
    }
  };

  const formatMeetingTime = (meeting: Call) => {
    const startsAt = meeting.state?.startsAt;
    const endsAt = meeting.state?.custom?.ends_at;

    if (!startsAt) return 'No date set';

    const startDate = new Date(startsAt);
    const dateStr = startDate.toLocaleString('en-US', {
      timeZone: 'Asia/Karachi',
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    if (endsAt) {
      const endDate = new Date(endsAt);
      const endTimeStr = endDate.toLocaleTimeString('en-US', {
        timeZone: 'Asia/Karachi',
        timeStyle: 'short',
      });
      return `${dateStr} - ${endTimeStr}`;
    }

    return dateStr;
  };

  useEffect(() => {
    const fetchRecordings = async () => {
      if (!callRecordings) return;
      
      const callData = await Promise.all(
        callRecordings.map((meeting) => meeting.queryRecordings()) ?? [],
      );

      const recordings = callData
        .filter((call) => call.recordings.length > 0)
        .flatMap((call) => call.recordings);

      setRecordings(recordings);
    };

    if (type === 'recordings') {
      fetchRecordings();
    }
  }, [type, callRecordings]);

  if (isLoading) return <Loader />;

  const calls = getCalls();
  const noCallsMessage = getNoCallsMessage();

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      {calls && calls.length > 0 ? (
        calls.map((meeting: Call | CallRecording, idx: number) => {
          // Safe key for mixed arrays
          const key =
            ((meeting as Call).id as string | undefined) ??
            ((meeting as CallRecording).filename as string | undefined) ??
            idx;

          // Title fallback
          const title =
            (meeting as Call).state?.custom?.description ||
            (meeting as CallRecording).filename?.substring(0, 20) ||
            'No Description';

          // Date: handle recordings (string) vs calls (startsAt)
          const date =
            type === 'recordings'
              ? (meeting as CallRecording).start_time
                ? new Date((meeting as CallRecording).start_time as string).toLocaleString('en-US', {
                    timeZone: 'Asia/Karachi',
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })
                : 'Not Available'
              : formatMeetingTime(meeting as Call);

          const link =
            type === 'recordings'
              ? (meeting as CallRecording).url
              : `${process.env.NEXT_PUBLIC_BASE_URL}/meeting/${(meeting as Call).id}`;

          return (
            <MeetingCard
              key={key}
              icon={
                type === 'ended'
                  ? '/icons/previous.svg'
                  : type === 'upcoming'
                  ? '/icons/upcoming.svg'
                  : '/icons/recordings.svg'
              }
              title={title}
              date={date}
              isPreviousMeeting={type === 'ended'}
              link={link}
              buttonIcon1={type === 'recordings' ? '/icons/play.svg' : undefined}
              buttonText={type === 'recordings' ? 'Play' : 'Start'}
              handleClick={
                type === 'recordings'
                  ? () => router.push(`${(meeting as CallRecording).url}`)
                  : () => router.push(`/meeting/${(meeting as Call).id}`)
              }
            />
          );
        })
      ) : (
        <h1 className="text-2xl font-bold text-white">{noCallsMessage}</h1>
      )}
    </div>
  );
};

export default CallList;
