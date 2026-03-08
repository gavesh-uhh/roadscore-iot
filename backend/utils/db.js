const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const serviceAccountPath = path.join(__dirname, '..', 'serviceAccountKey.json');

if (fs.existsSync(serviceAccountPath)) {
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://iot-test-b3636-default-rtdb.asia-southeast1.firebasedatabase.app/'
  });
  console.log('Connected to Firebase!');
} else {
  console.error('ERROR: serviceAccountKey.json file not found!');
  process.exit(1);
}

const db = admin.database();

function generateId(prefix) {
  return prefix + '_' + uuidv4().split('-')[0];
}

async function getDoc(collectionName, id) {
  const snapshot = await db.ref(collectionName + '/' + id).once('value');
  if (!snapshot.exists()) return null;
  return { id: id, ...snapshot.val() };
}

async function getCollection(collectionName) {
  const snapshot = await db.ref(collectionName).once('value');
  return snapshot.val() || {};
}

async function setDoc(collectionName, id, data) {
  await db.ref(collectionName + '/' + id).update(data);
  return { id: id, ...data };
}

async function deleteDoc(collectionName, id) {
  await db.ref(collectionName + '/' + id).remove();
}

module.exports = { db, generateId, getDoc, getCollection, setDoc, deleteDoc };
