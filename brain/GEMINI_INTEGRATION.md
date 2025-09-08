# Gemini API Integration for AI Feedback Miner

This document explains how to use the Gemini API integration in the brain service for AI-powered feedback analysis.

## Features

The Gemini integration provides:

1. **AI-Powered Sentiment Analysis** - Advanced sentiment scoring with confidence levels and reasoning
2. **Automatic Theme Extraction** - AI identification of main themes and topics in feedback
3. **Intelligent Insights Generation** - AI-generated actionable insights and recommendations
4. **Smart Cluster Labeling** - AI-generated cluster names and descriptions with context

## Setup

### 1. Get a Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Create a new API key
3. Copy the API key

### 2. Set Environment Variable

```bash
export GEMINI_API_KEY="your_api_key_here"
```

Or in Docker:

```bash
docker run -e GEMINI_API_KEY="your_api_key_here" your-image
```

### 3. Install Dependencies

The required dependency is already added to `requirements.txt`:

```
google-generativeai==0.8.3
```

## Usage

### API Endpoints

#### AI-Powered Analysis

```bash
POST /analyze
{
  "texts": ["feedback1", "feedback2", ...],
  "n_clusters": 5
}
```

#### Check Status

```bash
GET /status
```

Returns:

```json
{
  "status": "ok",
  "service": "brain",
  "gemini_available": true,
  "gemini_api_key_set": true,
  "features": {
    "enhanced_sentiment": true,
    "theme_extraction": true,
    "insights_generation": true,
    "cluster_labeling": true
  }
}
```

### Command Line Usage

```bash
python analyze.py '["feedback1", "feedback2"]' 3
```

### Response Format

The AI-powered response includes comprehensive analysis:

```json
{
  "items": [...],
  "clusters": [
    {
      "cluster": 0,
      "label": "User Experience Issues",
      "keywords": ["ui", "interface", "design"],
      "volume": 15,
      "avg_sentiment": -0.2,
      "roi": 45.5,
      "description": "Feedback related to user interface and design concerns",
      "cluster_sentiment": "negative",
      "labeling_method": "gemini"
    }
  ],
  "themes": [
    {
      "name": "User Interface",
      "keywords": ["ui", "design", "interface"],
      "description": "Feedback about the user interface design",
      "sentiment": "negative"
    }
  ],
  "insights": [
    "Users are experiencing UI/UX issues that need immediate attention",
    "Positive feedback is primarily about functionality"
  ],
  "recommendations": [
    {
      "action": "Redesign the main interface",
      "priority": "high",
      "impact": "Significant improvement in user satisfaction"
    }
  ],
  "priority_areas": ["User Interface", "Performance"]
}
```

## Requirements

**Important**: The Gemini API key is now **required** for the service to function. The service will not start without a valid API key.

## Testing

Run the test script to see Gemini integration in action:

```bash
python test_gemini.py
```

## Cost Considerations

Gemini API usage is based on:

- Number of tokens processed
- Number of API calls made

The integration is designed to be efficient:

- Batches requests where possible
- Uses appropriate model sizes
- Includes error handling and fallbacks

Monitor your usage in the Google AI Studio dashboard.
