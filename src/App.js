import { useState, useEffect } from "react";
import { auth, provider, db } from "./firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "firebase/auth";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  setDoc,
  getDoc
} from "firebase/firestore";

const COLORS = {
  bg: "#0a0f1e",
  card: "#111827",
  cardBorder: "#1e2d45",
  accent: "#f59e0b",
  text: "#f1f5f9",
  muted: "#94a3b8",
  green: "#22c55e",
  blue: "#3b82f6",
  red: "#ef4444",
};

const FONT = "'Sora', sans-serif";
const ADMIN_EMAIL = "emailnabonswendepourde@gmail.com";
