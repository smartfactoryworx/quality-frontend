import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SpkReusableTablesComponent } from '../../../@spk/spk-reusable-tables/spk-reusable-tables.component';
import { SpkSalesCardsComponent } from '../../../@spk/reusable-dashboard/spk-sales-cards/spk-sales-cards.component';
import { Router, NavigationEnd } from '@angular/router';
import { BreadcrumbService } from '../../shared/services/breadcrumb.service';
import { filter, Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, SpkReusableTablesComponent, SpkSalesCardsComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnDestroy {
  private destroy$ = new Subject<void>();

  constructor(private router: Router, private breadcrumbService: BreadcrumbService) {
    // Recompute on route changes
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd), takeUntil(this.destroy$))
      .subscribe(() => this.tryBuild());
    // Recompute when user data arrives
    this.breadcrumbService.userData$
      .pipe(filter(Boolean), takeUntil(this.destroy$))
      .subscribe(() => this.tryBuild());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Build or rebuild breadcrumbs when route or user data changes */
  private tryBuild(): void {
    const data = this.breadcrumbService.userSnapshot;
    const url = this.router.url.toLowerCase();

    if (!data || !url.startsWith('/hierarchy') || !url.endsWith('/home')) return;

    this.rebuildBreadcrumbs(url, data);
  }

  /** Full breadcrumb including optional :line and :formgroup */
  private rebuildBreadcrumbs(currentUrl: string, data: any): void {
  const parts = currentUrl.toLowerCase().split('/').filter(Boolean);
  // with line:    ["hierarchy","co","in","up","un","pdw","newkinley","wtp","home"]
  // without line: ["hierarchy","co","in","up","un","csd","micro","home"]

  const [_, company, country, state, plant] = parts;      // parts[0] === 'hierarchy'
  const maybeCat  = parts[5];
  const maybeLine = parts.length === 9 ? parts[6] : undefined;
  const formgroup = parts[parts.length - 2];
  const catCode   = maybeCat?.toLowerCase();

  const crumbs: any[] = [
    { label: 'Home', icon: 'fe fe-home', path: '/hierarchy', isLast: false },
  ];

  // helper to build a path safely from known segments
  const build = (...segs: (string | undefined)[]) =>
    ['/hierarchy', ...segs.filter(Boolean)].join('/');

  // up to category
  const levels = [
    { array: data.company,            code: company,   codeKey: 'company_code',  nameKey: 'company_name'  },
    { array: data.countries,          code: country,   codeKey: 'country_code',  nameKey: 'country_name'  },
    { array: data.states,             code: state,     codeKey: 'state_code',    nameKey: 'state_name'    },
    { array: data.plants,             code: plant,     codeKey: 'plant_code',    nameKey: 'plant_name'    },
    { array: data.user?.quality,      code: maybeCat,  codeKey: 'category_code', nameKey: 'category_name' },
  ];

  const chain = [company, country, state, plant, maybeCat]; // raw values in order
  for (let i = 0; i < levels.length; i++) {
    const L = levels[i];
    if (!L.code) break;
    const item = L.array?.find((x: any) => String(x[L.codeKey]).toLowerCase() === L.code!.toLowerCase());
    if (!item) break;

    crumbs.push({
      label: item[L.nameKey],
      path: build(...chain.slice(0, i + 1)),
      isLast: false,
    });
  }

  // optional LINE level
  const linesForCat = data.user?.categoryLines?.[catCode] || [];
  let hasLine = false, lineObj: any;

  if (maybeLine && linesForCat.length) {
    lineObj = linesForCat.find((ln: any) => String(ln.line_code).toLowerCase() === maybeLine.toLowerCase());
    if (lineObj) {
      hasLine = true;
      crumbs.push({
        label: lineObj.line_name,
        path: build(company, country, state, plant, maybeCat, maybeLine),
        isLast: false,
      });
    }
  }

  // formgroup
  const category = data.user?.quality?.find((q: any) => q.category_code?.toLowerCase() === catCode);
  const fg = category?.formgroups?.find((f: any) => f.formgroup_code?.toLowerCase() === formgroup);
  if (fg) {
    const fgPath = hasLine
      ? build(company, country, state, plant, maybeCat, maybeLine, formgroup)
      : build(company, country, state, plant, maybeCat, formgroup);
    crumbs.push({ label: fg.formgroup_name, path: fgPath, isLast: true });
  } else if (crumbs.length) {
    crumbs[crumbs.length - 1].isLast = true;
  }

  this.breadcrumbService.setBreadcrumbs(crumbs);
}


  // ===== Demo table + cards (unchanged) =====
  columns = [
    { header: 'ID', field: 'id' },
    { header: 'Name', field: 'name' },
    { header: 'Department', field: 'department' },
    { header: 'Status', field: 'status' }
  ];

  data = [
    { id: 1, name: 'John Doe', department: 'Production', status: 'Active', checked: false },
    { id: 2, name: 'Jane Smith', department: 'Quality', status: 'Inactive', checked: false },
    { id: 3, name: 'Ravi Kumar', department: 'Maintenance', status: 'Active', checked: false }
  ];

  salesCards = [
    { title: 'Total Sales', value: '$1.25M', valueClass: 'text-3xl font-semibold text-primary', percentage: '+12%', percentageIcon: 'ri-arrow-up-line', color: 'success', bg: 'primary/10', icon: 'ri-shopping-cart-line', cardClass: 'border border-defaultborder shadow-sm', graph: 'Compared to last month', customClass: 'items-center', customClass1: '' },
    { title: 'Orders Processed', value: '8,540', valueClass: 'text-3xl font-semibold text-success', percentage: '+4%', percentageIcon: 'ri-arrow-up-line', color: 'success', bg: 'success/10', icon: 'ri-box-3-line', cardClass: 'border border-defaultborder shadow-sm', graph: 'Orders fulfilled', customClass: 'items-center', customClass1: '' },
    { title: 'Returns', value: '432', valueClass: 'text-3xl font-semibold text-danger', percentage: '-2%', percentageIcon: 'ri-arrow-down-line', color: 'danger', bg: 'danger/10', icon: 'ri-refresh-line', cardClass: 'border border-defaultborder shadow-sm', graph: 'Compared to last week', customClass: 'items-center', customClass1: '' },
    { title: 'Customer Growth', value: '3.2k', valueClass: 'text-3xl font-semibold text-info', percentage: '+8%', percentageIcon: 'ri-arrow-up-line', color: 'info', bg: 'info/10', icon: 'ri-user-star-line', cardClass: 'border border-defaultborder shadow-sm', graph: 'New signups', customClass: 'items-center', customClass1: '' },
  ];

  onSelectAll(event: boolean) {
    this.data.forEach(r => (r.checked = event));
  }
}
