import { FirebaseOptions } from "firebase/app";

export const firebaseConfig: FirebaseOptions = {
  apiKey: import.meta.env.FIREBASE_APIKEY,
  appId: import.meta.env.FIREBASE_APPID,
  authDomain: import.meta.env.FIREBASE_AUTHDOMAIN,
  databaseURL: import.meta.env.FIREBASE_DATABASEURL,
  messagingSenderId: import.meta.env.FIREBASE_MESSAGINGSENDERID,
  projectId: import.meta.env.FIREBASE_PROJECTID,
  storageBucket: import.meta.env.FIREBASE_STORAGEBUCKET,
};
