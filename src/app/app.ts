import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MsalBroadcastService, MsalService } from '@azure/msal-angular';
import { AuthenticationResult, EventMessage, EventType } from '@azure/msal-browser';
import { filter } from 'rxjs/operators';
import { environment } from '../environments/environment';
import { UserService } from './services/user.service';
import { ThemeService } from './services/theme.service';
import { BookingsService } from './services/bookings.service';
import { ToastContainer } from './shared/toast-container';
import { ConfirmDialog } from './shared/confirm-dialog';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ToastContainer, ConfirmDialog],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
    private msalService = inject(MsalService);
    private msalBroadcastService = inject(MsalBroadcastService);
    private router = inject(Router);
    private route = inject(ActivatedRoute);
    private bookingsService = inject(BookingsService);
    protected userService = inject(UserService);
    protected themeService = inject(ThemeService);

    isLoggedIn = false;
    protected sidebarOpen = signal(false);
    protected pageTitle = signal('Inicio');
    /** Reservas SOLICITADAS esperando aprobación (badge del menú para Admin/Docente). */
    protected pendingCount = signal(0);
    protected readonly year = new Date().getFullYear();

    ngOnInit(): void {
        this.msalBroadcastService.msalSubject$
        .pipe(
            filter((msg: EventMessage) =>
                msg.eventType === EventType.INITIALIZE_END ||
                msg.eventType === EventType.LOGIN_SUCCESS
            )
        )
        .subscribe((result: EventMessage) => {
            if (result.eventType === EventType.LOGIN_SUCCESS) {
                const payload = result.payload as AuthenticationResult;
                this.msalService.instance.setActiveAccount(payload.account);
            }
            this.checkLoginStatus();
        });

        // Título de la barra superior según la ruta, cierre del menú móvil y refresco del badge
        this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => {
            let child = this.route.firstChild;
            while (child?.firstChild) child = child.firstChild;
            this.pageTitle.set(child?.snapshot.data['title'] ?? 'CampusLab');
            this.sidebarOpen.set(false);
            this.refreshPending();
        });

        this.checkLoginStatus();
    }

    checkLoginStatus(): void {
        try {
            const activeAccount = this.msalService.instance.getActiveAccount();
            if (!activeAccount) {
                // Solo sirven cuentas del tenant de la app: otras (p. ej. una cuenta personal) no obtienen token del BFF
                const tenantAccount = this.msalService.instance
                    .getAllAccounts()
                    .find((account) => account.tenantId === environment.azure.tenantId);
                if (tenantAccount) {
                    this.msalService.instance.setActiveAccount(tenantAccount);
                }
            }
            this.isLoggedIn = !!this.msalService.instance.getActiveAccount();
            if (this.isLoggedIn) {
                this.userService.load().subscribe(() => this.refreshPending());
            }
        } catch {
            this.isLoggedIn = false;
        }
    }

    private refreshPending(): void {
        if (!this.isLoggedIn || !this.userService.canManageBookings()) return;
        this.bookingsService.getAll('SOLICITADA').subscribe({
            next: (list) => this.pendingCount.set(list.length),
            error: () => this.pendingCount.set(0),
        });
    }

    login(): void {
        // Se pide directamente el scope del BFF para que el interceptor obtenga el token sin otro consentimiento
        this.msalService.loginRedirect({
            scopes: environment.apiConfig.scopes,
            // Deja elegir cuenta en vez de reutilizar en silencio la última sesión de Microsoft
            prompt: 'select_account'
        });
    }

    logout(): void {
        this.msalService.logoutRedirect();
    }
}
