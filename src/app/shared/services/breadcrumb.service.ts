import { Injectable } from '@angular/core';
import { BehaviorSubject, finalize, Observable, of, shareReplay, tap } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Params } from '@angular/router';

export type HierParams =
  'company'|'country'|'state'|'plant'|'category'|'line'|'formgroup';

/** tiny helper to read first array item’s *_code field safely */
const firstCode = (arr: any[] | undefined, key: string): string =>
  Array.isArray(arr) && arr.length ? (arr[0]?.[key] ?? '').toString() : '';

/** build defaults from your /currentUser payload shape, then overlay ctx */
export function pickHierarchy(
  payload: any,
  ctx: Partial<Record<HierParams,string>> = {}
): Partial<Record<HierParams,string>> {

  // 1) easy parts from top-level arrays
  const company   = firstCode(payload?.company,   'company_code');
  const country   = firstCode(payload?.countries, 'country_code');
  const state     = firstCode(payload?.states,    'state_code');
  const plant     = firstCode(payload?.plants,    'plant_code');

  // 2) choose a category, line, formgroup from quality map if present
  let category = '';
  let line = '';
  let formgroup = '';

  const quality = payload?.user?.quality as any[] | undefined;

  if (Array.isArray(quality) && quality.length) {
    // prefer the first category that has at least one line
    const qCat = quality.find(c => Array.isArray(c?.lines) && c.lines.length) ?? quality[0];
    category = (qCat?.category_code ?? '').toString();

    // prefer first line under that category
    const qLine = Array.isArray(qCat?.lines) && qCat.lines.length ? qCat.lines[0] : undefined;
    line = (qLine?.line_code ?? '').toString();

    // prefer first formgroup under that line
    const qFg = Array.isArray(qLine?.formgroups) && qLine.formgroups.length ? qLine.formgroups[0] : undefined;
    formgroup = (qFg?.formgroup_code ?? '').toString();
  }

  // 3) fallbacks if quality didn’t give us enough
  if (!category) {
    // fallback to the first category granted to the user
    category = firstCode(payload?.user?.categories, 'category_code');
  }

  if (!line) {
    // try categoryLines map (category_code → lines[])
    const cl = payload?.user?.categoryLines?.[category] as any[] | undefined;
    line = firstCode(cl, 'line_code') || firstCode(payload?.user?.lines, 'line_code');
  }

  // 4) final defaults (strings only), then overlay ctx
  const defaults: Partial<Record<HierParams,string>> = {
    company, country, state, plant, category, line, formgroup,
  };

  // DEBUG if needed
  //console.log('defaults built:', defaults, 'ctx overlay:', ctx);

  return { ...defaults, ...ctx };
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

    private _ctx = new BehaviorSubject<Params>({});
  ctx$ = this._ctx.asObservable();
  setContext(p: Params) { this._ctx.next({ ...this._ctx.value, ...p }); }
  get ctxSnapshot(): Params { return this._ctx.value; }
}
