import { Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail, signOut, User } from 'firebase/auth';
import { getFirestore, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private app = initializeApp(environment.firebase);
  private auth = getAuth(this.app);
  private firestore = getFirestore(this.app);

  public showLoader = false;
  public authState: User | null = null;

  constructor(private router: Router, public ngZone: NgZone) {
    this.auth.onAuthStateChanged((user) => (this.authState = user));
  }

  // --- GETTERS ---
  get isUserAnonymousLoggedIn(): boolean {
    return this.authState ? (this.authState as any).isAnonymous : false;
  }

  get currentUserId(): string {
    return this.authState ? this.authState.uid : '';
  }

  get currentUserEmail(): string {
    return this.authState ? this.authState.email ?? '' : '';
  }

  get currentUser(): User | null {
    return this.authState;
  }

  get isUserEmailLoggedIn(): boolean {
    return !!(this.authState && !this.isUserAnonymousLoggedIn);
  }

  // --- AUTH ACTIONS ---

  async registerWithEmail(email: string, password: string): Promise<void> {
    try {
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      this.authState = userCredential.user;
      await this.sendVerificationMail();
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  async loginWithEmail(email: string, password: string): Promise<void> {
    try {
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      this.authState = userCredential.user;
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  async signOut(): Promise<void> {
    await signOut(this.auth);
    this.router.navigate(['/login']);
  }

  async sendVerificationMail(): Promise<void> {
    if (this.auth.currentUser) {
      await sendEmailVerification(this.auth.currentUser);
    }
  }

  async setUserData(user: User): Promise<void> {
    const userRef = doc(this.firestore, `users/${user.uid}`);
    const userData = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName ?? '',
      photoURL: user.photoURL ?? 'src/favicon.ico',
      emailVerified: user.emailVerified,
    };
    await setDoc(userRef, userData, { merge: true });
  }

  async deleteUserData(user: User): Promise<void> {
    const userRef = doc(this.firestore, `users/${user.uid}`);
    await deleteDoc(userRef);
  }

  async forgotPassword(email: string): Promise<void> {
    await sendPasswordResetEmail(this.auth, email);
    alert('Password reset email sent. Check your inbox.');
  }
}
