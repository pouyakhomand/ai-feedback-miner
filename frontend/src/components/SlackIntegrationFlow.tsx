"use client";

import { useState } from "react";

interface SlackIntegrationFlowProps {
  onConnect: (data: { botToken: string; workspaceId: string }) => void;
  onCancel: () => void;
  loading: boolean;
}

export default function SlackIntegrationFlow({
  onConnect,
  onCancel,
  loading,
}: SlackIntegrationFlowProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    botToken: "",
    workspaceId: "",
  });

  const handleSubmit = () => {
    if (formData.botToken && formData.workspaceId) {
      onConnect({
        botToken: formData.botToken,
        workspaceId: formData.workspaceId,
      });
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <span className="text-2xl mr-3">💬</span>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Connect Slack Integration
            </h3>
            <p className="text-gray-600 text-sm">
              Step {step} of 3: Set up your Slack connection
            </p>
          </div>
        </div>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Step 1: Bot Token */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">
              1. Create a Slack Bot
            </h4>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h5 className="font-medium text-blue-900 mb-2">Instructions:</h5>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>
                  Go to{" "}
                  <a
                    href="https://api.slack.com/apps"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    api.slack.com/apps
                  </a>
                </li>
                <li>
                  Click &quot;Create New App&quot; → &quot;From scratch&quot;
                </li>
                <li>Name your app &quot;AI Feedback Miner&quot;</li>
                <li>Select your workspace</li>
                <li>Go to &quot;OAuth &amp; Permissions&quot;</li>
                <li>
                  Add these scopes:{" "}
                  <code className="bg-blue-100 px-1 rounded">
                    channels:read
                  </code>
                  ,{" "}
                  <code className="bg-blue-100 px-1 rounded">
                    channels:history
                  </code>
                  ,{" "}
                  <code className="bg-blue-100 px-1 rounded">groups:read</code>,{" "}
                  <code className="bg-blue-100 px-1 rounded">
                    groups:history
                  </code>
                </li>
                <li>Install app to workspace</li>
                <li>Copy the &quot;Bot User OAuth Token&quot;</li>
              </ol>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bot Token
            </label>
            <input
              type="password"
              value={formData.botToken}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, botToken: e.target.value }))
              }
              placeholder="xoxb-your-bot-token-here"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-sm text-gray-500 mt-1">
              This token starts with &quot;xoxb-&quot; and is used to
              authenticate with Slack
            </p>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => setStep(2)}
              disabled={!formData.botToken}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next Step
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Workspace ID */}
      {step === 2 && (
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">
              2. Get Workspace ID
            </h4>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h5 className="font-medium text-blue-900 mb-2">
                How to find your Workspace ID:
              </h5>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>Open Slack in your browser</li>
                <li>
                  Look at the URL:{" "}
                  <code className="bg-blue-100 px-1 rounded">
                    https://app.slack.com/client/TXXXXXXXXX/...
                  </code>
                </li>
                <li>
                  The part after{" "}
                  <code className="bg-blue-100 px-1 rounded">/client/</code> is
                  your Workspace ID
                </li>
                <li>It starts with &quot;T&quot; followed by 8-9 characters</li>
              </ol>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Workspace ID
            </label>
            <input
              type="text"
              value={formData.workspaceId}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  workspaceId: e.target.value,
                }))
              }
              placeholder="T1234567890"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-sm text-gray-500 mt-1">
              Your workspace ID starts with &quot;T&quot; and identifies your
              Slack workspace
            </p>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
              <div className="flex items-start">
                <svg
                  className="w-5 h-5 text-green-600 mr-3 mt-0.5"
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
                <div>
                  <h5 className="text-sm font-medium text-green-900">
                    Auto-Detection Enabled
                  </h5>
                  <p className="text-sm text-green-700 mt-1">
                    Once connected, the bot will automatically monitor any
                    channel it&apos;s added to. Simply invite the bot to
                    channels you want to monitor!
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setStep(1)}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
            >
              Previous
            </button>
            <button
              onClick={handleSubmit}
              disabled={!formData.workspaceId || loading}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Connecting...
                </>
              ) : (
                "Connect Slack"
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
