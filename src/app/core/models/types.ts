export interface Event {
  id: string;
  title: string;
  description: string;
  creator_name: string;
  invite_code: string;
  created_by: string | null;
  created_at: string;
}

export interface Participant {
  id: string;
  event_id: string;
  user_id: string | null;
  name: string;
  created_at: string;
}

export type AvailabilityStatus = 'available' | 'unavailable';

export interface Availability {
  id: string;
  participant_id: string;
  event_id: string;
  date: string;
  status: AvailabilityStatus;
}

export interface DateSummary {
  date: string;
  availableCount: number;
  unavailableCount: number;
  availableNames: string[];
  unavailableNames: string[];
}
