import './style.css'
import javascriptLogo from './assets/javascript.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import { getAuth, signInWithPopup, OAuthProvider, signOut, signInWithRedirect, onAuthStateChanged } from "firebase/auth";
import { doc, setDoc, getFirestore } from "firebase/firestore";

import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyCdKD9XUBGWEuA9Y4wgYNzHra9UHF-E9wc",
  authDomain: "studentmarketplace-c0ef9.firebaseapp.com",
  projectId: "studentmarketplace-c0ef9",
  storageBucket: "studentmarketplace-c0ef9.firebasestorage.app",
  messagingSenderId: "130963446060",
  appId: "1:130963446060:web:15c6a487d5b6a0422c3489",
  measurementId: "G-0PBGGGM2CH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

const auth = getAuth();
const db = getFirestore();
const provider = new OAuthProvider('microsoft.com');
let curUser;

provider.setCustomParameters({
  // Forces the account selection screen every time
  // prompt: 'select_account',
});
const analytics = getAnalytics(app);

let authSpot = document.querySelector("#authCorner");

onAuthStateChanged(auth, (user) => {
  renderAuthSpot();
  console.log("changedState");
  if (user) {
  } else {
  }
});
const login = async () => {
  const result = await signInWithPopup(auth, provider);

  // 1. Get the Firebase User object
  curUser = result.user;

  await registerUserInDb(curUser);
  renderAuthSpot();
}

const logout = () => {
  auth.signOut().then(function () {
    console.log('Signed Out');
  }, function (error) {
    console.error('Sign Out Error', error);
  });
}
function renderAuthSpot() {
  if (auth.currentUser) {
    authSpot.innerHTML = `<button id="btn-list">List Item</button><button id="logout">Logout</button>`;
    document.querySelector("#logout").addEventListener('click', () => logout());
  } else {
    authSpot.innerHTML = `Not Logged In <button class="btn-auth" id="login">Register / Sign In</button>`
    document.querySelector("#login").addEventListener('click', () => login());
  }
}
const registerUserInDb = async (user) => {
  const userRef = doc(db, "Users", user.uid);
  await setDoc(userRef, {
    fullName: user.displayName,
    email: user.email,
    createdAt: new Date()
  }, { merge: true }); // 'merge' prevents overwriting if they log in again
};

