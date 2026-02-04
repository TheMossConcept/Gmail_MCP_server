# Setup Instructions

## 1. Google Cloud Configuration

### Enable Gmail API
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Gmail API:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Gmail API"
   - Click "Enable"

### Create OAuth 2.0 Credentials
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Choose "Web application" as the application type
4. Add authorized redirect URI: `http://localhost:3500/oauth2callback`
5. Save the Client ID and Client Secret

### Store Credentials in Pass
```bash
# Store your Client ID
pass insert admin_work/GMAIL_SENDER_CLIENT_ID

# Store your Client Secret
pass insert admin_work/GMAIL_SENDER_CLIENT_SECRET
```

## 2. Installation

```bash
cd /Users/niklasmoss/Documents/code/admin_work/Gmail_MCP_server
npm install
```

## 3. Authentication

Start the server and authenticate:

```bash
npm start
```

Then visit `http://localhost:3500/auth` in your browser to complete OAuth authentication.

## 4. Add to Claude Code Configuration

Add this server to your Claude Code configuration file (`~/.claude/config.json`):

```json
{
  "mcpServers": {
    "gmail-sender": {
      "command": "bash",
      "args": [
        "-c",
        "GMAIL_CLIENT_ID=$(pass show admin_work/GMAIL_SENDER_CLIENT_ID) GMAIL_CLIENT_SECRET=$(pass show admin_work/GMAIL_SENDER_CLIENT_SECRET) node /Users/niklasmoss/Documents/code/admin_work/Gmail_MCP_server/src/index.js"
      ]
    }
  }
}
```

Or if you prefer to use a shell script:

Create a file `start-gmail-mcp.sh`:
```bash
#!/bin/bash
export GMAIL_CLIENT_ID=$(pass show admin_work/GMAIL_SENDER_CLIENT_ID)
export GMAIL_CLIENT_SECRET=$(pass show admin_work/GMAIL_SENDER_CLIENT_SECRET)
node /Users/niklasmoss/Documents/code/admin_work/Gmail_MCP_server/src/index.js
```

Make it executable:
```bash
chmod +x start-gmail-mcp.sh
```

Then in `~/.claude/config.json`:
```json
{
  "mcpServers": {
    "gmail-sender": {
      "command": "/Users/niklasmoss/Documents/code/admin_work/Gmail_MCP_server/start-gmail-mcp.sh"
    }
  }
}
```

## 5. Using the Tools

Once configured, you can use the tools through Claude Code:

### Send an Email
```
Please send an email to example@email.com with the subject "Test Email" and body "Hello from Gmail MCP!"
```

### Create a Draft
```
Create a draft email to colleague@company.com with subject "Meeting Notes" and attach the file /path/to/notes.pdf
```

### With Attachments
```
Send an email to client@example.com with subject "Project Report" and attach /Users/niklasmoss/Documents/report.pdf
```

## Troubleshooting

### Port Already in Use
If port 3500 is already in use, you can change it by modifying the `PORT` constant in `src/index.js`.

### OAuth Redirect URI Mismatch
Ensure your Google Cloud OAuth client has `http://localhost:3500/oauth2callback` as an authorized redirect URI.

### Token Expiration
If your token expires, delete `token.json` and re-authenticate by visiting `http://localhost:3500/auth`.

### Pass Command Not Found
Install `pass` using:
- macOS: `brew install pass`
- Linux: `sudo apt-get install pass` or `sudo yum install pass`

## Security Reminders

- Never commit `token.json` to version control
- Keep your Client ID and Secret secure in `pass`
- The OAuth tokens grant access to compose and send emails on your behalf
- Review the OAuth scopes if you need different permissions
