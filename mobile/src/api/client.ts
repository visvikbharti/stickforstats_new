/**
 * StickForStats Mobile API Client
 * Wraps axios for communication with the backend.
 */

import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = __DEV__
  ? 'http://localhost:8000/api/v1'
  : 'https://api.stickforstats.com/api/v1';

class APIClient {
  private client: AxiosInstance;
  private apiKey: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'StickForStats-Mobile/2.0.0',
      },
    });

    // Request interceptor for auth
    this.client.interceptors.request.use(async (config) => {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Token ${token}`;
      }
      if (this.apiKey) {
        config.headers['X-API-Key'] = this.apiKey;
      }
      return config;
    });
  }

  setApiKey(key: string) {
    this.apiKey = key;
  }

  // Auth
  async login(username: string, password: string) {
    const response = await this.client.post('/auth/login/', { username, password });
    if (response.data.token) {
      await AsyncStorage.setItem('auth_token', response.data.token);
    }
    return response.data;
  }

  async logout() {
    await AsyncStorage.removeItem('auth_token');
  }

  // Health
  async healthCheck() {
    const response = await this.client.get('/health/');
    return response.data;
  }

  // Statistical Tests
  async runTTest(data: { group1: number[]; group2: number[]; test_type?: string }) {
    const response = await this.client.post('/stats/ttest/', data);
    return response.data;
  }

  async runANOVA(data: { groups: number[][]; alpha?: number }) {
    const response = await this.client.post('/stats/anova/', data);
    return response.data;
  }

  async runCorrelation(data: { x: number[]; y: number[]; method?: string }) {
    const response = await this.client.post('/stats/correlation/', data);
    return response.data;
  }

  async runDescriptive(data: { values: number[] }) {
    const response = await this.client.post('/stats/descriptive/', data);
    return response.data;
  }

  // Smart Analysis
  async smartProfile(formData: FormData) {
    const response = await this.client.post('/autonomous/profile/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  async autonomousQuery(query: string, dataId?: string) {
    const response = await this.client.post('/autonomous/query/', {
      query,
      data_id: dataId,
    });
    return response.data;
  }

  // Guardian
  async guardianCheck(testType: string, dataSummary: object) {
    const response = await this.client.post('/guardian/check/', {
      test_type: testType,
      data_summary: dataSummary,
    });
    return response.data;
  }

  // SQS
  async analyzePaper(formData: FormData) {
    const response = await this.client.post('/sqs/analyze/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    });
    return response.data;
  }

  // Certification
  async getCertificationLevels() {
    const response = await this.client.get('/certification/levels/');
    return response.data;
  }

  async startExam(levelId: string) {
    const response = await this.client.post('/certification/exam/start/', {
      level_id: levelId,
    });
    return response.data;
  }

  async submitExam(levelId: string, answers: Record<string, number>) {
    const response = await this.client.post('/certification/exam/submit/', {
      level_id: levelId,
      answers,
    });
    return response.data;
  }
}

export const apiClient = new APIClient();
export default apiClient;
