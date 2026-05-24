import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AppComponent } from './app.component';
import { PendingKissesService } from './services/pending-kisses.service';

const pendingKissesServiceMock = {
  initializeAnonymousSession: jasmine.createSpy('initializeAnonymousSession').and.returnValue(of(void 0)),
  authorizeUsername: jasmine.createSpy('authorizeUsername').and.returnValue(
    of({
      sessionId: 7,
      userId: 3,
      username: 'johha86',
      usernameA: 'guapo',
      usernameB: 'bonita'
    })
  ),
  loadSummary: jasmine.createSpy('loadSummary').and.returnValue(
    of({
      totalPendingKisses: 11,
      eventCount: 2,
      latestEventAt: '2026-05-24T12:00:00.000Z'
    })
  ),
  addKisses: jasmine.createSpy('addKisses'),
  clearAll: jasmine.createSpy('clearAll')
};

describe('AppComponent', () => {
  let localStorageState: Record<string, string>;

  beforeEach(async () => {
    pendingKissesServiceMock.initializeAnonymousSession.calls.reset();
    pendingKissesServiceMock.authorizeUsername.calls.reset();
    pendingKissesServiceMock.loadSummary.calls.reset();
    localStorageState = {};

    spyOn(window.localStorage, 'getItem').and.callFake((key: string) => localStorageState[key] ?? null);
    spyOn(window.localStorage, 'setItem').and.callFake((key: string, value: string) => {
      localStorageState[key] = value;
    });
    spyOn(window.localStorage, 'removeItem').and.callFake((key: string) => {
      delete localStorageState[key];
    });

    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [{ provide: PendingKissesService, useValue: pendingKissesServiceMock }]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should have the required title', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('Besos & Caricias Pendientes');
  });

  it('should render the username gate before authorization', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Besos & Caricias Pendientes');
    expect(compiled.querySelector('.username-input')).not.toBeNull();
    expect(compiled.querySelector('.score-value')).toBeNull();
  });

  it('should render the counter after a valid username is authorized', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    fixture.detectChanges();

    app.usernameInput = 'johha86';
    app.authorizeUser();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.score-value')?.textContent).toContain('11');
    expect(compiled.textContent).toContain('Pendientes de guapo and bonita');
    expect(compiled.textContent).toContain('Bukake de Besos');
    expect(window.localStorage.setItem).toHaveBeenCalledWith('smooch-counter.authorized-username', 'johha86');
  });

  it('should restore the saved username session on load', () => {
    localStorageState['smooch-counter.authorized-username'] = 'johha86';

    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    expect(pendingKissesServiceMock.authorizeUsername).toHaveBeenCalledWith('johha86');
  });

  it('should remove the saved session when changing user', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    fixture.detectChanges();

    app.usernameInput = 'johha86';
    app.authorizeUser();
    app.clearAuthorization();

    expect(window.localStorage.removeItem).toHaveBeenCalledWith('smooch-counter.authorized-username');
  });
});
