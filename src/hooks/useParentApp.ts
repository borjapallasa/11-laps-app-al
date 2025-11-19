import { useAppState } from "@/src/state/AppStateProvider";

/**
 * Hook to access parent app data
 */
export function useParentApp() {
  const { parentData, projectContent, projectAudio } = useAppState();

  return {
    parentData,
    projectContent,
    projectAudio,
    organizationId: parentData?.organizationId,
    projectId: parentData?.projectId,
    userId: parentData?.userId,
  };
}

export default useParentApp;

