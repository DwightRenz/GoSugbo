import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyBG2tI8mHD2EQzwSLXZHKJB66ow_XNeDfI',
  authDomain: 'gosugbo-e469e.firebaseapp.com',
  projectId: 'gosugbo-e469e',
  storageBucket: 'gosugbo-e469e.firebasestorage.app',
  messagingSenderId: '732049052323',
  appId: '1:732049052323:web:52c3654c42cdda1003a516',
};

const app = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig);

export const auth = getAuth(app);