"use client";

import { useState, useEffect } from "react";
import SlackIntegrationFlow from "./SlackIntegrationFlow";

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: string;
  status: "connected" | "available" | "coming_soon";
  connectedAt?: string;
  channels?: string[];
  lastSync?: string;
}

interface SlackIntegration {
  id: string;
  type: string;
  name: string;
  status: string;
  channels: string[];
  lastSync: string;
}

const integrations: Integration[] = [
  {
    id: "slack",
    name: "Slack",
    description: "Connect Slack channels to automatically collect feedback",
    icon: "💬",
    status: "available",
  },
  {
    id: "zendesk",
    name: "Zendesk",
    description: "Import support tickets and customer feedback",
    icon: "🎫",
    status: "coming_soon",
  },
  {
    id: "productboard",
    name: "Productboard",
    description: "Sync feedback with your product roadmap",
    icon: "📋",
    status: "coming_soon",
  },
  {
    id: "jira",
    name: "Jira",
    description: "Connect with development workflow",
    icon: "🔧",
    status: "coming_soon",
  },
  {
    id: "hubspot",
    name: "HubSpot",
    description: "Import customer feedback from HubSpot",
    icon: "🎯",
    status: "coming_soon",
  },
];

// Get API URL from environment variable
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function IntegrationsPage() {
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(
    null
  );
  const [integrationsData, setIntegrationsData] =
    useState<Integration[]>(integrations);
  const [slackIntegration, setSlackIntegration] =
    useState<SlackIntegration | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load integrations on component mount
  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    try {
      const response = await fetch(`${API_URL}/integrations`);
      if (response.ok) {
        const data = await response.json();
        const slackIntegration = data.find(
          (int: SlackIntegration) => int.type === "slack"
        );

        if (slackIntegration) {
          setSlackIntegration(slackIntegration);
          setIntegrationsData((prev) =>
            prev.map((int) =>
              int.id === "slack"
                ? {
                    ...int,
                    status: "connected",
                    channels: slackIntegration.channels,
                    lastSync: slackIntegration.lastSync,
                  }
                : int
            )
          );
        }
      }
    } catch (error) {
      console.error("Failed to load integrations:", error);
    }
  };

  const handleSlackConnect = async (formData: {
    botToken: string;
    channels: string[];
    workspaceId: string;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/integrations/slack/connect`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to connect Slack");
      }

      const result = await response.json();
      setSlackIntegration(result.integration);
      setIntegrationsData((prev) =>
        prev.map((int) =>
          int.id === "slack"
            ? {
                ...int,
                status: "connected",
                channels: result.integration.channels,
                lastSync: result.integration.lastSync,
              }
            : int
        )
      );
      setSelectedIntegration(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect Slack");
    } finally {
      setLoading(false);
    }
  };

  const handleSlackDisconnect = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/integrations/slack/disconnect`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to disconnect Slack");
      }

      setSlackIntegration(null);
      setIntegrationsData((prev) =>
        prev.map((int) =>
          int.id === "slack"
            ? {
                ...int,
                status: "available",
                channels: undefined,
                lastSync: undefined,
              }
            : int
        )
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to disconnect Slack"
      );
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "connected":
        return "bg-green-100 text-green-800";
      case "available":
        return "bg-blue-100 text-blue-800";
      case "coming_soon":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "connected":
        return "Connected";
      case "available":
        return "Available";
      case "coming_soon":
        return "Coming Soon";
      default:
        return "Unknown";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Integrations</h1>
        <p className="text-gray-600">
          Connect your tools to automatically collect and analyze feedback
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-800">{error}</div>
        </div>
      )}

      {/* Slack Integration Flow */}
      {selectedIntegration === "slack" && (
        <SlackIntegrationFlow
          onConnect={handleSlackConnect}
          onCancel={() => setSelectedIntegration(null)}
          loading={loading}
        />
      )}

      {/* Connected Integrations Status */}
      {slackIntegration && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-2xl mr-3">💬</span>
              <div>
                <h3 className="text-sm font-medium text-green-900">
                  Slack Connected Successfully
                </h3>
                <p className="text-sm text-green-700">
                  Monitoring {slackIntegration.channels?.length || 0} channels
                  {slackIntegration.lastSync && (
                    <span>
                      {" "}
                      • Last sync:{" "}
                      {new Date(slackIntegration.lastSync).toLocaleString()}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={handleSlackDisconnect}
              disabled={loading}
              className="text-red-600 hover:text-red-800 text-sm font-medium disabled:opacity-50"
            >
              Disconnect
            </button>
          </div>
        </div>
      )}

      {/* Integration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {integrationsData.map((integration) => (
          <div
            key={integration.id}
            className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 transition-all ${
              integration.status === "coming_soon"
                ? "opacity-75 cursor-not-allowed"
                : "hover:shadow-md cursor-pointer"
            }`}
            onClick={() => {
              if (integration.status === "available") {
                setSelectedIntegration(integration.id);
              } else if (
                integration.status === "connected" &&
                integration.id === "slack"
              ) {
                // Show connected status or allow disconnect
                return;
              }
            }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="text-3xl">{integration.icon}</div>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                  integration.status
                )}`}
              >
                {getStatusText(integration.status)}
              </span>
            </div>

            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {integration.name}
            </h3>

            <p className="text-gray-600 text-sm mb-4">
              {integration.description}
            </p>

            {integration.status === "connected" && integration.connectedAt && (
              <div className="text-xs text-gray-500 mb-4">
                Connected on{" "}
                {new Date(integration.connectedAt).toLocaleDateString()}
              </div>
            )}

            <div className="flex items-center justify-between">
              {integration.status === "connected" ? (
                <div className="text-sm text-green-600 font-medium">
                  ✓ Connected
                </div>
              ) : integration.status === "available" ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedIntegration(integration.id);
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm font-medium"
                >
                  Connect
                </button>
              ) : (
                <span className="text-gray-400 text-sm">Coming Soon</span>
              )}

              <svg
                className="w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </div>
        ))}
      </div>

      {/* Slack Preview */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <span className="text-2xl mr-3">💬</span>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Slack Integration Preview
            </h3>
            <p className="text-gray-600 text-sm">
              First integration coming soon
            </p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <h4 className="font-medium text-gray-900 mb-2">How it will work:</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Connect specific Slack channels</li>
            <li>• Automatically ingest messages as feedback</li>
            <li>• Real-time clustering and sentiment analysis</li>
            <li>• Export insights back to Slack</li>
          </ul>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">Expected release: Q1 2024</div>
          <button
            disabled
            className="bg-gray-300 text-gray-500 px-4 py-2 rounded-md cursor-not-allowed text-sm font-medium"
          >
            Coming Soon
          </button>
        </div>
      </div>

      {/* Manual Upload Option */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <span className="text-2xl mr-3">📁</span>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Manual Upload
            </h3>
            <p className="text-gray-600 text-sm">
              Upload CSV files while integrations are being developed
            </p>
          </div>
        </div>

        <p className="text-gray-600 text-sm mb-4">
          For now, you can manually upload CSV files with your feedback data.
          Once integrations are available, you&apos;ll be able to connect your
          tools for automatic data collection.
        </p>

        <a
          href="/analysis"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
        >
          Upload CSV File
          <svg
            className="w-4 h-4 ml-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </a>
      </div>
    </div>
  );
}
