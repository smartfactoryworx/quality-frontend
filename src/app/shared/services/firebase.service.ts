import { Injectable } from '@angular/core';
import { initializeApp, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class FirebaseService {
  private app = initializeApp(environment.firebase);

  getFirestore() {
    return getFirestore(this.app);
  }

  getDatabase() {
    return getDatabase(this.app);
  }

  getAuth() {
    return getAuth(this.app);
  }
}
