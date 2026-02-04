#!/bin/bash
export GMAIL_CLIENT_ID=$(pass show admin_work/GMAIL_SENDER_CLIENT_ID)
export GMAIL_CLIENT_SECRET=$(pass show admin_work/GMAIL_SENDER_CLIENT_SECRET)
node /Users/niklasmoss/Documents/code/admin_work/Gmail_MCP_server/src/index.js
