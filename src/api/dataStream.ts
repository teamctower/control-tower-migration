import { apiClient } from './config';
import {
  DataStreamRequest,
  DataStreamResponse,
  PhoneActivityPayload
} from './phoneActivity.types';

/**
 * Upload phone activity data (call logs and SMS) to the API
 * @param activity - Array of phone activity records
 * @returns Promise with the API response
 */
export async function uploadPhoneActivity(
  activity: PhoneActivityPayload[]
): Promise<DataStreamResponse> {
  try {
    if (!activity || activity.length === 0) {
      throw new Error('No activity data to upload');
    }

    // Get device ID from environment variables
    const deviceId = process.env.API_DEVICE_ID;
    if (!deviceId) {
      throw new Error('API_DEVICE_ID environment variable is not set');
    }

    console.log(`Uploading ${activity.length} phone activity records...`);

    const request: DataStreamRequest = { activity };

    const response = await apiClient.post<DataStreamResponse>(
      '/api/data-stream',
      request,
      {
        headers: {
          'x-device-id': deviceId
        }
      }
    );

    if (response.data) {
      if (response.data.statusCode === 201 && response.data.data === true) {
        console.log(`✓ Successfully uploaded ${activity.length} phone activity records`);
      } else {
        console.log('Response:', JSON.stringify(response.data, null, 2));
      }
      return response.data;
    }

    throw new Error('Invalid response format');
  } catch (error: any) {
    console.error('Failed to upload phone activity:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Upload phone activity in batches to avoid overwhelming the API
 * @param activity - Array of phone activity records
 * @param batchSize - Number of records per batch (default: 100)
 * @returns Promise with aggregated results
 */
export async function uploadPhoneActivityInBatches(
  activity: PhoneActivityPayload[],
  batchSize: number = 100
): Promise<{ totalCreated: number; totalFailed: number; batches: number }> {
  if (!activity || activity.length === 0) {
    throw new Error('No activity data to upload');
  }

  let totalCreated = 0;
  let totalFailed = 0;
  let batches = 0;

  console.log(`\nUploading ${activity.length} records in batches of ${batchSize}...`);

  for (let i = 0; i < activity.length; i += batchSize) {
    const batch = activity.slice(i, i + batchSize);
    batches++;

    console.log(`\nBatch ${batches}: Uploading records ${i + 1} to ${i + batch.length}...`);

    try {
      const result = await uploadPhoneActivity(batch);

      // Check if upload was successful
      if (result.statusCode === 201 && result.data === true) {
        // All records in the batch were successfully uploaded
        totalCreated += batch.length;
      } else {
        // Upload failed or returned unexpected response
        totalFailed += batch.length;
        console.warn(`Unexpected response for batch ${batches}:`, result);
      }

      // Add a small delay between batches to avoid rate limiting
      if (i + batchSize < activity.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error(`Batch ${batches} failed:`, error);
      totalFailed += batch.length;
    }
  }

  console.log('\n=== Upload Summary ===');
  console.log(`Total batches: ${batches}`);
  console.log(`Total created: ${totalCreated}`);
  console.log(`Total failed: ${totalFailed}`);

  return { totalCreated, totalFailed, batches };
}

/**
 * Upload phone activity records one by one in chronological order
 * @param activity - Array of phone activity records
 * @param delayMs - Delay between uploads in milliseconds (default: 200ms)
 * @returns Promise with aggregated results
 */
export async function uploadPhoneActivityOneByOne(
  activity: PhoneActivityPayload[],
  delayMs: number = 200
): Promise<{ totalCreated: number; totalFailed: number; failedRecords: PhoneActivityPayload[] }> {
  if (!activity || activity.length === 0) {
    throw new Error('No activity data to upload');
  }

  // Sort by timestamp ascending (oldest first)
  const sortedActivity = [...activity].sort((a, b) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  let totalCreated = 0;
  let totalFailed = 0;
  const failedRecords: PhoneActivityPayload[] = [];

  console.log(`\nUploading ${sortedActivity.length} records one by one in chronological order...`);
  console.log(`First record: ${sortedActivity[0].timestamp}`);
  console.log(`Last record: ${sortedActivity[sortedActivity.length - 1].timestamp}\n`);

  for (let i = 0; i < sortedActivity.length; i++) {
    const record = sortedActivity[i];
    const progress = `[${i + 1}/${sortedActivity.length}]`;

    try {
      // Upload single record
      const result = await uploadPhoneActivity([record]);

      // Check if upload was successful
      if (result.statusCode === 201 && result.data === true) {
        totalCreated++;
        console.log(`${progress} ✓ ${record.type} - ${record.phoneNumber} at ${record.timestamp}`);
      } else {
        totalFailed++;
        failedRecords.push(record);
        console.warn(`${progress} ✗ Unexpected response for record:`, result);
      }

      // Add delay between uploads (except for the last one)
      if (i < sortedActivity.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    } catch (error: any) {
      totalFailed++;
      failedRecords.push(record);
      console.error(`${progress} ✗ Failed to upload:`, error.response?.data?.message || error.message);
    }
  }

  console.log('\n=== Upload Summary ===');
  console.log(`Total created: ${totalCreated}`);
  console.log(`Total failed: ${totalFailed}`);

  return { totalCreated, totalFailed, failedRecords };
}
