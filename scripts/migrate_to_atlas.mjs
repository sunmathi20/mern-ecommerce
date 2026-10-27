import mongoose from 'mongoose';
import dns from 'dns';
import dotenv from 'dotenv';
dotenv.config();

// Ensure public DNS fallback for Windows SRV queries
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (e) {
  // Ignore
}

const LOCAL_URI = process.env.LOCAL_MONGODB_URI || 'mongodb://localhost:27017/aurelia';
const ATLAS_URI = process.env.MONGODB_URI;

/**
 * Migration utility:
 * Migrates collections from local MongoDB to MongoDB Atlas while preserving:
 * - Original MongoDB ObjectIDs (_id)
 * - Timestamps and references (user, product, order relations)
 * - Indexes and unique constraints
 */
export async function migrateCollections({ targetDbName = 'aurelia', dryRun = false } = {}) {
  const rawAtlas = process.env.ATLAS_URI || ATLAS_URI;
  if (!rawAtlas || !rawAtlas.startsWith('mongodb')) {
    throw new Error('ATLAS_URI is not set or invalid.');
  }

  // Ensure target database name is included in URI
  let atlasTargetUri = rawAtlas;
  if (!atlasTargetUri.includes('.mongodb.net/' + targetDbName)) {
    if (atlasTargetUri.includes('.mongodb.net/?')) {
      atlasTargetUri = atlasTargetUri.replace('.mongodb.net/?', `.mongodb.net/${targetDbName}?`);
    } else if (atlasTargetUri.endsWith('.mongodb.net/')) {
      atlasTargetUri = atlasTargetUri + targetDbName + '?retryWrites=true&w=majority&appName=Cluster0';
    } else if (atlasTargetUri.endsWith('.mongodb.net')) {
      atlasTargetUri = atlasTargetUri + '/' + targetDbName + '?retryWrites=true&w=majority&appName=Cluster0';
    }
  }

  console.log(`Connecting to local DB: ${LOCAL_URI}...`);
  const localConn = await mongoose.createConnection(LOCAL_URI).asPromise();
  console.log(`✓ Connected to local database: ${localConn.db.databaseName}`);

  console.log(`Connecting to Atlas DB...`);
  const atlasConn = await mongoose.createConnection(atlasTargetUri).asPromise();
  console.log(`✓ Connected to Atlas database: ${atlasConn.db.databaseName}`);

  const localDb = localConn.db;
  const atlasDb = atlasConn.db;

  const collections = await localDb.listCollections().toArray();
  const report = {};

  for (const col of collections) {
    const colName = col.name;
    const docs = await localDb.collection(colName).find({}).toArray();
    const existingAtlasCount = await atlasDb.collection(colName).countDocuments();

    report[colName] = {
      localCount: docs.length,
      atlasCountBefore: existingAtlasCount,
      migratedCount: 0,
    };

    if (!dryRun && docs.length > 0) {
      console.log(`Migrating '${colName}' (${docs.length} documents)...`);
      // Upsert by _id to preserve original ObjectIDs and prevent duplicates
      const bulkOps = docs.map((doc) => ({
        replaceOne: {
          filter: { _id: doc._id },
          replacement: doc,
          upsert: true,
        },
      }));
      const res = await atlasDb.collection(colName).bulkWrite(bulkOps);
      report[colName].migratedCount = (res.upsertedCount || 0) + (res.modifiedCount || 0) + (res.matchedCount || 0);

      // Copy indexes (preserving unique constraints and performance indexes)
      try {
        const indexes = await localDb.collection(colName).indexes();
        for (const idx of indexes) {
          if (idx.name === '_id_') continue;
          const { key, name, unique, sparse } = idx;
          const options = { name };
          if (unique) options.unique = true;
          if (sparse) options.sparse = true;
          await atlasDb.collection(colName).createIndex(key, options);
        }
      } catch (idxErr) {
        console.warn(`Index copy warning for ${colName}:`, idxErr.message);
      }
    }
  }

  await localConn.close();
  await atlasConn.close();

  return report;
}

if (process.argv[1] && process.argv[1].endsWith('migrate_to_atlas.mjs')) {
  const isDryRun = process.argv.includes('--dry-run');
  migrateCollections({ dryRun: isDryRun })
    .then((r) => {
      console.log('Migration Report:', JSON.stringify(r, null, 2));
      process.exit(0);
    })
    .catch((err) => {
      console.error('Migration failed:', err.message);
      process.exit(1);
    });
}
