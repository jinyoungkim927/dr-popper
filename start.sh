#!/bin/bash

# Medical Exam App Startup Script

echo "🩺 Starting Medical Exam App..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create a .env file with the required environment variables."
    echo "See DEPLOYMENT.md for details."
    exit 1
fi

# Check if node_modules exists
if [ ! -d node_modules ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check if database exists, if not initialize it
if [ ! -f medical_exam.db ]; then
    echo "🗄️  Initializing database..."
fi

# Start the application
echo "🚀 Starting server..."
if [ "$NODE_ENV" = "production" ]; then
    npm start
else
    npm run dev
fi 