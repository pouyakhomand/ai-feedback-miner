# AI Feedback Miner - Setup Instructions

## Quick Start

1. **Clone and navigate to the project:**

   ```bash
   cd ai-feedback-miner
   ```

2. **Set up environment variables:**

   ```bash
   # Copy the example environment file
   cp env.example .env

   # Edit .env and add your Gemini API key
   nano .env
   ```

3. **Start the application:**

   ```bash
   docker-compose up --build
   ```

4. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - Brain Service: http://localhost:5000

## Environment Variables

### Required

- `GEMINI_API_KEY`: Your Google Gemini API key for AI analysis

### Optional (with defaults)

- `PORT`: Backend port (default: 8000)
- `MONGODB_URI`: MongoDB connection string
- `CORS_ORIGIN`: Frontend URL for CORS
- `NODE_ENV`: Environment mode (production/development)
- `NEXT_PUBLIC_API_URL`: Backend API URL for frontend

## Usage

1. **Upload CSV file** with feedback data (format: id,text,source,time)
2. **Click "Run Analysis"** to process the feedback
3. **View results** showing clustered feedback with sentiment analysis

## Development

### Frontend Development

```bash
cd frontend
cp env.local.example .env.local
npm install
npm run dev
```

### Backend Development

```bash
cd backend
npm install
npm run dev
```

### Brain Service Development

```bash
cd brain
pip install -r requirements.txt
python brain_server.py
```

## Troubleshooting

- **Connection errors**: Check if all services are running
- **Analysis fails**: Verify Gemini API key is set correctly
- **Upload fails**: Ensure CSV format matches expected schema
- **CORS errors**: Check CORS_ORIGIN environment variable

## Data Format

Expected CSV format:

```csv
id,text,source,time
1,"Great app!",google play comments,2024-01-15 14:30:22
2,"Needs improvement",app store reviews,2024-01-15 16:45:18
```
