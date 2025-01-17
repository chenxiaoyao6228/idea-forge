export interface AIProviderConfig {
  id: string;
  name: string;
  apiKey: string;
  model: string;
  baseURL?: string;
  isActive: boolean;
  priority: number;
}

export interface StreamResponse {
  id: string;
  content: string;
  provider: string;
}
