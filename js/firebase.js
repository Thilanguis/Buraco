import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { deleteDoc, doc, getFirestore, onSnapshot, setDoc, updateDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyBHvYOK7pWkikA9x5AjrVjuuSmopHisGik',
  authDomain: 'buraco-27cb3.firebaseapp.com',
  projectId: 'buraco-27cb3',
  storageBucket: 'buraco-27cb3.firebasestorage.app',
  messagingSenderId: '793904091112',
  appId: '1:793904091112:web:3e9f299f5603ee4b6a5e5d',
  measurementId: 'G-Q0RRR9714T',
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

export { db, deleteDoc, doc, onSnapshot, setDoc, updateDoc };
