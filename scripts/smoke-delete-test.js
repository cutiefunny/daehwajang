import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

// Usage:
// SERVICE_ACCOUNT=./serviceAccount.json PROJECT_ID=your-project-id node scripts/smoke-delete-test.js

const serviceAccountPath = './serviceAccount.json';
const projectId = 'daehwajang-7c6a8';
const bucketName = `${projectId}.firebasestorage.app`;

if (!serviceAccountPath) {
  console.error('Please set SERVICE_ACCOUNT env var to path of service account JSON');
  process.exit(1);
}
if (!projectId) {
  console.error('Please set PROJECT_ID env var');
  process.exit(1);
}

console.log(`Target Project: ${projectId}`);
console.log(`Target Bucket: ${bucketName}`); // [추가] 실행 시 확인용 로그

const sa = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(sa),
  storageBucket: bucketName,
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

async function uploadSampleFile(localFilePath, destPath) {
  await bucket.upload(localFilePath, { destination: destPath });
  // make the file public-read is optional; we'll generate a signed URL
  const file = bucket.file(destPath);
  const [url] = await file.getSignedUrl({ action: 'read', expires: Date.now() + 5 * 60 * 1000 });
  return { path: destPath, url };
}

async function run() {
  console.log('Starting smoke-delete-test');

  // 1) upload a small placeholder file
  const tmpFile = path.join(process.cwd(), 'scripts', 'tmp-test.txt');
  fs.writeFileSync(tmpFile, 'smoke test');
  const destPath = `test-smoke/${Date.now()}-tmp-test.txt`;

  console.log('Uploading sample file to storage...');
  const uploaded = await uploadSampleFile(tmpFile, destPath);
  console.log('Uploaded:', uploaded);

  // 2) create meeting doc with image URL
  const meetingRef = await db.collection('meetings').add({
    title: 'smoke-delete-test-meeting',
    image: uploaded.url,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
  const meetingId = meetingRef.id;
  console.log('Created meeting:', meetingId);

  // 3) create related application and review
  const appRef = await db.collection('meeting_applications').add({ meetingId, userId: 'smoke-user', status: 'pending' });
  const reviewRef = await db.collection('meeting_reviews').add({ meetingId, reviewerId: 'smoke-user', content: 'ok' });
  console.log('Created related docs:', appRef.id, reviewRef.id);

  // 4) Perform deletion sequence (mirror client logic)
  console.log('Deleting storage object by gs path...');
  try {
    // Try to delete by path
    await bucket.file(destPath).delete();
    console.log('Storage file deleted');
  } catch (e) {
    console.error('Storage delete failed:', e);
  }

  // delete applications
  const appsQ = await db.collection('meeting_applications').where('meetingId', '==', meetingId).get();
  for (const d of appsQ.docs) {
    await d.ref.delete();
  }
  console.log('Deleted applications count:', appsQ.size);

  // delete reviews
  const revQ = await db.collection('meeting_reviews').where('meetingId', '==', meetingId).get();
  for (const d of revQ.docs) {
    await d.ref.delete();
  }
  console.log('Deleted reviews count:', revQ.size);

  // delete meeting
  await meetingRef.delete();
  console.log('Deleted meeting doc');

  // verify
  const appsAfter = await db.collection('meeting_applications').where('meetingId', '==', meetingId).get();
  const revAfter = await db.collection('meeting_reviews').where('meetingId', '==', meetingId).get();
  const meetAfter = await db.collection('meetings').doc(meetingId).get();
  const fileExists = await bucket.file(destPath).exists();

  console.log('Verification: applications=', appsAfter.size, 'reviews=', revAfter.size, 'meetingExists=', meetAfter.exists, 'fileExists=', fileExists[0]);

  // cleanup temp
  try { fs.unlinkSync(tmpFile); } catch (e) {}

  console.log('Smoke test complete');
}

run().catch(err => { console.error(err); process.exit(1); });
