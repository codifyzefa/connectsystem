/* eslint-disable camelcase */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import HomeCard from './HomeCard';
import MeetingModal from './MeetingModal';
import { Call, useStreamVideoClient } from '@stream-io/video-react-sdk';
import { useUser } from '@clerk/nextjs';
import Loader from './Loader';
import { Textarea } from './ui/textarea';
import ReactDatePicker from 'react-datepicker';
import { useToast } from './ui/use-toast';
import { Input } from './ui/input';

const initialValues = {
  dateTime: new Date(),
  endDateTime: new Date(new Date().getTime() + 60 * 60000),
  description: '',
  link: '',
  members: '',
};

const MeetingTypeList = () => {
  const router = useRouter();
  const [meetingState, setMeetingState] = useState<'isScheduleMeeting' | 'isJoiningMeeting' | 'isInstantMeeting' | undefined>();
  const [values, setValues] = useState(initialValues);
  const [callDetail, setCallDetail] = useState<Call>();
  const client = useStreamVideoClient();
  const { user } = useUser();
  const { toast } = useToast();

  const createMeeting = async () => {
    if (!client || !user) return;
    try {
      if (!values.dateTime) {
        toast({ title: 'Please select a date and time' });
        return;
      }

      if (values.description && values.endDateTime <= values.dateTime) {
        toast({ 
          title: 'Invalid time range', 
          description: 'End time must be after start time' 
        });
        return;
      }

      let membersList: string[] = [];
      if (values.description && values.members) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const memberEmails = values.members.split(',').map(email => email.trim()).filter(email => email);
        const invalidEmails = memberEmails.filter(email => !emailRegex.test(email));
        
        if (invalidEmails.length > 0) {
          toast({ 
            title: 'Invalid email addresses', 
            description: `Please check: ${invalidEmails.join(', ')}` 
          });
          return;
        }
        membersList = memberEmails;
      }

      const id = crypto.randomUUID();
      const call = client.call('default', id);
      if (!call) throw new Error('Failed to create meeting');
      
      const startsAt = values.dateTime.toISOString();
      const description = values.description || 'Instant Meeting';
      
      const durationMinutes = Math.round((values.endDateTime.getTime() - values.dateTime.getTime()) / 60000);
      const endsAt = values.endDateTime.toISOString();

      const callData: any = {
        starts_at: startsAt,
        custom: {
          description,
          ends_at: endsAt,
          duration: durationMinutes,
        },
      };

      if (membersList.length > 0) {
        callData.members = membersList.map(email => ({ 
          user_id: email, 
          role: 'call_member' 
        }));
      }

      await call.getOrCreate({
        data: callData,
      });
      
      setCallDetail(call);
      
      if (!values.description) {
        router.push(`/meeting/${call.id}`);
      } else {
        toast({
          title: 'Meeting Scheduled',
          description: membersList.length > 0 ? `Invited ${membersList.length} member(s)` : 'Meeting created successfully',
        });
      }
    } catch (error) {
      console.error('Error creating meeting:', error);
      toast({ 
        title: 'Failed to create Meeting',
        description: error instanceof Error ? error.message : 'Please try again'
      });
    }
  };

  const joinMeeting = () => {
    if (!values.link) {
      toast({ title: 'Please enter a meeting link' });
      return;
    }

    try {
      let meetingPath = values.link.trim();
      
      if (meetingPath.includes('http')) {
        const url = new URL(meetingPath);
        meetingPath = url.pathname + url.search;
      }
      
      if (!meetingPath.includes('/')) {
        meetingPath = `/meeting/${meetingPath}`;
      }
      
      if (!meetingPath.startsWith('/meeting/')) {
        toast({ title: 'Invalid meeting link format' });
        return;
      }

      router.push(meetingPath);
    } catch (error) {
      console.error('Error parsing meeting link:', error);
      toast({ title: 'Invalid meeting link. Please check and try again.' });
    }
  };

  const resetMeetingState = () => {
    setMeetingState(undefined);
    setCallDetail(undefined);
    setValues(initialValues);
  };

  if (!client || !user) return <Loader />;

  const meetingLink = `${process.env.NEXT_PUBLIC_BASE_URL}/meeting/${callDetail?.id}`;

  return (
    <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
      <HomeCard
        img="/icons/add-meeting.svg"
        title="New Meeting"
        description="Start an instant meeting"
        handleClick={() => setMeetingState('isInstantMeeting')}
      />
      <HomeCard
        img="/icons/join-meeting.svg"
        title="Join Meeting"
        description="via invitation link"
        className="bg-blue-1"
        handleClick={() => setMeetingState('isJoiningMeeting')}
      />
      <HomeCard
        img="/icons/schedule.svg"
        title="Schedule Meeting"
        description="Plan your meeting"
        className="bg-purple-1"
        handleClick={() => setMeetingState('isScheduleMeeting')}
      />
      <HomeCard
        img="/icons/recordings.svg"
        title="View Recordings"
        description="Meeting Recordings"
        className="bg-yellow-1"
        handleClick={() => router.push('/recordings')}
      />

      {!callDetail ? (
        <MeetingModal
          isOpen={meetingState === 'isScheduleMeeting'}
          onClose={resetMeetingState}
          title="Schedule Meeting"
          handleClick={createMeeting}
        >
          <div className="flex flex-col gap-2.5">
            <label className="text-base font-normal leading-[22.4px] text-sky-2">
              Add a description
            </label>
            <Textarea
              className="border-none bg-dark-3 focus-visible:ring-0 focus-visible:ring-offset-0"
              onChange={(e) =>
                setValues({ ...values, description: e.target.value })
              }
              placeholder="Meeting description"
            />
          </div>
          <div className="flex w-full flex-col gap-2.5">
            <label className="text-base font-normal leading-[22.4px] text-sky-2">
              Start Date and Time
            </label>
            <ReactDatePicker
              selected={values.dateTime}
              onChange={(date) => {
                setValues({ 
                  ...values, 
                  dateTime: date!,
                  endDateTime: new Date(date!.getTime() + 60 * 60000)
                });
              }}
              showTimeSelect
              timeFormat="HH:mm"
              timeIntervals={15}
              timeCaption="time"
              dateFormat="MMMM d, yyyy h:mm aa"
              className="w-full rounded bg-dark-3 p-2 focus:outline-none"
            />
          </div>
          <div className="flex w-full flex-col gap-2.5">
            <label className="text-base font-normal leading-[22.4px] text-sky-2">
              End Date and Time
            </label>
            <ReactDatePicker
              selected={values.endDateTime}
              onChange={(date) => setValues({ ...values, endDateTime: date! })}
              showTimeSelect
              timeFormat="HH:mm"
              timeIntervals={15}
              timeCaption="time"
              dateFormat="MMMM d, yyyy h:mm aa"
              minDate={values.dateTime}
              className="w-full rounded bg-dark-3 p-2 focus:outline-none"
            />
          </div>
          <div className="flex flex-col gap-2.5">
            <label className="text-base font-normal leading-[22.4px] text-sky-2">
              Invite Members (comma-separated emails)
            </label>
            <Textarea
              className="border-none bg-dark-3 focus-visible:ring-0 focus-visible:ring-offset-0"
              onChange={(e) =>
                setValues({ ...values, members: e.target.value })
              }
              placeholder="email1@example.com, email2@example.com"
            />
          </div>
        </MeetingModal>
      ) : (
        <MeetingModal
          isOpen={meetingState === 'isScheduleMeeting'}
          onClose={resetMeetingState}
          title="Meeting Scheduled"
          handleClick={() => {
            navigator.clipboard.writeText(meetingLink);
            toast({ title: 'Link Copied' });
          }}
          image={'/icons/checked.svg'}
          buttonIcon="/icons/copy.svg"
          className="text-center"
          buttonText="Copy Meeting Link"
        />
      )}

      <MeetingModal
        isOpen={meetingState === 'isJoiningMeeting'}
        onClose={() => setMeetingState(undefined)}
        title="Type the link here"
        className="text-center"
        buttonText="Join Meeting"
        handleClick={joinMeeting}
      >
        <Input
          placeholder="Meeting link"
          onChange={(e) => setValues({ ...values, link: e.target.value })}
          className="border-none bg-dark-3 focus-visible:ring-0 focus-visible:ring-offset-0"
        />
      </MeetingModal>

      <MeetingModal
        isOpen={meetingState === 'isInstantMeeting'}
        onClose={() => setMeetingState(undefined)}
        title="Start an Instant Meeting"
        className="text-center"
        buttonText="Start Meeting"
        handleClick={createMeeting}
        />
</section>
);
};
export default MeetingTypeList;