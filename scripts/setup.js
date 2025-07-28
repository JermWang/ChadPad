#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up Abstract Token Dashboard...\n');

// Check if .env.local exists
const envPath = path.join(process.cwd(), '.env.local');
if (!fs.existsSync(envPath)) {
  console.log('📝 Creating .env.local file...');
  
  const envTemplate = `# Abstract Token Dashboard Environment Variables

# Telegram Configuration (Required for live data)
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
TELEGRAM_CHANNEL_ID=your_telegram_channel_id_here

# Redis Configuration (Optional - falls back to in-memory cache)
REDIS_URL=redis://localhost:6379

# Abstract L2 Network Configuration
ABSTRACT_RPC_URL=https://api.testnet.abs.xyz
REQUIRED_TOKEN_ADDRESS=0x1234567890123456789012345678901234567890

# Next.js Configuration
NEXTAUTH_SECRET=${generateRandomString(32)}
NEXTAUTH_URL=http://localhost:3000

# WalletConnect Project ID (Get from https://cloud.walletconnect.com)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here
`;

  fs.writeFileSync(envPath, envTemplate);
  console.log('✅ Created .env.local with template values');
} else {
  console.log('ℹ️  .env.local already exists');
}

// Create scripts directory if it doesn't exist
const scriptsDir = path.join(process.cwd(), 'scripts');
if (!fs.existsSync(scriptsDir)) {
  fs.mkdirSync(scriptsDir);
}

console.log('\n📋 Setup Instructions:');
console.log('1. Update .env.local with your actual values:');
console.log('   - Get Telegram Bot Token from @BotFather');
console.log('   - Get WalletConnect Project ID from https://cloud.walletconnect.com');
console.log('   - Set your required token address for access control');
console.log('');
console.log('2. Install dependencies (if not done):');
console.log('   npm install');
console.log('');
console.log('3. Start development server:');
console.log('   npm run dev');
console.log('');
console.log('4. Open http://localhost:3000 in your browser');
console.log('');
console.log('🔗 Network Setup:');
console.log('- Add Abstract Testnet to your wallet:');
console.log('  Chain ID: 11124');
console.log('  RPC URL: https://api.testnet.abs.xyz');
console.log('  Explorer: https://explorer.testnet.abs.xyz');
console.log('');
console.log('📱 For Telegram Integration:');
console.log('1. Create a bot with @BotFather');
console.log('2. Add bot to your channel as admin');
console.log('3. Get channel ID and update .env.local');
console.log('');
console.log('🎉 Setup complete! Ready to start development.');

function generateRandomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}