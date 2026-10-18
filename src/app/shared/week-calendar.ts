import { Component, computed, input, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Booking } from '../services/bookings.service';
import { statusMeta } from './booking-status';

const START_HOUR = 7;
const END_HOUR = 23;
const HOUR_PX = 44;

interface Block {
  booking: Booking;
  top: number;
  height: number;
  lane: number;
  lanes: number;
  color: string;
  label: string;
}

interface Day {
  date: Date;
  isToday: boolean;
  blocks: Block[];
}

/** Vista semanal (lunes a domingo, 07:00–23:00) con las reservas coloreadas por estado. */
@Component({
  selector: 'app-week-calendar',
  standalone: true,
  imports: [DatePipe],
  template: `
    <div class="cal-toolbar">
      <div class="d-flex gap-2 align-items-center">
        <button class="btn btn-ghost btn-icon" (click)="shift(-7)" aria-label="Semana anterior"><i class="bi bi-chevron-left"></i></button>
        <button class="btn btn-ghost btn-sm" (click)="goToday()">Hoy</button>
        <button class="btn btn-ghost btn-icon" (click)="shift(7)" aria-label="Semana siguiente"><i class="bi bi-chevron-right"></i></button>
      </div>
      <div class="cal-range">{{ days()[0].date | date: 'd MMM' }} – {{ days()[6].date | date: 'd MMM yyyy' }}</div>
      <div class="muted small">{{ weekCount() }} reserva(s) esta semana</div>
    </div>

    <div class="cal-scroll">
      <div class="cal-grid" [style.--hours]="hours.length">
        <div class="cal-corner"></div>
        @for (day of days(); track day.date.getTime()) {
          <div class="cal-dayhead" [class.today]="day.isToday">
            <span>{{ day.date | date: 'EEE' }}</span>
            <strong>{{ day.date | date: 'd' }}</strong>
          </div>
        }

        <div class="cal-hours">
          @for (h of hours; track h) {
            <div class="cal-hour" [style.height.px]="hourPx">{{ h }}:00</div>
          }
        </div>
        @for (day of days(); track day.date.getTime()) {
          <div class="cal-day" [class.today]="day.isToday" [style.height.px]="hours.length * hourPx">
            @for (h of hours; track h) {
              <div class="cal-slot" [style.height.px]="hourPx"></div>
            }
            @for (b of day.blocks; track b.booking.id) {
              <button class="cal-block"
                      [style.top.px]="b.top" [style.height.px]="b.height"
                      [style.left]="'calc(' + (b.lane * 100 / b.lanes) + '% + 2px)'"
                      [style.width]="'calc(' + (100 / b.lanes) + '% - 4px)'"
                      [style.--c]="b.color"
                      (click)="select.emit(b.booking)"
                      [title]="b.booking.resourceId + ' · ' + b.label">
                <span class="cal-block-title">{{ b.booking.resourceId }}</span>
                <span class="cal-block-time">{{ b.booking.from | date: 'HH:mm' }}–{{ b.booking.to | date: 'HH:mm' }}</span>
              </button>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .cal-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; padding: 1rem 1.25rem; border-bottom: 1px solid var(--border); }
    .cal-range { font-weight: 700; text-transform: capitalize; }
    .cal-scroll { overflow-x: auto; }
    .cal-grid { display: grid; grid-template-columns: 58px repeat(7, minmax(110px, 1fr)); min-width: 840px; }
    .cal-corner { border-bottom: 1px solid var(--border); }
    .cal-dayhead { text-align: center; padding: 0.6rem 0; border-bottom: 1px solid var(--border); border-left: 1px solid var(--border); font-size: 0.75rem; color: var(--text-muted); text-transform: capitalize; display: flex; flex-direction: column; }
    .cal-dayhead strong { font-size: 1.15rem; color: var(--text); }
    .cal-dayhead.today strong { color: var(--primary-contrast); background: var(--primary); width: 32px; height: 32px; border-radius: 50%; display: grid; place-items: center; margin: 0 auto; }
    .cal-hours { display: flex; flex-direction: column; }
    .cal-hour { font-size: 0.7rem; color: var(--text-soft); text-align: right; padding-right: 0.5rem; transform: translateY(-0.45rem); }
    .cal-day { position: relative; border-left: 1px solid var(--border); }
    .cal-day.today { background: var(--primary-soft); }
    .cal-slot { border-bottom: 1px dashed var(--border); }
    .cal-block {
      position: absolute; border: none; border-left: 3px solid var(--c); border-radius: 7px;
      background: color-mix(in srgb, var(--c) 18%, var(--surface)); color: var(--text);
      padding: 0.25rem 0.4rem; text-align: left; overflow: hidden; display: flex; flex-direction: column;
      font-size: 0.72rem; line-height: 1.25; cursor: pointer; transition: transform 0.12s, box-shadow 0.12s;
    }
    .cal-block:hover { transform: translateY(-1px); box-shadow: var(--shadow); z-index: 2; }
    .cal-block-title { font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .cal-block-time { color: var(--text-muted); }
  `],
})
export class WeekCalendar {
  readonly bookings = input<Booking[]>([]);
  readonly select = output<Booking>();

  protected readonly hourPx = HOUR_PX;
  protected readonly hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);
  protected weekStart = signal(startOfWeek(new Date()));

  protected days = computed<Day[]>(() => {
    const start = this.weekStart();
    const today = new Date().toDateString();
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      return { date, isToday: date.toDateString() === today, blocks: this.blocksFor(date) };
    });
  });

  protected weekCount = computed(() => {
    const ids = new Set<number | undefined>();
    this.days().forEach((d) => d.blocks.forEach((b) => ids.add(b.booking.id)));
    return ids.size;
  });

  shift(days: number): void {
    const next = new Date(this.weekStart());
    next.setDate(next.getDate() + days);
    this.weekStart.set(next);
  }

  goToday(): void {
    this.weekStart.set(startOfWeek(new Date()));
  }

  /** Ubica las reservas del día (recortadas a 07–23 h) y reparte en carriles las que se solapan. */
  private blocksFor(day: Date): Block[] {
    const dayStart = new Date(day);
    dayStart.setHours(START_HOUR, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(END_HOUR, 0, 0, 0);

    const items = this.bookings()
      .map((b) => ({ b, from: new Date(b.from), to: new Date(b.to) }))
      .filter(({ from, to }) => from < dayEnd && to > dayStart)
      .sort((x, y) => x.from.getTime() - y.from.getTime());

    const laneEnds: number[] = [];
    const placed = items.map(({ b, from, to }) => {
      const start = Math.max(from.getTime(), dayStart.getTime());
      const end = Math.min(to.getTime(), dayEnd.getTime());
      let lane = laneEnds.findIndex((e) => e <= start);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(end);
      } else {
        laneEnds[lane] = end;
      }
      const meta = statusMeta(b.status);
      return {
        booking: b,
        top: ((start - dayStart.getTime()) / 3_600_000) * HOUR_PX,
        height: Math.max(((end - start) / 3_600_000) * HOUR_PX - 2, 22),
        lane,
        lanes: 1,
        color: meta.color,
        label: meta.label,
      };
    });
    placed.forEach((p) => (p.lanes = Math.max(laneEnds.length, 1)));
    return placed;
  }
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const diff = (d.getDay() + 6) % 7; // lunes = 0
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
