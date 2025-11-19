"use client";
import React, { useEffect, useState } from "react";
import { useAppState } from "@/src/state/AppStateProvider";
import { postMessageService } from "@/src/services/postMessageService";
import { logService } from "@/src/services/logService";
import LoadingScreen from "./LoadingScreen";
import ApiKeyModal from "./ApiKeyModal";
import AppRoot from "./AppRoot";

// Component to handle iframe auto-resizing
export function IframeResizer() {
  useEffect(() => {
    const isStandalone = window.self === window.top;
    if (isStandalone) return; // Don't resize if not in iframe

    const resizeObserver = new ResizeObserver(() => {
      const height = document.documentElement.scrollHeight;
      postMessageService.resize(height);
    });

    resizeObserver.observe(document.body);

    // Also resize on window load and after delays
    const handleResize = () => {
      const height = document.documentElement.scrollHeight;
      postMessageService.resize(height);
    };

    window.addEventListener('load', handleResize);
    setTimeout(handleResize, 100);
    setTimeout(handleResize, 500);
    setTimeout(handleResize, 1000);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('load', handleResize);
    };
  }, []);

  return null;
}

/**
 * AppInitializer component
 * Orchestrates the app initialization flow:
 * 1. Listen for INIT message from parent
 * 2. Sync organization to Supabase DB
 * 3. Check if API key exists
 * 4. Show ApiKeyModal if no key exists
 * 5. Fetch decrypted key if exists
 * 6. Render AppRoot when ready
 */
export function AppInitializer() {
  const {
    setParentData,
    setProjectContent,
    setProjectAudio,
    setIsInitialized,
    setApiKey,
    setHasApiKey,
    isInitialized,
    parentData
  } = useAppState();

  const [error, setError] = useState<string | null>(null);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [isCheckingApiKey, setIsCheckingApiKey] = useState(false);

  // Step 1: Send READY message immediately when app loads
  useEffect(() => {
    // Send READY message to let parent know iframe is loaded and listening
    postMessageService.sendReady([
      "text-to-speech",
      "audio-generation",
      "audio-history",
      "project-content-integration",
      "project-audio-integration"
    ]);
    logService.info("Sent READY message to parent app");
  }, []); // Empty deps - only run once on mount

  // Step 2: Listen for INIT message from parent
  useEffect(() => {
    // Check if running standalone (not in iframe)
    const isStandalone = window.self === window.top;

    if (isStandalone) {
      // Running standalone - skip INIT message requirement
      logService.info("Running in standalone mode, skipping INIT message requirement");
      
      // Set default parent data for standalone mode
      setParentData({
        projectId: "standalone-project",
        organizationId: "5ec92adf-57cb-4d08-817a-f523cc308cda", //ONLY TESTING
        userId: "standalone-user",
        appInstallationId: "standalone-installation",
        permissions: []
      });
      
      setIsInitialized(true);
      return;
    }


    //Running in iframe - require INIT message
    const initTimeout = setTimeout(() => {
      if (!isInitialized && !isStandalone) {
        const errorMsg = "Timeout: No INIT message received from parent app";
        logService.error(errorMsg);
        setError(errorMsg);
      }
    }, 10000); // 10 second timeout

    postMessageService.setupListener((payload) => {
      clearTimeout(initTimeout);
      logService.info("INIT message received from parent", payload);

      // Store parent data
      setParentData({
        projectId: payload.projectId,
        organizationId: payload.organizationId,
        userId: payload.userId,
        appInstallationId: payload.appInstallationId,
        permissions: payload.permissions || []
      });

      // Store project content (plain text or markdown)
      if (payload.project?.content) {
        // Convert HTML to plain text if needed
        const content = payload.project.content;
        setProjectContent(content);
        logService.debug("Project content loaded", {
          length: content.length
        });
      }

      // Store project audio files
      if (payload.project?.media) {
        const audioFiles = payload.project.media.filter(
          (m: any) => m.type === "audio"
        );
        setProjectAudio(audioFiles);
        logService.debug("Project audio files loaded", {
          count: audioFiles.length
        });
      }

      setIsInitialized(true);
    });

    return () => {
      clearTimeout(initTimeout);
    };
  }, [
    isInitialized,
    setParentData,
    setProjectContent,
    setProjectAudio,
    setIsInitialized
  ]);

  // Step 2-5: Once initialized, sync org and check for API key
  useEffect(() => {
    if (!isInitialized || !parentData) return;

    const initializeApp = async () => {
      setIsCheckingApiKey(true);

      try {
        // Check if running standalone
        const isStandalone = window.self === window.top;
        
        if (!isStandalone) {
          // Step 2: Sync organization to Supabase DB (only in iframe mode)
          logService.info("Syncing organization", {
            organizationId: parentData.organizationId
          });

          const syncResponse = await fetch("/api/organizations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              organization_uuid: parentData.organizationId,
              name: `Organization ${parentData.organizationId}`
            })
          });

          if (!syncResponse.ok) {
            throw new Error("Failed to sync organization");
          }

          logService.info("Organization synced successfully");
        } else {
          logService.info("Standalone mode: skipping organization sync");
        }

        // Step 3: Check if API key exists
        logService.info("Checking for existing API key");

        const checkResponse = await fetch(
          `/api/credentials?org_uuid=${parentData.organizationId}&provider=elevenlabs`
        );

        if (!checkResponse.ok) {
          // In standalone mode, it's OK if the API check fails - just show the modal
          if (isStandalone) {
            logService.info("Standalone mode: API key check failed, showing modal");
            setHasApiKey(false);
            setShowApiKeyModal(true);
            setIsCheckingApiKey(false);
            return;
          }
          throw new Error("Failed to check API key status");
        }

        const { exists } = await checkResponse.json();
        setHasApiKey(exists);

        if (!exists) {
          // Step 4: Show ApiKeyModal if no key exists
          logService.info("No API key found, showing modal");
          setShowApiKeyModal(true);
        } else {
          // Step 5: Fetch decrypted key if exists
          logService.info("API key exists, fetching decrypted key");

          const decryptResponse = await fetch("/api/credentials/decrypt", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              organization_uuid: parentData.organizationId,
              provider: "elevenlabs"
            })
          });

          if (!decryptResponse.ok) {
            // If decryption fails, show modal to re-enter key
            logService.warn("Failed to decrypt API key, requesting new one");
            setShowApiKeyModal(true);
          } else {
            const { api_key } = await decryptResponse.json();
            setApiKey(api_key);
            logService.info("API key loaded successfully");
          }
        }
      } catch (err: any) {
        const errorMsg = err.message || "Failed to initialize app";
        logService.error("Initialization error", { error: errorMsg });
        // In standalone mode, don't show error - just show API key modal
        const isStandalone = window.self === window.top;
        if (isStandalone) {
          logService.info("Standalone mode: showing API key modal after error");
          setHasApiKey(false);
          setShowApiKeyModal(true);
        } else {
          setError(errorMsg);
        }
      } finally {
        setIsCheckingApiKey(false);
      }
    };

    initializeApp();
  }, [isInitialized, parentData, setHasApiKey, setApiKey]);

  // Handle API key submission from modal
  const handleApiKeySuccess = (apiKey: string) => {
    setApiKey(apiKey);
    setHasApiKey(true);
    setShowApiKeyModal(false);
    logService.info("API key set successfully from modal");
  };

  // Render loading screen if not initialized or checking API key
  if (error) {
    return <LoadingScreen error={error} />;
  }

  if (!isInitialized || isCheckingApiKey) {
    return <LoadingScreen />;
  }

  // Show API key modal if needed
  if (showApiKeyModal && parentData) {
    return (
      <ApiKeyModal
        organizationId={parentData.organizationId}
        onSuccess={handleApiKeySuccess}
      />
    );
  }

  // Step 6: Render main app when ready
  return <AppRoot />;
}

export default AppInitializer;

