import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAUpr9RlQpoQArjsFE0cjYyjEw5QonWWBE",
  authDomain: "dadbod-vegas.firebaseapp.com",
  projectId: "dadbod-vegas",
  storageBucket: "dadbod-vegas.firebasestorage.app",
  messagingSenderId: "724866056278",
  appId: "1:724866056278:web:e7cda7b5edf09cd3e03bf7",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);