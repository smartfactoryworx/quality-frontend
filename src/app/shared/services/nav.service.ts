import { Injectable, OnDestroy } from '@angular/core';
import { Subject, BehaviorSubject, fromEvent } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';
import { Router,Params } from '@angular/router';
import { BreadcrumbService, pickHierarchy  } from './breadcrumb.service';

// Menu
export interface Menu {
  headTitle?: string;
  headTitle2?: string;
  path?: string;
  title?: string;
  icon?: string;
  type?: string;
  badgeValue?: string;
  badgeClass?: string;
  badgeText?: string;
  active?: boolean;
  selected?: boolean;
  bookmark?: boolean;
  children?: Menu[];
  children2?: Menu[];
  Menusub?: boolean;
  target?: boolean;
  menutype?:string;
  dirchange?: boolean;
  nochild?: any;
    pathTemplate?: string;

}

@Injectable({
  providedIn: 'root',
})
export class NavService implements OnDestroy {
  private unsubscriber: Subject<any> = new Subject();
  public screenWidth: BehaviorSubject<number> = new BehaviorSubject(
    window.innerWidth
  );

  // Search Box
  public search = false;

  // Language
  public language = false;

  // Mega Menu
  public megaMenu = false;
  public levelMenu = false;
  public megaMenuColapse: boolean = window.innerWidth < 1199 ? true : false;

  // Collapse Sidebar
  public collapseSidebar: boolean = window.innerWidth < 991 ? true : false;

  // For Horizontal Layout Mobile
  public horizontal: boolean = window.innerWidth < 991 ? false : true;

  // Full screen
  public fullScreen = false;
    private destroy$ = new Subject<void>();

  active: any;

  constructor(private router: Router,private bc: BreadcrumbService) {
    this.setScreenWidth(window.innerWidth);
    fromEvent(window, 'resize')
      .pipe(debounceTime(1000), takeUntil(this.unsubscriber))
      .subscribe((evt: any) => {
        this.setScreenWidth(evt.target.innerWidth);
        if (evt.target.innerWidth < 991) {
          this.collapseSidebar = true;
          this.megaMenu = false;
          this.levelMenu = false;
        }
        if (evt.target.innerWidth < 1199) {
          this.megaMenuColapse = true;
        }
      });
    if (window.innerWidth < 991) {
      // Detect Route change sidebar close
      this.router.events.subscribe((event) => {
        this.collapseSidebar = true;
        this.megaMenu = false;
        this.levelMenu = false;
      });
    }

     if (window.innerWidth < 991) {
      this.router.events.subscribe(() => {
        this.collapseSidebar = true; this.megaMenu = false; this.levelMenu = false;
      });
    }

    // 👇 NEW: make sure user is loaded, seed ctx, then re-emit MENUITEMS
    this.bc.ensureLoaded().subscribe({
      next: (u:any) => {
        // seed context with user defaults so placeholders have values
        this.bc.setContext(pickHierarchy(u) as Params);
          this.items.next(this.computeMenuFor(u?.user));
        // force consumers (Sidebar) to re-read items after user is ready
        //this.items.next([...this.MENUITEMS]);
      },
      error: () => {
        // optional: keep menu disabled if user failed to load
  this.items.next(this.computeMenuFor(null));      }
    });
      // If your app can change users at runtime, also listen:
  this.bc.userData$.subscribe(u => {
    if (u) this.items.next(this.computeMenuFor(u.user));
  });
}

/** Build menu based on role (hides "User Admin" for non-superuser) */
private computeMenuFor(user: any): Menu[] {
  const isSuper = !!user?.superuser;
  // clone once (avoid mutating original MENUITEMS)
  const base = JSON.parse(JSON.stringify(this.MENUITEMS)) as Menu[];
  if (isSuper) return base;

  // remove the "User Admin" section entirely
  return base.filter(mi => mi.title !== 'User Admin');

  }

  ngOnDestroy() {
    this.unsubscriber.next;
    this.unsubscriber.complete();
    this.destroy$.next(); this.destroy$.complete();
  }

  private setScreenWidth(width: number): void {
    this.screenWidth.next(width);
  }

// --- IN NavService ---
  private currentRouteParams(): Params {
    let node: any = this.router.routerState.snapshot.root;
    const out: any = {};
    while (node) { Object.assign(out, node.params); node = node.firstChild; }
    return out;
  }

  /** Merge: route → breadcrumb context → caller overrides (later wins) */
 // nav.service.ts
private effectiveParams(overrides?: Params): Params {
  const routeParams = this.currentRouteParams();
  const defaults    = pickHierarchy(this.bc.userSnapshot);          // from user
  const ctxParams   = this.bc.ctxSnapshot as Params;                 // from breadcrumb context

  // Merge: defaults → ctx → route → overrides
  return { ...defaults, ...ctxParams, ...routeParams, ...(overrides ?? {}) };
}


  /** Ensure all :placeholders exist */
  private hasAll(template: string, params: Params): boolean {
    let ok = true;
    template.replace(/:([A-Za-z0-9_]+)/g, (_m, k) => {
      if (params?.[k] === undefined || params?.[k] === null || params?.[k] === '') ok = false;
      return '';
    });
    return ok;
  }

  /** Build URL from template (safe) */
  private build(template: string, params: Params): string | null {
    if (!this.hasAll(template, params)) return null;
    const segments = template.split('/').filter(Boolean).map(seg => {
      if (seg.startsWith(':')) return encodeURIComponent(String(params[seg.slice(1)]));
      return seg;
    });
    const tree: any = this.router.createUrlTree(['/', ...segments]);
    return this.router.serializeUrl(tree);
  }

  /** Public helpers used by the template */
  public canResolve(menu: Menu, overrides?: Params): boolean {
    if (menu.path) return true;
    if (!menu.pathTemplate) return false;
    return this.hasAll(menu.pathTemplate, this.effectiveParams(overrides));
  }

  public linkFor(menu: Menu, overrides?: Params): string | null {
    if (menu.path) return menu.path;
    if (!menu.pathTemplate) return null;
    return this.build(menu.pathTemplate, this.effectiveParams(overrides));
  }


  MENUITEMS: Menu[] = [
    // Dashboard
    { headTitle: 'Main' },
    {
  title: 'User Admin',
  icon: `<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 side-menu__icon" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 11c1.657 0 3-1.343 3-3S13.657 5 12 5 9 6.343 9 8s1.343 3 3 3Zm0 2.25c-2.485 0-4.5 2.015-4.5 4.5v1.5h9v-1.5c0-2.485-2.015-4.5-4.5-4.5Z"/></svg>`,
  type: 'sub',
  selected: false,
  active: false,
  dirchange: false,
  //showForSuperuser: true, // ✅ Custom flag
  children: [
    { path: '/user-admin/users', title: 'Users', type: 'link', dirchange: false },
    { path: '/user-admin/user-roles', title: 'Roles', type: 'link', dirchange: false },
    { path: '/user-admin/menu-routes', title: 'Menu Routes', type: 'link', dirchange: false },
    { path: '/user-admin/org-chart', title: 'Org Chart', type: 'link', dirchange: false },
  ],
},

    {
      title: 'Forms',
      icon: `<svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 side-menu__icon" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"></path></svg>`,
      type: 'sub',
      selected: false,
      active: false,
      dirchange: false,
      children: [

        
{
      title: 'Home',
      type: 'link',
      pathTemplate:
          '/hierarchy/:company/:country/:state/:plant/:category/:line/:formgroup/home',
      dirchange: false,
    },

    {
      title: 'Create Form',
      type: 'link',
      pathTemplate:
          '/hierarchy/:company/:country/:state/:plant/:category/:line/:formgroup/create-form',
      dirchange: false,
    },
       
  ],
    },
  ];

  items = new BehaviorSubject<Menu[]>(this.MENUITEMS);
}
