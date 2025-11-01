'use client';

import { YEPParticipant } from '@/lib/youth-empowerment';
import { ParticipantWorkshops } from '@/components/youth-empowerment/participant-workshops';

interface ProfileWorkshopsProps {
  profile: YEPParticipant;
}

export function ProfileWorkshops({ profile }: ProfileWorkshopsProps) {
  return (
    <ParticipantWorkshops
      participantId={profile.id}
      participantName={profile.youthParticipant}
    />
  );
}


