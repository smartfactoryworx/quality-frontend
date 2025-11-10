import { Component, ElementRef, Renderer2 } from '@angular/core';
import { Menu, NavService } from '../../services/nav.service';
import { ActivatedRoute, NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { SharedModule } from '../../shared.module';
import { HeaderComponent } from '../../components/header/header.component';
import { CommonModule } from '@angular/common';
@Component({
    selector: 'app-content-layout',
    standalone:true,
    imports:[SharedModule,RouterModule,HeaderComponent, CommonModule],
    templateUrl: './content-layout.component.html',
    
    styleUrl: './content-layout.component.scss',
})
export class ContentLayoutComponent {
  menuItems!:Menu[];
  menuitemsSubscribe$!:Subscription

  hideHeader = false;

  constructor(
    private navServices: NavService,  private router:Router,private route: ActivatedRoute,
    private elementRef: ElementRef,private renderer:Renderer2
  ) {
    const htmlElement =
    this.elementRef.nativeElement.ownerDocument.documentElement;
    let html = document.querySelector('html');

    if (window.innerWidth <= 992) {
      html?.setAttribute(
        'data-toggled',
        html?.getAttribute('data-toggled') == 'close' ? 'close' : 'close'
      );
    }
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd))
    .subscribe(() => {
      window.scrollTo(0, 0);
    });
  }
  
  ngOnInit() {

    this.menuitemsSubscribe$ = this.navServices.items.subscribe((items: any) => {
      this.menuItems = items;
    });
   this.route.data.subscribe((data) => {
    this.hideHeader = data['hideHeader'] || false;
  });
  }

  clearNavDropdown() {
    this.menuItems?.forEach((a: any) => {
      a.active = false;
      a?.children?.forEach((b: any) => {
        b.active = false;
        b?.children?.forEach((c: any) => {
          c.active = false;
        });
      });
    });
  }
  clickOnBody() {
    document.querySelector('#responsive-overlay')?.classList.remove('active');
    let html = this.elementRef.nativeElement.ownerDocument.documentElement;
    if (window.innerWidth <= 992) {
      html?.setAttribute('data-toggled', html?.getAttribute('data-toggled') == 'close' ? 'close' : 'close');
    }
    html?.removeAttribute('data-icon-text');


    this.menuItem.active = !this.menuItem.active;

    if(html.getAttribute('data-nav-layout') =='horizontal' && window.innerWidth >= 992){this.clearNavDropdown();}
    const navStyle = document.documentElement.getAttribute('data-nav-style');
    if (navStyle === 'menu-click' || navStyle === 'menu-hover' || navStyle === 'icon-click' || navStyle === 'icon-hover') {
      document.querySelector('.double-menu-active')?.setAttribute('style', 'display: none;');
    } 
  }
  menuItem = {
    active: false,
  };


  clearToggle() {
    let html = this.elementRef.nativeElement.ownerDocument.documentElement;
    html?.setAttribute('data-toggled', 'close');
    document.querySelector('#responsive-overlay')?.classList.remove('active');
  }
}