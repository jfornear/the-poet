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
# Build and serve with SSR
npm run dev:ssr

# The application will be available at http://localhost:4200
```

## Development Commands

```bash
# Run unit tests
ng test

# Run end-to-end tests
ng e2e

# Build for production
ng build

# Build for production with SSR
npm run build:ssr
```

## Project Structure

```
the-poet/
├── src/
│   ├── app/
│   │   ├── components/    # UI components
│   │   ├── services/      # Data and business logic
│   │   └── models/        # TypeScript interfaces
│   ├── assets/
│   │   ├── icons/         # App icons
│   │   └── search/        # Search data files
│   └── environments/      # Environment configurations
```

## Key Features

1. **Poetry Search**
   - Full-text search across poems
   - Author-based search
   - Combined search capabilities

2. **Offline Support**
   - IndexedDB storage
   - Service worker caching
   - Background sync

3. **Performance**
   - Server-side rendering
   - Progressive loading
   - Search index optimization

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
   - Configure service worker
   - Set up proper caching

## Additional Resources

- [Angular Documentation](https://angular.io/docs)
- [RxJS Guide](https://rxjs.dev/guide/overview)
- [IndexedDB Documentation](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Lunr.js Documentation](https://lunrjs.com/docs/index.html) 