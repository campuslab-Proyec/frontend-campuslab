import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe, JsonPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';
import {
  BindingSummary, CreateExchangeRequest, CreateQueueRequest, ExchangeSummary, QueueSummary, RabbitAdminService,
} from '../services/rabbit-admin.service';
import { ToastService, apiErrorMessage } from '../services/toast.service';
import { ConfirmService } from '../services/confirm.service';

type Tab = 'queues' | 'exchanges' | 'bindings' | 'publish';

/** Último request a la API de administración, para mostrar método, ruta, código y respuesta. */
interface ApiCall {
  method: string;
  path: string;
  body?: unknown;
  status: number;
  ok: boolean;
  response: unknown;
  at: Date;
}

/** Mismas reglas que valida ms-campuslab-notify (AdminPatterns), para avisar antes de enviar. */
const NAME_RE = /^[A-Za-z0-9._:-]+$/;
const ROUTING_KEY_RE = /^[A-Za-z0-9._:*#-]*$/;

const TEMPLATES: { label: string; icon: string; exchange: string; routingKey: string; payload: object; hint: string }[] = [
  {
    label: 'Correo válido', icon: 'bi-envelope-check', exchange: 'cmd.direct', routingKey: 'email.send',
    payload: { recipient: 'alumno@duocuc.cl', subject: 'Reserva aprobada', message: 'Tu reserva fue aprobada', type: 'EMAIL' },
    hint: 'EmailConsumer lo procesa y confirma con basicAck.',
  },
  {
    label: 'Correo inválido → DLQ', icon: 'bi-envelope-x', exchange: 'cmd.direct', routingKey: 'email.send',
    payload: { recipient: '', subject: 'Sin destinatario', message: 'Este mensaje falla', type: 'EMAIL' },
    hint: 'Sin destinatario: basicNack sin reencolar y termina en q.cmd.email.dlq.',
  },
  {
    label: 'Evento de reserva', icon: 'bi-calendar-event', exchange: 'cmd.direct', routingKey: 'booking.status.changed',
    payload: {
      type: 'BOOKING_STATUS_CHANGED', eventId: 'demo-1',
      payload: { bookingId: 99, resourceId: 'EQ-OSC-01', studentId: 'alumno@duocuc.cl', status: 'APROBADA' },
    },
    hint: 'Lo consume BookingEventConsumer (notify.booking.queue).',
  },
  {
    label: 'Ticket de preparación', icon: 'bi-tools', exchange: 'cmd.direct', routingKey: 'prep.ticket',
    payload: { recipient: 'OPERATIONS_TEAM', subject: 'PREP_REQUIRED', message: 'Preparar 2 osciloscopios para LAB-ELEC', type: 'PREP' },
    hint: 'Lo consume PreparationConsumer (q.cmd.prep).',
  },
];

@Component({
  selector: 'app-rabbit-admin',
  standalone: true,
  imports: [DatePipe, DecimalPipe, JsonPipe, FormsModule],
  templateUrl: './rabbit-admin.html',
  styleUrl: './rabbit-admin.css',
})
export class RabbitAdmin implements OnInit {
  private api = inject(RabbitAdminService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);

  protected readonly templates = TEMPLATES;

  protected tab = signal<Tab>('queues');
  protected queues = signal<QueueSummary[]>([]);
  protected exchanges = signal<ExchangeSummary[]>([]);
  protected bindings = signal<BindingSummary[]>([]);
  protected loading = signal(true);
  protected online = signal(true);
  protected updatedAt = signal<Date | null>(null);
  protected autoRefresh = signal(true);
  protected search = signal('');
  protected lastCall = signal<ApiCall | null>(null);
  protected busy = signal(false);

  // ---- formularios ----
  protected showQueueForm = signal(false);
  protected showExchangeForm = signal(false);
  protected showBindingForm = signal(false);
  protected submitted = signal(false);
  protected queueForm = this.emptyQueue();
  protected exchangeForm: CreateExchangeRequest = { name: '', type: 'direct', durable: true, autoDelete: false };
  protected bindingForm = { queue: '', exchange: '', routingKey: '' };
  protected publishForm = { exchange: 'cmd.direct', routingKey: 'email.send', payload: JSON.stringify(TEMPLATES[0].payload, null, 2) };
  protected publishHint = signal(TEMPLATES[0].hint);

  protected stats = computed(() => {
    const q = this.queues();
    const dlqs = q.filter((x) => this.isDlq(x));
    return {
      queues: q.length,
      messages: q.reduce((s, x) => s + x.messages, 0),
      dead: dlqs.reduce((s, x) => s + x.messages, 0),
      consumers: q.reduce((s, x) => s + x.consumers, 0),
      exchanges: this.exchanges().length,
      bindings: this.bindings().length,
    };
  });

  protected filteredQueues = computed(() => {
    const term = this.search().trim().toLowerCase();
    return this.queues().filter((q) => !term || q.name.toLowerCase().includes(term));
  });

  protected filteredExchanges = computed(() => {
    const term = this.search().trim().toLowerCase();
    return this.exchanges().filter((e) => !term || e.name.toLowerCase().includes(term));
  });

  protected filteredBindings = computed(() => {
    const term = this.search().trim().toLowerCase();
    return this.bindings().filter((b) => !term || [b.exchange, b.queue, b.routingKey].some((v) => v.toLowerCase().includes(term)));
  });

  private managedQueues = computed(() => new Set(this.queues().filter((q) => q.managed).map((q) => q.name)));
  private managedExchanges = computed(() => new Set(this.exchanges().filter((e) => e.managed).map((e) => e.name)));

  constructor() {
    const timer = setInterval(() => {
      if (this.autoRefresh() && !document.hidden) this.refresh(true);
    }, 5000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  ngOnInit(): void {
    this.refresh();
  }

  refresh(silent = false): void {
    if (!silent) this.loading.set(true);
    forkJoin({
      queues: this.api.listQueues(),
      exchanges: this.api.listExchanges(),
      bindings: this.api.listBindings(),
    }).subscribe({
      next: ({ queues, exchanges, bindings }) => {
        this.queues.set(queues);
        this.exchanges.set(exchanges);
        this.bindings.set(bindings);
        this.online.set(true);
        this.updatedAt.set(new Date());
        this.loading.set(false);
      },
      error: (err) => {
        this.online.set(false);
        this.loading.set(false);
        if (!silent) this.toast.error('No se pudo consultar RabbitMQ', apiErrorMessage(err));
      },
    });
  }

  setTab(tab: Tab): void {
    this.tab.set(tab);
    this.submitted.set(false);
  }

  isDlq(q: QueueSummary): boolean {
    return q.name.endsWith('.dlq');
  }

  /** Los bindings entre una cola y un exchange propios de la aplicación no se pueden borrar. */
  isManagedBinding(b: BindingSummary): boolean {
    return this.managedQueues().has(b.queue) && this.managedExchanges().has(b.exchange);
  }

  // ================= VALIDACIÓN EN EL CLIENTE =================

  protected nameError(name: string, kind: string): string | null {
    if (!name?.trim()) return `El nombre ${kind} es obligatorio`;
    if (name.length > 255) return 'Máximo 255 caracteres';
    if (!NAME_RE.test(name)) return 'Solo letras, números y . _ : -';
    if (name.startsWith('amq.')) return "El prefijo 'amq.' está reservado por RabbitMQ";
    return null;
  }

  protected queueErrors(): Record<string, string> {
    const f = this.queueForm;
    const e: Record<string, string> = {};
    const n = this.nameError(f.name, 'de la cola');
    if (n) e['name'] = n;
    else if (this.queues().some((q) => q.name === f.name)) e['name'] = 'Ya existe una cola con ese nombre';
    if (f.deadLetterRoutingKey && !f.deadLetterExchange) e['deadLetterRoutingKey'] = 'Requiere elegir un dead-letter exchange';
    if (f.deadLetterRoutingKey && !ROUTING_KEY_RE.test(f.deadLetterRoutingKey)) e['deadLetterRoutingKey'] = 'Caracteres no permitidos';
    if (f.messageTtl != null && f.messageTtl <= 0) e['messageTtl'] = 'Debe ser mayor que 0';
    if (f.maxLength != null && f.maxLength <= 0) e['maxLength'] = 'Debe ser mayor que 0';
    return e;
  }

  protected exchangeErrors(): Record<string, string> {
    const e: Record<string, string> = {};
    const n = this.nameError(this.exchangeForm.name, 'del exchange');
    if (n) e['name'] = n;
    else if (this.exchanges().some((x) => x.name === this.exchangeForm.name)) e['name'] = 'Ya existe un exchange con ese nombre';
    return e;
  }

  protected bindingErrors(): Record<string, string> {
    const f = this.bindingForm;
    const e: Record<string, string> = {};
    if (!f.queue) e['queue'] = 'Selecciona una cola';
    if (!f.exchange) e['exchange'] = 'Selecciona un exchange';
    if (!ROUTING_KEY_RE.test(f.routingKey)) e['routingKey'] = 'Solo letras, números y . _ : - * #';
    const type = this.exchanges().find((x) => x.name === f.exchange)?.type;
    if (type === 'direct' && !f.routingKey) e['routingKey'] = 'Un exchange direct necesita routing key';
    return e;
  }

  /** Permite enviar a propósito datos inválidos para demostrar la validación del backend. */
  protected skipClientValidation = signal(false);

  private blocked(errors: Record<string, string>): boolean {
    this.submitted.set(true);
    return !this.skipClientValidation() && Object.keys(errors).length > 0;
  }

  // ================= COLAS =================

  createQueue(): void {
    if (this.blocked(this.queueErrors())) return;
    const f = this.queueForm;
    const body: CreateQueueRequest = {
      name: f.name,
      durable: f.durable,
      autoDelete: f.autoDelete,
      deadLetterExchange: f.deadLetterExchange || null,
      deadLetterRoutingKey: f.deadLetterRoutingKey || null,
      messageTtl: f.messageTtl || null,
      maxLength: f.maxLength || null,
    };
    this.call('POST', '/admin/queues', this.api.createQueue(body), body, () => {
      this.toast.success('Cola creada', f.name);
      this.queueForm = this.emptyQueue();
      this.showQueueForm.set(false);
    });
  }

  async purgeQueue(q: QueueSummary): Promise<void> {
    const ok = await this.confirm.ask({
      title: `¿Vaciar ${q.name}?`,
      message: `Se descartarán ${q.messages} mensaje(s). La cola y sus bindings se mantienen.`,
      confirmText: 'Vaciar cola', tone: 'warning', icon: 'bi-eraser',
    });
    if (!ok) return;
    this.call('DELETE', `/admin/queues/${q.name}/messages`, this.api.purgeQueue(q.name), undefined, (res: any) =>
      this.toast.success('Cola vaciada', `${res?.purged ?? 0} mensaje(s) descartados de ${q.name}`));
  }

  async deleteQueue(q: QueueSummary): Promise<void> {
    const ok = await this.confirm.ask({
      title: `¿Eliminar la cola ${q.name}?`,
      message: q.messages ? `Tiene ${q.messages} mensaje(s) que se perderán.` : 'Esta acción no se puede deshacer.',
      confirmText: 'Eliminar', tone: 'danger', icon: 'bi-trash',
    });
    if (!ok) return;
    this.call('DELETE', `/admin/queues/${q.name}`, this.api.deleteQueue(q.name), undefined, () =>
      this.toast.success('Cola eliminada', q.name));
  }

  // ================= EXCHANGES =================

  createExchange(): void {
    if (this.blocked(this.exchangeErrors())) return;
    const body = { ...this.exchangeForm };
    this.call('POST', '/admin/exchanges', this.api.createExchange(body), body, () => {
      this.toast.success('Exchange creado', `${body.name} (${body.type})`);
      this.exchangeForm = { name: '', type: 'direct', durable: true, autoDelete: false };
      this.showExchangeForm.set(false);
    });
  }

  async deleteExchange(x: ExchangeSummary): Promise<void> {
    const ok = await this.confirm.ask({
      title: `¿Eliminar el exchange ${x.name}?`,
      message: 'También se eliminan sus bindings. Esta acción no se puede deshacer.',
      confirmText: 'Eliminar', tone: 'danger', icon: 'bi-trash',
    });
    if (!ok) return;
    this.call('DELETE', `/admin/exchanges/${x.name}`, this.api.deleteExchange(x.name), undefined, () =>
      this.toast.success('Exchange eliminado', x.name));
  }

  // ================= BINDINGS =================

  createBinding(): void {
    if (this.blocked(this.bindingErrors())) return;
    const body = { ...this.bindingForm };
    this.call('POST', '/admin/bindings', this.api.createBinding(body), body, () => {
      this.toast.success('Binding creado', `${body.exchange} → ${body.queue}`);
      this.bindingForm = { queue: '', exchange: '', routingKey: '' };
      this.showBindingForm.set(false);
    });
  }

  async deleteBinding(b: BindingSummary): Promise<void> {
    const ok = await this.confirm.ask({
      title: '¿Eliminar binding?',
      message: `${b.exchange} → ${b.queue} (${b.routingKey || 'sin routing key'})`,
      confirmText: 'Eliminar', tone: 'danger', icon: 'bi-link-45deg',
    });
    if (!ok) return;
    const body = { queue: b.queue, exchange: b.exchange, routingKey: b.routingKey };
    this.call('DELETE', '/admin/bindings', this.api.deleteBinding(body), body, () =>
      this.toast.success('Binding eliminado', `${b.exchange} → ${b.queue}`));
  }

  // ================= PUBLICAR =================

  useTemplate(t: (typeof TEMPLATES)[number]): void {
    this.publishForm = { exchange: t.exchange, routingKey: t.routingKey, payload: JSON.stringify(t.payload, null, 2) };
    this.publishHint.set(t.hint);
  }

  protected payloadError(): string | null {
    try {
      const parsed = JSON.parse(this.publishForm.payload);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return 'El mensaje debe ser un objeto JSON';
      if (!Object.keys(parsed).length) return 'El objeto JSON no puede estar vacío';
      return null;
    } catch {
      return 'JSON inválido';
    }
  }

  publish(): void {
    this.submitted.set(true);
    if (!this.publishForm.exchange) return;
    const error = this.payloadError();
    if (error && !this.skipClientValidation()) return;
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(this.publishForm.payload);
    } catch {
      return;
    }
    const body = { exchange: this.publishForm.exchange, routingKey: this.publishForm.routingKey, payload };
    this.call('POST', '/admin/messages', this.api.publish(body), body, () => {
      this.toast.success('Mensaje publicado', `${body.exchange} → ${body.routingKey || '(sin routing key)'}`);
      // Da tiempo al consumidor a procesarlo (o a mandarlo a la DLQ) antes de refrescar
      setTimeout(() => this.refresh(true), 1200);
    });
  }

  // ================= APOYO =================

  /** Ejecuta un request, registra la respuesta en el panel "Última llamada" y refresca los listados. */
  private call(method: string, path: string, obs: Observable<HttpResponse<any>>, body: unknown, onOk: (res: any) => void): void {
    this.busy.set(true);
    obs.subscribe({
      next: (res) => {
        this.lastCall.set({ method, path, body, status: res.status, ok: true, response: res.body ?? '(sin contenido)', at: new Date() });
        this.busy.set(false);
        this.submitted.set(false);
        onOk(res.body);
        this.refresh(true);
      },
      error: (err: HttpErrorResponse) => {
        let response: unknown = err.error;
        if (typeof response === 'string') {
          try { response = JSON.parse(response); } catch { /* texto plano */ }
        }
        this.lastCall.set({ method, path, body, status: err.status, ok: false, response, at: new Date() });
        this.busy.set(false);
        this.toast.error(`Error ${err.status || ''}`.trim(), apiErrorMessage(err));
      },
    });
  }

  private emptyQueue() {
    return {
      name: '', durable: true, autoDelete: false,
      deadLetterExchange: '', deadLetterRoutingKey: '',
      messageTtl: null as number | null, maxLength: null as number | null,
    };
  }
}
