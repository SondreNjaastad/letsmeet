import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../../core/services/supabase.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [FormsModule],
  styles: [`
    .hero {
      text-align: center;
      padding: 80px 20px 40px;
    }

    .hero h1 {
      font-size: 36px;
      margin-bottom: 12px;
    }

    .hero p {
      color: var(--color-text-secondary);
      font-size: 18px;
      margin-bottom: 40px;
    }

    .form-card {
      max-width: 480px;
      margin: 0 auto;
    }

    .error {
      color: var(--color-unavailable-dark);
      background: #fef2f2;
      padding: 10px 14px;
      border-radius: var(--radius);
      font-size: 14px;
      margin-bottom: 16px;
    }
  `],
  template: `
    <div class="hero">
      <h1>Find a date that works for everyone</h1>
      <p>Create an event, invite your friends, and see when everyone is free.</p>
    </div>
    <div class="card form-card container">
      @if (error) {
        <div class="error">{{ error }}</div>
      }
      <form (ngSubmit)="createEvent()">
        <div class="form-group">
          <label class="label" for="title">Event Title</label>
          <input class="input" id="title" [(ngModel)]="title" name="title" placeholder="e.g. Summer BBQ" required />
        </div>
        <div class="form-group">
          <label class="label" for="description">Description (optional)</label>
          <textarea class="input" id="description" [(ngModel)]="description" name="description" placeholder="What's the event about?"></textarea>
        </div>
        <div class="form-group">
          <label class="label" for="name">Your Name</label>
          <input class="input" id="name" [(ngModel)]="creatorName" name="name" placeholder="Your name" required />
        </div>
        <button class="btn btn-primary" type="submit" [disabled]="loading" style="width: 100%; justify-content: center;">
          {{ loading ? 'Creating...' : 'Create Event' }}
        </button>
      </form>
    </div>
  `,
})
export class HomeComponent {
  private supabase = inject(SupabaseService);
  private router = inject(Router);

  title = '';
  description = '';
  creatorName = '';
  loading = false;
  error = '';

  async createEvent() {
    if (!this.title.trim() || !this.creatorName.trim()) return;

    this.loading = true;
    this.error = '';

    try {
      const event = await this.supabase.createEvent(
        this.title.trim(),
        this.description.trim(),
        this.creatorName.trim()
      );
      this.router.navigate(['/event', event.invite_code]);
    } catch (e: any) {
      this.error = e.message || 'Failed to create event';
      this.loading = false;
    }
  }
}
