import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { AuthorizedKissSession, PendingKissSummary, PendingKissesService } from './services/pending-kisses.service';

interface LoveBurst {
  id: number;
  glyph: string;
  left: number;
  top: number;
  rotationDeg: number;
  sizeRem: number;
  durationMs: number;
}

@Component({
  selector: 'app-root',
  imports: [DatePipe, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent implements OnInit, OnDestroy {
  readonly title = 'Besos & Caricias Pendientes';
  readonly increments = [1, 10, 50] as const;
  readonly totalPendingKisses = signal(0);
  readonly eventCount = signal(0);
  readonly lastEventAt = signal<string | null>(null);
  readonly busyMessage = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly activeSession = signal<AuthorizedKissSession | null>(null);
  readonly loveBursts = signal<LoveBurst[]>([]);
  readonly showWelcomeBurst = signal(false);
  readonly isBusy = computed(() => this.busyMessage() !== null);
  readonly isAuthorized = computed(() => this.activeSession() !== null);

  usernameInput = '';

  private readonly pendingKissesService = inject(PendingKissesService);
  private readonly timerIds = new Set<number>();
  private readonly storageKey = 'smooch-counter.authorized-username';
  private burstId = 0;

  ngOnInit(): void {
    this.prepareAccess();
  }

  ngOnDestroy(): void {
    for (const timerId of this.timerIds) {
      window.clearTimeout(timerId);
    }

    this.timerIds.clear();
  }

  prepareAccess(): void {
    this.errorMessage.set(null);
    this.busyMessage.set('Preparando acceso seguro...');

    this.pendingKissesService
      .initializeAnonymousSession()
      .pipe(finalize(() => this.busyMessage.set(null)))
      .subscribe({
        next: () => this.restoreAuthorization(),
        error: (error) => this.handleError(error, 'No fue posible inicializar el acceso en Supabase.')
      });
  }

  authorizeUser(): void {
    if (this.isBusy()) {
      return;
    }

    this.errorMessage.set(null);
    this.busyMessage.set('Validando usuario...');

    this.pendingKissesService
      .authorizeUsername(this.usernameInput)
      .pipe(finalize(() => this.busyMessage.set(null)))
      .subscribe({
        next: (authorizedSession) => {
          this.completeAuthorization(authorizedSession, true);
        },
        error: (error) => this.handleError(error, 'No fue posible validar el usuario.')
      });
  }

  clearAuthorization(): void {
    this.errorMessage.set(null);
    this.activeSession.set(null);
    this.totalPendingKisses.set(0);
    this.eventCount.set(0);
    this.lastEventAt.set(null);
    this.usernameInput = '';
    window.localStorage.removeItem(this.storageKey);
  }

  loadSummary(): void {
    const session = this.activeSession();
    if (!session) {
      return;
    }

    this.errorMessage.set(null);
    this.busyMessage.set('Cargando besos pendientes...');

    this.pendingKissesService
      .loadSummary(session.sessionId)
      .pipe(finalize(() => this.busyMessage.set(null)))
      .subscribe({
        next: (summary) => this.applySummary(summary),
        error: (error) => this.handleError(error, 'No fue posible cargar los besos pendientes.')
      });
  }

  addKisses(amount: number): void {
    const session = this.activeSession();
    if (!session || this.isBusy()) {
      return;
    }

    this.errorMessage.set(null);
    this.busyMessage.set(`Guardando ${amount} beso${amount === 1 ? '' : 's'}...`);

    this.pendingKissesService
      .addKisses(session.sessionId, session.username, amount)
      .pipe(finalize(() => this.busyMessage.set(null)))
      .subscribe({
        next: (summary) => {
          this.applySummary(summary);
          this.spawnLoveBursts(amount);
        },
        error: (error) => this.handleError(error, 'No fue posible guardar el nuevo beso.')
      });
  }

  clearKisses(): void {
    const session = this.activeSession();
    if (!session || this.isBusy()) {
      return;
    }

    const confirmed = window.confirm(
      `Se van a borrar todos los besos pendientes de ${session.usernameA} y ${session.usernameB}. Quieres continuar?`
    );

    if (!confirmed) {
      return;
    }

    this.errorMessage.set(null);
    this.busyMessage.set('Borrando todos los besos pendientes...');

    this.pendingKissesService
      .clearAll(session.sessionId)
      .pipe(finalize(() => this.busyMessage.set(null)))
      .subscribe({
        next: (summary) => this.applySummary(summary),
        error: (error) => this.handleError(error, 'No fue posible vaciar los besos pendientes.')
      });
  }

  private applySummary(summary: PendingKissSummary): void {
    this.totalPendingKisses.set(summary.totalPendingKisses);
    this.eventCount.set(summary.eventCount);
    this.lastEventAt.set(summary.latestEventAt);
  }

  private handleError(error: unknown, fallbackMessage: string): void {
    console.error(error);

    if (error instanceof Error && error.message.trim()) {
      this.errorMessage.set(error.message);
      return;
    }

    this.errorMessage.set(fallbackMessage);
  }

  private restoreAuthorization(): void {
    const storedUsername = window.localStorage.getItem(this.storageKey)?.trim();
    if (!storedUsername) {
      return;
    }

    this.busyMessage.set('Recuperando tu sesion...');

    this.pendingKissesService
      .authorizeUsername(storedUsername)
      .pipe(finalize(() => this.busyMessage.set(null)))
      .subscribe({
        next: (authorizedSession) => this.completeAuthorization(authorizedSession, false),
        error: () => {
          window.localStorage.removeItem(this.storageKey);
          this.clearAuthorization();
        }
      });
  }

  private completeAuthorization(session: AuthorizedKissSession, animateWelcome: boolean): void {
    this.activeSession.set(session);
    this.usernameInput = session.username;
    window.localStorage.setItem(this.storageKey, session.username);
    if (animateWelcome) {
      this.triggerWelcomeBurst();
    }
    this.loadSummary();
  }

  private triggerWelcomeBurst(): void {
    this.showWelcomeBurst.set(true);

    const timerId = window.setTimeout(() => {
      this.showWelcomeBurst.set(false);
      this.timerIds.delete(timerId);
    }, 1500);

    this.timerIds.add(timerId);
  }

  private spawnLoveBursts(amount: number): void {
    const burstCount = amount >= 50 ? 40 : amount >= 10 ? 24 : 14;
    const glyphs = ['💋', '❤', '♥', '✦'];
    const createdBursts = Array.from({ length: burstCount }, (_, index) => ({
      id: ++this.burstId,
      glyph: glyphs[index % glyphs.length],
      left: 6 + Math.random() * 88,
      top: 22 + Math.random() * 58,
      rotationDeg: -26 + Math.random() * 52,
      sizeRem: 1.5 + Math.random() * 1.9,
      durationMs: 1500 + Math.round(Math.random() * 900)
    }));

    this.loveBursts.update((currentBursts) => [...currentBursts, ...createdBursts]);

    const timerId = window.setTimeout(() => {
      this.loveBursts.update((currentBursts) =>
        currentBursts.filter((burst) => !createdBursts.some((createdBurst) => createdBurst.id === burst.id))
      );
      this.timerIds.delete(timerId);
    }, 3200);

    this.timerIds.add(timerId);
  }
}
