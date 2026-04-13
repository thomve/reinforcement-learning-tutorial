import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  AlgorithmDef,
  CreateSessionRequest,
  EnvironmentDef,
  Session,
} from '../models/types';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private base = '/api/v1';

  constructor(private http: HttpClient) {}

  getEnvironments(): Observable<EnvironmentDef[]> {
    return this.http.get<EnvironmentDef[]>(`${this.base}/environments`);
  }

  getAlgorithms(): Observable<AlgorithmDef[]> {
    return this.http.get<AlgorithmDef[]>(`${this.base}/algorithms`);
  }

  getSessions(): Observable<Session[]> {
    return this.http.get<Session[]>(`${this.base}/sessions`);
  }

  getSession(id: string): Observable<Session> {
    return this.http.get<Session>(`${this.base}/sessions/${id}`);
  }

  createSession(config: CreateSessionRequest): Observable<Session> {
    return this.http.post<Session>(`${this.base}/sessions`, config);
  }

  controlSession(id: string, action: 'pause' | 'resume' | 'stop' | 'reset'): Observable<{ ok: boolean }> {
    return this.http.post<{ ok: boolean }>(`${this.base}/sessions/${id}/control`, { action });
  }

  deleteSession(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/sessions/${id}`);
  }
}
