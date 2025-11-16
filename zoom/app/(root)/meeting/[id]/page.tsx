'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { StreamCall, StreamTheme } from '@stream-io/video-react-sdk';
import { useParams, useRouter } from 'next/navigation';
import { Loader } from 'lucide-react';

import { useGetCallById } from '@/hooks/useGetCallById';
import Alert from '@/components/Alert';
import MeetingSetup from '@/components/MeetingSetup';
import MeetingRoom from '@/components/MeetingRoom';
import { useToast } from '@/components/ui/use-toast';

const MeetingPage = () => {
  const { id } = useParams();
  const router = useRouter();
  const { isLoaded, user } = useUser();
  const { call, isCallLoading } = useGetCallById(id);
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Join the call when component mounts and call is available
    if (call && user) {
      const joinCall = async () => {
        try {
          await call.join();
          console.log('Successfully joined call:', call.id);
        } catch (error) {
          console.error('Error joining call:', error);
        }
      };
      joinCall();
    }

    // Leave call on unmount
    return () => {
      if (call) {
        call.leave().catch((error) => {
          console.error('Error leaving call:', error);
        });
      }
    };
  }, [call, user]);

  // Auto-end meeting when scheduled end time is reached
  useEffect(() => {
    if (!call) return;

    const checkMeetingEnd = () => {
      const endsAt = call.state.custom?.ends_at;
      if (!endsAt) return;

      const endTime = new Date(endsAt).getTime();
      const now = Date.now();
      const timeUntilEnd = endTime - now;

      // Show warning 5 minutes before end
      const fiveMinutes = 5 * 60 * 1000;
      if (timeUntilEnd > 0 && timeUntilEnd <= fiveMinutes) {
        const minutesLeft = Math.ceil(timeUntilEnd / 60000);
        toast({
          title: 'Meeting Ending Soon',
          description: `This meeting will end in ${minutesLeft} minute(s)`,
        });
      }

      if (timeUntilEnd <= 0) {
        // Meeting time has ended
        toast({
          title: 'Meeting Time Ended',
          description: 'The scheduled meeting time has finished.',
        });
        
        // End the call
        call.endCall().then(() => {
          router.push('/');
        }).catch((error) => {
          console.error('Error ending call:', error);
          router.push('/');
        });
      } else {
        // Set timeout to end meeting at scheduled time
        const timeoutId = setTimeout(() => {
          toast({
            title: 'Meeting Time Ended',
            description: 'The scheduled meeting time has finished.',
          });
          
          call.endCall().then(() => {
            router.push('/');
          }).catch((error) => {
            console.error('Error ending call:', error);
            router.push('/');
          });
        }, timeUntilEnd);

        return () => clearTimeout(timeoutId);
      }
    };

    const cleanup = checkMeetingEnd();
    return cleanup;
  }, [call, router, toast]);

  if (!isLoaded || isCallLoading) return <Loader />;

  if (!call) return (
    <p className="text-center text-3xl font-bold text-white">
      Call Not Found
    </p>
  );

  const notAllowed = call.type === 'invited' && (!user || !call.state.members.find((m) => m.user.id === user.id));

  if (notAllowed) return <Alert title="You are not allowed to join this meeting" />;

  return (
    <main className="h-screen w-full">
      <StreamCall call={call}>
        <StreamTheme>
          {!isSetupComplete ? (
            <MeetingSetup setIsSetupComplete={setIsSetupComplete} />
          ) : (
            <MeetingRoom />
          )}
        </StreamTheme>
      </StreamCall>
    </main>
  );
};

export default MeetingPage;