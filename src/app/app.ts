import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { MsalBroadcastService, MsalService } from '@azure/msal-angular';
import { AuthenticationResult, EventMessage, EventType } from '@azure/msal-browser';
import { filter } from 'rxjs/operators';
import { environment } from '../environments/environment';
import { UserService } from './services/user.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
    protected readonly title = signal('ngfrontend-campuslab');

    private msalService = inject(MsalService);
    private msalBroadcastService = inject(MsalBroadcastService);
    protected userService = inject(UserService);

    isLoggedIn = false;

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

        this.checkLoginStatus();
    }

    checkLoginStatus(): void {
        try {
            const activeAccount = this.msalService.instance.getActiveAccount();
            if (!activeAccount && this.msalService.instance.getAllAccounts().length > 0) {
                this.msalService.instance.setActiveAccount(this.msalService.instance.getAllAccounts()[0]);
            }
            this.isLoggedIn = !!this.msalService.instance.getActiveAccount();
            if (this.isLoggedIn) {
                this.userService.load().subscribe();
            }
        } catch {
            this.isLoggedIn = false;
        }
    }

    login(): void {
        // Se pide directamente el scope del BFF para que el interceptor obtenga el token sin otro consentimiento
        this.msalService.loginRedirect({
            scopes: environment.apiConfig.scopes
        });
    }

    logout(): void {
        this.msalService.logoutRedirect();
    }
}