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
    navigate,
    requestPermission
  };
}

export default useParentCommunication;

