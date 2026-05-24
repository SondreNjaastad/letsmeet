import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { RealtimeChannel } from '@supabase/supabase-js';
import { SupabaseService } from '../../core/services/supabase.service';
import { Availability, Event, Participant } from '../../core/models/types';
import { HeatmapCalendarComponent } from '../../shared/components/heatmap-calendar/heatmap-calendar.component';

@Component({
  selector: 'app-event',
  standalone: true,
  imports: [FormsModule, HeatmapCalendarComponent],
  styles: [`
    .page {
      padding: 32px 20px;
      max-width: 960px;
      margin: 0 auto;
    }

    .event-header {
      margin-bottom: 24px;
    }

    .event-header h1 {
      margin-bottom: 4px;
    }

    .event-header p {
      color: var(--color-text-secondary);
    }

    .share-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      background: var(--color-neutral);
      border-radius: var(--radius);
      margin-bottom: 24px;
      font-size: 14px;
    }

    .share-bar code {
      flex: 1;
      font-family: inherit;
      color: var(--color-text);
      word-break: break-all;
    }

    .copied {
      color: var(--color-available-dark);
      font-size: 13px;
    }

    .section {
      margin-bottom: 32px;
    }

    .section h2 {
      margin-bottom: 16px;
    }

    .add-participant {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
    }

    .add-participant input {
      flex: 1;
    }

    .participant-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .participant-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      background: var(--color-neutral);
      border-radius: var(--radius);
      font-size: 14px;
    }

    .participant-name {
      font-weight: 500;
    }

    .participant-link {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .participant-link code {
      font-size: 12px;
      color: var(--color-text-secondary);
      max-width: 200px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .response-count {
      font-size: 12px;
      color: var(--color-text-secondary);
      margin-left: 8px;
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

    .not-found h2 {
      margin-bottom: 8px;
    }
  `],
  template: `
    @if (loading) {
      <div class="loading">Loading event...</div>
    } @else if (!event) {
      <div class="not-found">
        <h2>Event not found</h2>
        <p>This invite link doesn't seem to be valid.</p>
      </div>
    } @else {
      <div class="page">
        <div class="event-header">
          <h1>{{ event.title }}</h1>
          @if (event.description) {
            <p>{{ event.description }}</p>
          }
        </div>

        <div class="share-bar">
          <span>Overview link:</span>
          <code>{{ shareUrl }}</code>
          <button class="btn btn-sm btn-secondary" (click)="copyShareLink()">
            {{ copiedShare ? 'Copied!' : 'Copy' }}
          </button>
        </div>

        <div class="section card">
          <h2>Participants</h2>
          <div class="add-participant">
            <input class="input" [(ngModel)]="newParticipantName" placeholder="Enter a name" (keyup.enter)="addParticipant()" />
            <button class="btn btn-primary" (click)="addParticipant()" [disabled]="!newParticipantName.trim()">Add</button>
          </div>
          @if (participants.length === 0) {
            <p style="color: var(--color-text-secondary); font-size: 14px;">Add participants to generate invite links.</p>
          }
          <div class="participant-list">
            @for (p of participants; track p.id) {
              <div class="participant-row">
                <div>
                  <span class="participant-name">{{ p.name }}</span>
                  <span class="response-count">{{ getResponseCount(p.id) }} dates marked</span>
                </div>
                <div class="participant-link">
                  <code>{{ getParticipantUrl(p) }}</code>
                  <button class="btn btn-sm btn-secondary" (click)="copyParticipantLink(p)">
                    {{ copiedParticipant === p.id ? 'Copied!' : 'Copy link' }}
                  </button>
                </div>
              </div>
            }
          </div>
        </div>

        <div class="section card">
          <h2>Group Availability</h2>
          @if (participants.length === 0) {
            <p style="color: var(--color-text-secondary); font-size: 14px;">Add participants to see availability.</p>
          } @else {
            <app-heatmap-calendar
              [allAvailability]="allAvailability"
              [participants]="participants"
              [participantCount]="participants.length"
            />
          }
        </div>
      </div>
    }
  `,
})
export class EventComponent implements OnInit, OnDestroy {
  private supabase = inject(SupabaseService);
  private route = inject(ActivatedRoute);

  event: Event | null = null;
  participants: Participant[] = [];
  allAvailability: Availability[] = [];
  loading = true;
  newParticipantName = '';
  copiedShare = false;
  copiedParticipant: string | null = null;
  shareUrl = '';

  private channel: RealtimeChannel | null = null;

  async ngOnInit() {
    const inviteCode = this.route.snapshot.paramMap.get('inviteCode')!;
    this.event = await this.supabase.getEventByInviteCode(inviteCode);

    if (this.event) {
      const base = document.baseURI.replace(/\/$/, '');
      this.shareUrl = `${base}/event/${this.event.invite_code}`;
      await this.loadData();

      this.channel = this.supabase.subscribeToAvailability(this.event.id, () => this.loadData());
    }

    this.loading = false;
  }

  ngOnDestroy() {
    if (this.channel) {
      this.supabase.unsubscribe(this.channel);
    }
  }

  private async loadData() {
    await Promise.all([this.loadParticipants(), this.loadAvailability()]);
  }

  private async loadParticipants() {
    if (!this.event) return;
    this.participants = await this.supabase.getParticipants(this.event.id);
  }

  private async loadAvailability() {
    if (!this.event) return;
    this.allAvailability = await this.supabase.getAllAvailability(this.event.id);
  }

  async addParticipant() {
    if (!this.event || !this.newParticipantName.trim()) return;

    await this.supabase.addParticipant(this.event.id, this.newParticipantName.trim());
    this.newParticipantName = '';
    await this.loadParticipants();
  }

  getParticipantUrl(p: Participant): string {
    const base = document.baseURI.replace(/\/$/, '');
    return `${base}/event/${this.event!.invite_code}/p/${p.id}`;
  }

  getResponseCount(participantId: string): number {
    return this.allAvailability.filter(a => a.participant_id === participantId).length;
  }

  async copyShareLink() {
    await navigator.clipboard.writeText(this.shareUrl);
    this.copiedShare = true;
    setTimeout(() => this.copiedShare = false, 2000);
  }

  async copyParticipantLink(p: Participant) {
    await navigator.clipboard.writeText(this.getParticipantUrl(p));
    this.copiedParticipant = p.id;
    setTimeout(() => this.copiedParticipant = null, 2000);
  }
}
