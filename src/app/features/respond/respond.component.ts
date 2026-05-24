import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { RealtimeChannel } from '@supabase/supabase-js';
import { SupabaseService } from '../../core/services/supabase.service';
import { Availability, AvailabilityStatus, Event, Participant } from '../../core/models/types';
import { CalendarGridComponent } from '../../shared/components/calendar-grid/calendar-grid.component';
import { HeatmapCalendarComponent } from '../../shared/components/heatmap-calendar/heatmap-calendar.component';

@Component({
  selector: 'app-respond',
  standalone: true,
  imports: [CalendarGridComponent, HeatmapCalendarComponent],
  styles: [`
    .page {
      padding: 32px 20px;
      max-width: 960px;
      margin: 0 auto;
    }

    .greeting {
      margin-bottom: 24px;
    }

    .greeting h1 {
      margin-bottom: 4px;
    }

    .greeting p {
      color: var(--color-text-secondary);
    }

    .section {
      margin-bottom: 32px;
    }

    .section h2 {
      margin-bottom: 16px;
    }

    .loading {
      text-align: center;
      padding: 60px 20px;
      color: var(--color-text-secondary);
    }

    .not-found {
      text-align: center;
      padding: 60px 20px;
    }
  `],
  template: `
    @if (loading) {
      <div class="loading">Loading...</div>
    } @else if (!event || !participant) {
      <div class="not-found">
        <h2>Invalid link</h2>
        <p>This invitation link doesn't seem to be valid.</p>
      </div>
    } @else {
      <div class="page">
        <div class="greeting">
          <h1>Hi {{ participant.name }}!</h1>
          <p>Mark your availability for <strong>{{ event.title }}</strong></p>
          @if (event.description) {
            <p>{{ event.description }}</p>
          }
        </div>

        <div class="section card">
          <h2>Your Availability</h2>
          <p style="color: var(--color-text-secondary); font-size: 14px; margin-bottom: 16px;">
            Click dates you're available. Click again to remove.
          </p>
          <app-calendar-grid
            [availability]="myAvailabilityMap"
            (dateToggled)="onDateToggled($event)"
          />
        </div>

        <div class="section card">
          <h2>Group Availability</h2>
          <app-heatmap-calendar
            [allAvailability]="allAvailability"
            [participants]="allParticipants"
            [participantCount]="allParticipants.length"
          />
        </div>
      </div>
    }
  `,
})
export class RespondComponent implements OnInit, OnDestroy {
  private supabase = inject(SupabaseService);
  private route = inject(ActivatedRoute);

  event: Event | null = null;
  participant: Participant | null = null;
  myAvailability: Availability[] = [];
  myAvailabilityMap = new Map<string, AvailabilityStatus>();
  allAvailability: Availability[] = [];
  allParticipants: Participant[] = [];
  loading = true;

  private channel: RealtimeChannel | null = null;

  async ngOnInit() {
    const inviteCode = this.route.snapshot.paramMap.get('inviteCode')!;
    const participantId = this.route.snapshot.paramMap.get('participantId')!;

    const [event, participant] = await Promise.all([
      this.supabase.getEventByInviteCode(inviteCode),
      this.supabase.getParticipant(participantId),
    ]);

    this.event = event;
    this.participant = participant;

    if (this.event && this.participant && this.participant.event_id === this.event.id) {
      await this.loadData();
      this.channel = this.supabase.subscribeToAvailability(this.event.id, () => this.loadAllAvailability());
    } else {
      this.participant = null;
    }

    this.loading = false;
  }

  ngOnDestroy() {
    if (this.channel) {
      this.supabase.unsubscribe(this.channel);
    }
  }

  private async loadData() {
    await Promise.all([this.loadMyAvailability(), this.loadAllAvailability(), this.loadParticipants()]);
  }

  private async loadMyAvailability() {
    if (!this.participant) return;
    this.myAvailability = await this.supabase.getParticipantAvailability(this.participant.id);
    this.myAvailabilityMap = new Map(this.myAvailability.map(a => [a.date, a.status]));
  }

  private async loadAllAvailability() {
    if (!this.event) return;
    this.allAvailability = await this.supabase.getAllAvailability(this.event.id);
  }

  private async loadParticipants() {
    if (!this.event) return;
    this.allParticipants = await this.supabase.getParticipants(this.event.id);
  }

  async onDateToggled(event: { date: string; status: AvailabilityStatus | null }) {
    if (!this.participant || !this.event) return;

    if (event.status === null) {
      this.myAvailabilityMap = new Map(this.myAvailabilityMap);
      this.myAvailabilityMap.delete(event.date);
      await this.supabase.removeAvailability(this.participant.id, this.event.id, event.date);
    } else {
      this.myAvailabilityMap = new Map(this.myAvailabilityMap);
      this.myAvailabilityMap.set(event.date, event.status);
      await this.supabase.setAvailability(this.participant.id, this.event.id, event.date, event.status);
    }

    await this.loadAllAvailability();
  }
}
