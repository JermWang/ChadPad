# Deployment Guide - Abstract Token Dashboard

## 🚀 Quick Start

1. **Clone and Setup**
```bash
git clone <repository-url>
cd abstract-token-dashboard
npm install
npm run setup
```

2. **Configure Environment**
Edit `.env.local` with your actual values:
```env
# Telegram Configuration
TELEGRAM_BOT_TOKEN=your_bot_token_from_botfather
TELEGRAM_CHANNEL_ID=your_channel_id

# WalletConnect Project ID
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id

# Token Requirements
REQUIRED_TOKEN_ADDRESS=0xYourTokenContract
```

3. **Start Development**
```bash
npm run dev
```
Visit `http://localhost:3000`

## 📋 Environment Variables

### Required
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` - Get from [WalletConnect Cloud](https://cloud.walletconnect.com)
- `REQUIRED_TOKEN_ADDRESS` - Contract address of the token required for access

### Optional
- `TELEGRAM_BOT_TOKEN` - For live Telegram integration (falls back to mock data)
- `TELEGRAM_CHANNEL_ID` - Channel to monitor for token deployments
- `REDIS_URL` - For production caching (falls back to in-memory)

## 🔧 Telegram Bot Setup

1. **Create Bot**
   - Message @BotFather on Telegram
   - Use `/newbot` command
   - Save the bot token

2. **Get Channel ID**
   - Add bot to your channel
   - Make bot an admin
   - Use the channel username or ID

3. **Configure Webhook** (Production)
   ```javascript
   // In your production environment
   curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
        -H "Content-Type: application/json" \
        -d '{"url": "https://yourdomain.com/api/pairs"}'
   ```

## 🌐 Deployment Options

### Vercel (Recommended)

1. **Connect Repository**
   - Import project to Vercel
   - Connect your GitHub repository

2. **Environment Variables**
   Add all required environment variables in Vercel dashboard

3. **Deploy**
   - Vercel will auto-deploy on commits
   - Visit your deployed URL

### Manual Deployment

1. **Build**
   ```bash
   npm run build
   npm start
   ```

2. **Production Environment**
   ```bash
   NODE_ENV=production npm start
   ```

3. **Process Manager** (PM2)
   ```bash
   npm install -g pm2
   pm2 start npm --name "abstract-dashboard" -- start
   ```

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 🏗 Architecture Overview

### Frontend
- **Next.js 14** - React framework with App Router
- **TailwindCSS** - Utility-first CSS framework
- **RainbowKit** - Wallet connection UI
- **Wagmi** - React hooks for Ethereum

### Backend
- **Next.js API Routes** - Serverless functions
- **Viem** - TypeScript Ethereum library
- **Redis** - Caching layer (optional)
- **Telegram Bot API** - Real-time message processing

### Blockchain
- **Abstract L2** - Layer 2 blockchain
- **ERC-20 Tokens** - Token balance verification
- **Smart Contracts** - On-chain data retrieval

## 🔒 Security Considerations

1. **Environment Variables**
   - Never commit sensitive keys
   - Use different keys for development/production
   - Rotate keys regularly

2. **Rate Limiting**
   - Implement rate limiting for API routes
   - Use Vercel's built-in protection

3. **Input Validation**
   - All user inputs are validated
   - SQL injection protection
   - XSS prevention

## 📊 Monitoring & Analytics

### Error Tracking
```javascript
// Add to your production deployment
export const config = {
  // ... existing config
  experimental: {
    // instrumentationHook: true, // For monitoring
  }
}
```

### Performance Monitoring
- Use Vercel Analytics
- Monitor API response times
- Track wallet connection success rates

## 🔄 Updates & Maintenance

### Regular Updates
1. **Dependencies**
   ```bash
   npm update
   npm audit fix
   ```

2. **Security Patches**
   ```bash
   npm audit
   npm audit fix --force # if needed
   ```

3. **Feature Updates**
   - Update token requirements
   - Add new blockchain networks
   - Enhance UI/UX

### Backup & Recovery
- Database backups (if using persistent storage)
- Environment variable backups
- Git repository backups

## 🚨 Troubleshooting

### Common Issues

1. **Wallet Connection Fails**
   - Check WalletConnect Project ID
   - Verify network configuration
   - Clear browser cache

2. **Token Balance Not Detected**
   - Verify token contract address
   - Check user is on correct network
   - Confirm token has sufficient balance

3. **Build Errors**
   - Run `npm run type-check`
   - Check for TypeScript errors
   - Verify all dependencies are installed

4. **Telegram Integration Issues**
   - Verify bot token and permissions
   - Check webhook URL accessibility
   - Monitor API rate limits

### Debug Mode
```bash
# Enable debug logging
DEBUG=* npm run dev

# Check specific modules
DEBUG=telegram:* npm run dev
```

### Health Checks
- `/api/health` - API health status
- Monitor Redis connection
- Check Telegram webhook status

## 📈 Scaling Considerations

### Performance Optimization
1. **Caching Strategy**
   - Use Redis for production
   - Cache blockchain calls
   - Implement CDN for static assets

2. **Database Optimization**
   - Index frequently queried fields
   - Use connection pooling
   - Implement read replicas

3. **API Rate Limiting**
   - Implement proper rate limiting
   - Use queue for heavy operations
   - Cache external API calls

### Multi-Region Deployment
- Deploy to multiple regions
- Use load balancers
- Implement geo-routing

## 🔍 Analytics & Insights

### Key Metrics
- Daily/Monthly active users
- Token verification success rate
- Popular token pairs
- Geographic distribution

### Data Collection
```javascript
// Example analytics tracking
const trackEvent = (event, properties) => {
  // Send to your analytics provider
  analytics.track(event, properties);
};
```

## 🛠 Development Workflow

### Local Development
```bash
# Start development server
npm run dev

# Run type checking
npm run type-check

# Run linting
npm run lint

# Build for production
npm run build
```

### Testing
```bash
# Add testing framework (recommended)
npm install --save-dev jest @testing-library/react
npm run test
```

### Code Quality
```bash
# Format code
npm install --save-dev prettier
npm run format

# Git hooks
npm install --save-dev husky lint-staged
```

## 📞 Support

- Documentation: [README.md](./README.md)
- Issues: GitHub Issues
- Community: Discord/Telegram

---

**Note**: This dashboard is built for the Abstract L2 testnet. For mainnet deployment, update the RPC URLs and contract addresses accordingly.