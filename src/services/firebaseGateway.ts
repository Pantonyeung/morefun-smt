import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  browserLocalPersistence,
  getAuth,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  type Auth,
  type User,
} from 'firebase/auth';
import { get, getDatabase, onValue, ref, type Database, type Unsubscribe } from 'firebase/database';
import type { FirebaseUserIdentity, StaffProfile } from '../domain/types';
import type { SmtRuntimeConfig } from '../runtime/config';
import { normalizeSmtCatalogSnapshot } from './smtCatalogGatewayAdapter';

export interface FirebaseGateway {
  auth: Auth;
  database: Database;
  signIn: (email: string, password: string) => Promise<FirebaseUserIdentity>;
  signOut: () => Promise<void>;
  onUser: (callback: (user: FirebaseUserIdentity | null) => void) => Unsubscribe;
  getIdToken: () => Promise<string>;
  readStaffProfile: (uid: string) => Promise<StaffProfile | null>;
  subscribeStaffProfile: (uid: string, callback: (profile: StaffProfile | null) => void) => Unsubscribe;
  subscribeCatalog: (callback: (catalog: unknown) => void, onError?: (error: Error) => void) => Unsubscribe;
  subscribePath: (path: string, callback: (value: unknown) => void, onError?: (error: Error) => void) => Unsubscribe;
  subscribeConnected: (callback: (connected: boolean) => void) => Unsubscribe;
  readPath: (path: string) => Promise<unknown>;
}

export function createFirebaseGateway(config: SmtRuntimeConfig): FirebaseGateway {
  const firebase = config.firebase;
  const app: FirebaseApp = getApps()[0] ?? initializeApp(firebase);
  const auth = getAuth(app);
  const database = getDatabase(app);
  void setPersistence(auth, browserLocalPersistence);

  return {
    auth,
    database,
    async signIn(email, password) {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      return toIdentity(credential.user);
    },
    signOut: () => signOut(auth),
    onUser(callback) {
      return onAuthStateChanged(auth, (user) => callback(user ? toIdentity(user) : null));
    },
    async getIdToken() {
      if (!auth.currentUser) throw Object.assign(new Error('請先登入 SMT'), { code: 'AUTH_REQUIRED', status: 401 });
      return auth.currentUser.getIdToken();
    },
    async readStaffProfile(uid) {
      const snapshot = await get(ref(database, `staffProfiles/${uid}`));
      return snapshot.exists() ? normalizeStaffProfile(uid, snapshot.val()) : null;
    },
    subscribeStaffProfile(uid, callback) {
      return onValue(ref(database, `staffProfiles/${uid}`), (snapshot) => callback(snapshot.exists() ? normalizeStaffProfile(uid, snapshot.val()) : null));
    },
    subscribeCatalog(callback, onError) {
      return onValue(
        ref(database, 'public/catalogV1'),
        (snapshot) => callback(normalizeSmtCatalogSnapshot(snapshot.val() ?? {})),
        (error) => onError?.(error),
      );
    },
    subscribePath(path, callback, onError) {
      return onValue(ref(database, path), (snapshot) => callback(snapshot.val() ?? {}), (error) => onError?.(error));
    },
    subscribeConnected(callback) {
      return onValue(ref(database, '.info/connected'), (snapshot) => callback(snapshot.val() === true));
    },
    async readPath(path) {
      const snapshot = await get(ref(database, path));
      return snapshot.val() ?? null;
    },
  };
}

function toIdentity(user: User): FirebaseUserIdentity {
  return {
    uid: user.uid,
    email: user.email || '',
    displayName: user.displayName || user.email?.split('@')[0] || 'SMT 職員',
  };
}

function normalizeStaffProfile(uid: string, value: unknown): StaffProfile {
  const raw = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const roleText = String(raw.role || 'unknown').toLowerCase();
  const role: StaffProfile['role'] = ['smt', 'admin', 'smm', 'printer'].includes(roleText) ? roleText as StaffProfile['role'] : 'unknown';
  return {
    uid,
    role,
    active: raw.active === true,
    displayName: String(raw.display_name || raw.displayName || raw.name || uid),
    deviceNumber: String(raw.device_number || raw.deviceNumber || '') || undefined,
  };
}
