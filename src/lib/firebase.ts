// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD7mz-MY4WtL26YIwIbdJKVQgzNjkwvQmg",
  authDomain: "scago-feedback.firebaseapp.com",
  projectId: "scago-feedback",
  storageBucket: "scago-feedback.appspot.com",
  messagingSenderId: "698862461210",
  appId: "1:698862461210:web:3f4074e0410dcfb4f10ca3"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export { app, db };
