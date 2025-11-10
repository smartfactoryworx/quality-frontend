import { CommonModule, DOCUMENT } from '@angular/common';
import { Component, ElementRef, Inject, Renderer2 } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { Router, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { HttpClientModule } from '@angular/common/http';
import { UserAdminService, LoginPayload } from '../../user-admin/services/user-admin.service';
import { BreadcrumbService } from '../../shared/services/breadcrumb.service';
import { catchError, finalize, of, switchMap } from 'rxjs';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule, HttpClientModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  public loginForm!: FormGroup;
  public showPassword = false;
  public isLoading = false;
  public errorMessage: string | null = null;

  toggleClass = 'off-line';

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private elementRef: ElementRef,
    private sanitizer: DomSanitizer,
    private router: Router,
    private formBuilder: FormBuilder,
    private renderer: Renderer2,
    private toastr: ToastrService,
    private userAdminService: UserAdminService,
    private breadcrumbService: BreadcrumbService // ✅ inject new service
  ) {
    this.document.body.classList.add('authentication-background');
  }

  ngOnInit(): void {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  ngOnDestroy(): void {
    this.document.body.classList.remove('authentication-background');
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
    this.toggleClass = this.toggleClass === 'line' ? 'off-line' : 'line';
  }


login(): void {
  if (this.loginForm.invalid) {
    this.toastr.error('Please enter valid credentials', 'Xintra');
    return;
  }

  this.isLoading = true;
  const payload: LoginPayload = this.loginForm.value;

  this.userAdminService.login(payload).pipe(
    switchMap(() => this.breadcrumbService.ensureLoaded()),  // ← single, cached call
    finalize(() => this.isLoading = false),
    catchError(err => {
      const msg = err.error?.message || 'Invalid email or password';
      this.toastr.error(msg, 'Login Failed');
      return of(null);
    })
  ).subscribe(userData => {
    if (!userData) return;
    this.breadcrumbService.setBreadcrumbs([]);
    this.toastr.success(`Welcome, ${userData.user?.name ?? ''}`, 'Login successful');
    this.router.navigate(['/hierarchy'], { replaceUrl: true });
  });
}


  logout(): void {
    this.userAdminService.logout().subscribe(() => {
      localStorage.removeItem('userData');
      this.breadcrumbService.clearBreadcrumbs();
      this.router.navigate(['/login']);
      this.toastr.info('Logged out successfully');
    });
  }

  get form() {
    return this.loginForm.controls;
  }
}
