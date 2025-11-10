import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter, skip, Subscription, take } from 'rxjs';
import { SpkRibbonsComponent } from '../../../@spk/reusable-advancedui/spk-ribbons/spk-ribbons.component';
import { BreadcrumbService } from '../../shared/services/breadcrumb.service';

@Component({
  selector: 'app-hierarchy',
  standalone: true,
  imports: [CommonModule, RouterModule, SpkRibbonsComponent],
  templateUrl: './hierarchy.component.html',
  styleUrls: ['./hierarchy.component.scss'],
})
export class HierarchyComponent implements OnInit, OnDestroy {
  breadcrumbs: any[] = [];
  ribbonCards: any[] = [];
  currentLevel = '';
  data: any;
  private subs = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private breadcrumbService: BreadcrumbService
  ) {}

  ngOnInit(): void {
    this.subs.add(
      this.breadcrumbService.ensureLoaded()
        .pipe(take(1))
        .subscribe(u => {
          this.data = u;
          this.initRouteWatcher();
        })
    );

    this.subs.add(
      this.breadcrumbService.userData$
        .pipe(skip(1), filter(Boolean))
        .subscribe(u => {
          this.data = u;
          const params = this.route.snapshot.params;
          this.updateBreadcrumbs(params);
          this.updateRibbons(params);
        })
    );
  }

  private initRouteWatcher() {
    this.subs.add(
      this.route.params.subscribe((params) => {
        this.currentLevel = this.detectLevel(params);
        this.updateBreadcrumbs(params);
        this.updateRibbons(params);
      })
    );
  }

  /** -------- Helpers (minimal additions) -------- */

  /** Lines under a given category from user.quality (fallback to categoryLines) */
  private getLinesFromQuality(catCode?: string) {
    if (!catCode) return [];
    const cat = (this.data?.user?.quality || []).find(
      (q: any) => q.category_code?.toLowerCase() === String(catCode).toLowerCase()
    );
    if (cat?.lines?.length) return cat.lines;
    // fallback (if backend omitted lines inside quality)
    return this.data?.user?.categoryLines?.[String(catCode).toLowerCase()] || [];
  }

  /** Formgroups for a given (category, line) from user.quality */
  private getFormgroupsFromQuality(catCode?: string, lineCode?: string) {
    if (!catCode || !lineCode) return [];
    const cat = (this.data?.user?.quality || []).find(
      (q: any) => q.category_code?.toLowerCase() === String(catCode).toLowerCase()
    );
    const line = cat?.lines?.find(
      (ln: any) => ln.line_code?.toLowerCase() === String(lineCode).toLowerCase()
    );
    return line?.formgroups || [];
  }

  /** Detect level with optional :line */
  private detectLevel(params: any): string {
    if (params.formgroup) return 'formgroup';
    if (params.line) return 'line';
    const depth = Object.keys(params).length;
    // root, company, country, state, plant, category
    return ['root', 'company', 'country', 'state', 'plant', 'category'][depth] || 'root';
  }

  /** Build breadcrumbs including optional line + formgroup */
  updateBreadcrumbs(params: any) {
    const crumbs: any[] = [
      { label: 'Home', icon: 'fe fe-home', path: '/hierarchy', isLast: Object.keys(params).length === 0 },
    ];

    const hierarchyOrder = [
      { key: 'company', array: this.data.company,  nameKey: 'company_name',  codeKey: 'company_code' },
      { key: 'country', array: this.data.countries,nameKey: 'country_name',  codeKey: 'country_code' },
      { key: 'state',   array: this.data.states,   nameKey: 'state_name',    codeKey: 'state_code' },
      { key: 'plant',   array: this.data.plants,   nameKey: 'plant_name',    codeKey: 'plant_code' },
      { key: 'category',array: this.data.user?.quality, nameKey: 'category_name', codeKey: 'category_code' },
    ];

    // push company→country→state→plant→category
    const paramValues = Object.values(params).map((v) => String(v).toLowerCase());
    hierarchyOrder.slice(0, Math.min(paramValues.length, 5)).forEach((level, i) => {
      const code = paramValues[i];
      const item = level.array?.find((x: any) => String(x[level.codeKey]).toLowerCase() === code);
      if (item) {
        crumbs.push({
          label: item[level.nameKey],
          path: `/hierarchy/${paramValues.slice(0, i + 1).join('/')}`,
          isLast: false,
        });
      }
    });

    // optional line (now taking lines from quality)
    if (params.line) {
      const catCode = params.category?.toLowerCase();
      const lineCode = params.line?.toLowerCase();
      const linesForCategory = this.getLinesFromQuality(catCode);
      const line = linesForCategory.find((ln: any) => ln.line_code?.toLowerCase() === lineCode);
      if (line) {
        crumbs.push({
          label: line.line_name,
          path: `/hierarchy/${params.company}/${params.country}/${params.state}/${params.plant}/${params.category}/${params.line}`,
          isLast: !params.formgroup,
        });
      }
    }

    // optional formgroup (only on /home)
    const url = this.router.url.toLowerCase();
    if (url.endsWith('/home')) {
      const parts = url.split('/').filter(Boolean);
      // with line: .../:category/:line/:formgroup/home
      // without line: .../:category/:formgroup/home
      const formIdx = parts.length - 2;      // 'formgroup' segment
      const hasLine = !!params.line;
      const catIdx  = hasLine ? formIdx - 2 : formIdx - 1;

      const formgroupCode = parts[formIdx];
      const categoryCode  = parts[catIdx];
      const lineCode      = hasLine ? parts[formIdx - 1] : undefined;

      let formgroup: any = null;
      if (hasLine) {
        // use quality->lines->formgroups
        const fgs = this.getFormgroupsFromQuality(categoryCode, lineCode);
        formgroup = fgs.find((f: any) => f.formgroup_code?.toLowerCase() === formgroupCode);
      } else {
        // categories without lines (rare) – keep old behavior
        const category = this.data.user?.quality?.find(
          (q: any) => q.category_code?.toLowerCase() === categoryCode
        );
        formgroup = category?.formgroups?.find(
          (f: any) => f.formgroup_code?.toLowerCase() === formgroupCode
        );
      }

      if (formgroup) {
        const base = params.line
          ? `/hierarchy/${params.company}/${params.country}/${params.state}/${params.plant}/${params.category}/${params.line}/${formgroupCode}/home`
          : `/hierarchy/${params.company}/${params.country}/${params.state}/${params.plant}/${params.category}/${formgroupCode}/home`;

        crumbs.push({ label: formgroup.formgroup_name, path: base.replace('/home',''), isLast: true });
      } else if (crumbs.length) {
        crumbs[crumbs.length - 1].isLast = true;
      }
    } else if (crumbs.length) {
      crumbs[crumbs.length - 1].isLast = true;
    }

    this.breadcrumbs = crumbs;
    this.breadcrumbService.setBreadcrumbs(crumbs);
  }

  /** Build ribbons for the current level */
  updateRibbons(params: any) {
    switch (this.currentLevel) {
      case 'root':
        this.ribbonCards = (this.data.company || []).map((x: any) => ({
          name: x.company_name, next: x.company_code, ribbonIcon: 'fe fe-briefcase',
        }));
        break;

      case 'company':
        this.ribbonCards = (this.data.countries || []).map((x: any) => ({
          name: x.country_name, next: x.country_code, ribbonIcon: 'fe fe-globe',
        }));
        break;

      case 'country':
        this.ribbonCards = (this.data.states || []).map((x: any) => ({
          name: x.state_name, next: x.state_code, ribbonIcon: 'fe fe-map',
        }));
        break;

      case 'state':
        this.ribbonCards = (this.data.plants || []).map((x: any) => ({
          name: x.plant_name, next: x.plant_code, ribbonIcon: 'fe fe-cpu',
        }));
        break;

      case 'plant': {
        // show categories (always)
        this.ribbonCards = (this.data.user?.quality || []).map((c: any) => ({
          name: c.category_name, next: c.category_code, ribbonIcon: 'fe fe-layers',
        }));
        break;
      }

      case 'category': {
        const catCode = params['category']?.toLowerCase();

        // lines from quality (fallback handled inside helper)
        const linesForCategory = this.getLinesFromQuality(catCode);

        if (linesForCategory.length) {
          // show LINES as next step
          this.ribbonCards = linesForCategory.map((ln: any) => ({
            name: ln.line_name,
            next: ln.line_code,   // navigate into :line
            ribbonIcon: 'fe fe-git-branch',
          }));
        } else {
          // no lines → show FORMGROUPS directly (legacy category-only style)
          const category = this.data.user?.quality?.find(
            (q: any) => q.category_code.toLowerCase() === catCode
          );
          this.ribbonCards = (category?.formgroups || []).map((f: any) => ({
            name: f.formgroup_name,
            next: f.formgroup_code, // navigate straight to :formgroup
            ribbonIcon: 'fe fe-file-text',
          }));
        }
        break;
      }

      case 'line': {
        // At line-level we show the FORMGROUPS for the (category,line)
        const catCode  = params['category']?.toLowerCase();
        const lineCode = params['line']?.toLowerCase();

        const fgs = this.getFormgroupsFromQuality(catCode, lineCode);

        this.ribbonCards = fgs.map((f: any) => ({
          name: f.formgroup_name,
          next: f.formgroup_code,
          ribbonIcon: 'fe fe-file-text',
        }));
        break;
      }

      case 'formgroup':
        this.ribbonCards = [{ name: 'Home', next: 'home', ribbonIcon: 'fe fe-home' }];
        break;

      default:
        this.ribbonCards = [];
    }
  }

  onRibbonClick(name: string, nextCode: string) {
    const p: any = this.route.snapshot.params;

    if (this.currentLevel === 'category') {
      // decide whether next is :line or :formgroup using lines from quality
      const catCode = p['category']?.toLowerCase();
      const linesForCategory = this.getLinesFromQuality(catCode);
      if (linesForCategory.length) {
        // go to :line
        this.router.navigate(['/hierarchy', p.company, p.country, p.state, p.plant, p.category, nextCode]);
      } else {
        // go directly to :formgroup → home
        this.router.navigate(['/hierarchy', p.company, p.country, p.state, p.plant, p.category, nextCode, 'home']);
      }
      return;
    }

    if (this.currentLevel === 'line') {
      // line → formgroup → home
      this.router.navigate(['/hierarchy', p.company, p.country, p.state, p.plant, p.category, p.line, nextCode, 'home']);
      return;
    }

    if (this.currentLevel === 'formgroup') {
      // already at formgroup ribbons: only "Home"
      this.router.navigate([this.router.url.endsWith('/home') ? this.router.url : this.router.url + '/home']);
      return;
    }

    // generic: drill down
    const currentParams = Object.values(this.route.snapshot.params);
    this.router.navigate(['/hierarchy', ...currentParams, nextCode]);
  }

  onBreadcrumbClick(event: any) {
    const target = event.target as HTMLElement;
    const clickedLabel = target?.textContent?.trim();
    const clickedItem = this.breadcrumbs.find((b) => b.label === clickedLabel);
    if (clickedItem && clickedItem.path && !clickedItem.isLast) {
      this.router.navigateByUrl(clickedItem.path);
    }
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }
}
