import * as path from 'path';
import * as dotenv from 'dotenv';
import { parseAllLogs } from './parser';
import { signInApi, uploadPhoneActivityOneByOne } from './api';
import { mapLogsToPhoneActivities } from './mappers/phoneActivityMapper';

// Load environment variables
dotenv.config();

async function main(): Promise<void> {
  try {
    console.log('=== Control Tower Migration ===\n');

    // Validate required environment variables
    const username = process.env.API_USERNAME;
    const password = process.env.API_PASSWORD;
    const deviceName = process.env.API_DEVICE_NAME;

    if (!username || !password || !deviceName) {
      throw new Error(
        'Missing required environment variables. Please set API_USERNAME, API_PASSWORD, and API_DEVICE_NAME in .env file'
      );
    }

    // Step 1: Sign in to the API
    console.log('Step 1: Authenticating...\n');
    await signInApi({
      username,
      password,
      deviceName
    });
    console.log();

    // Step 2: Parse XML and CSV logs
    console.log('Step 2: Parsing XML and CSV logs...\n');

    // Define paths to the log files
    const callLogsPath = path.join(__dirname, '../data/call logs.xml');
    const smsLogsPath = path.join(__dirname, '../data/SMS logs.xml');
    const csvCallLogsPath = path.join(__dirname, '../data/Calllog-export.csv');

    // Parse all log files (XML and CSV)
    const result = await parseAllLogs(callLogsPath, smsLogsPath, csvCallLogsPath);

    // Display summary
    console.log('=== Parsing Summary ===');
    console.log(`Total Call Logs: ${result.summary.totalCalls}`);
    console.log(`  - Incoming: ${result.summary.callsByType.incoming}`);
    console.log(`  - Outgoing: ${result.summary.callsByType.outgoing}`);
    console.log(`  - Missed: ${result.summary.callsByType.missed}`);
    console.log(`  - Rejected: ${result.summary.callsByType.rejected}`);
    console.log(`  - Blocked: ${result.summary.callsByType.blocked}`);
    console.log();
    console.log(`Total SMS Logs: ${result.summary.totalSMS}`);
    console.log(`  - Received: ${result.summary.smsByType.received}`);
    console.log(`  - Sent: ${result.summary.smsByType.sent}`);
    console.log(`  - Draft: ${result.summary.smsByType.draft}`);
    console.log();

    // Show sample data
    console.log('=== Sample Call Log ===');
    if (result.callLogs.length > 0) {
      const sampleCall = result.callLogs[0];
      console.log(JSON.stringify(sampleCall, null, 2));
    }
    console.log();

    console.log('=== Sample SMS Log ===');
    if (result.smsLogs.length > 0) {
      const sampleSMS = result.smsLogs[0];
      console.log(JSON.stringify(sampleSMS, null, 2));
    }
    console.log();

    // Step 3: Map logs to PhoneActivity format
    console.log('Step 3: Converting logs to PhoneActivity format...\n');
    const phoneActivities = mapLogsToPhoneActivities(
      result.callLogs,
      result.smsLogs
    );

    console.log(`✓ Converted ${phoneActivities.length} records to PhoneActivity format`);
    console.log();

    // Check if there are any records to upload
    if (phoneActivities.length === 0) {
      console.log('⚠ No phone activity records found to upload.');
      console.log('Please ensure XML backup files exist in the ./data folder:');
      console.log('  - call logs.xml');
      console.log('  - SMS logs.xml');
      console.log();
      console.log('Migration completed with no data to upload.');
      return;
    }

    // Show sample PhoneActivity
    if (phoneActivities.length > 0) {
      console.log('=== Sample PhoneActivity ===');
      console.log(JSON.stringify(phoneActivities[0], null, 2));
      console.log();
    }

    // Step 4: Upload to API (one by one in chronological order)
    console.log('Step 4: Uploading phone activity data to API...\n');
    const uploadResult = await uploadPhoneActivityOneByOne(phoneActivities, 200);

    console.log();
    console.log('=== Migration Complete ===');
    console.log(`✓ Successfully uploaded ${uploadResult.totalCreated} records`);
    if (uploadResult.totalFailed > 0) {
      console.log(`✗ Failed to upload ${uploadResult.totalFailed} records`);
      if (uploadResult.failedRecords.length > 0) {
        console.log('\nFailed records:');
        uploadResult.failedRecords.forEach(record => {
          console.log(`  - ${record.type} from ${record.phoneNumber} at ${record.timestamp}`);
        });
      }
    }
  } catch (error) {
    console.error('Error in main:', error);
    process.exit(1);
  }
}

main();
