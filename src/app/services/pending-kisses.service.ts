import { Injectable } from '@angular/core';
import { AuthError, PostgrestError, createClient } from '@supabase/supabase-js';
import { from, Observable } from 'rxjs';
import { environment } from '../../environments/environment';

interface AuthorizedUserRow {
  id: number;
  username: string;
  session_fk: number | null;
}

interface SessionParticipantRow {
  id: number;
  username_a: number | null;
  username_b: number | null;
}

interface PendingKissEventRow {
  amount: number;
  created_at: string;
}

export interface AuthorizedKissSession {
  sessionId: number;
  userId: number;
  username: string;
  usernameA: string;
  usernameB: string;
}

export interface PendingKissSummary {
  totalPendingKisses: number;
  eventCount: number;
  latestEventAt: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class PendingKissesService {
  private readonly supabase = createClient(
    environment.supabase.url,
    environment.supabase.publishableKey,
    {
      auth: {
        autoRefreshToken: true,
        persistSession: true
      }
    }
  );

  initializeAnonymousSession(): Observable<void> {
    this.assertConfiguration();
    return from(this.ensureAnonymousSession());
  }

  authorizeUsername(username: string): Observable<AuthorizedKissSession> {
    this.assertConfiguration();
    return from(this.authorizeUsernameInternal(username));
  }

  loadSummary(sessionId: number): Observable<PendingKissSummary> {
    this.assertConfiguration();
    return from(this.fetchSummary(sessionId));
  }

  addKisses(sessionId: number, username: string, amount: number): Observable<PendingKissSummary> {
    this.assertConfiguration();
    return from(this.addKissesInternal(sessionId, username, amount));
  }

  clearAll(sessionId: number): Observable<PendingKissSummary> {
    this.assertConfiguration();
    return from(this.clearAllInternal(sessionId));
  }

  private async authorizeUsernameInternal(rawUsername: string): Promise<AuthorizedKissSession> {
    const username = rawUsername.trim();
    if (!username) {
      throw new Error('Ingresa tu nombre de usuario para continuar.');
    }

    await this.ensureAnonymousSession();

    const { data: user, error: userError } = await this.supabase
      .from('users')
      .select('id, username, session_fk')
      .eq('username', username)
      .maybeSingle<AuthorizedUserRow>();

    if (userError) {
      throw new Error(this.describeSupabaseError(userError));
    }

    if (!user) {
      throw new Error('Ese nombre de usuario no esta autorizado para usar la plataforma.');
    }

    if (!user.session_fk) {
      throw new Error('El usuario existe pero no tiene session_fk configurado en la tabla users.');
    }

    const { data: session, error: sessionError } = await this.supabase
      .from('sessions')
      .select('id, username_a, username_b')
      .eq('id', user.session_fk)
      .maybeSingle<SessionParticipantRow>();

    if (sessionError) {
      throw new Error(this.describeSupabaseError(sessionError));
    }

    if (!session) {
      throw new Error('La sesion asociada al usuario no existe en la tabla sessions.');
    }

    const participantIds = [session.username_a, session.username_b].filter((value): value is number => value !== null);
    const { data: participants, error: participantsError } = await this.supabase
      .from('users')
      .select('id, username')
      .in('id', participantIds)
      .returns<AuthorizedUserRow[]>();

    if (participantsError) {
      throw new Error(this.describeSupabaseError(participantsError));
    }

    const usernamesById = new Map((participants ?? []).map((participant) => [participant.id, participant.username]));
    const usernameA = session.username_a ? usernamesById.get(session.username_a) : undefined;
    const usernameB = session.username_b ? usernamesById.get(session.username_b) : undefined;

    if (!usernameA || !usernameB) {
      throw new Error('No fue posible resolver los dos usuarios asociados a la sesion.');
    }

    return {
      sessionId: user.session_fk,
      userId: user.id,
      username: user.username,
      usernameA,
      usernameB
    };
  }

  private async fetchSummary(sessionId: number): Promise<PendingKissSummary> {
    await this.ensureAnonymousSession();

    const { data, error } = await this.supabase
      .from('pending_kisses_events')
      .select('amount, created_at')
      .eq('session_fk', sessionId)
      .order('created_at', { ascending: false })
      .returns<PendingKissEventRow[]>();

    if (error) {
      throw new Error(this.describeSupabaseError(error));
    }

    const rows = data ?? [];
    const totalPendingKisses = rows.reduce((total, row) => total + Number(row.amount ?? 0), 0);

    return {
      totalPendingKisses,
      eventCount: rows.length,
      latestEventAt: rows[0]?.created_at ?? null
    };
  }

  private async addKissesInternal(sessionId: number, username: string, amount: number): Promise<PendingKissSummary> {
    await this.ensureAnonymousSession();

    const { error } = await this.supabase.from('pending_kisses_events').insert({
      amount,
      username,
      session_fk: sessionId
    });

    if (error) {
      throw new Error(this.describeSupabaseError(error));
    }

    return this.fetchSummary(sessionId);
  }

  private async clearAllInternal(sessionId: number): Promise<PendingKissSummary> {
    await this.ensureAnonymousSession();

    const { error } = await this.supabase
      .from('pending_kisses_events')
      .delete()
      .eq('session_fk', sessionId);

    if (error) {
      throw new Error(this.describeSupabaseError(error));
    }

    return {
      totalPendingKisses: 0,
      eventCount: 0,
      latestEventAt: null
    };
  }

  private async ensureAnonymousSession(): Promise<void> {
    const { data, error } = await this.supabase.auth.getSession();
    if (error) {
      throw new Error(this.describeSupabaseError(error));
    }

    if (data.session) {
      return;
    }

    const { error: signInError } = await this.supabase.auth.signInAnonymously();
    if (signInError) {
      throw new Error(this.describeSupabaseError(signInError));
    }
  }

  private assertConfiguration(): void {
    if (!environment.supabase.url || !environment.supabase.publishableKey) {
      throw new Error('Supabase no esta configurado. Completa url y publishableKey en environment.');
    }
  }

  private describeSupabaseError(error: AuthError | PostgrestError): string {
    const normalizedMessage = error.message?.toLowerCase() ?? '';

    if (normalizedMessage.includes('anonymous provider is disabled')) {
      return 'Supabase Auth todavia no tiene habilitado el acceso anonimo.';
    }

    if (normalizedMessage.includes('row-level security')) {
      return 'Supabase bloqueo la operacion por RLS. Faltan politicas para leer o borrar en pending_kisses_events.';
    }

    if (normalizedMessage.includes('permission denied')) {
      return 'Supabase rechazo la operacion por permisos insuficientes sobre las tablas configuradas.';
    }

    if (normalizedMessage.includes('invalid api key')) {
      return 'La publishable key de Supabase no es valida.';
    }

    return error.message || 'Supabase devolvio un error inesperado.';
  }
}
