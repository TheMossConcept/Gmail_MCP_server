# Gmail Sender MCP Server

An MCP (Model Context Protocol) server that enables sending emails and creating drafts through the Gmail API.

## Features

- **sendEmail**: Send emails through your Gmail account with optional file attachments
- **createDraft**: Create email drafts with optional file attachments
- OAuth 2.0 authentication with Google
- Support for file attachments of various types (PDF, DOC, images, etc.)
- Run anywhere with `npx` - no local installation required

## Prerequisites

- Node.js v18 or higher
- A Google Cloud project with Gmail API enabled
- OAuth 2.0 credentials (Client ID and Client Secret)

### Setting up Google Cloud Credentials

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Gmail API for your project
4. Go to **Credentials** and create an **OAuth 2.0 Client ID**
5. Set the application type to **Web application**
6. Add `http://localhost:3500/oauth2callback` as an authorized redirect URI
7. Save your Client ID and Client Secret

## Installation & Usage

### Run with npx (Recommended)

The easiest way to use this server is with `npx`. No installation required:

```bash
GMAIL_CLIENT_ID=your_client_id GMAIL_CLIENT_SECRET=your_client_secret npx gmail-sender-mcp-server
```

### Install Globally

```bash
npm install -g gmail-sender-mcp-server
```

Then run:

```bash
GMAIL_CLIENT_ID=your_client_id GMAIL_CLIENT_SECRET=your_client_secret gmail-sender-mcp-server
```

### Install Locally (for development)

```bash
git clone <repository-url>
cd Gmail_MCP_server
npm install
GMAIL_CLIENT_ID=your_client_id GMAIL_CLIENT_SECRET=your_client_secret npm start
```

## Authentication

On first run, the server will start an OAuth server on port 3500:

1. Visit `http://localhost:3500/auth` in your browser
2. Sign in with your Google account and grant permissions
3. The authentication token will be saved to `~/.config/gmail-sender-mcp-server/token.json`

The token is stored in your home directory, so it persists across `npx` runs and works across different machines once authenticated.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GMAIL_CLIENT_ID` | Yes | Your Google OAuth 2.0 Client ID |
| `GMAIL_CLIENT_SECRET` | Yes | Your Google OAuth 2.0 Client Secret |

## MCP Configuration

To use this server with an MCP client (like Claude Desktop), add it to your MCP configuration:

```json
{
  "mcpServers": {
    "gmail-sender": {
      "type": "stdio",
      "command": "npx",
      "args": ["gmail-sender-mcp-server"],
      "env": {
        "GMAIL_CLIENT_ID": "your_client_id",
        "GMAIL_CLIENT_SECRET": "your_client_secret"
      }
    }
  }
}
```

## Available Tools

### sendEmail

Send an email immediately through Gmail.

**Parameters:**
- `recipient` (required): Email address of the recipient
- `subject` (required): Subject line of the email
- `body` (required): Body content of the email (plain text)
- `attachmentPath` (optional): Absolute path to a file to attach

**Example:**
```json
{
  "recipient": "example@email.com",
  "subject": "Hello from MCP",
  "body": "This is a test email sent via the Gmail MCP server.",
  "attachmentPath": "/path/to/document.pdf"
}
```

### createDraft

Create an email draft in Gmail (not sent automatically).

**Parameters:**
- `recipient` (required): Email address of the recipient
- `subject` (required): Subject line of the email
- `body` (required): Body content of the email (plain text)
- `attachmentPath` (optional): Absolute path to a file to attach

**Example:**
```json
{
  "recipient": "example@email.com",
  "subject": "Draft Email",
  "body": "This is a draft that can be reviewed and sent later.",
  "attachmentPath": "/path/to/image.png"
}
```

## Supported Attachment Types

The server automatically detects file types based on extension:
- Documents: PDF, DOC, DOCX, TXT
- Images: JPG, JPEG, PNG, GIF
- Archives: ZIP
- Other files are sent as `application/octet-stream`

## OAuth Scopes

The server uses the `https://www.googleapis.com/auth/gmail.compose` scope, which allows:
- Creating and sending emails
- Creating drafts
- Modifying drafts

## File Structure

```
gmail-sender-mcp-server/
├── src/
│   └── index.js          # Main server implementation
├── package.json          # Dependencies and scripts
└── README.md             # This file

~/.config/gmail-sender-mcp-server/
└── token.json            # OAuth tokens (created after authentication)
```

## Security Notes

- OAuth tokens are stored in `~/.config/gmail-sender-mcp-server/token.json` and should be kept secure
- Client ID and Secret should be passed via environment variables, not committed to version control
- The OAuth server only runs on localhost (port 3500)
- Consider using a secrets manager for production deployments

## Troubleshooting

### Authentication Issues
- Ensure your OAuth client is configured with `http://localhost:3500/oauth2callback` as a redirect URI
- Check that the Gmail API is enabled in your Google Cloud project
- Verify your `GMAIL_CLIENT_ID` and `GMAIL_CLIENT_SECRET` environment variables are set correctly

### Token Issues
- If authentication fails, delete `~/.config/gmail-sender-mcp-server/token.json` and re-authenticate
- Tokens may expire; re-authenticate if you get authorization errors

### File Attachment Issues
- Use absolute paths for attachments
- Ensure the file exists and is readable
- Check that the file size is within Gmail's limits (25MB for attachments)

## License

MIT
# Gmail_MCP_server
