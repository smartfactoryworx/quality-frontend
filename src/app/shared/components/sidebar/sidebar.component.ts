import {
  Component,
  Renderer2,
  HostListener,
  OnInit,
  OnDestroy,
  AfterViewInit,
} from '@angular/core';
import { Menu, NavService } from '../../services/nav.service';
import { Subscription, fromEvent } from 'rxjs';
import { NavigationEnd, Router, ActivatedRoute } from '@angular/router';
import { filter } from 'rxjs/operators';
import { DomSanitizer } from '@angular/platform-browser';
import { BreadcrumbService } from '../../services/breadcrumb.service';

@Component({
  selector: 'app-sidebar',
  standalone: false,
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
})
export class SidebarComponent implements OnInit, OnDestroy, AfterViewInit {
  eventTriggered = false;
  screenWidth!: number;
  public windowSubscribe$!: Subscription;
  public menuItems: Menu[] = [];
  public menuitemsSubscribe$!: Subscription;
  scrolled = false;

  constructor(
    public navServices: NavService,
    public router: Router,
    private route: ActivatedRoute,
    public renderer: Renderer2,
    private sanitizer: DomSanitizer,
    private bc: BreadcrumbService
  ) {}

  /** Build URL (or null if params missing) */
  resolve(menu: Menu): string | null {
    return this.navServices.linkFor(menu) ?? null;
  }
  canResolve(menu: Menu): boolean {
    return this.navServices.canResolve(menu);
  }
  onMenuClick(evt: Event, menu: Menu) {
    const url = this.resolve(menu);
    console.log('Resolved menu URL:', url, menu);
    if (url) {
      evt.preventDefault();
      this.router.navigateByUrl(url);
    } else {
      evt.preventDefault();
      console.warn('Menu link unresolved (missing params):', menu);
    }
  }

  ngOnInit() {
    // 1) Ensure user defaults are loaded (company/country/state/plant/category/line/formgroup)
    this.bc.ensureLoaded().subscribe({
      next: () => {
        // After user loads, change detection will re-evaluate canResolve()
      },
      error: (e) => console.error('ensureLoaded failed', e),
    });

    // 2) On every navigation, push deep route params into breadcrumb context
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => {
        const params = this.collectDeepParams();
        if (Object.keys(params).length) this.bc.setContext(params);
        // also keep highlighting in sync
        this.setNavActive(null, this.router.url);
      });

    // initial items + highlight
    this.menuitemsSubscribe$ = this.navServices.items.subscribe(
      (items) => (this.menuItems = items)
    );
    this.setNavActive(null, this.router.url);

    // resize watcher
    const WindowResize = fromEvent(window, 'resize');
    if (WindowResize) this.windowSubscribe$ = WindowResize.subscribe(() => this.menuResizeFn());

    // layout cleanup (as in your original)
    const bodyElement: any = document.querySelector('.main-content');
    bodyElement.onclick = () => {
      if (
        localStorage.getItem('layoutStyles') == 'icon-click' ||
        localStorage.getItem('layoutStyles') == 'menu-click' ||
        localStorage.getItem('layoutStyles') == 'icon-hover' ||
        localStorage.getItem('data-nav-layout') == 'horizontal'
      ) {
        document.querySelectorAll('.main-menu .slide-menu.child1')
          .forEach((ele: any) => (ele.style.display = 'none'));
      }
      if (localStorage.getItem('layoutStyles') == 'icontext') {
        document.querySelector('html')?.removeAttribute('data-icon-text');
      }
    };
  }

  /** Walk the activated route tree and merge all params */
  private collectDeepParams(): Record<string, string> {
    let node: any = this.router.routerState.snapshot.root;
    const out: any = {};
    while (node) {
      Object.assign(out, node.params);
      node = node.firstChild;
    }
    return out;
  }

  // ====== everything below is your original behavior (active/expand/responsive) ======
  ngAfterViewInit(): void {}

  ngOnDestroy() {
    this.menuitemsSubscribe$?.unsubscribe();
    this.windowSubscribe$?.unsubscribe();
    document.querySelector('html')?.setAttribute('data-vertical-style', 'overlay');
    document.querySelector('html')?.setAttribute('data-nav-layout', 'vertical');
  }

  setNavActive(event:any, currentPath: string, menuData = this.menuItems) {
    if (event?.ctrlKey) return;
    const html = document.documentElement;
    if (html.getAttribute('data-nav-style') != 'icon-hover' &&
        html.getAttribute('data-nav-style') != 'menu-hover') {
      for (const item of menuData) {
        if (item.path === currentPath) {
          item.active = true; item.selected = true; this.setMenuAncestorsActive(item);
        } else if (!item.active && !item.selected) {
          item.active = false; item.selected = false;
        } else {
          this.removeActiveOtherMenus(item);
        }
        if (item.children?.length) this.setNavActive(event, currentPath, item.children);
      }
    }
  }
  getParentObject(obj: any, child: Menu) {
    for (const k in obj) {
      if (!obj.hasOwnProperty(k)) continue;
      if (typeof obj[k] === 'object' && JSON.stringify(obj[k]) === JSON.stringify(child)) return obj;
      if (typeof obj[k] === 'object') {
        const p:any = this.getParentObject(obj[k], child);
        if (p) return p;
      }
    } return null;
  }
  hasParent = false; hasParentLevel = 0;
  setMenuAncestorsActive(target: Menu) {
    const parent = this.getParentObject(this.menuItems, target);
    const html = document.documentElement;
    if (parent) {
      if (this.hasParentLevel >= 2) this.hasParent = true;
      parent.active = true; parent.selected = true; this.hasParentLevel += 1;
      this.setMenuAncestorsActive(parent);
    } else if (!this.hasParent) {
      this.hasParentLevel = 0;
      if (html.getAttribute('data-vertical-style') == 'doublemenu')
        html.setAttribute('data-toggled', 'double-menu-close');
    } else { this.hasParentLevel = 0; this.hasParent = false; }
  }
  removeActiveOtherMenus(item: any) {
    if (!item) return;
    if (Array.isArray(item)) for (const v of item) { v.active = false; v.selected = false; }
    item.active = false; item.selected = false;
    if (item.children?.length) this.removeActiveOtherMenus(item.children);
  }
  toggleNavActive(event:any, target:Menu, menuData = this.menuItems, state?:any) {
    const html = document.documentElement; const element = event?.target as HTMLElement;
    const hoverClosed = html.getAttribute('data-nav-style') == 'icon-hover-closed' ||
                        html.getAttribute('data-nav-style') == 'menu-hover-closed';
    const isHover = html.getAttribute('data-nav-style') == 'icon-hover' ||
                    html.getAttribute('data-nav-style') == 'menu-hover';

    if ((!isHover || window.innerWidth < 992) &&
        (html.getAttribute('data-nav-layout') != 'horizontal') && !hoverClosed) {
      for (const item of menuData) {
        if (item === target) {
          if (html.getAttribute('data-vertical-style') == 'doublemenu' &&
              item.active && window.innerWidth > 992 && state) return;
          item.active = !item.active;
          if (item.active) this.closeOtherMenus(menuData, item);
          this.setAncestorsActive(menuData, item);
        } else if (!item.active) {
          if (html.getAttribute('data-vertical-style') != 'doublemenu') item.active = false;
        }
        if (item.children?.length) this.toggleNavActive(event, target, item.children);
      }
      if (target?.children && target.active) {
        if (html.getAttribute('data-vertical-style') == 'doublemenu' &&
            html.getAttribute('data-toggled') != 'double-menu-open')
          html.setAttribute('data-toggled', 'double-menu-open');
      }
      if (element && html.getAttribute('data-nav-layout') == 'horizontal' &&
         (html.getAttribute('data-nav-style') == 'menu-click' ||
          html.getAttribute('data-nav-style') == 'icon-click')) {
        const listItem = element.closest('li');
        if (listItem) {
          const siblingUL = listItem.querySelector('ul');
          let outterUlWidth = 0;
          let listItemUL:any = listItem.closest('ul:not(.main-menu)');
          while (listItemUL) {
            listItemUL = listItemUL.parentElement?.closest('ul:not(.main-menu)');
            if (listItemUL) outterUlWidth += listItemUL.clientWidth;
          }
          if (siblingUL) {
            const r = listItem.getBoundingClientRect();
            target.dirchange = html.getAttribute('dir') == 'rtl'
              ? (r.left - r.width - outterUlWidth + 150 < 0 &&
                 outterUlWidth < window.innerWidth &&
                 outterUlWidth + r.width + r.width < window.innerWidth)
              : (outterUlWidth + r.right + r.width + 50 > window.innerWidth &&
                 r.right >= 0 &&
                 outterUlWidth + r.width + r.width < window.innerWidth);
          }
        }
      }
    } else {
      for (const item of menuData) {
        if (item === target) {
          if (html.getAttribute('data-vertical-style') == 'doublemenu' &&
              item.active && window.innerWidth > 992 && state) return;
          item.active = !item.active;
          if (item.active) this.closeOtherMenus(menuData, item);
          this.setAncestorsActive(menuData, item);
        }
      }
    }
    if (html.getAttribute('data-vertical-style') == 'icontext')
      document.querySelector('html')?.setAttribute('data-icon-text','open');
    else
      document.querySelector('html')?.removeAttribute('data-icon-text');
  }
  setAncestorsActive(menuData:Menu[], target:Menu) {
    const html = document.documentElement;
    const parent = this.findParent(menuData, target);
    if (parent) {
      parent.active = true;
      if (parent.active) html.setAttribute('data-toggled', 'double-menu-open');
      this.setAncestorsActive(menuData, parent);
    }
  }
  closeOtherMenus(menuData:Menu[], target:Menu) {
    for (const item of menuData) {
      if (item !== target) {
        item.active = false;
        if (item.children?.length) this.closeOtherMenus(item.children, target);
      }
    }
  }
  findParent(menuData:Menu[], target:Menu) {
    for (const item of menuData) {
      if (item.children && item.children.includes(target)) return item;
      if (item.children?.length) {
        const p:any = this.findParent(item.children, target);
        if (p) return p;
      }
    }
    return null;
  }

  @HostListener('window:scroll', [])
  onWindowScroll() { this.scrolled = window.scrollY > 10; }

  @HostListener('window:resize', ['$event'])
  onResize(_: any): void {
    this.menuResizeFn();
    this.screenWidth = window.innerWidth;
    if (!this.eventTriggered && this.screenWidth <= 992) {
      document.documentElement?.setAttribute('data-toggled', 'close');
      this.eventTriggered = true;
    } else if (this.screenWidth > 992) {
      this.eventTriggered = false;
    }
  }

  WindowPreSize: number[] = [window.innerWidth];
  menuResizeFn(): void {
    this.WindowPreSize.push(window.innerWidth);
    if (this.WindowPreSize.length > 2) this.WindowPreSize.shift();
    if (this.WindowPreSize.length > 1) {
      const html = document.documentElement;
      if (this.WindowPreSize.at(-1)! < 992 && this.WindowPreSize.at(-2)! >= 992)
        html.setAttribute('data-toggled', 'close');
      if (this.WindowPreSize.at(-1)! >= 992 && this.WindowPreSize.at(-2)! < 992) {
        html.removeAttribute('data-toggled');
        document.querySelector('#responsive-overlay')?.classList.remove('active');
      }
    }
  }

  leftArrowFn() { /* unchanged (your original) */ }
  rightArrowFn() { /* unchanged (your original) */ }
}
