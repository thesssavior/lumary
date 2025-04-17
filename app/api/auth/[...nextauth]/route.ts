import { handlers } from '@/auth';

// Re-export NextAuth handlers (GET/POST) defined in auth.ts
export const { GET, POST } = handlers;