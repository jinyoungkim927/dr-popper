# Medical Exam System

An AI-powered medical examination preparation system with advanced case-based learning, real-time grading, and comprehensive performance analytics.

## Features

### 🔐 Authentication & Payment

- User registration and login system
- Secure JWT-based authentication
- Stripe payment integration ($50 lifetime access)
- Protected medical exam content

### 🩺 Medical Examination

- AI-powered examiner using GPT-4
- 45+ comprehensive case protocols
- Real-time question-by-question grading
- Multiple exam modes (Random, Viva, Revise)
- System-specific focus areas

### 📊 Performance Analytics

- Live score tracking during sessions
- Detailed performance reports
- PDF report generation
- Progress tracking across topics
- Weak area identification

### 🎯 Educational Features

- Interactive case-based scenarios
- Immediate feedback on responses
- Comprehensive medical knowledge base
- Adaptive difficulty based on performance

## Quick Start

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd med-exam-app
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file (see `DEPLOYMENT.md` for details):

   ```env
   OPENAI_API_KEY=your_openai_api_key
   STRIPE_SECRET_KEY=your_stripe_secret_key
   JWT_SECRET=your_jwt_secret
   # ... other variables
   ```

4. **Start the application**

   ```bash
   npm run dev
   ```

5. **Access the app**
   Open `http://localhost:3000` in your browser

## User Flow

1. **Registration**: Create an account with email and password
2. **Payment**: Pay $50 for lifetime access via Stripe
3. **Exam Access**: Full access to all medical exam features
4. **Study**: Practice with AI examiner across multiple modes
5. **Track Progress**: Monitor performance and identify weak areas

## Technology Stack

- **Frontend**: React, Tailwind CSS, Vite
- **Backend**: Node.js, Express
- **Database**: SQLite (easily upgradeable to PostgreSQL)
- **Authentication**: JWT, bcrypt
- **Payments**: Stripe
- **AI**: OpenAI GPT-4 and GPT-4 Realtime API
- **PDF Generation**: jsPDF

## Deployment

See `DEPLOYMENT.md` for comprehensive deployment instructions including:

- Environment setup
- Stripe configuration
- Production deployment options
- Security considerations

## Revenue Model

- **One-time payment**: $50 per user for lifetime access
- **Target audience**: Medical students, residents, healthcare professionals
- **Value proposition**: AI-powered personalized medical exam preparation

## Support

For technical issues or questions:

1. Check the deployment guide
2. Verify environment variables
3. Test Stripe webhook delivery
4. Review application logs

## License

This project is proprietary software. All rights reserved.
