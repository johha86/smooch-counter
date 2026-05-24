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
      username: 'johha86'
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
  beforeEach(async () => {
    pendingKissesServiceMock.initializeAnonymousSession.calls.reset();
    pendingKissesServiceMock.authorizeUsername.calls.reset();
    pendingKissesServiceMock.loadSummary.calls.reset();

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
    expect(compiled.textContent).toContain('Autorizado como johha86');
  });
});
