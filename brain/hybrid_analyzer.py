#!/usr/bin/env python3
"""
Hybrid AI Feedback Analyzer - Efficient approach using traditional ML + minimal LLM
Reduces API calls from 11+ to just 2 by using VADER sentiment and TF-IDF keywords
"""

import sys
import json
import re
import math
from typing import List, Dict, Any, Optional
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# Traditional ML libraries
try:
    from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
    VADER_AVAILABLE = True
except ImportError:
    VADER_AVAILABLE = False
    print("Warning: vaderSentiment not available", file=sys.stderr)

try:
    from rake_nltk import Rake
    RAKE_AVAILABLE = True
except ImportError:
    RAKE_AVAILABLE = False
    print("Warning: rake-nltk not available", file=sys.stderr)

# Import Gemini analyzer (minimal usage)
try:
    from gemini_analyzer import get_gemini_analyzer
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    print("Warning: Gemini analyzer not available", file=sys.stderr)

class HybridAnalyzer:
    """Efficient analyzer using traditional ML + minimal LLM usage"""
    
    def __init__(self):
        self.vader = SentimentIntensityAnalyzer() if VADER_AVAILABLE else None
        self.rake = Rake() if RAKE_AVAILABLE else None
        self.gemini = None
        
        if GEMINI_AVAILABLE:
            try:
                self.gemini = get_gemini_analyzer()
                if not self.gemini.available:
                    print("Warning: Gemini API not available", file=sys.stderr)
            except Exception as e:
                print(f"Warning: Could not initialize Gemini: {e}", file=sys.stderr)
    
    def clean_text(self, text: str) -> str:
        """Clean and normalize text"""
        if not isinstance(text, str):
            return ""
        text = text.lower()
        text = re.sub(r"https?://\S+", " ", text)
        text = re.sub(r"[^a-z0-9\s]", " ", text)
        text = re.sub(r"\s+", " ", text).strip()
        return text
    
    def get_sentiment_vader(self, texts: List[str]) -> List[Dict[str, Any]]:
        """Get sentiment scores using VADER (fast, free, no API calls)"""
        if not self.vader:
            return [{"sentiment": 0.0, "confidence": 0.5, "reasoning": "VADER not available"} for _ in texts]
        
        results = []
        for text in texts:
            scores = self.vader.polarity_scores(text)
            compound_score = scores['compound']
            
            # Convert to -1 to 1 scale
            sentiment = compound_score
            
            # Calculate confidence based on intensity
            confidence = abs(scores['pos'] - scores['neg']) + scores['neu'] * 0.5
            
            results.append({
                "sentiment": sentiment,
                "confidence": min(confidence, 1.0),
                "reasoning": f"VADER: pos={scores['pos']:.2f}, neg={scores['neg']:.2f}, neu={scores['neu']:.2f}",
                "method": "vader"
            })
        
        return results
    
    def extract_keywords_tfidf(self, texts: List[str], max_features: int = 20) -> List[str]:
        """Extract keywords using TF-IDF (no API calls)"""
        if len(texts) == 0:
            return []
        
        try:
            vectorizer = TfidfVectorizer(
                max_features=max_features,
                stop_words='english',
                ngram_range=(1, 2),
                min_df=1,
                max_df=0.8
            )
            
            tfidf_matrix = vectorizer.fit_transform(texts)
            feature_names = vectorizer.get_feature_names_out()
            
            # Get top keywords by mean TF-IDF score
            mean_scores = np.mean(tfidf_matrix.toarray(), axis=0)
            top_indices = np.argsort(mean_scores)[-max_features:][::-1]
            
            keywords = [feature_names[i] for i in top_indices if mean_scores[i] > 0]
            return keywords[:10]  # Return top 10
            
        except Exception as e:
            print(f"TF-IDF keyword extraction error: {e}", file=sys.stderr)
            return []
    
    def extract_keywords_rake(self, texts: List[str]) -> List[str]:
        """Extract keywords using RAKE (fallback)"""
        if not self.rake or len(texts) == 0:
            return []
        
        try:
            combined_text = " ".join(texts)
            self.rake.extract_keywords_from_text(combined_text)
            keywords = self.rake.get_ranked_phrases()[:10]
            return keywords
        except Exception as e:
            print(f"RAKE keyword extraction error: {e}", file=sys.stderr)
            return []
    
    def get_embeddings(self, texts: List[str]) -> np.ndarray:
        """Get embeddings using TF-IDF"""
        vectorizer = TfidfVectorizer(max_features=1000, stop_words='english')
        tfidf_matrix = vectorizer.fit_transform(texts)
        return tfidf_matrix.toarray()
    
    def generate_cluster_labels_traditional(self, texts: List[str], labels: np.ndarray) -> Dict[int, Dict[str, Any]]:
        """Generate cluster labels using traditional ML (no API calls)"""
        df = pd.DataFrame({"text": texts, "label": labels})
        label_to_texts = {int(l): df[df.label == l]["text"].tolist() for l in sorted(df.label.unique())}
        
        enhanced_labels = {}
        
        for cluster_id, cluster_texts in label_to_texts.items():
            # Extract keywords for this cluster
            keywords = self.extract_keywords_tfidf(cluster_texts, max_features=5)
            
            # Generate simple label based on keywords
            if keywords:
                # Use top keywords to create label
                top_keywords = keywords[:3]
                label = " ".join(top_keywords).title()
            else:
                label = f"Cluster {cluster_id}"
            
            # Calculate cluster sentiment
            cluster_sentiments = []
            for text in cluster_texts:
                if self.vader:
                    scores = self.vader.polarity_scores(text)
                    cluster_sentiments.append(scores['compound'])
            
            avg_sentiment = np.mean(cluster_sentiments) if cluster_sentiments else 0.0
            
            if avg_sentiment > 0.1:
                sentiment_label = "positive"
            elif avg_sentiment < -0.1:
                sentiment_label = "negative"
            else:
                sentiment_label = "neutral"
            
            enhanced_labels[cluster_id] = {
                "label": label,
                "keywords": keywords[:5],
                "sentiment": sentiment_label,
                "description": f"Cluster focused on {', '.join(keywords[:3])}",
                "method": "traditional_ml"
            }
        
        return enhanced_labels
    
    def enhance_with_gemini_batch(self, cluster_summaries: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Enhance cluster labels using Gemini (single batch call)"""
        if not self.gemini or not self.gemini.available:
            return cluster_summaries
        
        try:
            # Prepare data for batch processing
            clusters_data = []
            for cluster in cluster_summaries:
                clusters_data.append({
                    "cluster_id": cluster["cluster"],
                    "label": cluster["label"],
                    "keywords": cluster["keywords"],
                    "volume": cluster["volume"],
                    "avg_sentiment": cluster["avg_sentiment"]
                })
            
            prompt = f"""
            Enhance these customer feedback cluster labels to be more descriptive and actionable.
            For each cluster, provide:
            1. A better, more descriptive label
            2. Top 3-5 keywords that represent this cluster
            3. Brief description of what this cluster represents
            
            Cluster Data:
            {json.dumps(clusters_data, indent=2)}
            
            Respond ONLY in JSON format with an array of enhanced clusters:
            [
                {{
                    "cluster_id": <cluster_number>,
                    "enhanced_label": "<better descriptive label>",
                    "enhanced_keywords": ["keyword1", "keyword2", "keyword3"],
                    "description": "<brief description>"
                }}
            ]
            """
            
            response = self.gemini.model.generate_content(prompt)
            result = self.gemini._parse_gemini_response(response.text.strip() if response.text else "")
            
            if isinstance(result, list):
                # Map enhanced results back to original clusters
                enhanced_map = {item["cluster_id"]: item for item in result}
                
                for cluster in cluster_summaries:
                    cluster_id = cluster["cluster"]
                    if cluster_id in enhanced_map:
                        enhanced = enhanced_map[cluster_id]
                        cluster["label"] = enhanced.get("enhanced_label", cluster["label"])
                        cluster["keywords"] = enhanced.get("enhanced_keywords", cluster["keywords"])
                        cluster["description"] = enhanced.get("description", cluster["description"])
                        cluster["enhanced_by"] = "gemini_batch"
            
            return cluster_summaries
            
        except Exception as e:
            print(f"Gemini batch enhancement error: {e}", file=sys.stderr)
            return cluster_summaries
    
    def generate_insights_gemini(self, analysis_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate final insights using Gemini (single call)"""
        if not self.gemini or not self.gemini.available:
            return {
                "insights": ["Analysis completed using traditional ML methods"],
                "recommendations": [],
                "priority_areas": []
            }
        
        try:
            # Prepare summary for Gemini
            clusters_summary = []
            for cluster in analysis_data.get("clusters", []):
                clusters_summary.append({
                    "label": cluster["label"],
                    "volume": cluster["volume"],
                    "sentiment": cluster["avg_sentiment"],
                    "keywords": cluster["keywords"][:3]
                })
            
            prompt = f"""
            Based on this customer feedback analysis, provide actionable business insights:
            
            Analysis Summary:
            - Total feedback items: {len(analysis_data.get('items', []))}
            - Clusters found: {len(analysis_data.get('clusters', []))}
            
            Cluster Details:
            {json.dumps(clusters_summary, indent=2)}
            
            Provide:
            1. 3-5 key insights about customer satisfaction
            2. 3-5 actionable recommendations
            3. Priority areas to focus on
            
            Respond ONLY in JSON format:
            {{
                "insights": ["<insight 1>", "<insight 2>"],
                "recommendations": [
                    {{
                        "action": "<specific action>",
                        "priority": "<high/medium/low>",
                        "impact": "<expected impact>"
                    }}
                ],
                "priority_areas": ["<area 1>", "<area 2>"]
            }}
            """
            
            response = self.gemini.model.generate_content(prompt)
            result = self.gemini._parse_gemini_response(response.text.strip() if response.text else "")
            
            return {
                "insights": result.get("insights", []),
                "recommendations": result.get("recommendations", []),
                "priority_areas": result.get("priority_areas", []),
                "method": "gemini_insights"
            }
            
        except Exception as e:
            print(f"Gemini insights generation error: {e}", file=sys.stderr)
            return {
                "insights": ["Analysis completed - detailed insights unavailable"],
                "recommendations": [],
                "priority_areas": []
            }
    
    def compute_roi(self, volume: int, max_volume: int, avg_sentiment: float, weight: float = 1.0) -> float:
        """Compute ROI score based on volume and sentiment"""
        if max_volume <= 0:
            return 0.0
        volume_score = volume / float(max_volume)
        sentiment_score = (avg_sentiment + 1.0) / 2.0  # map [-1,1] -> [0,1]
        roi = volume_score * sentiment_score * max(weight, 0.1)
        return round(float(roi) * 100.0, 2)
    
    def analyze_feedback(self, feedbacks: List[str], n_clusters: int = 5) -> Dict[str, Any]:
        """Main analysis function - hybrid approach with minimal LLM usage"""
        if len(feedbacks) == 0:
            return {"items": [], "clusters": [], "insights": [], "themes": []}
        
        print(f"Starting hybrid analysis of {len(feedbacks)} feedback items...", file=sys.stderr)
        
        # Step 1: Clean texts
        cleaned = [self.clean_text(t) for t in feedbacks]
        
        # Step 2: Get embeddings and cluster (traditional ML)
        print("Step 1: Clustering feedback...", file=sys.stderr)
        embeddings = self.get_embeddings(cleaned)
        n_clusters = min(n_clusters, len(feedbacks))
        kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
        labels = kmeans.fit_predict(embeddings)
        
        # Step 3: Get sentiments using VADER (traditional ML)
        print("Step 2: Analyzing sentiment with VADER...", file=sys.stderr)
        sentiment_results = self.get_sentiment_vader(feedbacks)
        sentiments = [result["sentiment"] for result in sentiment_results]
        
        # Step 4: Create results dataframe
        df = pd.DataFrame({
            "text": feedbacks,
            "clean": cleaned,
            "cluster": labels,
            "sentiment": sentiments,
            "sentiment_details": sentiment_results,
        })
        
        # Step 5: Generate cluster summaries (traditional ML)
        print("Step 3: Generating cluster summaries...", file=sys.stderr)
        summaries = []
        label_info = self.generate_cluster_labels_traditional(cleaned, labels)
        max_volume = df.groupby("cluster").size().max()
        
        for cluster_id, group in df.groupby("cluster"):
            volume = int(group.shape[0])
            avg_sent = float(group["sentiment"].mean()) if volume > 0 else 0.0
            label_meta = label_info.get(int(cluster_id), {"label": f"Cluster {int(cluster_id)}", "keywords": []})
            roi = self.compute_roi(volume=volume, max_volume=int(max_volume), avg_sentiment=avg_sent, weight=1.0)
            
            cluster_summary = {
                "cluster": int(cluster_id),
                "label": label_meta["label"],
                "keywords": label_meta["keywords"],
                "volume": volume,
                "avg_sentiment": round(avg_sent, 3),
                "roi": roi,
                "description": label_meta.get("description", ""),
                "cluster_sentiment": label_meta.get("sentiment", "neutral"),
                "labeling_method": label_meta.get("method", "traditional_ml")
            }
            
            summaries.append(cluster_summary)
        
        # Step 6: Enhance with Gemini (single batch call)
        print("Step 4: Enhancing with Gemini (1 API call)...", file=sys.stderr)
        enhanced_summaries = self.enhance_with_gemini_batch(summaries)
        
        # Step 7: Generate final insights (single Gemini call)
        print("Step 5: Generating insights with Gemini (1 API call)...", file=sys.stderr)
        items = df.to_dict(orient="records")
        enhanced_summaries = sorted(enhanced_summaries, key=lambda s: s["roi"], reverse=True)
        
        analysis_result = {
            "items": items,
            "clusters": enhanced_summaries,
            "themes": [],  # Derived from clusters
            "theme_summary": f"Analysis completed with {len(enhanced_summaries)} clusters"
        }
        
        insights_result = self.generate_insights_gemini(analysis_result)
        analysis_result.update(insights_result)
        
        print(f"Analysis complete! Used 2 Gemini API calls instead of 11+", file=sys.stderr)
        return analysis_result

# Global instance
_hybrid_analyzer = None

def get_hybrid_analyzer() -> HybridAnalyzer:
    """Get or create global hybrid analyzer instance"""
    global _hybrid_analyzer
    if _hybrid_analyzer is None:
        _hybrid_analyzer = HybridAnalyzer()
    return _hybrid_analyzer

def analyze_feedback_hybrid(feedbacks: List[str], n_clusters: int = 5) -> Dict[str, Any]:
    """Main entry point for hybrid analysis"""
    analyzer = get_hybrid_analyzer()
    return analyzer.analyze_feedback(feedbacks, n_clusters)

if __name__ == "__main__":
    # Test with sample data
    test_feedbacks = [
        "Love the new dark mode but it sometimes resets to light",
        "Support response times are too slow",
        "The onboarding flow is confusing and needs tooltips",
        "Billing page loads slowly on mobile",
        "Please add export to CSV feature"
    ]
    
    result = analyze_feedback_hybrid(test_feedbacks, n_clusters=3)
    print(json.dumps(result, indent=2))
