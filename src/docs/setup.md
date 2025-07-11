# Local Development Setup

## Prerequisites

- Node.js (v18 or later)
- npm (v9 or later)
- Angular CLI (`npm install -g @angular/cli`)

## Initial Setup

1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd the-poet
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   # Copy the environment template
   cp src/environments/environment.template.ts src/environments/environment.ts
   ```

   Example environment.ts:
   ```typescript
   export const environment = {
     production: false,
     // Add environment-specific settings here
   };
   ```

## Running the Application

### Development Server
```bash
# Start the development server
ng serve

# The application will be available at http://localhost:4200
```

### Running with SSR (Server-Side Rendering)
```bash
# Build with SSR
npm run build:ssr

# Serve with SSR
npm run serve:ssr
```

## Development Commands

```bash
# Run unit tests
ng test

# Run end-to-end tests
ng e2e

# Build for production
ng build
```

## Project Structure

```
the-poet/
├── src/
│   ├── app/
│   │   ├── components/    # UI components
│   │   │   ├── poem-card/   # Individual poem display
│   │   │   ├── poem-detail/ # Full poem view
│   │   │   ├── poem-list/   # List of poems
│   │   │   ├── search/      # Search interface
│   │   │   └── search-results/ # Search results display
│   │   ├── services/      # Core services
│   │   │   ├── poetry-db/   # API interaction
│   │   │   ├── poetry-search/ # Search functionality
│   │   │   ├── poetry-storage/ # IndexedDB management
│   │   │   └── poetry-search-index/ # Lunr.js integration
│   │   └── models/        # TypeScript interfaces
│   ├── assets/
│   │   └── search/        # Search data files
│   └── environments/      # Environment configurations
```

## Key Features

1. **Poetry Search**
   - Unified search across poems and poets
   - Author-based search with name matching
   - Title and content search with relevance ranking
   - Real-time search suggestions

2. **Offline Support**
   - IndexedDB storage for poems and search index
   - Offline-first architecture
   - Background data refresh

3. **Performance**
   - Server-side rendering for fast initial load
   - Lazy-loaded routes
   - Preloading strategies
   - Search index optimization
   - Optimized bundle size

## Common Issues

### IndexedDB Not Working
- Check browser support
- Ensure private browsing is disabled
- Clear browser data if issues persist

### Search Not Functioning
- Verify search index is built
- Check browser console for errors
- Ensure poems are loaded in IndexedDB

### SSR Issues
- Ensure Node.js version is compatible
- Check for browser-only code in components
- Review SSR-specific configuration

## Development Guidelines

1. **Code Style**
   - Follow Angular style guide
   - Use TypeScript strict mode
   - Maintain component isolation

2. **Testing**
   - Write unit tests for services
   - Add component tests
   - Include e2e tests for critical paths

3. **Performance**
   - Lazy load routes
   - Optimize bundle size
   - Monitor memory usage

## Deployment

1. **Production Build**
   ```bash
   # Build for production with SSR
   npm run build:ssr
   
   # Start production server
   npm run serve:ssr
   ```

2. **Environment Configuration**
   - Update environment.prod.ts
   - Set up proper caching strategies
   - Configure server settings

## Additional Resources

- [Angular Documentation](https://angular.io/docs)
- [RxJS Guide](https://rxjs.dev/guide/overview)
- [IndexedDB Documentation](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Lunr.js Documentation](https://lunrjs.com/docs/index.html) 