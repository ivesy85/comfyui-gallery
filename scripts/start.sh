#!/bin/bash

# Start Docker containers
docker-compose up comfyui-gallery-db -d

# Function to stop Docker containers when script is stopped
function cleanup {
    echo "Stopping Docker containers..."
    docker-compose stop comfyui-gallery-db
}

# Trap Ctrl+C (SIGINT) to trigger the cleanup function
trap cleanup EXIT

# Start Next.js dev server
next start
