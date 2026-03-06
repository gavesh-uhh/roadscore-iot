// =============================================
// DATABASE HELPER FUNCTIONS
// This file connects to Firebase Realtime Database
// =============================================

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// ----- STEP 1: Connect to Firebase -----
const serviceAccountPath = path.join(__dirname, '..', 'serviceAccountKey.json');

if (fs.existsSync(serviceAccountPath)) {
  // Load the service account key file
  const serviceAccount = require(serviceAccountPath);
  
  // Initialize Firebase with your credentials
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://iot-test-b3636-default-rtdb.asia-southeast1.firebasedatabase.app/'
  });
  
  console.log('Connected to Firebase!');
} else {
  console.error('ERROR: serviceAccountKey.json file not found!');
  process.exit(1);
}

// Get the database reference
const db = admin.database();


// ----- HELPER FUNCTIONS -----

// Create a random ID like "UID_123" or "VEH_456"
function generateId(prefix) {
  const randomNumber = Math.floor(Math.random() * 1000);
  return prefix + '_' + randomNumber.toString().padStart(3, '0');
}

// Get one item from the database
async function getDoc(collectionName, id) {
  const snapshot = await db.ref(collectionName + '/' + id).once('value');
  
  if (!snapshot.exists()) {
    return null;  // Item not found
  }
  
  return { id: id, ...snapshot.val() };
}

// Get all items from a collection
async function getCollection(collectionName) {
  const snapshot = await db.ref(collectionName).once('value');
  return snapshot.val() || {};
}

// Save or update an item in the database
async function setDoc(collectionName, id, data) {
  await db.ref(collectionName + '/' + id).update(data);
  return { id: id, ...data };
}

// Delete an item from the database
async function deleteDoc(collectionName, id) {
  await db.ref(collectionName + '/' + id).remove();
}

// Export all functions so other files can use them
module.exports = { 
  db,
  generateId, 
  getDoc, 
  getCollection, 
  setDoc, 
  deleteDoc 
};
