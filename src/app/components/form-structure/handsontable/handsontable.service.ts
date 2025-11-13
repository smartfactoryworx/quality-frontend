import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin, map, Observable } from 'rxjs';
import Handsontable from 'handsontable';
import { Kind, Opt } from './types';

@Injectable({ providedIn: 'root' })
export class HandsontableService {
  private http = inject(HttpClient);

fetchDropdownOptions(equipUrl: string, statusUrl: string): Observable<Record<Kind, Opt[]>> {
  return forkJoin({
    equip: this.http.get<any[]>(equipUrl).pipe(
      map(arr => (arr ?? [])
        .map(x => ({
          _id: String(x?.equipment_name ?? x?._id ?? ''),
          name: String(x?.display_name ?? x?.equipment_name ?? '')
        }))
        .filter(o => o._id && o.name))
    ),
    status: this.http.get<any[]>(statusUrl).pipe(
      map(arr => (arr ?? [])
        .map(x => ({
          _id: String(x?.state_name ?? x?.status ?? x?._id ?? ''),
          name: String(x?.text ?? x?.status ?? '')
        }))
        .filter(o => o._id && o.name))
    ),
  });
}


  toast(msg: string, type: 'success' | 'error' | 'warning' = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = msg;
    Object.assign(toast.style, {
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      padding: '8px 16px',
      background: type === 'error' ? '#ef4444' : type === 'warning' ? '#facc15' : '#22c55e',
      color: 'white',
      borderRadius: '4px',
      zIndex: '9999',
      transition: 'opacity 0.5s ease'
    });
    document.body.appendChild(toast);
    setTimeout(() => (toast.style.opacity = '0'), 2500);
    setTimeout(() => toast.remove(), 3000);
  }
}
