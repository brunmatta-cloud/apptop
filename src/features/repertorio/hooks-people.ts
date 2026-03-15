import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Person, CreatePersonInput, UpdatePersonInput, PersonAccessToken } from '@/types/people';
import { generateSecureToken } from '@/types/people';

const PEOPLE_QUERY_KEY = ['people'];
const PERSON_TOKENS_QUERY_KEY = ['person-tokens'];

/**
 * Hook para listar todas as pessoas
 */
export function usePeople() {
  return useQuery<Person[]>({
    queryKey: PEOPLE_QUERY_KEY,
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('people')
          .select('*')
          .order('name', { ascending: true });

        if (error) {
          console.error('Erro ao buscar pessoas:', error);
          return [];
        }
        return data || [];
      } catch (err) {
        console.error('Erro na requisição de pessoas:', err);
        return [];
      }
    },
  });
}

/**
 * Hook para obter uma pessoa específica
 */
export function usePerson(personId: string | null) {
  return useQuery<Person | null>({
    queryKey: ['person', personId],
    queryFn: async () => {
      if (!personId) return null;

      try {
        const { data, error } = await supabase
          .from('people')
          .select('*')
          .eq('id', personId)
          .single();

        if (error) {
          console.error('Erro ao buscar pessoa:', error);
          return null;
        }
        return data;
      } catch (err) {
        console.error('Erro na requisição de pessoa:', err);
        return null;
      }
    },
    enabled: !!personId,
  });
}

/**
 * Hook para criar uma nova pessoa
 */
export function useCreatePerson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePersonInput) => {
      try {
        const { data, error } = await supabase
          .from('people')
          .insert([input])
          .select()
          .single();

        if (error) throw error;
        return data as Person;
      } catch (err) {
        console.error('Erro ao criar pessoa:', err);
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PEOPLE_QUERY_KEY });
    },
  });
}

/**
 * Hook para atualizar uma pessoa
 */
export function useUpdatePerson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdatePersonInput & { id: string }) => {
      try {
        const { data, error } = await supabase
          .from('people')
          .update(input)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        return data as Person;
      } catch (err) {
        console.error('Erro ao atualizar pessoa:', err);
        throw err;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: PEOPLE_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['person', data.id] });
    },
  });
}

/**
 * Hook para deletar uma pessoa
 */
export function useDeletePerson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (personId: string) => {
      try {
        const { error } = await supabase
          .from('people')
          .delete()
          .eq('id', personId);

        if (error) throw error;
      } catch (err) {
        console.error('Erro ao deletar pessoa:', err);
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PEOPLE_QUERY_KEY });
    },
  });
}

/**
 * Hook para gerar token de acesso para uma pessoa
 */
export function useGeneratePersonToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (personId: string) => {
      try {
        const token = generateSecureToken();

        const { data, error } = await supabase
          .from('person_access_tokens')
          .insert([
            {
              person_id: personId,
              token,
              is_active: true,
            },
          ])
          .select()
          .single();

        if (error) throw error;
        return data as PersonAccessToken;
      } catch (err) {
        console.error('Erro ao gerar token:', err);
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PERSON_TOKENS_QUERY_KEY });
    },
  });
}

/**
 * Hook para obter tokens de uma pessoa
 */
export function usePersonTokens(personId: string | null) {
  return useQuery<PersonAccessToken[]>({
    queryKey: [...PERSON_TOKENS_QUERY_KEY, personId],
    queryFn: async () => {
      if (!personId) return [];

      try {
        const { data, error } = await supabase
          .from('person_access_tokens')
          .select('*')
          .eq('person_id', personId)
          .eq('is_active', true);

        if (error) {
          console.error('Erro ao buscar tokens:', error);
          return [];
        }
        return data || [];
      } catch (err) {
        console.error('Erro na requisição de tokens:', err);
        return [];
      }
    },
    enabled: !!personId,
  });
}

/**
 * Hook para validar e obter pessoa por token
 */
export function usePersonByToken(token: string | null) {
  return useQuery<Person | null>({
    queryKey: ['person-by-token', token],
    queryFn: async () => {
      if (!token) return null;

      try {
        // Validar token usando RPC
        const { data, error } = await supabase.rpc('get_person_by_token', {
          token_param: token,
        });

        if (error) {
          console.error('Erro ao validar token:', error);
          return null;
        }

        if (!data || data.length === 0) {
          return null;
        }

        const person = data[0];
        return {
          id: person.person_id,
          name: person.person_name,
          church: person.person_church,
          phone: person.person_phone,
          email: person.person_email,
          notes: '',
          created_at: '',
          updated_at: '',
        } as Person;
      } catch (err) {
        console.error('Erro na validação de token:', err);
        return null;
      }
    },
    enabled: !!token,
  });
}

/**
 * Hook para obter momentos de uma pessoa por token
 */
export function useMomentsForPersonToken(token: string | null) {
  const personQuery = usePersonByToken(token);

  return useQuery({
    queryKey: ['moments-for-token', token, personQuery.data?.id],
    queryFn: async () => {
      if (!personQuery.data?.id) return [];

      try {
        const { data, error } = await supabase.rpc('get_moments_for_person', {
          person_id_param: personQuery.data.id,
        });

        if (error) {
          console.error('Erro ao buscar momentos:', error);
          return [];
        }

        return data || [];
      } catch (err) {
        console.error('Erro na requisição de momentos:', err);
        return [];
      }
    },
    enabled: !!personQuery.data?.id,
  });
}
