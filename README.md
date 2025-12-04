# Control Tower Migration

A Node.js TypeScript project for parsing Android call logs and SMS logs from XML backup files and uploading them to the Control Tower API.

## Pre-Migration Setup (AWS)

Before running the migration scripts, you need to configure the AWS environment:

### Step 1: Disable Signature Verification in ECS

1. Open AWS ECS Console
2. Find `control-tower-server-service`
3. Click **"Create new revision"**
4. Change the environment variable: `ENABLE_SIGNATURE=false`
5. Apply changes and deploy the new revision

### Step 2: Create Migration Device in RDS

1. Open AWS RDS Console
2. Open **Query Editor**
3. Connect to the database
4. Run the following SQL script to create a migration device:

```sql
INSERT INTO public.device(physical_id, public_key, name)
VALUES (
    'c661cc65-d00e-4c5b-900e-4652db603940',
    'fake public key',
    'migration device'
);
```

### Step 3: Configure Local Environment

1. Open `.env` file
2. Update the following environment variables:

```env
API_BASE_URL=https://projectcapture.net
API_DEVICE_NAME=migration device
API_DEVICE_ID=c661cc65-d00e-4c5b-900e-4652db603940
```

## Step 4. Prepare data and launch the script

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables** (see Configuration section below)

3. **Add XML backup files** to `./data` folder:
   - `call logs.xml`
   - `SMS logs.xml`
   - `Calllog-export.csv`

4. **Run the migration**:
   ```bash
   npm run dev
   ```

### Step 5: Restore env variable

1. Change the environment variable in ECS: `ENABLE_SIGNATURE=true`

## Project Structure

```
control-tower-migration/
├── src/
│   ├── api/
│   │   ├── auth.ts   # Authentication API calls
│   │   ├── config.ts # API configuration and axios setup
│   │   ├── types.ts  # API type definitions
│   │   └── index.ts  # API module exports
│   ├── index.ts      # Main entry point
│   ├── parser.ts     # XML parsing logic
│   └── types.ts      # TypeScript interfaces
├── data/
│   ├── call logs.xml # Call logs backup file
│   └── SMS logs.xml  # SMS logs backup file
└── dist/             # Compiled JavaScript (after build)
```

## Data Types

### Call Logs
- **Phone Number**: Contact phone number
- **Duration**: Call duration in seconds
- **Timestamp**: Unix timestamp
- **Call Type**: incoming, outgoing, missed, rejected, blocked
- **Contact Name**: Saved contact name
- **Readable Date**: Human-readable date string

### SMS Logs
- **Phone Number**: Sender/recipient phone number
- **Timestamp**: Unix timestamp
- **Message Type**: received, sent, draft, outbox, failed, queued
- **Body**: Message content
- **Contact Name**: Saved contact name
- **Readable Date**: Human-readable date string
- **Is Read**: Boolean flag
