import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UserAdminService } from '../../services/user-admin.service';

@Component({
  selector: 'app-menu-routes',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './menu-routes.component.html',
  styleUrls: ['./menu-routes.component.scss']
})
export class MenuRoutesComponent {
  menuRoutes: any[] = [];
  allRoutesChecked: boolean = false;
  selectedRoute: any = null;
  isAddEditPopupOpen = false;
toastMessage = '';
showToast = false;
  menuRouteColumns = [
    { header: "Path", field: "path" },
    { header: "Label", field: "label" },
    { header: "Module", field: "module" },
    { header: "Icon", field: "icon" }
  ];

  constructor(private http: HttpClient, private userAdmin: UserAdminService) {}

  ngOnInit() {
    this.fetchMenuRoutes();
  }

  private _showToast(msg: string) {
  this.toastMessage = msg;
  this.showToast = true;
  setTimeout(() => this.showToast = false, 3000);  // hide after 3s
}

  fetchMenuRoutes() {
    this.userAdmin.GetMenuRoutes().subscribe({
      next: (res) => {
        this.menuRoutes = res.map((route:any) => ({ ...route, checked: false }));
      },
      error: (err) => {
        console.error('Failed to fetch menu routes', err);
      },
    });
  }

  toggleSelectAll(checked: boolean) {
    this.menuRoutes.forEach(route => route.checked = checked);
    this.allRoutesChecked = checked;
  }

  openAddRoutePopup() {
    this.selectedRoute = { path: '', label: '', module: '', icon: '' };
    this.isAddEditPopupOpen = true;
  }

  onEditRoute(route: any) {
    this.selectedRoute = { ...route };
    this.isAddEditPopupOpen = true;
  }

  closePopup() {
    this.selectedRoute = null;
    this.isAddEditPopupOpen = false;
  }

  onSaveRoute() {
    if (!this.selectedRoute) return;

    const payload = {
      path:   this.selectedRoute.path,
      label:  this.selectedRoute.label,
      module: this.selectedRoute.module,
      icon:   this.selectedRoute.icon
    };

    if (this.selectedRoute._id) {
      // UPDATE
      this.userAdmin
        .UpdateMenuRoute(this.selectedRoute._id, payload)
        .subscribe({
          next: () => {
            this.fetchMenuRoutes();  // reload from server
            this.closePopup();
                      this._showToast('Route updated successfully');

          },
          error: err => {console.error('Failed to update route', err)
                    this._showToast('Failed to update route');
          }

        });
    } else {
      // CREATE
      this.userAdmin
        .PostMenuRoutes([payload])
        .subscribe({
          next: () => {
            this.fetchMenuRoutes();
            this.closePopup();
            this._showToast('Route created successfully');

          },
          error: err => {
            console.error('Failed to create route', err)
            this._showToast('Failed to create route');

          }

        });
    }
  }

  onDeleteRoute(id: string) {
    this.userAdmin
      .DeleteMenuRoute(id)
      .subscribe({
        next: () => {
          this.fetchMenuRoutes(),
          this._showToast('Route deleted successfully');
        },
        error: err => {
          console.error('Failed to delete route', err)
                  this._showToast('Failed to delete route');

        }
      });
  }

}
