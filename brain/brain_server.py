#!/usr/bin/env python3
"""
AI Feedback Miner Brain Service HTTP Server
Provides REST API for feedback analysis
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import sys
import os

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from analyze import analyze_feedback

app = Flask(__name__)
CORS(app)

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "ok", "service": "brain"})

@app.route('/status', methods=['GET'])
def status():
    """Get service status including Gemini availability"""
    try:
        from gemini_analyzer import get_gemini_analyzer
        gemini_analyzer = get_gemini_analyzer()
        
        return jsonify({
            "status": "ok",
            "service": "brain",
            "gemini_available": gemini_analyzer.available,
            "gemini_api_key_set": bool(gemini_analyzer.api_key),
            "features": {
                "enhanced_sentiment": gemini_analyzer.available,
                "theme_extraction": gemini_analyzer.available,
                "insights_generation": gemini_analyzer.available,
                "cluster_labeling": gemini_analyzer.available
            }
        })
    except Exception as e:
        return jsonify({
            "status": "ok",
            "service": "brain",
            "gemini_available": False,
            "error": str(e)
        })

@app.route('/analyze', methods=['POST'])
def analyze():
    """Analyze feedback endpoint using Gemini"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        
        texts = data.get('texts', [])
        n_clusters = data.get('n_clusters', 5)
        
        if not texts:
            return jsonify({"error": "No texts provided"}), 400
        
        if not isinstance(texts, list):
            return jsonify({"error": "Texts must be a list"}), 400
        
        # Perform analysis using Gemini
        result = analyze_feedback(texts, n_clusters)
        
        return jsonify(result)
        
    except Exception as e:
        print(f"Analysis error: {e}", file=sys.stderr)
        return jsonify({"error": f"Analysis failed: {str(e)}"}), 500

if __name__ == '__main__':
    print("Starting AI Feedback Miner Brain Service...")
    app.run(host='0.0.0.0', port=5000, debug=False)
