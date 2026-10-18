/**
 * Ciclo de vida de una reserva. Debe coincidir con BookingStatus de ms-campuslab-bookings,
 * que valida las mismas transiciones en el backend (responde 409 si no son válidas).
 */
export type BookingStatus = 'SOLICITADA' | 'APROBADA' | 'EN_PREPARACION' | 'EN_USO' | 'DEVUELTA' | 'CANCELADA';

export interface StatusMeta {
  label: string;
  icon: string;
  tone: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'violet' | 'neutral';
  /** Color sólido para gráficos y calendario (independiente del tema). */
  color: string;
}

export const STATUS_META: Record<BookingStatus, StatusMeta> = {
  SOLICITADA: { label: 'Solicitada', icon: 'bi-hourglass-split', tone: 'warning', color: '#f59e0b' },
  APROBADA: { label: 'Aprobada', icon: 'bi-check2-circle', tone: 'info', color: '#0ea5e9' },
  EN_PREPARACION: { label: 'En preparación', icon: 'bi-tools', tone: 'violet', color: '#8b5cf6' },
  EN_USO: { label: 'En uso', icon: 'bi-play-circle', tone: 'primary', color: '#6366f1' },
  DEVUELTA: { label: 'Devuelta', icon: 'bi-box-arrow-in-left', tone: 'success', color: '#22c55e' },
  CANCELADA: { label: 'Cancelada', icon: 'bi-x-circle', tone: 'danger', color: '#ef4444' },
};

export const ALL_STATUSES = Object.keys(STATUS_META) as BookingStatus[];

/** Camino feliz, usado por la línea de tiempo. */
export const FLOW: BookingStatus[] = ['SOLICITADA', 'APROBADA', 'EN_PREPARACION', 'EN_USO', 'DEVUELTA'];

export const TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  SOLICITADA: ['APROBADA', 'CANCELADA'],
  APROBADA: ['EN_PREPARACION', 'CANCELADA'],
  EN_PREPARACION: ['EN_USO', 'CANCELADA'],
  EN_USO: ['DEVUELTA'],
  DEVUELTA: [],
  CANCELADA: [],
};

/** Verbo del botón que lleva a cada estado. */
export const ACTION_LABEL: Record<BookingStatus, { text: string; icon: string; btn: string }> = {
  SOLICITADA: { text: 'Solicitar', icon: 'bi-send', btn: 'btn-soft-primary' },
  APROBADA: { text: 'Aprobar', icon: 'bi-check-lg', btn: 'btn-soft-success' },
  EN_PREPARACION: { text: 'Preparar', icon: 'bi-tools', btn: 'btn-soft-primary' },
  EN_USO: { text: 'Entregar', icon: 'bi-box-arrow-right', btn: 'btn-soft-primary' },
  DEVUELTA: { text: 'Recibir devolución', icon: 'bi-box-arrow-in-left', btn: 'btn-soft-success' },
  CANCELADA: { text: 'Cancelar', icon: 'bi-x-lg', btn: 'btn-soft-danger' },
};

export function statusMeta(status?: string | null): StatusMeta {
  return STATUS_META[(status ?? '') as BookingStatus] ?? {
    label: status ?? '—', icon: 'bi-question-circle', tone: 'neutral', color: '#94a3b8',
  };
}

export function nextStatuses(status?: string | null): BookingStatus[] {
  return TRANSITIONS[(status ?? '') as BookingStatus] ?? [];
}

export function isActive(status?: string | null): boolean {
  return status === 'APROBADA' || status === 'EN_PREPARACION' || status === 'EN_USO';
}

export function isFinal(status?: string | null): boolean {
  return status === 'DEVUELTA' || status === 'CANCELADA';
}
