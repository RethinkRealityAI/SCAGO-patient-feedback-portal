# Patient Feedback Response Portal

A comprehensive bilingual survey platform for healthcare feedback collection, built with Next.js and Firebase.

## Features

### 🌐 Bilingual Support (English/French)
- Complete translation system with 60+ translations
- Dynamic language switching on all pages
- Medical terminology and healthcare-specific translations
- Context-aware French translations with proper gender agreement

### 📱 Mobile-Optimized Design
- Responsive design optimized for mobile iframe embedding
- Touch-friendly interactions with default hover states on mobile
- Flexible container system for better mobile viewport utilization
- Optimized for landscape mobile viewing

### 📋 Advanced Survey System
- Rich survey editor with drag-and-drop functionality
- Multiple question types (text, select, radio, checkbox, rating, etc.)
- Conditional logic and field dependencies
- Anonymous submission options
- Progress saving and resume functionality

### 🏥 Healthcare-Specific Features
- Ontario hospital and city selectors
- Medical department categorization
- Patient/caregiver role selection
- Visit type classification (outpatient, emergency, inpatient)
- Healthcare encounter tracking

### 🤖 AI-Powered Analytics
- Automated feedback analysis with Gemini AI
- Sentiment analysis and topic identification
- Interactive AI chat with 12+ predefined insight queries
- Real-time conversational data analysis
- Comprehensive dashboard with colorful metric cards
- PDF report generation capabilities
- Floating glassmorphic chat button with elegant design

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   - Copy `.env.example` to `.env.local`
   - Configure Firebase credentials

3. **Run development server:**
   ```bash
   npm run dev
   ```

4. **Access the application:**
   - Survey list: `http://localhost:9002`
   - Survey editor: `http://localhost:9002/editor`
   - Dashboard: `http://localhost:9002/dashboard`

## Architecture

### Core Components
- **Survey Editor** (`/editor/[surveyId]`) - Rich survey creation interface
- **Survey Form** (`/survey/[surveyId]`) - Public survey completion interface  
- **Dashboard** (`/dashboard`) - Analytics and feedback management
- **Translation System** (`src/lib/translations.ts`) - Bilingual support

### Key Technologies
- **Frontend:** Next.js 15, React 18, TypeScript
- **Backend:** Firebase (Firestore, Authentication)
- **Styling:** Tailwind CSS, shadcn/ui components
- **AI:** Google AI SDK for analytics
- **Forms:** React Hook Form with Zod validation

## Translation System

The application features a comprehensive bilingual system:

- **Translation Library:** Central system with medical terminology
- **Dynamic Switching:** Real-time language toggle on all forms
- **Contextual Translation:** Proper French grammar and gender agreement
- **Extensible:** Easy to add new languages or translations

See `src/lib/README-translations.md` for detailed translation documentation.

## Mobile Optimization

Designed for iframe embedding on mobile devices:

- **Responsive Layout:** Adapts to mobile landscape viewports
- **Touch Interactions:** Mobile-first interaction design
- **Performance:** Optimized loading and rendering
- **Accessibility:** WCAG compliant interface

## Documentation

- **Main Documentation:** `documentation.md` - Architecture and best practices
- **Translation Guide:** `src/lib/README-translations.md` - Bilingual system details
- **API Documentation:** Generated from code comments

## Development

### Project Structure
```
src/
├── app/                 # Next.js app router pages
├── components/          # Reusable React components
├── lib/                # Utilities and configurations
│   ├── translations.ts  # Translation system
│   └── firebase.ts     # Firebase configuration
├── hooks/              # Custom React hooks
└── ai/                 # AI integration and flows
```

### Key Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run typecheck` - TypeScript type checking

## Contributing

1. Follow the coding standards in `documentation.md`
2. Test both English and French translations
3. Ensure mobile responsiveness
4. Update documentation for new features

## License

This project is proprietary software for healthcare feedback collection.
