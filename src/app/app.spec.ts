import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MsalBroadcastService, MsalService } from '@azure/msal-angular';
import { EMPTY, of } from 'rxjs';
import { App } from './app';
import { UserService } from './services/user.service';

describe('App', () => {
  beforeEach(async () => {
    // Dobles mínimos de MSAL: usuario sin sesión iniciada
    const msalServiceStub = {
      instance: {
        getActiveAccount: () => null,
        getAllAccounts: () => [],
        setActiveAccount: () => {},
      },
      loginRedirect: () => EMPTY,
      logoutRedirect: () => EMPTY,
    };

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        { provide: MsalService, useValue: msalServiceStub },
        { provide: MsalBroadcastService, useValue: { msalSubject$: EMPTY } },
        { provide: UserService, useValue: { user: signal(null), isAdmin: signal(false), load: () => of(null) } },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render title', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('CampusLab');
  });
});
