#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { google } from 'googleapis';
import express from 'express';
import fs from 'fs/promises';
import { createReadStream } from 'fs';
import path from 'path';
import os from 'os';

// Configuration
const PORT = 3500;
const SCOPES = ['https://www.googleapis.com/auth/gmail.compose'];

// Store config in user's home directory for persistence across npx runs
const CONFIG_DIR = path.join(os.homedir(), '.config', 'gmail-sender-mcp-server');
const TOKEN_PATH = path.join(CONFIG_DIR, 'token.json');
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`;

// Ensure config directory exists
async function ensureConfigDir() {
  try {
    await fs.mkdir(CONFIG_DIR, { recursive: true });
  } catch (err) {
    // Directory already exists or other error
  }
}

// Initialize OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  REDIRECT_URI
);

// Check if we have stored credentials
async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    oauth2Client.setCredentials(credentials);
    return true;
  } catch (err) {
    return false;
  }
}

// Save credentials to disk
async function saveCredentials(tokens) {
  await ensureConfigDir();
  await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens));
}

// Start Express server for OAuth callback
function startOAuthServer() {
  const app = express();

  app.get('/auth', (req, res) => {
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
    });
    res.redirect(authUrl);
  });

  app.get('/oauth2callback', async (req, res) => {
    const { code } = req.query;
    try {
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);
      await saveCredentials(tokens);
      res.send('Authentication successful! You can close this window.');
    } catch (error) {
      res.status(500).send('Authentication failed: ' + error.message);
    }
  });

  app.listen(PORT, () => {
    console.error(`OAuth server listening on http://localhost:${PORT}`);
    console.error(`To authenticate, visit: http://localhost:${PORT}/auth`);
  });
}

// Create MIME message with optional attachment
function createMimeMessage(to, subject, body, attachmentPath = null) {
  const boundary = '----=_Part_' + Date.now();
  let message = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
  ];

  if (attachmentPath) {
    message.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
    message.push('');
    message.push(`--${boundary}`);
    message.push('Content-Type: text/plain; charset=UTF-8');
    message.push('');
    message.push(body);
    message.push('');

    // Add attachment (this will be handled separately)
    message.push(`--${boundary}`);
  } else {
    message.push('Content-Type: text/plain; charset=UTF-8');
    message.push('');
    message.push(body);
  }

  return message.join('\r\n');
}

// Create MIME message with attachment
async function createMimeMessageWithAttachment(to, subject, body, attachmentPath) {
  const boundary = '----=_Part_' + Date.now();
  const fileName = path.basename(attachmentPath);

  // Read the attachment file
  const attachmentContent = await fs.readFile(attachmentPath);
  const attachmentBase64 = attachmentContent.toString('base64');

  // Determine content type based on file extension
  const ext = path.extname(fileName).toLowerCase();
  const contentTypeMap = {
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.txt': 'text/plain',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.zip': 'application/zip',
  };
  const contentType = contentTypeMap[ext] || 'application/octet-stream';

  const message = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    '',
    body,
    '',
    `--${boundary}`,
    `Content-Type: ${contentType}; name="${fileName}"`,
    'Content-Transfer-Encoding: base64',
    `Content-Disposition: attachment; filename="${fileName}"`,
    '',
    attachmentBase64,
    '',
    `--${boundary}--`
  ].join('\r\n');

  return message;
}

// Encode message to base64url
function encodeMessage(message) {
  return Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Send email via Gmail API
async function sendEmail(recipient, subject, body, attachmentPath = null) {
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  let mimeMessage;
  if (attachmentPath) {
    mimeMessage = await createMimeMessageWithAttachment(recipient, subject, body, attachmentPath);
  } else {
    mimeMessage = createMimeMessage(recipient, subject, body);
  }

  const encodedMessage = encodeMessage(mimeMessage);

  const response = await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodedMessage,
    },
  });

  return response.data;
}

// Create draft via Gmail API
async function createDraft(recipient, subject, body, attachmentPath = null) {
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  let mimeMessage;
  if (attachmentPath) {
    mimeMessage = await createMimeMessageWithAttachment(recipient, subject, body, attachmentPath);
  } else {
    mimeMessage = createMimeMessage(recipient, subject, body);
  }

  const encodedMessage = encodeMessage(mimeMessage);

  const response = await gmail.users.drafts.create({
    userId: 'me',
    requestBody: {
      message: {
        raw: encodedMessage,
      },
    },
  });

  return response.data;
}

// Initialize MCP server
const server = new Server(
  {
    name: 'gmail-sender',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'sendEmail',
        description: 'Send an email through Gmail. Requires OAuth authentication.',
        inputSchema: {
          type: 'object',
          properties: {
            recipient: {
              type: 'string',
              description: 'Email address of the recipient',
            },
            subject: {
              type: 'string',
              description: 'Subject line of the email',
            },
            body: {
              type: 'string',
              description: 'Body content of the email',
            },
            attachmentPath: {
              type: 'string',
              description: 'Optional: Absolute path to a file to attach',
            },
          },
          required: ['recipient', 'subject', 'body'],
        },
      },
      {
        name: 'createDraft',
        description: 'Create an email draft in Gmail. Requires OAuth authentication.',
        inputSchema: {
          type: 'object',
          properties: {
            recipient: {
              type: 'string',
              description: 'Email address of the recipient',
            },
            subject: {
              type: 'string',
              description: 'Subject line of the email',
            },
            body: {
              type: 'string',
              description: 'Body content of the email',
            },
            attachmentPath: {
              type: 'string',
              description: 'Optional: Absolute path to a file to attach',
            },
          },
          required: ['recipient', 'subject', 'body'],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    // Check if we're authenticated
    const hasCredentials = await loadSavedCredentialsIfExist();
    if (!hasCredentials) {
      return {
        content: [
          {
            type: 'text',
            text: `Authentication required. Please visit http://localhost:${PORT}/auth to authenticate with your Gmail account.`,
          },
        ],
      };
    }

    switch (name) {
      case 'sendEmail': {
        const { recipient, subject, body, attachmentPath } = args;
        const result = await sendEmail(recipient, subject, body, attachmentPath);
        return {
          content: [
            {
              type: 'text',
              text: `Email sent successfully! Message ID: ${result.id}`,
            },
          ],
        };
      }

      case 'createDraft': {
        const { recipient, subject, body, attachmentPath } = args;
        const result = await createDraft(recipient, subject, body, attachmentPath);
        return {
          content: [
            {
              type: 'text',
              text: `Draft created successfully! Draft ID: ${result.id}`,
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the OAuth server
startOAuthServer();

// Start MCP server
async function main() {
  await ensureConfigDir();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Gmail Sender MCP server running on stdio');
  console.error(`Token storage: ${TOKEN_PATH}`);
}

main().catch(console.error);
