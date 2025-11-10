// src/app/shared/services/user-admin.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

export interface LoginPayload {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    _id: string;
    name: string;  // ✅ add this
    email: string;
    lines?: any[];
    categories?: any[];
    quality?: any[];
  };
  plants?: any[];
  locations?: any[];
  states?: any[];
  countries?: any[];
  company?: any[];
}



@Injectable({ providedIn: 'root' })
export class UserAdminService {

  
  private http = inject(HttpClient); // ✅ new Angular 19 injection style
  private readonly apiBase = environment.uaapiBaseUrl;


  // ✅ Endpoints
  private readonly loginUrl = `${this.apiBase}/api/users/login`;
  private readonly rolesUrl = `${this.apiBase}/api/roles`;
  private readonly menuRoutesUrl = `${this.apiBase}/api/menu-routes`;
  private readonly usersUrl = `${this.apiBase}/api/users`;
  private readonly hierarchyUrl = `${this.apiBase}/api/hierarchy`;
  private readonly companyApiUrl = `${this.hierarchyUrl}/company`;

  // ======================
  // 🔐 AUTH & LOGIN
  // ======================
  login(payload: LoginPayload): Observable<any> {
  return this.http.post(`${this.apiBase}/api/users/login`, payload, { withCredentials: true });
}

getCurrentUser(): Observable<any> {
  return this.http.get(`${this.apiBase}/api/users/currentUser`, { withCredentials: true });
}

logout(): Observable<any> {
  return this.http.post(`${this.apiBase}/api/users/logout`, {}, { withCredentials: true });
}

  // ======================
  // 📋 MENU ROUTES
  // ======================
  GetMenuRoutes(): Observable<any> {
    return this.http.get<any>(this.menuRoutesUrl);
  }

  PostMenuRoutes(payload: any): Observable<any> {
    return this.http.post<any>(this.menuRoutesUrl, payload);
  }

  UpdateMenuRoute(id: string, body: Partial<{ path: string; label: string; module: string; icon: string }>): Observable<any> {
    return this.http.put<any>(`${this.menuRoutesUrl}/${id}`, body);
  }

  DeleteMenuRoute(id: string): Observable<any> {
    return this.http.delete<any>(`${this.menuRoutesUrl}/${id}`);
  }

  // ======================
  // 🧑‍🤝‍🧑 USER ROLES
  // ======================
  GetUserRoles(): Observable<any> {
    return this.http.get<any>(this.rolesUrl);
  }

  PostUserRoles(payload: any): Observable<any> {
    return this.http.post<any>(this.rolesUrl, payload);
  }

  UpdateRole(id: string, payload: any): Observable<any> {
    return this.http.put(`${this.rolesUrl}/${id}`, payload);
  }

  // ======================
  // 🏭 HIERARCHY & COMPANIES
  // ======================
  GetCompanyApi(): Observable<any> {
    return this.http.get<any>(this.companyApiUrl);
  }

  PostHierarchy(payload: any): Observable<any> {
    return this.http.post<any>(this.hierarchyUrl, payload);
  }

  // ======================
  // 🧩 USERS
  // ======================
  GetUsers(): Observable<any> {
    return this.http.get<any>(this.usersUrl);
  }

  PostUsers(payload: any): Observable<any> {
    return this.http.post<any>(this.usersUrl, payload);
  }

  getUserById(id: string): Observable<any> {
    return this.http.get(`${this.usersUrl}/${id}`);
  }

  updateUser(id: string, userData: any): Observable<any> {
    return this.http.put(`${this.usersUrl}/${id}`, userData);
  }

  deactivateUser(userId: string): Observable<any> {
    return this.http.delete(`${this.usersUrl}/${userId}`);
  }

  activateUser(userId: string): Observable<any> {
    return this.http.put(`${this.usersUrl}/${userId}`, { isActive: true });
  }

  // ======================
  // 🧮 LINES HELPER (unchanged)
  // ======================
  GetAllLinesList(data: any): any[] {
    const linesMap = new Map<string, any>();

    for (const company of data) {
      for (const country of company.countries || []) {
        for (const state of country.states || []) {
          for (const location of state.locations || []) {
            for (const plant of location.plants || []) {
              for (const line of plant.lines || []) {
                const lineKey = line._id;
                if (!linesMap.has(lineKey)) {
                  linesMap.set(lineKey, {
                    companyname: company.company_name,
                    countryname: country.country_name,
                    statename: state.state_name,
                    locationname: location.location_name,
                    plantcode: plant.plant_code,
                    plantname: plant.plant_name,
                    lineid: line._id,
                    linecode: line.line_code,
                    linename: line.line_name,
                    equipments: []
                  });
                }

                const lineEntry = linesMap.get(lineKey);
                for (const equipment of line.equipments || []) {
                  lineEntry.equipments.push({
                    machine_id: equipment._id,
                    machine_display_name: equipment.display_name,
                    equipment_name: equipment.equipment_name
                  });
                }
              }
            }
          }
        }
      }
    }

    return Array.from(linesMap.values());
  }
}
