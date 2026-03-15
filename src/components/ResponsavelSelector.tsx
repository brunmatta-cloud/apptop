import { useState } from 'react';
import { UsersPlus, X, Settings, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePeople, useCreatePerson } from '@/features/repertorio/hooks-people';
import type { CreatePersonInput } from '@/types/people';
import { toast } from '@/hooks/use-toast';

interface ResponsavelSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export default function ResponsavelSelector({ value, onChange, disabled = false }: ResponsavelSelectorProps) {
  const navigate = useNavigate();
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
  
  const selectedPerson = people.find(p => p.name === value);
  const hasPeople = people.length > 0;

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-2">
        <div className="flex-1">
          <label className={labelClass}>👤 Responsável pelo Momento</label>
          <p className="text-xs text-muted-foreground">Selecione quem será responsável por este momento</p>
        </div>
        {hasPeople && (
          <button
            type="button"
            onClick={() => navigate('/configuracoes?tab=pessoas')}
            disabled={disabled}
            className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 px-2 py-1 rounded hover:bg-muted/50 transition-colors whitespace-nowrap ml-2"
            title="Gerenciar cadastro de pessoas"
          >
            <Settings className="w-3 h-3" />
            Gerenciar
          </button>
        )}
      </div>
      
      {showNewPersonForm ? (
        // Inline form to add new person
        <div className="glass-card p-4 rounded-lg border-2 border-primary/30 bg-primary/5 space-y-3 mb-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <UsersPlus className="w-4 h-4 text-primary" />
              Cadastrar Nova Pessoa
            </h3>
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
              className="flex-1 px-3 py-2 rounded-lg bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:from-primary/90 hover:to-primary/70 text-sm font-medium disabled:opacity-50 transition-all"
            >
              {createMutation.isPending ? '⏳ Criando...' : '✅ Criar Pessoa'}
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
        <div className="relative space-y-2">
          {/* Selected person display */}
          {selectedPerson && (
            <div className="glass-card p-3 rounded-lg border-2 border-primary/40 bg-gradient-to-r from-primary/5 to-primary/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-foreground">{selectedPerson.name}</div>
                    <div className="text-xs text-muted-foreground">{selectedPerson.church}</div>
                    {selectedPerson.phone && (
                      <div className="text-xs text-muted-foreground">{selectedPerson.phone}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground">Status</div>
                    <div className="text-xs font-semibold text-green-600 flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      Selecionado
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onChange('');
                      setShowDropdown(false);
                      setSearchTerm('');
                    }}
                    className="p-2 hover:bg-primary/20 rounded-lg text-primary transition-colors"
                    title="Limpar seleção"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
          
          <div className="relative flex items-center gap-1">
            <div className="relative flex-1">
              <input
                type="text"
                value={showDropdown ? searchTerm : ''}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  if (!showDropdown) setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                placeholder={value ? 'Buscar outro responsável...' : 'Buscar pessoa cadastrada...'}
                disabled={disabled}
                className={`${inputClass} ${showDropdown ? 'rounded-b-none' : ''}`}
              />
              {showDropdown && (
                <div className="absolute top-full left-0 right-0 border border-t-0 border-border rounded-b-md bg-card shadow-lg z-50 max-h-60 overflow-y-auto">
                  {isLoading ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      Carregando pessoas...
                    </div>
                  ) : !hasPeople ? (
                    // Sem pessoas cadastradas
                    <div className="p-4 space-y-3">
                      <div className="text-center">
                        <div className="text-sm font-semibold text-foreground mb-1">📋 Nenhuma pessoa cadastrada</div>
                        <div className="text-xs text-muted-foreground mb-3">Cadastre uma pessoa para atribuir responsabilidades</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setShowDropdown(false);
                          setShowNewPersonForm(true);
                          setSearchTerm('');
                        }}
                        className="w-full px-3 py-2 rounded-md bg-gradient-to-r from-primary/20 to-primary/10 hover:from-primary/30 hover:to-primary/20 text-primary text-sm font-medium flex items-center justify-center gap-2 transition-all border border-primary/30"
                      >
                        <UsersPlus className="w-4 h-4" />
                        Cadastrar Primeira Pessoa
                      </button>
                    </div>
                  ) : filtered.length === 0 ? (
                    <div className="p-4 space-y-2">
                      <div className="text-center text-sm text-muted-foreground">
                        Nenhuma pessoa encontrada
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setShowDropdown(false);
                          setShowNewPersonForm(true);
                          setSearchTerm('');
                        }}
                        className="w-full px-3 py-2 rounded-md bg-primary/10 text-primary hover:bg-primary/20 text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                      >
                        <UsersPlus className="w-4 h-4" />
                        Cadastrar Nova Pessoa
                      </button>
                    </div>
                  ) : (
                    <>
                      {filtered.map((person) => (
                        <button
                          key={person.id}
                          type="button"
                          onClick={() => handleSelect(person.name)}
                          className="w-full text-left px-4 py-2.5 hover:bg-primary/10 border-b border-border/50 last:border-b-0 transition-colors group"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                              <User className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                            </div>
                            <div>
                              <div className="font-medium text-sm">{person.name}</div>
                              <div className="text-xs text-muted-foreground">{person.church}</div>
                            </div>
                          </div>
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          setShowDropdown(false);
                          setShowNewPersonForm(true);
                          setSearchTerm('');
                        }}
                        className="w-full text-left px-4 py-2.5 hover:bg-muted/50 border-t border-border/50 transition-colors text-primary hover:text-primary/80 text-sm font-medium flex items-center gap-2"
                      >
                        <UsersPlus className="w-4 h-4" />
                        Cadastrar Nova Pessoa
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
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
