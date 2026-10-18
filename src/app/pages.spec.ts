import { computed, signal, Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { LOCALE_ID } from '@angular/core';
import { of } from 'rxjs';
import { UserService } from './services/user.service';
import { Home } from './home/home';
import { Bookings } from './bookings/bookings';
import { CatalogComponent } from './catalog/catalog.component';
import { Audit } from './audit/audit';
import { Report } from './report/report';
import { RabbitAdmin } from './rabbit-admin/rabbit-admin';

registerLocaleData(localeEs);

/** Fecha local "yyyy-MM-ddTHH:mm:ss" desplazada N horas desde ahora (formato del backend). */
function at(hoursFromNow: number): string {
  const d = new Date(Date.now() + hoursFromNow * 3_600_000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00`;
}

const BOOKINGS = [
  { id: 1, resourceId: 'EQ-OSC-01', studentId: 'alumno@duocuc.cl', status: 'SOLICITADA', from: at(2), to: at(4), createdAt: at(-1) },
  { id: 2, resourceId: 'LAB-CLOUD', studentId: 'otro@duocuc.cl', status: 'EN_USO', from: at(-3), to: at(-1), createdAt: at(-30) },
  { id: 3, resourceId: 'SUP-ARD-01', studentId: 'alumno@duocuc.cl', status: 'DEVUELTA', from: at(-50), to: at(-48), createdAt: at(-60) },
  { id: 4, resourceId: 'EQ-OSC-01', studentId: 'otro@duocuc.cl', status: 'CANCELADA', from: at(5), to: at(6), createdAt: at(-2) },
];
const LABS = [{ id: 1, code: 'LAB-CLOUD', name: 'Laboratorio Redes & Cloud', location: 'Edificio A', capacity: 30, isAvailable: true }];
const RESOURCES = [
  { id: 1, code: 'EQ-OSC-01', name: 'Osciloscopio Digital', category: 'EQUIPMENT', stock: 10, isAvailable: true },
  { id: 2, code: 'SUP-ARD-01', name: 'Kit Arduino Uno R3', category: 'SUPPLY', stock: 3, isAvailable: true },
];
const AUDIT = [
  { id: 1, bookingId: '1', action: 'SOLICITADA', actorId: 'abc', actorRole: 'Estudiante', timestamp: at(-1) },
  { id: 2, bookingId: '2', action: 'EN_USO', actorId: 'def', actorRole: 'Admin,Docente', timestamp: at(-3) },
];
const QUEUES = [
  { name: 'q.cmd.email', messages: 2, messagesReady: 2, messagesUnacknowledged: 0, consumers: 1, durable: true, autoDelete: false, deadLetterExchange: 'cmd.dead.dlx', messageTtl: null, managed: true },
  { name: 'q.cmd.email.dlq', messages: 1, messagesReady: 1, messagesUnacknowledged: 0, consumers: 0, durable: true, autoDelete: false, deadLetterExchange: null, messageTtl: null, managed: true },
  { name: 'demo.admin.queue', messages: 0, messagesReady: 0, messagesUnacknowledged: 0, consumers: 0, durable: true, autoDelete: false, deadLetterExchange: null, messageTtl: 60000, managed: false },
];
const EXCHANGES = [{ name: 'cmd.direct', type: 'direct', durable: true, autoDelete: false, managed: true }];
const BINDINGS = [{ exchange: 'cmd.direct', queue: 'q.cmd.email', routingKey: 'email.send' }];

/** Responde las peticiones pendientes según la URL, hasta que no quede ninguna. */
function flushAll(http: HttpTestingController): void {
  for (let round = 0; round < 5; round++) {
    const pending = http.match(() => true);
    if (!pending.length) return;
    for (const req of pending) {
      const url = req.request.urlWithParams;
      if (url.includes('/bookings') && url.includes('/history')) req.flush(AUDIT);
      else if (url.includes('/bookings')) req.flush(BOOKINGS);
      else if (url.includes('/catalog/labs')) req.flush(LABS);
      else if (url.includes('/catalog/resources')) req.flush(RESOURCES);
      else if (url.includes('/audit/events')) req.flush(AUDIT);
      else if (url.includes('/report/kpis')) req.flush({ totalBookings: 4, activeBookings: 1, completedBookings: 1, avgCycleTimeMinutes: 42.5 });
      else if (url.includes('/report/top-resources')) req.flush([{ resourceId: 'EQ-OSC-01', totalBookings: 2 }]);
      else if (url.includes('/admin/queues')) req.flush(QUEUES);
      else if (url.includes('/admin/exchanges')) req.flush(EXCHANGES);
      else if (url.includes('/admin/bindings')) req.flush(BINDINGS);
      else req.flush([]);
    }
  }
}

function userStub(roles: string[]) {
  const user = signal({ name: 'Ana Pérez', username: 'alumno@duocuc.cl', roles });
  const isAdmin = computed(() => roles.includes('Admin'));
  const isDocente = computed(() => roles.includes('Docente'));
  return {
    user,
    roles: computed(() => roles),
    isAdmin,
    isDocente,
    isStudent: computed(() => !isAdmin() && !isDocente()),
    canManageBookings: computed(() => isAdmin() || isDocente()),
    primaryRole: computed(() => (isAdmin() ? 'Administrador' : isDocente() ? 'Docente' : 'Estudiante')),
    firstName: computed(() => 'Ana'),
    initials: computed(() => 'AP'),
    load: () => of(user()),
    hasRole: (r: string) => of(roles.includes(r)),
  };
}

async function render<T>(component: Type<T>, roles: string[]) {
  await TestBed.configureTestingModule({
    imports: [component],
    providers: [
      provideRouter([]),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: LOCALE_ID, useValue: 'es' },
      { provide: UserService, useValue: userStub(roles) },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(component);
  const http = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  flushAll(http);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement as HTMLElement, http };
}

describe('Páginas (smoke)', () => {
  for (const roles of [['Admin'], ['Docente'], ['Estudiante']]) {
    describe(`rol ${roles[0]}`, () => {
      it('Inicio muestra el saludo y los KPIs', async () => {
        const { el } = await render(Home, roles);
        expect(el.textContent).toContain('Ana');
        expect(el.querySelectorAll('.stat-card').length).toBe(4);
        if (roles[0] !== 'Estudiante') expect(el.textContent).toContain('Por aprobar');
      });

      it('Reservas lista las reservas con nombres del catálogo', async () => {
        const { el } = await render(Bookings, roles);
        expect(el.textContent).toContain('Osciloscopio Digital');
        const canManage = roles[0] !== 'Estudiante';
        expect(el.textContent?.includes('Aprobar')).toBe(canManage);
      });

      it('Catálogo muestra laboratorios en tarjetas', async () => {
        const { el } = await render(CatalogComponent, roles);
        expect(el.textContent).toContain('Laboratorio Redes & Cloud');
        expect(el.querySelectorAll('.item-card').length).toBe(1);
      });
    });
  }

  it('Reservas abre el detalle con la línea de tiempo', async () => {
    const { fixture, el, http } = await render(Bookings, ['Admin']);
    (fixture.componentInstance as Bookings).open(BOOKINGS[0] as any);
    fixture.detectChanges();
    flushAll(http);
    fixture.detectChanges();
    expect(el.querySelector('.drawer')).toBeTruthy();
    expect(el.querySelectorAll('.tl-item').length).toBe(5);
  });

  it('Reservas cambia a vista de calendario', async () => {
    const { fixture, el } = await render(Bookings, ['Admin']);
    (fixture.componentInstance as any).view.set('calendar');
    fixture.detectChanges();
    expect(el.querySelectorAll('.cal-dayhead').length).toBe(7);
  });

  it('Auditoría muestra eventos y resumen por acción', async () => {
    const { el } = await render(Audit, ['Admin']);
    expect(el.querySelectorAll('tbody tr').length).toBe(2);
    expect(el.textContent).toContain('Eventos registrados');
  });

  it('Reportes muestra KPIs y gráficos', async () => {
    const { el } = await render(Report, ['Admin']);
    expect(el.textContent).toContain('42,5');
    expect(el.querySelectorAll('app-chart').length).toBeGreaterThanOrEqual(3);
  });

  it('Panel RabbitMQ lista colas, marca DLQ y protege las propias', async () => {
    const { el } = await render(RabbitAdmin, ['Admin']);
    expect(el.textContent).toContain('q.cmd.email.dlq');
    expect(el.textContent).toContain('mensaje(s) en colas DLQ');
    const deleteButtons = Array.from(el.querySelectorAll('button[title="Eliminar cola"]'));
    expect(deleteButtons.length).toBe(1); // solo demo.admin.queue (las propias están protegidas)
  });
});
