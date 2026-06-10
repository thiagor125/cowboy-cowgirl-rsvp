import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAAwTp5NPRbFX4t6b7-cdZNtyETd4zI-kg",
  authDomain: "cowboycowgirl-751c4.firebaseapp.com",
  projectId: "cowboycowgirl-751c4",
  storageBucket: "cowboycowgirl-751c4.appspot.com",
  messagingSenderId: "906928299919",
  appId: "1:906928299919:web:f46d0f327076f436df75fa",
  measurementId: "G-KQZPXKNHTL",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export { app };
