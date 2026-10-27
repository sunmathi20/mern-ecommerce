import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';
dotenv.config();

// Configure Google Public DNS for reliable SRV resolution on Windows
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (e) {
  console.warn('DNS server override warning:', e.message);
}

const LOCAL_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/aurelia';
// Atlas URI from argument or environment variable
const ATLAS_URI_INPUT = process.env.ATLAS_URI || process.argv[2];

async function inspectLocal() {
  console.log('--- Inspecting Local MongoDB ---');
  try {
    const conn = await mongoose.createConnection(LOCAL_URI).asPromise();
    const db = conn.db;
    const dbName = db.databaseName;
    console.log(`Local Database Name: ${dbName}`);
    const collections = await db.listCollections().toArray();
    const counts = {};
    for (const col of collections) {
      counts[col.name] = await db.collection(col.name).countDocuments();
    }
    console.log('Local Collections & Counts:', JSON.stringify(counts, null, 2));
    await conn.close();
    return { success: true, dbName, counts };
  } catch (err) {
    console.error('Local DB inspection error:', err.message);
    return { success: false, error: err.message };
  }
}

async function inspectAtlas(atlasUri) {
  console.log('--- Inspecting MongoDB Atlas Cluster ---');
  try {
    let targetUri = atlasUri;
    if (!targetUri.includes('.mongodb.net/aurelia')) {
      targetUri = targetUri.replace('.mongodb.net/?', '.mongodb.net/aurelia?');
      if (targetUri.endsWith('.mongodb.net/')) {
        targetUri = targetUri + 'aurelia?retryWrites=true&w=majority&appName=Cluster0';
      } else if (targetUri.endsWith('.mongodb.net')) {
        targetUri = targetUri + '/aurelia?retryWrites=true&w=majority&appName=Cluster0';
      }
    }
    // Mask credentials for logging
    const masked = targetUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
    console.log(`Attempting connection to Atlas cluster: ${masked}`);

    const conn = await mongoose.createConnection(targetUri).asPromise();
    console.log('✓ Atlas Connection Successful!');

    const adminDb = conn.db.admin();
    const dbsList = await adminDb.listDatabases();
    console.log('Atlas Existing Databases:', dbsList.databases.map(d => `${d.name} (${d.sizeOnDisk} bytes)`));

    // Check default dbName or 'aurelia' / 'viva'
    const currentDbName = conn.db.databaseName;
    console.log(`Current Connected Atlas Database: ${currentDbName}`);

    // Inspect collections in currentDbName
    const collections = await conn.db.listCollections().toArray();
    const counts = {};
    for (const col of collections) {
      counts[col.name] = await conn.db.collection(col.name).countDocuments();
    }
    console.log(`Atlas '${currentDbName}' Collections & Counts:`, JSON.stringify(counts, null, 2));

    await conn.close();
    return { success: true, databases: dbsList.databases, currentDbName, counts };
  } catch (err) {
    console.error('Atlas connection error:', err.message);
    return { success: false, error: err.message };
  }
}

async function run() {
  const localRes = await inspectLocal();
  if (ATLAS_URI_INPUT) {
    const atlasRes = await inspectAtlas(ATLAS_URI_INPUT);
  } else {
    console.log('No Atlas URI provided for inspection.');
  }
}

run();
