import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as fbSignOut } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyCP4DJgsePkBeW1aZRo2wT1yOlDePtCLmc",
  authDomain: "photodump-4d917.firebaseapp.com",
  projectId: "photodump-4d917",
  storageBucket: "photodump-4d917.firebasestorage.app",
  messagingSenderId: "517599273965",
  appId: "1:517599273965:web:fbf2843be3f8080de8bde4",
  measurementId: "G-1NV4BP2D7P"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

export { app, auth, db };

export function signInWithGoogle() {
  return signInWithPopup(auth, provider);
}

export function signOut() {
  return fbSignOut(auth);
}

export const authInitialized = () => {
  return new Promise<void>((resolve) => {
    const unsubscribe = auth.onAuthStateChanged(() => {
      resolve()
      unsubscribe()
    })
  })
}

