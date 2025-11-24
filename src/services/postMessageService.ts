/**
 * PostMessage Service
 * Handles all communication between ElevenLabs iframe and parent app
 */

// Message types
export type MessageType =
  | 'INIT'
  | 'READY'
  | 'SAVE_DATA'
  | 'ERROR'
  | 'LOG'
  | 'NAVIGATE'
  | 'REQUEST_PERMISSION'
  | 'UPLOAD'
  | 'IMPORT_AUDIO'
  | 'RESIZE';

// Message structure
export interface PostMessage {
  type: MessageType;
  payload: any;
  timestamp: number;
  requestId?: string;
}

// INIT payload from parent
export interface InitPayload {
  projectId: string;
  organizationId: string;
  userId: string;
  appInstallationId: string;
  permissions: string[];
  settings: {
    apiKey?: string;
    [key: string]: any;
  };
  project: {
    uuid: string;
    name: string;
    status: string;
    content: string; // Plain text or markdown
    organization_uuid: string;
    media: MediaItem[];
    client?: {
      client_uuid: string;
      name: string;
      thumbnail?: string;
    };
  };
}

export interface MediaItem {
  media_uuid: string;
  type: 'video' | 'audio' | 'image';
  name: string;
  public_url: string;
  created_at: string;
  is_primary?: boolean | null;
  [key: string]: any;
}

// Allowed parent origins
const getAllowedOrigins = (): string[] => {
  const origins = process.env.NEXT_PUBLIC_PARENT_ORIGINS || 'http://localhost:8080';
  return origins.split(',').map(origin => origin.trim());
};

class PostMessageService {
  private listeners: Map<MessageType, ((payload: any) => void)[]> = new Map();
  private isListening: boolean = false;
  private initReceived: boolean = false;

  /**
   * Setup message listener
   * Call this once when app initializes
   */
  setupListener(onInit: (payload: InitPayload) => void): void {
    if (this.isListening) {
      console.warn('[PostMessageService] Listener already setup');
      return;
    }

    window.addEventListener('message', (event: MessageEvent) => {
      // Validate origin
      const allowedOrigins = getAllowedOrigins();
      if (!allowedOrigins.includes(event.origin)) {
        console.warn('[PostMessageService] Message from unauthorized origin:', event.origin);
        return;
      }

      const message: PostMessage = event.data;

      // Validate message structure
      if (!message || typeof message !== 'object' || !message.type) {
        console.warn('[PostMessageService] Invalid message structure:', message);
        return;
      }

      console.log(`[PostMessageService] Received message:`, message.type, message.payload);

      // Handle INIT message
      if (message.type === 'INIT' && !this.initReceived) {
        this.initReceived = true;
        onInit(message.payload as InitPayload);
      }

      // Call registered listeners
      const listeners = this.listeners.get(message.type);
      if (listeners) {
        listeners.forEach(callback => callback(message.payload));
      }
    });

    this.isListening = true;
    console.log('[PostMessageService] Listening for messages from:', getAllowedOrigins());
  }

  /**
   * Register a listener for a specific message type
   */
  on(type: MessageType, callback: (payload: any) => void): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type)!.push(callback);
  }

  /**
   * Send READY message to parent
   */
  sendReady(features: string[] = []): void {
    this.sendMessage('READY', {
      appVersion: '1.0.0',
      features: [...features, 'text-to-speech', 'audio-generation', 'audio-history']
    });
    console.log('[PostMessageService] Sent READY message');
  }

  /**
   * Save data to parent app
   * Used to persist app settings and job data
   */
  saveData(settings: object, merge: boolean = true, requestId?: string): void {
    this.sendMessage('SAVE_DATA', {
      settings,
      merge
    }, requestId);
    console.log('[PostMessageService] Sent SAVE_DATA message');
  }

  /**
   * Report error to parent app
   */
  reportError(error: Error | string): void {
    const errorData = typeof error === 'string'
      ? { message: error, code: 'ELEVENLABS_ERROR' }
      : {
          message: error.message,
          code: error.name || 'ELEVENLABS_ERROR',
          stack: error.stack
        };

    this.sendMessage('ERROR', errorData);
    console.error('[PostMessageService] Reported error:', errorData);
  }

  /**
   * Send log message to parent app
   */
  sendLog(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: any): void {
    this.sendMessage('LOG', {
      level,
      message,
      data
    });
  }

  /**
   * Request navigation to external URL
   */
  navigate(url: string, external: boolean = true): void {
    this.sendMessage('NAVIGATE', {
      url,
      external
    });
    console.log('[PostMessageService] Requested navigation to:', url);
  }

  /**
   * Request permission from parent
   */
  requestPermission(permission: string, reason: string): string {
    const requestId = this.generateRequestId();
    this.sendMessage('REQUEST_PERMISSION', {
      permission,
      reason
    }, requestId);
    console.log('[PostMessageService] Requested permission:', permission);
    return requestId;
  }

  /**
   * Upload audio to parent's project media
   */
  uploadToProject(audioData: {
    url: string;
    name: string;
    metadata: any;
  }): string {
    const requestId = this.generateRequestId();
    this.sendMessage('UPLOAD', audioData, requestId);
    console.log('[PostMessageService] Requested audio upload to project:', audioData.name);
    return requestId;
  }

  /**
   * Send IMPORT_AUDIO event to parent app with audio details
   */
  importAudio(audioData: {
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
  }): string {
    const requestId = this.generateRequestId();
    this.sendMessage('IMPORT_AUDIO', audioData, requestId);
    console.log('[PostMessageService] Sent IMPORT_AUDIO event:', audioData.name);
    return requestId;
  }

  /**
   * Request iframe resize
   */
  resize(height: number): void {
    this.sendMessage('RESIZE', { height });
  }

  /**
   * Send message to parent window
   */
  private sendMessage(type: MessageType, payload: any, requestId?: string): void {
    const message: PostMessage = {
      type,
      payload,
      timestamp: Date.now(),
      ...(requestId && { requestId })
    };

    window.parent.postMessage(message, '*');
  }

  /**
   * Generate unique request ID
   */
  generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }

  /**
   * Check if INIT has been received
   */
  isInitialized(): boolean {
    return this.initReceived;
  }
}

// Export singleton instance
export const postMessageService = new PostMessageService();

