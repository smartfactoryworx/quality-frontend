import { Injectable } from '@angular/core';
import { BehaviorSubject, finalize, Observable, of, shareReplay, tap } from 'rxjs';
import { HttpClient } from '@angular/common/http';
// breadcrumb.service.ts
export type HierParams =
  'company'|'country'|'state'|'plant'|'category'|'line'|'formgroup';

export function pickHierarchy(user: any): Partial<Record<HierParams,string>> {
  // shape this to your user payload
  const cur = user?.currentHierarchy ?? user?.defaultHierarchy ?? {};
  return {
    company:   cur.company?.code ?? cur.company ?? '',
    country:   cur.country?.code ?? cur.country ?? '',
    state:     cur.state?.code ?? cur.state ?? '',
    plant:     cur.plant?.code ?? cur.plant ?? '',
    category:  cur.category?.code ?? cur.category ?? '',
    line:      cur.line?.code ?? cur.line ?? '',
    formgroup: cur.formgroup?.code ?? cur.formgroup ?? '',
  };
}

@Injectable({
  providedIn: 'root',
})
export class BreadcrumbService {
   _breadcrumbs = new BehaviorSubject<any[]>([]);
  breadcrumbs$ = this._breadcrumbs.asObservable();

  private _userData = new BehaviorSubject<any | null>(null);
  userData$ = this._userData.asObservable();

  private baseUrl = 'https://qualitydevua.smartfactoryworx.com/api/users';
  private inFlight$?: Observable<any>;

  constructor(private http: HttpClient) {
   
  }

  // ✅ Fetch current user + hierarchy from backend
   /** Call this to make sure user is loaded once. Never subscribe in here. */
 // breadcrumb.service.ts


 
ensureLoaded(): Observable<any> {
  if (this._userData.value) return of(this._userData.value);
  if (this.inFlight$) return this.inFlight$;

  const url = `${this.baseUrl}/currentUser?t=${Date.now()}`; // 👈 cache buster

  this.inFlight$ = this.http
    .get(url, { withCredentials: true /* , headers: new HttpHeaders({'Cache-Control': 'no-cache'}) */ })
    .pipe(
      tap(u => this._userData.next(u)),
      shareReplay(1),
      finalize(() => (this.inFlight$ = undefined))
    );

  return this.inFlight$;
}


  // ✅ Breadcrumb handling
  setBreadcrumbs(list: any[]) {
    this._breadcrumbs.next(list);
    //localStorage.setItem('breadcrumbs', JSON.stringify(list));
  }

  clearBreadcrumbs() {
    this._breadcrumbs.next([]);
    //localStorage.removeItem('breadcrumbs');
  }

  // ✅ Accessor for current user snapshot
  get userSnapshot() {
    return this._userData.value;
  }
}
