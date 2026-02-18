# actual-argenta

A Node.js + TypeScript application to sync Argenta bank data with Actual Budget.

## Prerequisites

- Node.js 20 or higher
- npm

## Installation

Install dependencies:

```bash
npm install
```

## Usage

### Development

Run the application in development mode (with tsx):

```bash
npm run dev
```

### Production

Build the TypeScript code:

```bash
npm run build
```

Run the compiled code:

```bash
npm start
```

## Configuration

### First Run

On first run, if `config.yaml` doesn't exist, the application will launch a configuration wizard:

1. **Server URL**: You'll be asked for your Actual Budget server URL (e.g., `https://your-server.com`)
2. **Password**: You'll be prompted to enter your password and authenticate
3. **Budget Selection**: After successful authentication, the app will fetch your available budgets and let you select one from a list

The wizard ensures you have valid credentials before showing available budgets, and creates a `config.yaml` file with your settings.

### Configuration Files

The application uses:
- `config.yaml` - Server URL and Sync ID configuration
- System keychain (via keytar) - Secure password storage
- Command line arguments - Runtime configuration overrides

### Password Management

The application securely manages your Actual Budget password:

1. **First Run**: You'll be prompted to enter your password
2. **Authentication**: The password is validated against your Actual Budget server
3. **Success**: Only after successful authentication, the password is saved to your system keychain
4. **Subsequent Runs**: The password is retrieved from the keychain automatically
5. **Failed Authentication**: If authentication fails (e.g., wrong password), the stored password is automatically removed from the keychain, and you'll be prompted to enter a new password immediately
6. **Automatic Retry**: The application will keep retrying until you provide a valid password

This ensures that only valid passwords are stored in your keychain, and you don't need to restart the application after entering an incorrect password.

### Manual Configuration

You can also manually create or edit `config.yaml`:

```yaml
actual:
  serverUrl: https://your-server.com
  syncId: your-sync-id-here
```

## Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm run start` - Run the compiled application
- `npm run dev` - Run the application in development mode with tsx
- `npm run clean` - Remove the dist directory
