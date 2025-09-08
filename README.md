# AI Feedback Miner (MVP)

A lean MVP to ingest product feedback, cluster & summarize it, score by ROI, and visualize in a dashboard.

## Architecture

```
/ai-feedback-miner
  /frontend   (Next.js + Tailwind) - Dashboard UI
  /backend    (Node.js + Express) - API server
  /brain      (Python) - AI pipeline (clustering, sentiment, ROI)
  /data       (sample CSVs) - Example data
```

## Features

- **Upload**: CSV file upload with feedback data
- **Analysis**: AI-powered clustering using embeddings + sentiment analysis
- **Scoring**: ROI calculation based on volume × sentiment × impact
- **Dashboard**: Clean UI showing clusters, sentiment distribution, and ROI scores

## Quick Start

### Option 1: Docker Compose (Recommended)

1. **Clone and setup**:

   ```bash
   cd ai-feedback-miner
   cp backend/.env.example backend/.env
   ```

2. **Start services**:

   ```bash
   docker-compose up -d
   ```

3. **Access the application**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - MongoDB: localhost:27017

### Option 2: Manual Setup

#### Backend (Node.js + MongoDB)

1. **Install dependencies**:

   ```bash
   cd backend
   npm install
   ```

2. **Setup environment**:

   ```bash
   cp .env.example .env
   # Edit .env with your MongoDB URL
   ```

3. **Start MongoDB** (if not using Docker):

   ```bash
   # Using Docker
   docker run -d -p 27017:27017 --name mongo mongo:6

   # Or install MongoDB locally
   ```

4. **Run backend**:
   ```bash
   npm run dev  # Development
   npm start    # Production
   ```

#### Brain Service (Python)

1. **Install Python dependencies**:

   ```bash
   cd brain
   pip install -r requirements.txt
   ```

2. **Test the service**:
   ```bash
   python analyze.py '["test feedback"]' 5
   ```

#### Frontend (Next.js)

1. **Install dependencies**:

   ```bash
   cd frontend
   npm install
   ```

2. **Run development server**:
   ```bash
   npm run dev
   ```

## API Endpoints

### Backend API (Port 8000)

- `GET /health` - Health check
- `POST /upload` - Upload CSV file with feedback
- `POST /analyze` - Run AI analysis on uploaded feedback
- `GET /analysis` - Get analysis results
- `GET /feedback/count` - Get feedback count

### Example Usage

**Upload CSV**:

```bash
curl -X POST -F "file=@sample_feedback.csv" http://localhost:8000/upload
```

**Run Analysis**:

```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"n_clusters": 5, "limit": 1000}' \
  http://localhost:8000/analyze
```

## Data Format

### CSV Input Format

```csv
id,text,source
1,"Love the new dark mode but it sometimes resets to light",app_review
2,"Support response times are too slow",intercom
3,"The onboarding flow is confusing and needs tooltips",app_review
```

Required columns:

- `text`: The feedback content
- `source`: Source of feedback (optional, defaults to "upload")

## AI Pipeline

The brain service performs:

1. **Text Cleaning**: Normalize and clean feedback text
2. **Embeddings**: Generate vector representations using sentence-transformers
3. **Clustering**: K-means clustering to group similar feedback
4. **Sentiment**: VADER sentiment analysis
5. **ROI Scoring**: `volume_score × sentiment_score × weight`

## Development

### Backend Development

```bash
cd backend
npm run dev  # Auto-reload on changes
```

### Frontend Development

```bash
cd frontend
npm run dev  # Next.js dev server
```

### Brain Service Testing

```bash
cd brain
python analyze.py '["sample feedback text"]' 5
```

## Docker Services

- **mongo**: MongoDB database
- **backend**: Node.js API server
- **brain**: Python AI service

## Environment Variables

### Backend (.env)

```
PORT=8000
MONGODB_URI=mongodb://localhost:27017/ai_feedback_miner
CORS_ORIGIN=http://localhost:3000
NODE_ENV=development
```

## Troubleshooting

1. **MongoDB Connection Issues**: Ensure MongoDB is running on port 27017
2. **Python Dependencies**: Install brain requirements with `pip install -r requirements.txt`
3. **CORS Issues**: Check CORS_ORIGIN in backend .env file
4. **File Upload Issues**: Ensure uploads directory exists in backend

## Next Steps

- [ ] Add authentication
- [ ] Implement real-time analysis updates
- [ ] Add more clustering algorithms
- [ ] Export analysis results
- [ ] Add API rate limiting
- [ ] Implement caching
