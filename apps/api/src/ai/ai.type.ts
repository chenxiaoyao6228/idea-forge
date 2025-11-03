export interface AIProviderConfig {
  id: string;
  name: string;
  apiKey: string;
  baseURL: string;
  model: string;
  isActive: boolean;
  priority: number;
}
