#!/bin/bash

echo "Starting FoundryVTT REST API Local Server..."
echo

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check if ws module is installed
if [ ! -d "node_modules/ws" ]; then
    echo "Installing required dependencies..."
    npm install
fi

# Start the server
echo "Starting local WebSocket server on ws://localhost:8080"
echo "Press Ctrl+C to stop the server"
echo
node local-server.js