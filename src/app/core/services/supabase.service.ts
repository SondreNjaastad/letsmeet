import { Injectable } from '@angular/core';
import { createClient, RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import { Availability, AvailabilityStatus, Event, Participant } from '../models/types';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseAnonKey);
  }

  // ── Events ──

  async createEvent(title: string, description: string, creatorName: string): Promise<Event> {
    const { data: code } = await this.supabase.rpc('generate_invite_code');

    const { data, error } = await this.supabase
      .from('events')
      .insert({ title, description, creator_name: creatorName, invite_code: code })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getEventByInviteCode(inviteCode: string): Promise<Event | null> {
    const { data, error } = await this.supabase
      .from('events')
      .select('*')
      .eq('invite_code', inviteCode)
      .single();

    if (error) return null;
    return data;
  }

  // ── Participants ──

  async addParticipant(eventId: string, name: string): Promise<Participant> {
    const { data, error } = await this.supabase
      .from('participants')
      .insert({ event_id: eventId, name })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getParticipants(eventId: string): Promise<Participant[]> {
    const { data, error } = await this.supabase
      .from('participants')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at');

    if (error) throw error;
    return data ?? [];
  }

  async getParticipant(participantId: string): Promise<Participant | null> {
    const { data, error } = await this.supabase
      .from('participants')
      .select('*')
      .eq('id', participantId)
      .single();

    if (error) return null;
    return data;
  }

  // ── Availability ──

  async setAvailability(participantId: string, eventId: string, date: string, status: AvailabilityStatus): Promise<void> {
    const { error } = await this.supabase
      .from('availability')
      .upsert(
        { participant_id: participantId, event_id: eventId, date, status },
        { onConflict: 'participant_id,event_id,date' }
      );

    if (error) throw error;
  }

  async removeAvailability(participantId: string, eventId: string, date: string): Promise<void> {
    const { error } = await this.supabase
      .from('availability')
      .delete()
      .eq('participant_id', participantId)
      .eq('event_id', eventId)
      .eq('date', date);

    if (error) throw error;
  }

  async getParticipantAvailability(participantId: string): Promise<Availability[]> {
    const { data, error } = await this.supabase
      .from('availability')
      .select('*')
      .eq('participant_id', participantId);

    if (error) throw error;
    return data ?? [];
  }

  async getAllAvailability(eventId: string): Promise<Availability[]> {
    const { data, error } = await this.supabase
      .from('availability')
      .select('*')
      .eq('event_id', eventId);

    if (error) throw error;
    return data ?? [];
  }

  // ── Realtime ──

  subscribeToAvailability(eventId: string, callback: () => void): RealtimeChannel {
    return this.supabase
      .channel(`availability:${eventId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'availability', filter: `event_id=eq.${eventId}` },
        () => callback()
      )
      .subscribe();
  }

  unsubscribe(channel: RealtimeChannel): void {
    this.supabase.removeChannel(channel);
  }
}
