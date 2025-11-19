"use client";
import React, { useState } from "react";
import { useAppState } from "@/src/state/AppStateProvider";
import { logService } from "@/src/services/logService";

type ApiKeyModalProps = {
  organizationId: string;
  onSuccess: (apiKey: string) => void;
};

/**
 * ApiKeyModal component
 * Shows when no ElevenLabs API key exists for the organization
 * Allows user to enter and validate their ElevenLabs API key
 * Saves encrypted API key to database on success
 */
export function ApiKeyModal({ organizationId, onSuccess }: ApiKeyModalProps) {
  const [apiKey, setApiKey] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!apiKey.trim()) {
      setError("Please enter your ElevenLabs API key");
      return;
    }

    setIsValidating(true);
    setError(null);

    try {
      logService.info("Validating and saving ElevenLabs API key", { organizationId });

      // Step 1: Validate the API key with ElevenLabs
      const validateResponse = await fetch("/api/credentials/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: apiKey })
      });

      if (!validateResponse.ok) {
        const errorData = await validateResponse.json();
        throw new Error(errorData.error || "Invalid API key");
      }

      // Step 2: Save the encrypted API key to database
      const saveResponse = await fetch("/api/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organization_uuid: organizationId,
          provider: "elevenlabs",
          api_key: apiKey
        })
      });

      if (!saveResponse.ok) {
        const errorData = await saveResponse.json();
        throw new Error(errorData.error || "Failed to save API key");
      }

      logService.info("ElevenLabs API key validated and saved successfully");
      onSuccess(apiKey);
    } catch (err: any) {
      const errorMessage = err.message || "Failed to validate API key";
      logService.error("API key validation failed", { error: errorMessage });
      setError(errorMessage);
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            ElevenLabs API Key Required
          </h2>
          <p className="text-gray-600 text-sm">
            To use this app, you need to provide your ElevenLabs API key. Your key will be encrypted and stored securely.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="apiKey"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              ElevenLabs API Key
            </label>
            <input
              type="password"
              id="apiKey"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your ElevenLabs API key"
              disabled={isValidating}
            />
            {error && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}
          </div>

          <div className="mb-4">
            <a
              href="https://elevenlabs.io/app/settings/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-700 underline"
            >
              Get your API key from ElevenLabs
            </a>
          </div>

          <button
            type="submit"
            disabled={isValidating || !apiKey.trim()}
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold text-base shadow-md"
          >
            {isValidating ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Validating...
              </span>
            ) : (
              "Save API Key"
            )}
          </button>
        </form>

        <div className="mt-4 p-3 bg-blue-50 rounded-md">
          <p className="text-xs text-blue-800">
            <strong>Note:</strong> Your API key is encrypted using AES-256-GCM before being stored in the database. It is never exposed in plain text.
          </p>
        </div>
      </div>
    </div>
  );
}

export default ApiKeyModal;

