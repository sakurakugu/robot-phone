import { http } from '../../../shared/net/http';

export function submitFeedback(content: string) {
  return http.post<{ id: string }>('/api/v1/feedback', { content });
}
