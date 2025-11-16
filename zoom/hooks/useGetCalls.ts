import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { Call, useStreamVideoClient } from '@stream-io/video-react-sdk';

export const useGetCalls = () => {
  const { user } = useUser();
  const client = useStreamVideoClient();
  const [calls, setCalls] = useState<Call[]>();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadCalls = async () => {
      if (!client || !user?.id) return;
      
      setIsLoading(true);

      try {
        const { calls } = await client.queryCalls({
          sort: [{ field: 'starts_at', direction: -1 }],
          filter_conditions: {
            starts_at: { $exists: true },
            $or: [
              { created_by_user_id: user.id },
              { members: { $in: [user.id] } },
            ],
          },
        });

        console.log('All loaded calls:', calls.map(c => ({
          id: c.id,
          desc: c.state?.custom?.description,
          starts: c.state?.startsAt,
          ends: c.state?.custom?.ends_at
        })));

        setCalls(calls);
      } catch (error) {
        console.error('Error loading calls:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCalls();
  }, [client, user?.id]);

  const now = new Date();

  // Ended calls: calls where end time has passed OR call was explicitly ended
  const endedCalls = calls?.filter(({ state: { custom, endedAt } }: Call) => {
    if (endedAt) return true;
    
    if (custom?.ends_at) {
      return new Date(custom.ends_at) < now;
    }
    
    return false;
  });

  // Upcoming calls: all scheduled meetings (including personal rooms) that haven't ended
  const upcomingCalls = calls?.filter(({ state: { startsAt, custom, endedAt } }: Call) => {
    // Don't show if explicitly ended
    if (endedAt) {
      console.log('Call ended, skipping:', custom?.description);
      return false;
    }
    
    // Must have a valid description (not instant meeting and not empty)
    const hasValidDescription = custom?.description && 
                                custom.description.trim() !== '' && 
                                custom.description !== 'Instant Meeting';
    
    if (!hasValidDescription) {
      console.log('Invalid description, skipping');
      return false;
    }
    
    // Check if meeting end time hasn't passed yet
    if (custom?.ends_at) {
      const endTime = new Date(custom.ends_at);
      const isUpcoming = endTime > now;
      console.log('Checking call:', custom.description, 'End time:', endTime, 'Is upcoming:', isUpcoming);
      return isUpcoming;
    }
    
    // Fallback: check start time if no end time
    if (startsAt) {
      const isUpcoming = new Date(startsAt) > now;
      console.log('No end time, checking start time:', isUpcoming);
      return isUpcoming;
    }
    
    return false;
  });

  console.log('Upcoming calls:', upcomingCalls?.map(c => ({
    desc: c.state?.custom?.description,
    ends: c.state?.custom?.ends_at
  })));

  const callRecordings = endedCalls;

  return { endedCalls, upcomingCalls, callRecordings, isLoading };
};