#!/usr/bin/env python3
"""
Gemini API Integration for Enhanced Feedback Analysis
Provides advanced text analysis using Google's Gemini API
"""

import os
import json
import sys
from typing import List, Dict, Any, Optional

# Try to import Gemini
try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    print("Warning: google-generativeai not available", file=sys.stderr)

class GeminiAnalyzer:
    """Enhanced analyzer using Google's Gemini API"""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv('GEMINI_API_KEY')
        self.model = None
        self.available = False
        
        if GEMINI_AVAILABLE and self.api_key:
            try:
                genai.configure(api_key=self.api_key)
                self.model = genai.GenerativeModel('gemini-1.5-flash')
                self.available = True
                print("Gemini API initialized successfully", file=sys.stderr)
            except Exception as e:
                print(f"Warning: Could not initialize Gemini API: {e}", file=sys.stderr)
        else:
            if not GEMINI_AVAILABLE:
                print("Warning: Gemini library not installed", file=sys.stderr)
            if not self.api_key:
                print("Warning: GEMINI_API_KEY environment variable not set", file=sys.stderr)
    
    def _parse_gemini_response(self, response_text: str) -> Dict[str, Any]:
        """Helper method to parse Gemini API responses and extract JSON"""
        if not response_text:
            raise ValueError("Empty response from Gemini API")
        
        # Try to extract JSON from the response if it's wrapped in markdown or other text
        if response_text.startswith("```json"):
            # Extract JSON from markdown code block
            start = response_text.find("```json") + 7
            end = response_text.find("```", start)
            if end != -1:
                response_text = response_text[start:end].strip()
        elif response_text.startswith("```"):
            # Extract JSON from generic code block
            start = response_text.find("```") + 3
            end = response_text.find("```", start)
            if end != -1:
                response_text = response_text[start:end].strip()
        
        # Try to find JSON object in the response
        if not response_text.startswith("{"):
            # Look for JSON object in the response
            start = response_text.find("{")
            end = response_text.rfind("}") + 1
            if start != -1 and end > start:
                response_text = response_text[start:end]
        
        if not response_text:
            raise ValueError("No JSON found in Gemini API response")
        
        try:
            return json.loads(response_text)
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON in Gemini API response: {e}")
    
    def analyze_sentiment_batch(self, texts: List[str]) -> List[Dict[str, Any]]:
        """Batch sentiment analysis using Gemini for better performance"""
        if not self.available:
            return [{"sentiment": 0.0, "confidence": 0.0, "reasoning": "Gemini not available"} for _ in texts]
        
        try:
            # Combine texts for batch analysis
            combined_texts = "\n".join([f"{i+1}. {text}" for i, text in enumerate(texts)])
            
            prompt = f"""
            Analyze the sentiment of these customer feedback texts. For each text, provide:
            1. Sentiment score (-1 to 1, where -1 is very negative, 0 is neutral, 1 is very positive)
            2. Confidence level (0 to 1)
            3. Brief reasoning for your analysis
            
            Texts:
            {combined_texts}
            
            Respond ONLY in JSON format with an array of results:
            [
                {{
                    "sentiment": <score>,
                    "confidence": <confidence>,
                    "reasoning": "<brief explanation>"
                }}
            ]
            """
            
            response = self.model.generate_content(prompt)
            result = self._parse_gemini_response(response.text.strip() if response.text else "")
            
            # Ensure we have the right number of results
            if isinstance(result, list):
                results = result
            else:
                # If single result, duplicate it for all texts
                results = [result] * len(texts)
            
            # Pad or truncate to match input length
            while len(results) < len(texts):
                results.append({"sentiment": 0.0, "confidence": 0.0, "reasoning": "No analysis available"})
            
            return results[:len(texts)]
            
        except Exception as e:
            error_msg = str(e)
            print(f"Gemini batch sentiment analysis error: {error_msg}", file=sys.stderr)
            
            # Check if it's a quota/rate limit error
            if "quota" in error_msg.lower() or "rate" in error_msg.lower() or "limit" in error_msg.lower():
                print("Gemini API quota/rate limit exceeded. Using fallback sentiment analysis.", file=sys.stderr)
                return self._fallback_sentiment_analysis(texts)
            
            return [{"sentiment": 0.0, "confidence": 0.0, "reasoning": f"Error: {error_msg}"} for _ in texts]
    
    def _fallback_sentiment_analysis(self, texts: List[str]) -> List[Dict[str, Any]]:
        """Simple fallback sentiment analysis when Gemini is unavailable"""
        results = []
        for text in texts:
            text_lower = text.lower()
            positive_words = ['great', 'amazing', 'excellent', 'love', 'best', 'good', 'wonderful', 'fantastic', 'awesome', 'perfect']
            negative_words = ['terrible', 'awful', 'bad', 'hate', 'worst', 'poor', 'disappointed', 'horrible', 'useless', 'waste']
            
            positive_count = sum(1 for word in positive_words if word in text_lower)
            negative_count = sum(1 for word in negative_words if word in text_lower)
            
            if positive_count > negative_count:
                sentiment = 0.7
                reasoning = "Positive keywords detected"
            elif negative_count > positive_count:
                sentiment = -0.7
                reasoning = "Negative keywords detected"
            else:
                sentiment = 0.0
                reasoning = "Neutral or mixed sentiment"
            
            results.append({
                "sentiment": sentiment,
                "confidence": 0.6,  # Lower confidence for fallback
                "reasoning": f"Fallback analysis: {reasoning}"
            })
        
        return results
    
    def analyze_sentiment(self, text: str) -> Dict[str, Any]:
        """Single sentiment analysis using Gemini (fallback for compatibility)"""
        results = self.analyze_sentiment_batch([text])
        return results[0] if results else {"sentiment": 0.0, "confidence": 0.0, "reasoning": "No analysis available"}
    
    def extract_themes(self, texts: List[str]) -> Dict[str, Any]:
        """Extract themes and topics from feedback using Gemini"""
        if not self.available:
            return {"themes": [], "reasoning": "Gemini not available"}
        
        try:
            # Combine texts for analysis
            combined_text = "\n".join([f"{i+1}. {text}" for i, text in enumerate(texts)])
            
            prompt = f"""
            Analyze these customer feedback texts and identify the main themes/topics. 
            Provide:
            1. List of main themes (3-7 themes)
            2. For each theme, provide keywords and brief description
            3. Overall summary of customer sentiment patterns
            
            Feedback texts:
            {combined_text}
            
            Respond ONLY in JSON format:
            {{
                "themes": [
                    {{
                        "name": "<theme_name>",
                        "keywords": ["keyword1", "keyword2"],
                        "description": "<brief description>",
                        "sentiment": "<positive/negative/neutral>"
                    }}
                ],
                "summary": "<overall summary>"
            }}
            """
            
            response = self.model.generate_content(prompt)
            result = self._parse_gemini_response(response.text.strip() if response.text else "")
            
            return {
                "themes": result.get("themes", []),
                "summary": result.get("summary", ""),
                "reasoning": "Gemini analysis completed"
            }
            
        except Exception as e:
            print(f"Gemini theme extraction error: {e}", file=sys.stderr)
            return {"themes": [], "summary": "", "reasoning": f"Error: {str(e)}"}
    
    def generate_insights(self, analysis_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate actionable insights from analysis data"""
        if not self.available:
            return {"insights": [], "recommendations": []}
        
        try:
            # Prepare data summary for Gemini
            data_summary = {
                "total_feedback": len(analysis_data.get("items", [])),
                "clusters": analysis_data.get("clusters", []),
                "sentiment_distribution": "mixed"  # Could be calculated from actual data
            }
            
            prompt = f"""
            Based on this customer feedback analysis data, provide:
            1. Key insights about customer satisfaction
            2. Actionable recommendations for improvement
            3. Priority areas to focus on
            
            Analysis Data:
            {json.dumps(data_summary, indent=2)}
            
            Respond ONLY in JSON format:
            {{
                "insights": [
                    "<insight 1>",
                    "<insight 2>"
                ],
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
            
            response = self.model.generate_content(prompt)
            result = self._parse_gemini_response(response.text.strip() if response.text else "")
            
            return {
                "insights": result.get("insights", []),
                "recommendations": result.get("recommendations", []),
                "priority_areas": result.get("priority_areas", []),
                "reasoning": "Gemini insights generated"
            }
            
        except Exception as e:
            print(f"Gemini insights generation error: {e}", file=sys.stderr)
            return {"insights": [], "recommendations": [], "priority_areas": [], "reasoning": f"Error: {str(e)}"}
    
    def enhance_cluster_labels(self, cluster_texts: Dict[int, List[str]]) -> Dict[int, Dict[str, Any]]:
        """Generate better cluster labels using Gemini"""
        if not self.available:
            return {}
        
        enhanced_labels = {}
        
        for cluster_id, texts in cluster_texts.items():
            try:
                sample_texts = texts[:5]  # Use first 5 texts as sample
                combined_sample = "\n".join([f"{i+1}. {text}" for i, text in enumerate(sample_texts)])
                
                prompt = f"""
                Analyze these customer feedback texts from a cluster and provide:
                1. A descriptive label for this cluster
                2. Key keywords that represent this cluster
                3. The main sentiment/tone of this cluster
                
                Sample feedback texts:
                {combined_sample}
                
                Respond ONLY in JSON format:
                {{
                    "label": "<descriptive cluster name>",
                    "keywords": ["keyword1", "keyword2", "keyword3"],
                    "sentiment": "<positive/negative/neutral>",
                    "description": "<brief description of what this cluster represents>"
                }}
                """
                
                response = self.model.generate_content(prompt)
                
                # Handle potential non-JSON responses
                response_text = response.text.strip() if response.text else ""
                
                # Try to extract JSON from the response if it's wrapped in markdown or other text
                if response_text.startswith("```json"):
                    # Extract JSON from markdown code block
                    start = response_text.find("```json") + 7
                    end = response_text.find("```", start)
                    if end != -1:
                        response_text = response_text[start:end].strip()
                elif response_text.startswith("```"):
                    # Extract JSON from generic code block
                    start = response_text.find("```") + 3
                    end = response_text.find("```", start)
                    if end != -1:
                        response_text = response_text[start:end].strip()
                
                # Try to find JSON object in the response
                if not response_text.startswith("{"):
                    # Look for JSON object in the response
                    start = response_text.find("{")
                    end = response_text.rfind("}") + 1
                    if start != -1 and end > start:
                        response_text = response_text[start:end]
                
                if not response_text:
                    raise ValueError("Empty response from Gemini API")
                
                result = json.loads(response_text)
                
                enhanced_labels[cluster_id] = {
                    "label": result.get("label", f"Cluster {cluster_id}"),
                    "keywords": result.get("keywords", []),
                    "sentiment": result.get("sentiment", "neutral"),
                    "description": result.get("description", ""),
                    "enhanced_by": "gemini"
                }
                
            except Exception as e:
                print(f"Gemini cluster enhancement error for cluster {cluster_id}: {e}", file=sys.stderr)
                enhanced_labels[cluster_id] = {
                    "label": f"Cluster {cluster_id}",
                    "keywords": [],
                    "sentiment": "neutral",
                    "description": "",
                    "enhanced_by": "error"
                }
        
        return enhanced_labels

# Global instance
_gemini_analyzer = None

def get_gemini_analyzer() -> GeminiAnalyzer:
    """Get or create global Gemini analyzer instance"""
    global _gemini_analyzer
    if _gemini_analyzer is None:
        _gemini_analyzer = GeminiAnalyzer()
    return _gemini_analyzer
