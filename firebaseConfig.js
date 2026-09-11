// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBDPObIPL2rzp7epQW6H1kx87K50nNuij4",
  authDomain: "food2go-ec9cb.firebaseapp.com",
  projectId: "food2go-ec9cb",
  storageBucket: "food2go-ec9cb.firebasestorage.app",
  messagingSenderId: "839410891459",
  appId: "1:839410891459:web:a7068a4b30c21d6b534076",
  measurementId: "G-NNWRRC7JQK",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

const analytics = getAnalytics(app);

export const auth = getAuth(app);
export const db = getFirestore(app);
