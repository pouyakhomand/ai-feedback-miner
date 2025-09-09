"use client";

import { useState } from "react";

interface Cluster {
  cluster: number;
  label: string;
  keywords: string[];
  volume: number;
  avg_sentiment: number;
  roi: number;
  description?: string;
  cluster_sentiment?: string;
  labeling_method?: string;
}

interface AnalysisItem {
  text: string;
  clean: string;
  cluster: number;
  sentiment: number;
  sentiment_details?: {
    sentiment: number;
    confidence: number;
    reasoning: string;
    method: string;
  };
}

interface Recommendation {
  action: string;
  priority: string;
  impact: string;
}

interface AnalysisResult {
  items: AnalysisItem[];
  clusters: Cluster[];
  insights?: string[];
  recommendations?: Recommendation[];
  priority_areas?: string[];
  themes?: string[];
  theme_summary?: string;
}

// Get API URL from environment variable
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function AnalysisPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<"roi" | "volume" | "sentiment">("roi");
  const [filterSentiment, setFilterSentiment] = useState<
    "all" | "positive" | "negative" | "neutral"
  >("all");

  // Utility functions
  const getSentimentColor = (sentiment: number) => {
    if (sentiment > 0.1) return "text-green-600 bg-green-50";
    if (sentiment < -0.1) return "text-red-600 bg-red-50";
    return "text-gray-600 bg-gray-50";
  };

  const getSentimentLabel = (sentiment: number) => {
    if (sentiment > 0.1) return "Positive";
    if (sentiment < -0.1) return "Negative";
    return "Neutral";
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "high":
        return "text-red-600 bg-red-50 border-red-200";
      case "medium":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "low":
        return "text-green-600 bg-green-50 border-green-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getROIColor = (roi: number) => {
    if (roi > 0.7) return "text-green-600 bg-green-100";
    if (roi > 0.4) return "text-yellow-600 bg-yellow-100";
    return "text-red-600 bg-red-100";
  };

  const exportAnalysis = () => {
    if (!analysis) return;

    const exportData = {
      summary: {
        totalItems: analysis.items.length,
        totalClusters: analysis.clusters.length,
        analysisDate: new Date().toISOString(),
      },
      insights: analysis.insights || [],
      recommendations: analysis.recommendations || [],
      priorityAreas: analysis.priority_areas || [],
      clusters: analysis.clusters,
      sampleItems: analysis.items.slice(0, 20), // Export first 20 items as sample
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `feedback-analysis-${
      new Date().toISOString().split("T")[0]
    }.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
    }
  };

  const uploadFile = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${API_URL}/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Upload failed: ${response.status}`);
      }

      const result = await response.json();
      console.log("Upload successful:", result);
    } catch (err) {
      if (err instanceof TypeError && err.message.includes("fetch")) {
        setError(
          "Cannot connect to server. Please check if the backend is running."
        );
      } else {
        setError(err instanceof Error ? err.message : "Upload failed");
      }
    } finally {
      setUploading(false);
    }
  };

  const analyzeFeedback = async () => {
    setAnalyzing(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          n_clusters: 5,
          limit: 1000,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Analysis failed: ${response.status}`
        );
      }

      const result = await response.json();
      setAnalysis(result);
    } catch (err) {
      if (err instanceof TypeError && err.message.includes("fetch")) {
        setError(
          "Cannot connect to server. Please check if the backend is running."
        );
      } else {
        setError(err instanceof Error ? err.message : "Analysis failed");
      }
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Feedback Analysis
        </h1>
        <p className="text-gray-600">
          Upload and analyze your customer feedback with AI-powered insights
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upload Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4">Upload Feedback</h2>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select CSV file
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          <button
            onClick={uploadFile}
            disabled={!file || uploading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? "Uploading..." : "Upload File"}
          </button>
        </div>

        {/* Analysis Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4">Analyze Feedback</h2>

          <button
            onClick={analyzeFeedback}
            disabled={analyzing}
            className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {analyzing ? "Analyzing..." : "Run Analysis"}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-800">{error}</div>
        </div>
      )}

      {/* Analysis Results */}
      {analysis && (
        <div className="space-y-6">
          {/* Header with Export */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Analysis Results</h2>
              <button
                onClick={exportAnalysis}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Export Results
              </button>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {analysis.items.length}
                </div>
                <div className="text-sm text-blue-800">
                  Total Feedback Items
                </div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {analysis.clusters.length}
                </div>
                <div className="text-sm text-green-800">Themes Identified</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {analysis.items.filter((item) => item.sentiment > 0.1).length}
                </div>
                <div className="text-sm text-purple-800">Positive Feedback</div>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {
                    analysis.items.filter((item) => item.sentiment < -0.1)
                      .length
                  }
                </div>
                <div className="text-sm text-orange-800">Negative Feedback</div>
              </div>
            </div>
          </div>

          {/* AI-Generated Insights */}
          {analysis.insights && analysis.insights.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
                Key Insights
              </h3>
              <div className="space-y-3">
                {analysis.insights.map((insight, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg"
                  >
                    <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                      {idx + 1}
                    </div>
                    <p className="text-gray-800">{insight}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Priority Areas */}
          {analysis.priority_areas && analysis.priority_areas.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
                Priority Areas
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {analysis.priority_areas.map((area, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-red-50 border border-red-200 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span className="font-medium text-red-800">{area}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actionable Recommendations */}
          {analysis.recommendations && analysis.recommendations.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Actionable Recommendations
              </h3>
              <div className="space-y-4">
                {analysis.recommendations.map((rec, idx) => (
                  <div key={idx} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-gray-800">
                        {rec.action}
                      </h4>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(
                          rec.priority
                        )}`}
                      >
                        {rec.priority.toUpperCase()} PRIORITY
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{rec.impact}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex flex-wrap gap-4 items-center mb-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Sort by:</label>
                <select
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy(e.target.value as "roi" | "volume" | "sentiment")
                  }
                  className="border rounded px-2 py-1 text-sm"
                >
                  <option value="roi">ROI Score</option>
                  <option value="volume">Volume</option>
                  <option value="sentiment">Sentiment</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Filter:</label>
                <select
                  value={filterSentiment}
                  onChange={(e) =>
                    setFilterSentiment(
                      e.target.value as
                        | "all"
                        | "positive"
                        | "negative"
                        | "neutral"
                    )
                  }
                  className="border rounded px-2 py-1 text-sm"
                >
                  <option value="all">All Sentiments</option>
                  <option value="positive">Positive Only</option>
                  <option value="negative">Negative Only</option>
                  <option value="neutral">Neutral Only</option>
                </select>
              </div>
            </div>
          </div>

          {/* Enhanced Cluster Cards */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-xl font-semibold mb-4">Feedback Themes</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {analysis.clusters
                .filter((cluster) => {
                  if (filterSentiment === "all") return true;
                  if (filterSentiment === "positive")
                    return cluster.avg_sentiment > 0.1;
                  if (filterSentiment === "negative")
                    return cluster.avg_sentiment < -0.1;
                  if (filterSentiment === "neutral")
                    return (
                      cluster.avg_sentiment >= -0.1 &&
                      cluster.avg_sentiment <= 0.1
                    );
                  return true;
                })
                .sort((a, b) => {
                  if (sortBy === "roi") return b.roi - a.roi;
                  if (sortBy === "volume") return b.volume - a.volume;
                  if (sortBy === "sentiment")
                    return b.avg_sentiment - a.avg_sentiment;
                  return 0;
                })
                .map((cluster: Cluster) => (
                  <div
                    key={cluster.cluster}
                    className="border rounded-lg p-4 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-semibold text-lg text-gray-800">
                        {cluster.label}
                      </h4>
                      <button
                        onClick={() =>
                          setSelectedCluster(
                            selectedCluster === cluster.cluster
                              ? null
                              : cluster.cluster
                          )
                        }
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        {selectedCluster === cluster.cluster
                          ? "Hide Details"
                          : "View Details"}
                      </button>
                    </div>

                    {cluster.description && (
                      <p className="text-sm text-gray-600 mb-3">
                        {cluster.description}
                      </p>
                    )}

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="font-medium">Volume:</span>
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                          {cluster.volume} items
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Sentiment:</span>
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${getSentimentColor(
                            cluster.avg_sentiment
                          )}`}
                        >
                          {getSentimentLabel(cluster.avg_sentiment)} (
                          {cluster.avg_sentiment.toFixed(2)})
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">ROI Score:</span>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getROIColor(
                            cluster.roi
                          )}`}
                        >
                          {(cluster.roi * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="text-sm font-medium text-gray-700 mb-2">
                        Keywords:
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {cluster.keywords
                          .slice(0, 5)
                          .map((keyword: string, idx: number) => (
                            <span
                              key={idx}
                              className="inline-block bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded"
                            >
                              {keyword}
                            </span>
                          ))}
                        {cluster.keywords.length > 5 && (
                          <span className="text-xs text-gray-500">
                            +{cluster.keywords.length - 5} more
                          </span>
                        )}
                      </div>
                    </div>

                    {selectedCluster === cluster.cluster && (
                      <div className="mt-4 pt-4 border-t">
                        <h5 className="font-medium text-sm mb-2">
                          Sample Feedback:
                        </h5>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {analysis.items
                            .filter((item) => item.cluster === cluster.cluster)
                            .slice(0, 3)
                            .map((item: AnalysisItem, idx: number) => (
                              <div
                                key={idx}
                                className="text-xs text-gray-600 bg-gray-50 p-2 rounded"
                              >
                                <div className="flex justify-between items-center mb-1">
                                  <span
                                    className={`px-1 py-0.5 rounded text-xs ${getSentimentColor(
                                      item.sentiment
                                    )}`}
                                  >
                                    {getSentimentLabel(item.sentiment)}
                                  </span>
                                </div>
                                <p className="text-gray-800">{item.text}</p>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>

          {/* Detailed Feedback Items */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-xl font-semibold mb-4">All Feedback Items</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {analysis.items
                .filter((item) => {
                  if (filterSentiment === "all") return true;
                  if (filterSentiment === "positive")
                    return item.sentiment > 0.1;
                  if (filterSentiment === "negative")
                    return item.sentiment < -0.1;
                  if (filterSentiment === "neutral")
                    return item.sentiment >= -0.1 && item.sentiment <= 0.1;
                  return true;
                })
                .map((item: AnalysisItem, idx: number) => (
                  <div
                    key={idx}
                    className="border-l-4 border-blue-200 pl-4 py-3 bg-gray-50 rounded-r-lg"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-600">
                          Theme:{" "}
                          {analysis.clusters.find(
                            (c) => c.cluster === item.cluster
                          )?.label || `Cluster ${item.cluster}`}
                        </span>
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${getSentimentColor(
                            item.sentiment
                          )}`}
                        >
                          {getSentimentLabel(item.sentiment)}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">#{idx + 1}</span>
                    </div>
                    <div className="text-gray-800">{item.text}</div>
                    {item.sentiment_details && (
                      <div className="mt-2 text-xs text-gray-500">
                        Confidence:{" "}
                        {(item.sentiment_details.confidence * 100).toFixed(0)}%
                        | Method: {item.sentiment_details.method}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
