# Medical Exam App Deployment Guide

This guide will help you deploy the Medical Exam App with authentication and Stripe payment integration.

## Prerequisites

1. Node.js 18+ installed
2. OpenAI API key
3. Stripe account (for payments)
4. A hosting platform (Heroku, Railway, DigitalOcean, etc.)

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# OpenAI API Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Authentication
JWT_SECRET=your_super_secret_jwt_key_here
SESSION_SECRET=your_session_secret_here

# Application Settings
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://your-domain.com
```

For the frontend, create a `.env` file in the `client` directory:

```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
```

## Stripe Setup

### 1. Create Stripe Account

1. Go to [https://stripe.com](https://stripe.com)
2. Create an account
3. Get your API keys from the dashboard

### 2. Configure Webhook

1. In Stripe dashboard, go to Developers → Webhooks
2. Add endpoint: `https://your-domain.com/api/stripe/webhook`
3. Select events: `payment_intent.succeeded` and `payment_intent.payment_failed`
4. Copy the webhook secret

### 3. Test Payment Flow

Use Stripe's test card numbers:

- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Set up environment variables (see above)

3. Start development server:

```bash
npm run dev
```

4. The app will be available at `http://localhost:3000`

## Production Deployment

### Option 1: Heroku

1. Install Heroku CLI
2. Create Heroku app:

```bash
heroku create your-app-name
```

3. Set environment variables:

```bash
heroku config:set OPENAI_API_KEY=your_key
heroku config:set STRIPE_SECRET_KEY=your_key
heroku config:set JWT_SECRET=your_secret
# ... add all other variables
```

4. Deploy:

```bash
git push heroku main
```

### Option 2: Railway

1. Connect your GitHub repository to Railway
2. Set environment variables in Railway dashboard
3. Deploy automatically on push

### Option 3: DigitalOcean App Platform

1. Create new app from GitHub repository
2. Set environment variables
3. Configure build and run commands:
   - Build: `npm run build`
   - Run: `npm start`

### Option 4: VPS/Server

1. Clone repository on server
2. Install dependencies: `npm install`
3. Build application: `npm run build`
4. Set up PM2 or similar process manager:

```bash
npm install -g pm2
pm2 start server.js --name "medical-exam-app"
```

5. Set up reverse proxy (Nginx):

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Database

The app uses SQLite by default, which creates a local file. For production, you may want to:

1. **Keep SQLite**: Simple, works well for small to medium applications
2. **Upgrade to PostgreSQL**: For better performance and scalability

To switch to PostgreSQL, modify `database.js` to use a PostgreSQL adapter.

## Security Considerations

1. **HTTPS**: Always use HTTPS in production
2. **Environment Variables**: Never commit secrets to version control
3. **Rate Limiting**: Configured by default, adjust as needed
4. **CORS**: Update CORS settings for your domain
5. **JWT Secret**: Use a strong, unique secret key
6. **Database**: Ensure database file has proper permissions

## Post-Deployment Checklist

1. ✅ Test user registration
2. ✅ Test user login
3. ✅ Test payment flow with test cards
4. ✅ Test medical exam functionality
5. ✅ Verify Stripe webhook is receiving events
6. ✅ Check logs for any errors
7. ✅ Set up monitoring/alerting

## Monitoring

Consider setting up:

- Application monitoring (e.g., Sentry)
- Uptime monitoring (e.g., UptimeRobot)
- Log aggregation (e.g., LogRocket)

## Scaling

For high traffic:

1. Use a load balancer
2. Scale horizontally with multiple instances
3. Use Redis for session storage
4. Implement database connection pooling
5. Add CDN for static assets

## Support

For issues:

1. Check application logs
2. Verify environment variables
3. Test Stripe webhook delivery
4. Check database connectivity

## Revenue Tracking

The app charges $50 per user for lifetime access. Monitor:

- User registrations
- Payment success rate
- Revenue through Stripe dashboard
- User retention and usage

## Legal Considerations

Ensure you have:

- Privacy Policy
- Terms of Service
- GDPR compliance (if applicable)
- Medical disclaimer (for educational use only)
