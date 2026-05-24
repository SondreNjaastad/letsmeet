import { Component, input, output } from '@angular/core';
import { AvailabilityStatus } from '../../../core/models/types';

interface DayCell {
  date: string;
  day: number;
  isPast: boolean;
  isEmpty: boolean;
}

@Component({
  selector: 'app-calendar-grid',
  standalone: true,
  styles: [`
    .calendar-container {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 24px;
    }

    .month {
      min-width: 0;
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
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      transition: background-color 0.15s;
      border: none;
      background: var(--color-neutral);
      color: var(--color-text);
    }

    .day-cell:hover:not(.past):not(.empty) {
      opacity: 0.8;
    }

    .day-cell.available {
      background: var(--color-available);
      color: var(--color-available-dark);
      font-weight: 600;
    }

    .day-cell.unavailable {
      background: var(--color-unavailable);
      color: var(--color-unavailable-dark);
      font-weight: 600;
    }

    .day-cell.past {
      opacity: 0.3;
      cursor: default;
    }

    .day-cell.empty {
      background: transparent;
      cursor: default;
    }

    .legend {
      display: flex;
      gap: 16px;
      margin-top: 16px;
      font-size: 13px;
      color: var(--color-text-secondary);
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .legend-swatch {
      width: 16px;
      height: 16px;
      border-radius: 4px;
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
                [class.available]="getStatus(cell.date) === 'available'"
                [class.past]="cell.isPast"
                [class.empty]="cell.isEmpty"
                [disabled]="cell.isPast || cell.isEmpty"
                (click)="toggleDate(cell)">
                {{ cell.isEmpty ? '' : cell.day }}
              </button>
            }
          </div>
        </div>
      }
    </div>
    <div class="legend">
      <div class="legend-item">
        <div class="legend-swatch" style="background: var(--color-available)"></div>
        <span>Available</span>
      </div>
      <div class="legend-item">
        <div class="legend-swatch" style="background: var(--color-neutral)"></div>
        <span>Not marked</span>
      </div>
    </div>
  `,
})
export class CalendarGridComponent {
  availability = input<Map<string, AvailabilityStatus>>(new Map());
  dateToggled = output<{ date: string; status: AvailabilityStatus | null }>();

  weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  startMonth = new Date();

  get visibleMonths() {
    const months: { key: string; label: string; cells: DayCell[] }[] = [];
    for (let i = 0; i < 3; i++) {
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
      cells.push({
        date: dateStr,
        day: d,
        isPast: date < today,
        isEmpty: false,
      });
    }

    return cells;
  }

  getStatus(date: string): AvailabilityStatus | null {
    return this.availability().get(date) ?? null;
  }

  toggleDate(cell: DayCell) {
    if (cell.isPast || cell.isEmpty) return;

    const current = this.getStatus(cell.date);
    const next: AvailabilityStatus | null = current === 'available' ? null : 'available';

    this.dateToggled.emit({ date: cell.date, status: next });
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
