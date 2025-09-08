#!/usr/bin/env python3
"""
Test script for Gemini-enhanced feedback analysis
"""

import json
import os
from analyze import analyze_feedback

def test_gemini_integration():
    """Test the Gemini integration with sample feedback"""
    
    # Sample feedback data
    sample_feedback = [
        "The app is amazing! Love the new features.",
        "Customer service was terrible, took forever to respond.",
        "Great product but the UI could be better.",
        "Best app I've ever used, highly recommend!",
        "Had some issues with the login process.",
        "Excellent support team, very helpful.",
        "The app crashes frequently, needs fixing.",
        "Love the design and functionality.",
        "Too expensive for what it offers.",
        "Perfect for my needs, exactly what I was looking for."
    ]
    
    print("Testing Gemini-enhanced feedback analysis...")
    print(f"Sample feedback count: {len(sample_feedback)}")
    print("\nSample feedback:")
    for i, feedback in enumerate(sample_feedback, 1):
        print(f"{i}. {feedback}")
    
    print("\n" + "="*50)
    print("ANALYSIS WITH GEMINI")
    print("="*50)
    
    # Test with Gemini
    result_with_gemini = analyze_feedback(sample_feedback, n_clusters=3)
    
    print(f"\nClusters found: {len(result_with_gemini['clusters'])}")
    for cluster in result_with_gemini['clusters']:
        print(f"\nCluster {cluster['cluster']}: {cluster['label']}")
        print(f"  Volume: {cluster['volume']}")
        print(f"  Avg Sentiment: {cluster['avg_sentiment']}")
        print(f"  ROI: {cluster['roi']}")
        if 'description' in cluster:
            print(f"  Description: {cluster['description']}")
        if 'cluster_sentiment' in cluster:
            print(f"  Cluster Sentiment: {cluster['cluster_sentiment']}")
    
    if 'themes' in result_with_gemini and result_with_gemini['themes']:
        print(f"\nThemes identified: {len(result_with_gemini['themes'])}")
        for theme in result_with_gemini['themes']:
            print(f"\nTheme: {theme['name']}")
            print(f"  Keywords: {', '.join(theme['keywords'])}")
            print(f"  Sentiment: {theme['sentiment']}")
            print(f"  Description: {theme['description']}")
    
    if 'insights' in result_with_gemini and result_with_gemini['insights']:
        print(f"\nInsights:")
        for insight in result_with_gemini['insights']:
            print(f"  • {insight}")
    
    if 'recommendations' in result_with_gemini and result_with_gemini['recommendations']:
        print(f"\nRecommendations:")
        for rec in result_with_gemini['recommendations']:
            print(f"  • {rec['action']} (Priority: {rec['priority']})")
    

if __name__ == "__main__":
    # Check if API key is set
    api_key = os.getenv('GEMINI_API_KEY')
    if api_key:
        print(f"Gemini API key is set: {api_key[:10]}...")
    else:
        print("No GEMINI_API_KEY environment variable found")
        print("Please set the GEMINI_API_KEY environment variable to use the service")
        exit(1)
    
    test_gemini_integration()
