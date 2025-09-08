#!/usr/bin/env python3
"""
AI Feedback Miner Brain Service
Called by Node.js backend to perform analysis
"""

import sys
import json
import re
import math
from typing import List, Dict, Any
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.feature_extraction.text import TfidfVectorizer

# Import Gemini analyzer
try:
    from gemini_analyzer import get_gemini_analyzer
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    print("Error: Gemini analyzer is required but not available", file=sys.stderr)
    sys.exit(1)

# Global Gemini analyzer
_gemini_analyzer = None

def get_gemini():
    """Get Gemini analyzer instance"""
    global _gemini_analyzer
    if _gemini_analyzer is None:
        _gemini_analyzer = get_gemini_analyzer()
        if not _gemini_analyzer.available:
            print("Error: Gemini API is not available. Please check your API key.", file=sys.stderr)
            sys.exit(1)
    return _gemini_analyzer

def clean_text(text: str) -> str:
    """Clean and normalize text"""
    if not isinstance(text, str):
        return ""
    text = text.lower()
    text = re.sub(r"https?://\S+", " ", text)
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text

def get_sentiment_batch(texts: List[str]) -> List[Dict[str, Any]]:
    """Get sentiment scores using Gemini batch processing"""
    gemini = get_gemini()
    results = gemini.analyze_sentiment_batch(texts)
    return [{
        "score": result["sentiment"],
        "confidence": result["confidence"],
        "reasoning": result["reasoning"],
        "method": "gemini"
    } for result in results]

def get_sentiment(text: str) -> Dict[str, Any]:
    """Get sentiment score using Gemini (single text fallback)"""
    results = get_sentiment_batch([text])
    return results[0] if results else {
        "score": 0.0,
        "confidence": 0.0,
        "reasoning": "No analysis available",
        "method": "gemini"
    }

def get_embeddings(texts: List[str]) -> np.ndarray:
    """Get embeddings using Gemini (simplified approach)"""
    # For clustering, we'll use TF-IDF as a simple embedding method
    # This is still needed for the clustering algorithm
    vectorizer = TfidfVectorizer(max_features=1000, stop_words='english')
    tfidf_matrix = vectorizer.fit_transform(texts)
    return tfidf_matrix.toarray()

def auto_label_clusters(texts: List[str], labels: np.ndarray, top_k: int = 3) -> Dict[int, Dict[str, Any]]:
    """Generate cluster labels using Gemini"""
    df = pd.DataFrame({"text": texts, "label": labels})
    label_to_texts = {int(l): df[df.label == l]["text"].tolist() for l in sorted(df.label.unique())}
    
    gemini = get_gemini()
    enhanced_labels = gemini.enhance_cluster_labels(label_to_texts)
    
    label_summaries = {}
    for cluster_id, enhanced_data in enhanced_labels.items():
        label_summaries[cluster_id] = {
            "keywords": enhanced_data["keywords"],
            "label": enhanced_data["label"],
            "description": enhanced_data.get("description", ""),
            "sentiment": enhanced_data.get("sentiment", "neutral"),
            "method": "gemini"
        }
    
    return label_summaries

def compute_roi(volume: int, max_volume: int, avg_sentiment: float, weight: float = 1.0) -> float:
    """Compute ROI score based on volume and sentiment"""
    if max_volume <= 0:
        return 0.0
    volume_score = volume / float(max_volume)
    sentiment_score = (avg_sentiment + 1.0) / 2.0  # map [-1,1] -> [0,1]
    roi = volume_score * sentiment_score * max(weight, 0.1)
    return round(float(roi) * 100.0, 2)

def analyze_feedback(feedbacks: List[str], n_clusters: int = 5) -> Dict[str, Any]:
    """Main analysis function using Gemini"""
    if len(feedbacks) == 0:
        return {"items": [], "clusters": [], "insights": [], "themes": []}
    
    cleaned = [clean_text(t) for t in feedbacks]
    
    # Get embeddings for clustering
    embeddings = get_embeddings(cleaned)
    
    # Cluster
    n_clusters = min(n_clusters, len(feedbacks))
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    labels = kmeans.fit_predict(embeddings)
    
    # Get sentiments using Gemini batch processing
    sentiment_results = get_sentiment_batch(feedbacks)
    sentiments = [result["score"] for result in sentiment_results]
    
    # Create results
    df = pd.DataFrame({
        "text": feedbacks,
        "clean": cleaned,
        "cluster": labels,
        "sentiment": sentiments,
        "sentiment_details": sentiment_results,
    })
    
    summaries = []
    label_info = auto_label_clusters(cleaned, labels, top_k=3)
    max_volume = df.groupby("cluster").size().max()
    
    for cluster_id, group in df.groupby("cluster"):
        volume = int(group.shape[0])
        avg_sent = float(group["sentiment"].mean()) if volume > 0 else 0.0
        label_meta = label_info.get(int(cluster_id), {"label": f"Cluster {int(cluster_id)}", "keywords": []})
        roi = compute_roi(volume=volume, max_volume=int(max_volume), avg_sentiment=avg_sent, weight=1.0)
        
        cluster_summary = {
            "cluster": int(cluster_id),
            "label": label_meta["label"],
            "keywords": label_meta["keywords"],
            "volume": volume,
            "avg_sentiment": round(avg_sent, 3),
            "roi": roi,
            "description": label_meta.get("description", ""),
            "cluster_sentiment": label_meta.get("sentiment", "neutral"),
            "labeling_method": label_meta.get("method", "gemini")
        }
        
        summaries.append(cluster_summary)
    
    items = df.to_dict(orient="records")
    summaries = sorted(summaries, key=lambda s: s["roi"], reverse=True)
    
    # Prepare result
    result = {"items": items, "clusters": summaries}
    
    # Add Gemini enhancements (only for reasonable dataset sizes)
    if len(feedbacks) <= 100:  # Only use Gemini for smaller datasets to avoid timeouts
        gemini = get_gemini()
        
        # Extract themes
        themes_result = gemini.extract_themes(feedbacks)
        result["themes"] = themes_result.get("themes", [])
        result["theme_summary"] = themes_result.get("summary", "")
        
        # Generate insights
        insights_result = gemini.generate_insights(result)
        result["insights"] = insights_result.get("insights", [])
        result["recommendations"] = insights_result.get("recommendations", [])
        result["priority_areas"] = insights_result.get("priority_areas", [])
    else:
        # For larger datasets, provide basic analysis without Gemini enhancements
        result["themes"] = []
        result["theme_summary"] = "Analysis completed for large dataset without theme extraction"
        result["insights"] = ["Large dataset analyzed - consider reducing size for detailed insights"]
        result["recommendations"] = []
        result["priority_areas"] = []
    
    return result

def main():
    """Main entry point for command line usage"""
    if len(sys.argv) < 3:
        print("Usage: python analyze.py '<json_texts>' <n_clusters>", file=sys.stderr)
        sys.exit(1)
    
    try:
        # Handle the case where quotes might be stripped by shell
        json_str = sys.argv[1]
        if not json_str.startswith('['):
            json_str = '[' + json_str
        if not json_str.endswith(']'):
            json_str = json_str + ']'
        
        texts = json.loads(json_str)
        n_clusters = int(sys.argv[2])
        
        result = analyze_feedback(texts, n_clusters)
        print(json.dumps(result))
        
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
