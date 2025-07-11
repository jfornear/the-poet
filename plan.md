# The Poet - Implementation Plan

## Project Overview
An Angular application that provides a powerful search experience for poetry, with server-side rendering (SSR) support and efficient client-side storage.

## Core Architecture
- Server-side rendering (SSR):
  - Angular Universal integration
  - Platform detection for SSR/browser
  - Hydration handling
  - SEO optimization
- Client-side storage:
  - IndexedDB for poem data
  - Lunr.js search index
  - Background data refresh
- Search optimization:
  - Author name matching
  - Title and content search
  - Relevance scoring
  - Result ranking

## Features

### 1. Search Experience
- Unified search interface:
  - Single search box with Material Design
  - Real-time suggestions
  - Loading indicators
  - Error handling
- Search capabilities:
  - Author name matching
  - Title and content search
  - Wildcard support
  - Score-based ranking

### 2. Search Implementation
- Multi-stage search process:
  1. Author name matching:
     - Exact matches
     - Consecutive word matches
     - Individual name parts
  2. Title and content search:
     - Full-text search
     - Wildcard support
     - Result combination
  3. Result ranking:
     - Author base score (1,000,000)
     - Title match boost (+10,000)
     - Author prominence ranking
     - Relevance scoring

### 3. Technical Implementation

#### Data Layer
- IndexedDB storage:
  - Poems store
  - Search index store
  - Background refresh
- Lunr.js integration:
  - Custom tokenization
  - Field boosting
  - Wildcard support
  - Score normalization

#### Frontend Components
- Standalone Angular components:
  - Search interface
  - Poem detail view
  - Search results
  - Poem cards
- Material Design:
  - Form fields
  - Cards
  - Icons
  - Progress indicators

#### Core Services
- Poetry DB service:
  - API interaction
  - Data fetching
  - Error handling
- Search service:
  - Author matching
  - Search index
  - Result ranking
- Storage service:
  - IndexedDB management
  - Data persistence
  - Background refresh

#### SSR Support
- Universal rendering:
  - Platform detection
  - Hydration handling
  - Loading states
  - Error boundaries
- SEO optimization:
  - Meta tags
  - Title updates
  - Loading indicators 