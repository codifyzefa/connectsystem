"use client";

import { useUser } from "@clerk/nextjs";
import { useStreamVideoClient } from "@stream-io/video-react-sdk";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

import { useGetCallById } from "@/hooks/useGetCallById";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import MeetingModal from "@/components/MeetingModal";
import { Textarea } from "@/components/ui/textarea";
import ReactDatePicker from "react-datepicker";
import Loader from "@/components/Loader";

const Table = ({
  title,
  description,
}: {
  title: string;
  description: string;
}) => {
  return (
    <div className="flex flex-col items-start gap-2 xl:flex-row">
      <h1 className="text-base font-medium text-sky-1 lg:text-xl xl:min-w-32">
        {title}:
      </h1>
      <h1 className="truncate text-sm font-bold max-sm:max-w-[320px] lg:text-xl">
        {description}
      </h1>
    </div>
  );
};

const PersonalRoom = () => {
  const router = useRouter();
  const { user } = useUser();
  const client = useStreamVideoClient();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [roomDetails, setRoomDetails] = useState({
    description: '',
    startDateTime: new Date(),
    endDateTime: new Date(new Date().getTime() + 60 * 60000),
  });

  const meetingId = user?.id;
  const { call, isCallLoading } = useGetCallById(meetingId!);

  // Load existing room details when updating
  useEffect(() => {
    if (isUpdating && call) {
      setRoomDetails({
        description: call.state?.custom?.description || '',
        startDateTime: call.state?.startsAt ? new Date(call.state.startsAt) : new Date(),
        endDateTime: call.state?.custom?.ends_at 
          ? new Date(call.state.custom.ends_at) 
          : new Date(new Date().getTime() + 60 * 60000),
      });
    }
  }, [isUpdating, call]);

  const createOrUpdateRoom = async () => {
    if (!client || !user) return;

    try {
      if (!roomDetails.description.trim()) {
        toast({ title: 'Please enter a room title/description' });
        return;
      }

      if (roomDetails.endDateTime <= roomDetails.startDateTime) {
        toast({ 
          title: 'Invalid time range', 
          description: 'End time must be after start time' 
        });
        return;
      }

      const startsAt = roomDetails.startDateTime.toISOString();
      const endsAt = roomDetails.endDateTime.toISOString();
      const durationMinutes = Math.round(
        (roomDetails.endDateTime.getTime() - roomDetails.startDateTime.getTime()) / 60000
      );

      const personalCall = client.call("default", meetingId!);

      await personalCall.getOrCreate({
        data: {
          starts_at: startsAt,
          custom: {
            description: roomDetails.description,
            ends_at: endsAt,
            duration: durationMinutes,
          },
        },
      });

      toast({
        title: isUpdating ? "Room Updated Successfully" : "Room Created Successfully",
        description: "Your personal meeting room is ready!",
      });

      setIsModalOpen(false);
      setIsUpdating(false);
      
      setTimeout(() => {
        window.location.reload();
      }, 500);
      
    } catch (error) {
      console.error("Error saving room:", error);
      toast({
        title: "Failed to save room",
        description: error instanceof Error ? error.message : "Please try again",
      });
    }
  };

  const deleteRoom = async () => {
    if (!call || !client) return;

    const confirmDelete = window.confirm("Are you sure you want to delete your personal room?");
    if (!confirmDelete) return;

    try {
      // End the call first
      await call.endCall();
      
      toast({
        title: "Room Deleted Successfully",
        description: "Your personal room has been removed",
      });

      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error("Error deleting room:", error);
      toast({
        title: "Failed to delete room",
        description: error instanceof Error ? error.message : "Please try again",
      });
    }
  };

  const openCreateModal = () => {
    setIsUpdating(false);
    setRoomDetails({
      description: '',
      startDateTime: new Date(),
      endDateTime: new Date(new Date().getTime() + 60 * 60000),
    });
    setIsModalOpen(true);
  };

  const openUpdateModal = () => {
    setIsUpdating(true);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsUpdating(false);
    setRoomDetails({
      description: '',
      startDateTime: new Date(),
      endDateTime: new Date(new Date().getTime() + 60 * 60000),
    });
  };

  const joinRoom = () => {
    if (!call) {
      toast({
        title: "Room not found",
        description: "Please create your personal room first",
      });
      return;
    }
    router.push(`/meeting/${meetingId}?personal=true`);
  };

  const meetingLink = `${process.env.NEXT_PUBLIC_BASE_URL}/meeting/${meetingId}?personal=true`;

  if (!user || isCallLoading) {
    return (
      <section className="flex size-full flex-col gap-10 text-white">
        <h1 className="text-xl font-bold lg:text-3xl">Personal Meeting Room</h1>
        <Loader />
      </section>
    );
  }

  return (
    <section className="flex size-full flex-col gap-10 text-white">
      <h1 className="text-xl font-bold lg:text-3xl">Personal Meeting Room</h1>
      
      {call && call.state?.custom?.description ? (
        <>
          <div className="flex w-full flex-col gap-8 xl:max-w-[900px]">
            <Table 
              title="Topic" 
              description={call.state?.custom?.description || `${user?.username || user?.firstName}'s Meeting Room`} 
            />
            <Table title="Meeting ID" description={meetingId!} />
            <Table title="Invite Link" description={meetingLink} />
            <Table 
              title="Start Time" 
              description={
                call.state?.startsAt 
                  ? new Date(call.state.startsAt).toLocaleString('en-US', {
                      timeZone: 'Asia/Karachi',
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })
                  : 'Not set'
              } 
            />
            <Table 
              title="End Time" 
              description={
                call.state?.custom?.ends_at 
                  ? new Date(call.state.custom.ends_at).toLocaleString('en-US', {
                      timeZone: 'Asia/Karachi',
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })
                  : 'Not set'
              } 
            />
          </div>
          <div className="flex flex-wrap gap-5">
            <Button className="bg-blue-1" onClick={joinRoom}>
              Start Meeting
            </Button>
            <Button
              className="bg-dark-3"
              onClick={() => {
                navigator.clipboard.writeText(meetingLink);
                toast({
                  title: "Link Copied",
                });
              }}
            >
              Copy Invitation
            </Button>
            <Button
              className="bg-orange-1"
              onClick={openUpdateModal}
            >
              Update Room
            </Button>
            <Button
              className="bg-red-500"
              onClick={deleteRoom}
            >
              Delete Room
            </Button>
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-5">
          <p className="text-lg text-sky-2">
            You haven't created a personal room yet. Create one to have a permanent meeting space.
          </p>
          <Button 
            className="bg-blue-1 max-w-xs" 
            onClick={openCreateModal}
          >
            Create Personal Room
          </Button>
        </div>
      )}

      <MeetingModal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={isUpdating ? "Update Personal Room" : "Create Personal Room"}
        handleClick={createOrUpdateRoom}
        buttonText={isUpdating ? "Update Room" : "Create Room"}
      >
        <div className="flex flex-col gap-2.5">
          <label className="text-base font-normal leading-[22.4px] text-sky-2">
            Room Title/Description *
          </label>
          <Textarea
            className="border-none bg-dark-3 focus-visible:ring-0 focus-visible:ring-offset-0"
            value={roomDetails.description}
            onChange={(e) =>
              setRoomDetails({ ...roomDetails, description: e.target.value })
            }
            placeholder="Enter room title or description"
          />
        </div>
        <div className="flex w-full flex-col gap-2.5">
          <label className="text-base font-normal leading-[22.4px] text-sky-2">
            Start Date and Time *
          </label>
          <ReactDatePicker
            selected={roomDetails.startDateTime}
            onChange={(date) => {
              if (date) {
                setRoomDetails({ 
                  ...roomDetails, 
                  startDateTime: date,
                  endDateTime: new Date(date.getTime() + 60 * 60000)
                });
              }
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
            End Date and Time *
          </label>
          <ReactDatePicker
            selected={roomDetails.endDateTime}
            onChange={(date) => {
              if (date) {
                setRoomDetails({ ...roomDetails, endDateTime: date });
              }
            }}
            showTimeSelect
            timeFormat="HH:mm"
            timeIntervals={15}
            timeCaption="time"
            dateFormat="MMMM d, yyyy h:mm aa"
            minDate={roomDetails.startDateTime}
            className="w-full rounded bg-dark-3 p-2 focus:outline-none"
          />
        </div>
      </MeetingModal>
    </section>
  );
};

export default PersonalRoom;