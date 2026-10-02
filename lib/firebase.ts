import { getApp, getApps, initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";

// Firebase web config is public by design; access is enforced by firestore.rules.
const firebaseConfig = {
  apiKey: "AIzaSyDr69jTqTHcMKjyNooukkFCdTsfsgoJ6ds",
  authDomain: "relp-d6046.firebaseapp.com",
  projectId: "relp-d6046",
  storageBucket: "relp-d6046.firebasestorage.app",
  messagingSenderId: "455016130088",
  appId: "1:455016130088:web:f3d6a88ddb4da1f7ec771d",
};

const isFirstInit = !getApps().length;
export const app = isFirstInit ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);

// Local development / QA against `firebase emulators:start`.
if (isFirstInit && process.env.NEXT_PUBLIC_USE_EMULATORS === "true") {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}
