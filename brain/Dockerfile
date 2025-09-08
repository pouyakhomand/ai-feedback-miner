# syntax=docker/dockerfile:1.4
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for caching
COPY requirements.txt .

# Use pip cache mount
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy app code AFTER deps
COPY . .

RUN chmod +x analyze.py

# Environment variables for Gemini API (optional)
ENV GEMINI_API_KEY="AIzaSyBRHJCZLnximTAddXpMZ0KyGB4oj48gWlc"

CMD ["python", "brain_server.py"]
