import { postMessageService } from "@/src/services/postMessageService";
import { logService } from "@/src/services/logService";

/**
 * Hook for communicating with parent app via postMessage
 */
export function useParentCommunication() {
  const saveData = (settings: object, merge: boolean = true) => {
    postMessageService.saveData(settings, merge);
  };

  const reportError = (error: Error | string) => {
    postMessageService.reportError(error);
  };

  const log = (level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: any) => {
    logService.log(level, message, data);
  };

  const uploadToProject = (audioData: { url: string; name: string; metadata: any }) => {
    return postMessageService.uploadToProject(audioData);
  };

  const importAudio = (audioData: {
    url: string;
    name: string;
    duration?: number;
    voiceId: string;
    voiceName?: string;
    modelId: string;
    text: string;
    settings: {
      stability: number;
      similarity_boost: number;
      style: number;
      use_speaker_boost: boolean;
    };
  }) => {
    return postMessageService.importAudio(audioData);
  };

  const navigate = (url: string, external: boolean = true) => {
    postMessageService.navigate(url, external);
  };

  const requestPermission = (permission: string, reason: string) => {
    return postMessageService.requestPermission(permission, reason);
  };

  return {
    saveData,
    reportError,
    log,
    uploadToProject,
    importAudio,
    navigate,
    requestPermission
  };
}

export default useParentCommunication;

