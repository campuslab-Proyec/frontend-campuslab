import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface QueueSummary {
  name: string;
  messages: number;
  messagesReady: number;
  messagesUnacknowledged: number;
  consumers: number;
  durable: boolean;
  autoDelete: boolean;
  deadLetterExchange: string | null;
  messageTtl: number | null;
  managed: boolean;
}

export interface NodeSummary {
  name: string;
  running: boolean;
  type: string;
  uptimeMs: number;
  memoryUsed: number;
  memoryLimit: number;
  partitions: number;
}

export interface ExchangeSummary {
  name: string;
  type: string;
  durable: boolean;
  autoDelete: boolean;
  managed: boolean;
}

export interface BindingSummary {
  exchange: string;
  queue: string;
  routingKey: string;
}

export interface CreateQueueRequest {
  name: string;
  durable?: boolean;
  autoDelete?: boolean;
  deadLetterExchange?: string | null;
  deadLetterRoutingKey?: string | null;
  messageTtl?: number | null;
  maxLength?: number | null;
}

export interface CreateExchangeRequest {
  name: string;
  type: 'direct' | 'topic' | 'fanout' | 'headers';
  durable?: boolean;
  autoDelete?: boolean;
}

export interface BindingRequest {
  queue: string;
  exchange: string;
  routingKey?: string;
}

export interface PublishMessageRequest {
  exchange: string;
  routingKey?: string;
  payload: Record<string, unknown>;
}

/**
 * Las operaciones que modifican devuelven la HttpResponse completa (observe: 'response') para que el panel
 * muestre el código HTTP real (201, 202, 204, 400, 404, 409...).
 */
export type ApiResponse = Observable<HttpResponse<any>>;

/** API de administración de RabbitMQ de ms-campuslab-notify, a través del BFF (/api/bff/admin, solo Admin). */
@Injectable({ providedIn: 'root' })
export class RabbitAdminService {
  private http = inject(HttpClient);
  private base = `${environment.bffUrl}/admin`;

  listNodes(): Observable<NodeSummary[]> {
    return this.http.get<NodeSummary[]>(`${this.base}/nodes`);
  }

  listQueues(): Observable<QueueSummary[]> {
    return this.http.get<QueueSummary[]>(`${this.base}/queues`);
  }

  createQueue(req: CreateQueueRequest): ApiResponse {
    return this.http.post(`${this.base}/queues`, req, { observe: 'response' });
  }

  deleteQueue(name: string, ifEmpty = false): ApiResponse {
    return this.http.delete(`${this.base}/queues/${encodeURIComponent(name)}`, { params: { ifEmpty }, observe: 'response' });
  }

  purgeQueue(name: string): ApiResponse {
    return this.http.delete(`${this.base}/queues/${encodeURIComponent(name)}/messages`, { observe: 'response' });
  }

  listExchanges(): Observable<ExchangeSummary[]> {
    return this.http.get<ExchangeSummary[]>(`${this.base}/exchanges`);
  }

  createExchange(req: CreateExchangeRequest): ApiResponse {
    return this.http.post(`${this.base}/exchanges`, req, { observe: 'response' });
  }

  deleteExchange(name: string): ApiResponse {
    return this.http.delete(`${this.base}/exchanges/${encodeURIComponent(name)}`, { observe: 'response' });
  }

  listBindings(): Observable<BindingSummary[]> {
    return this.http.get<BindingSummary[]>(`${this.base}/bindings`);
  }

  createBinding(req: BindingRequest): ApiResponse {
    return this.http.post(`${this.base}/bindings`, req, { observe: 'response' });
  }

  deleteBinding(req: BindingRequest): ApiResponse {
    return this.http.delete(`${this.base}/bindings`, { body: req, observe: 'response' });
  }

  publish(req: PublishMessageRequest): ApiResponse {
    return this.http.post(`${this.base}/messages`, req, { observe: 'response' });
  }
}
