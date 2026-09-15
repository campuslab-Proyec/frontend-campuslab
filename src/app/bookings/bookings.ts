import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BookingsService, Booking } from '../services/bookings.service';

@Component({
  selector: 'app-bookings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './bookings.html',
  styleUrl: './bookings.css',
})
export class Bookings implements OnInit {
  private bookingsService = inject(BookingsService);

  bookings = signal<Booking[]>([]);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);

  statusOptions = ['SOLICITADA', 'APROBADA', 'EN_PREPARACION', 'EN_USO', 'DEVUELTA', 'CANCELADA'];
  filterStatus = '';

  newBooking: Booking = {
    resourceId: '',
    studentId: '',
    from: '',
    to: '',
  };

  ngOnInit(): void {
    this.loadBookings();
  }

  loadBookings(): void {
    this.loading.set(true);
    this.error.set(null);

    // MsalInterceptor adjunta automáticamente la cabecera Authorization: Bearer <token>
    this.bookingsService.getAll(this.filterStatus || undefined).subscribe({
      next: (data) => {
        this.bookings.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.message ?? 'Error al conectar con la API');
        this.loading.set(false);
      },
    });
  }

  createBooking(): void {
    if (
      !this.newBooking.resourceId ||
      !this.newBooking.studentId ||
      !this.newBooking.from ||
      !this.newBooking.to
    ) {
      this.error.set('Completa todos los campos antes de crear la reserva.');
      return;
    }

    this.bookingsService.create(this.newBooking).subscribe({
      next: () => {
        this.newBooking = { resourceId: '', studentId: '', from: '', to: '' };
        this.loadBookings();
      },
      error: (err) => this.error.set(err?.message ?? 'No se pudo crear la reserva.'),
    });
  }

  changeStatus(booking: Booking, newStatus: string): void {
    if (!booking.id) return;
    this.bookingsService.updateStatus(booking.id, newStatus).subscribe({
      next: () => this.loadBookings(),
      error: (err) => this.error.set(err?.message ?? 'No se pudo actualizar el estado.'),
    });
  }

  onFilterChange(): void {
    this.loadBookings();
  }
}
