import { Component, computed, input } from '@angular/core';
import { Availability, DateSummary, Participant } from '../../../core/models/types';

interface DayCell {
  date: string;
  day: number;
  isPast: boolean;
  isEmpty: boolean;
}

@Component({
  selector: 'app-heatmap-calendar',
  standalone: true,
  styles: [`
    .calendar-container {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 24px;
    }

    .month-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }

    .month-title {
      font-size: 16px;
      font-weight: 600;
    }

    .nav-btn {
      background: none;
      border: 1px solid var(--color-border);
      border-radius: 6px;
      padding: 4px 10px;
      cursor: pointer;
      font-size: 14px;
      color: var(--color-text-secondary);
    }

    .nav-btn:hover {
      background: var(--color-neutral);
    }

    .weekday-headers {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 4px;
      margin-bottom: 4px;
    }

    .weekday {
      text-align: center;
      font-size: 12px;
      font-weight: 500;
      color: var(--color-text-secondary);
      padding: 4px 0;
    }

    .month-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 4px;
    }

    .day-cell {
      aspect-ratio: 1;
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      cursor: pointer;
      position: relative;
      border: none;
      background: var(--color-neutral);
      color: var(--color-text);
      gap: 1px;
    }

    .day-number {
      line-height: 1;
    }

    .count {
      font-size: 9px;
      line-height: 1;
      opacity: 0.7;
    }

    .day-cell.empty {
      background: transparent;
      cursor: default;
    }

    .day-cell.past {
      opacity: 0.3;
    }

    .day-cell.has-data {
      color: white;
      font-weight: 600;
    }

    .tooltip {
      position: absolute;
      bottom: calc(100% + 8px);
      left: 50%;
      transform: translateX(-50%);
      background: var(--color-text);
      color: white;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 12px;
      white-space: nowrap;
      z-index: 10;
      pointer-events: none;
    }

    .tooltip::after {
      content: '';
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      border: 5px solid transparent;
      border-top-color: var(--color-text);
    }

    .tooltip-available {
      color: var(--color-available);
    }

    .tooltip-unavailable {
      color: var(--color-unavailable);
    }

    .legend {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 16px;
      font-size: 13px;
      color: var(--color-text-secondary);
    }

    .legend-gradient {
      display: flex;
      gap: 2px;
    }

    .legend-block {
      width: 20px;
      height: 14px;
      border-radius: 3px;
    }
  `],
  template: `
    <div class="calendar-container">
      @for (month of visibleMonths; track month.key) {
        <div class="month">
          <div class="month-header">
            @if ($first) {
              <button class="nav-btn" (click)="previousMonth()">&#8249;</button>
            } @else {
              <span></span>
            }
            <span class="month-title">{{ month.label }}</span>
            @if ($last) {
              <button class="nav-btn" (click)="nextMonth()">&#8250;</button>
            } @else {
              <span></span>
            }
          </div>
          <div class="weekday-headers">
            @for (day of weekdays; track day) {
              <span class="weekday">{{ day }}</span>
            }
          </div>
          <div class="month-grid">
            @for (cell of month.cells; track cell.date) {
              <button
                class="day-cell"
                [class.empty]="cell.isEmpty"
                [class.past]="cell.isPast"
                [class.has-data]="hasAvailability(cell.date)"
                [style.background]="cell.isEmpty ? 'transparent' : getColor(cell.date)"
                (mouseenter)="hoveredDate = cell.date"
                (mouseleave)="hoveredDate = null"
                (click)="selectedDate = selectedDate === cell.date ? null : cell.date">
                @if (!cell.isEmpty) {
                  <span class="day-number">{{ cell.day }}</span>
                  @if (getSummary(cell.date); as s) {
                    <span class="count">{{ s.availableCount }}/{{ participantCount() }}</span>
                  }
                }
                @if ((hoveredDate === cell.date || selectedDate === cell.date) && getSummary(cell.date)) {
                  <div class="tooltip">
                    <div>{{ getSummary(cell.date)!.availableCount }}/{{ participantCount() }} available</div>
                    @if (getSummary(cell.date)!.availableNames.length) {
                      <div class="tooltip-available">{{ getSummary(cell.date)!.availableNames.join(', ') }}</div>
                    }
                    @if (getSummary(cell.date)!.unavailableNames.length) {
                      <div class="tooltip-unavailable">{{ getSummary(cell.date)!.unavailableNames.join(', ') }}</div>
                    }
                  </div>
                }
              </button>
            }
          </div>
        </div>
      }
    </div>
    <div class="legend">
      <span>None</span>
      <div class="legend-gradient">
        <div class="legend-block" style="background: var(--color-neutral)"></div>
        <div class="legend-block" style="background: hsl(30, 70%, 65%)"></div>
        <div class="legend-block" style="background: hsl(142, 70%, 45%)"></div>
      </div>
      <span>All available</span>
    </div>
  `,
})
export class HeatmapCalendarComponent {
  allAvailability = input<Availability[]>([]);
  participants = input<Participant[]>([]);
  participantCount = input(0);

  weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  startMonth = new Date();
  hoveredDate: string | null = null;
  selectedDate: string | null = null;

  summaryMap = computed(() => {
    const map = new Map<string, DateSummary>();
    const names = new Map(this.participants().map(p => [p.id, p.name]));

    for (const a of this.allAvailability()) {
      if (!map.has(a.date)) {
        map.set(a.date, {
          date: a.date,
          availableCount: 0,
          unavailableCount: 0,
          availableNames: [],
          unavailableNames: [],
        });
      }
      const s = map.get(a.date)!;
      const name = names.get(a.participant_id) ?? 'Unknown';
      if (a.status === 'available') {
        s.availableCount++;
        s.availableNames.push(name);
      } else {
        s.unavailableCount++;
        s.unavailableNames.push(name);
      }
    }
    return map;
  });

  get visibleMonths() {
    const months: { key: string; label: string; cells: DayCell[] }[] = [];
    for (let i = 0; i < 4; i++) {
      const d = new Date(this.startMonth.getFullYear(), this.startMonth.getMonth() + i, 1);
      months.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        cells: this.buildCells(d.getFullYear(), d.getMonth()),
      });
    }
    return months;
  }

  private buildCells(year: number, month: number): DayCell[] {
    const cells: DayCell[] = [];
    const firstDay = new Date(year, month, 1);
    let startDow = firstDay.getDay();
    if (startDow === 0) startDow = 7;

    for (let i = 1; i < startDow; i++) {
      cells.push({ date: `empty-${month}-${i}`, day: 0, isPast: false, isEmpty: true });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const dateStr = this.formatDate(date);
      cells.push({ date: dateStr, day: d, isPast: date < today, isEmpty: false });
    }
    return cells;
  }

  getSummary(date: string): DateSummary | null {
    return this.summaryMap().get(date) ?? null;
  }

  hasAvailability(date: string): boolean {
    const s = this.summaryMap().get(date);
    return !!s && s.availableCount > 0;
  }

  getColor(date: string): string {
    const summary = this.summaryMap().get(date);
    if (!summary || summary.availableCount === 0) return 'var(--color-neutral)';
    const total = this.participantCount();
    if (total === 0) return 'var(--color-neutral)';
    const ratio = summary.availableCount / total;
    if (ratio >= 1) return 'hsl(142, 70%, 45%)';
    // partial: stay in orange range (hue 25–40), darken as more people are available
    const lightness = Math.round(70 - ratio * 15);
    return `hsl(30, 70%, ${lightness}%)`;
  }

  previousMonth() {
    this.startMonth = new Date(this.startMonth.getFullYear(), this.startMonth.getMonth() - 1, 1);
  }

  nextMonth() {
    this.startMonth = new Date(this.startMonth.getFullYear(), this.startMonth.getMonth() + 1, 1);
  }

  private formatDate(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
