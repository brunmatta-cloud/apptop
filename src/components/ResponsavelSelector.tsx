import { useState } from 'react';
import { UsersPlus, Search, X } from 'lucide-react';
import { usePeople, useCreatePerson, useGeneratePersonToken } from '@/features/repertorio/hooks-people';
import type { CreatePersonInput } from '@/types/people';
import { toast } from '@/hooks/use-toast';

interface ResponsavelSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export default function ResponsavelSelector({ value, onChange, disabled = false }: ResponsavelSelectorProps) {
  const { data: people = [], isLoading } = usePeople();
  const createMutation = useCreatePerson();
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewPersonForm, setShowNewPersonForm] = useState(false);
  const [newPersonData, setNewPersonData] = useState<CreatePersonInput>({
    name: '',
    church: '',
    phone: '',
    email: '',
    notes: '',
  });

  const filtered = people.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.church.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (personName: string) => {
    onChange(personName);
    setShowDropdown(false);
    setSearchTerm('');
  };

  const handleCreatePerson = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPersonData.name.trim() || !newPersonData.church.trim()) {
      toast({
        title: 'Erro',
        description: 'Nome e Igreja são obrigatórios',
        variant: 'destructive',
      });
      return;
    }

    try {
      await createMutation.mutateAsync(newPersonData);
      toast({
        title: 'Sucesso',
        description: 'Pessoa cadastrada com sucesso',
      });
      
      // Auto-select the newly created person
      handleSelect(newPersonData.name);
      setNewPersonData({ name: '', church: '', phone: '', email: '', notes: '' });
      setShowNewPersonForm(false);
    } catch (error: any) {
      console.error('Erro ao criar pessoa:', error);
      toast({
        title: 'Erro',
        description: error?.message || 'Falha ao cadastrar pessoa',
        variant: 'destructive',
      });
    }
  };

  const inputClass = "w-full bg-muted border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary";
  const labelClass = "text-xs text-muted-foreground font-medium mb-1 block";

  return (
    <div className="relative">
      <label className={labelClass}>Responsável</label>
      
      {showNewPersonForm ? (
        // Inline form to add new person
        <div className="glass-card p-4 rounded-lg border border-border bg-muted/40 space-y-3 mb-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">Cadastrar Nova Pessoa</h3>
            <button
              type="button"
              onClick={() => setShowNewPersonForm(false)}
              className="p-1 hover:bg-muted rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div>
            <label className={labelClass}>Nome *</label>
            <input
              type="text"
              value={newPersonData.name}
              onChange={(e) => setNewPersonData({ ...newPersonData, name: e.target.value })}
              placeholder="João Silva"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Igreja *</label>
            <input
              type="text"
              value={newPersonData.church}
              onChange={(e) => setNewPersonData({ ...newPersonData, church: e.target.value })}
              placeholder="Igreja Apostólica"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>Telefone</label>
              <input
                type="tel"
                value={newPersonData.phone || ''}
                onChange={(e) => setNewPersonData({ ...newPersonData, phone: e.target.value })}
                placeholder="(11) 9999-9999"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input
                type="email"
                value={newPersonData.email || ''}
                onChange={(e) => setNewPersonData({ ...newPersonData, email: e.target.value })}
                placeholder="joao@email.com"
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCreatePerson}
              disabled={createMutation.isPending}
              className="flex-1 px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium disabled:opacity-50"
            >
              {createMutation.isPending ? '⏳ Criando...' : '➕ Criar Pessoa'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowNewPersonForm(false);
                setNewPersonData({ name: '', church: '', phone: '', email: '', notes: '' });
              }}
              className="px-3 py-2 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 text-sm font-medium"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        // Selector dropdown
        <div className="relative">
          <div className="relative flex items-center gap-1">
            <div className="relative flex-1">
              <input
                type="text"
                value={showDropdown ? searchTerm : value}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  if (!showDropdown) setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                placeholder={showDropdown ? 'Buscar pessoa...' : 'Selecionar responsável...'}
                disabled={disabled}
                className={`${inputClass} ${showDropdown ? 'rounded-b-none' : ''}`}
              />
              {showDropdown && (
                <div className="absolute top-full left-0 right-0 border border-t-0 border-border rounded-b-md bg-card shadow-lg z-50 max-h-60 overflow-y-auto">
                  {isLoading ? (
                    <div className="p-3 text-center text-sm text-muted-foreground">
                      Carregando pessoas...
                    </div>
                  ) : filtered.length === 0 ? (
                    <div className="p-3 text-center text-sm text-muted-foreground">
                      {searchTerm ? 'Nenhuma pessoa encontrada' : 'Sem pessoas cadastradas'}
                    </div>
                  ) : (
                    filtered.map((person) => (
                      <button
                        key={person.id}
                        type="button"
                        onClick={() => handleSelect(person.name)}
                        className="w-full text-left px-4 py-2.5 hover:bg-muted/50 border-b border-border/50 last:border-b-0 transition-colors"
                      >
                        <div className="font-medium text-sm">{person.name}</div>
                        <div className="text-xs text-muted-foreground">{person.church}</div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setShowDropdown(false);
                setShowNewPersonForm(true);
                setSearchTerm('');
              }}
              disabled={disabled}
              className="p-2.5 rounded-md bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              title="Cadastrar nova pessoa"
            >
              <UsersPlus className="w-4 h-4" />
            </button>
          </div>

          {showDropdown && (
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowDropdown(false)}
            />
          )}
        </div>
      )}
    </div>
  );
}
