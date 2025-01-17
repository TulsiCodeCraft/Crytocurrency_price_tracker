A Node.js-based real-time cryptocurrency price monitoring system that fetches live prices, allows users to set price alerts, and provides notifications when conditions are met. The project features caching optimizations using Redis and a robust database integration with MongoDB for persistent storage.

---

## Features

### 1. Real-Time Monitoring
- Fetches real-time cryptocurrency prices using the CoinGecko API.
- Continuously updates prices in real-time.

### 2. Alerting System
- Users can set price change alerts based on custom thresholds.
- Sends notifications when alert criteria are met.

### 3. Caching Optimization
- Implements Redis to cache recent price updates, reducing API call frequency.
- Automatically refreshes cached data using TTL.

### 4. Database Integration
- Uses MongoDB for storing user data and alert configurations.
- Optimized schema for real-time operations.

### 5. Additional Features
- A basic frontend interface for showcasing functionality.
- Dockerized application for easy deployment.

---

## Tech Stack
- **Backend:** Node.js, TypeScript
- **Database:** MongoDB
- **Caching:** Redis
- **API:** CoinGecko

---

## How to Run

### Steps
1. Clone the repository:
   ```bash
   git clone <repository-link>
   ```
2. Navigate to the project directory:
   ```bash
   cd cryptocurrency_tracker
   ```
3. Build and run the Docker container:
   ```bash
   docker build -t cryptocurrency_tracker .
   docker compose up --build
   ```
4. (Optional) Run Redis server locally:
   ```bash
   redis-server
   ```
5. Open the app at `http://localhost:5173`.
