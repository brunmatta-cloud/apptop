/**
 * Tipos de domínio para gestão de pessoas e equipes
 */

export type Person = {
  id: string;
  name: string;
  church: string;
  phone?: string;
  email?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
};

export type PersonAccessToken = {
  id: string;
  person_id: string;
  token: string;
  created_at: string;
  expires_at?: string;
  is_active: boolean;
};

export type CreatePersonInput = Omit<Person, 'id' | 'created_at' | 'updated_at'>;
export type UpdatePersonInput = Partial<CreatePersonInput>;

export const generateSecureToken = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
};
