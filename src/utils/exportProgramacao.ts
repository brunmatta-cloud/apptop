import * as XLSX from 'xlsx';
import type { Culto, MomentoProgramacao } from '@/types/culto';
import { calcularHorarioTermino, tipoMomentoLabel } from '@/types/culto';

export function exportarProgramacao(culto: Culto, momentos: MomentoProgramacao[]) {
  const wb = XLSX.utils.book_new();

  // Header rows
  const headerData: (string | number)[][] = [
    ['PROGRAMAÇÃO DO CULTO'],
    [],
    ['Culto:', culto.nome, '', 'Data:', new Date(culto.data + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })],
    ['Horário Inicial:', culto.horarioInicial, '', 'Duração Prevista:', `${culto.duracaoPrevista} minutos`],
    [],
  ];

  // Group by bloco
  const blocos = momentos.reduce<Record<string, MomentoProgramacao[]>>((acc, m) => {
    const key = m.bloco || 'Geral';
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {});

  const tableHeader = ['#', 'Horário', 'Término', 'Duração (min)', 'Atividade', 'Responsável', 'Ministério', 'Função', 'Tipo', 'Ação Sonoplastia', 'Observação'];

  const rows: (string | number)[][] = [...headerData];

  let ordem = 1;
  for (const [bloco, items] of Object.entries(blocos)) {
    // Bloco separator
    rows.push([`▸ ${bloco.toUpperCase()}`]);
    rows.push(tableHeader);

    for (const m of items) {
      const termino = calcularHorarioTermino(m.horarioInicio, m.duracao);
      rows.push([
        ordem++,
        m.horarioInicio,
        termino,
        m.duracao,
        m.atividade,
        m.responsavel,
        m.ministerio,
        m.funcao,
        tipoMomentoLabel(m.tipoMomento),
        m.acaoSonoplastia,
        m.observacao,
      ]);
    }

    rows.push([]); // spacer
  }

  // Summary
  const totalDuracao = momentos.reduce((s, m) => s + m.duracao, 0);
  const primeiroHorario = momentos.length > 0 ? momentos[0].horarioInicio : culto.horarioInicial;
  const ultimoTermino = momentos.length > 0
    ? calcularHorarioTermino(momentos[momentos.length - 1].horarioInicio, momentos[momentos.length - 1].duracao)
    : culto.horarioInicial;

  rows.push(['RESUMO']);
  rows.push(['Total de Momentos:', momentos.length, '', 'Duração Total:', `${totalDuracao} minutos`]);
  rows.push(['Início:', primeiroHorario, '', 'Término Previsto:', ultimoTermino]);

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Column widths
  ws['!cols'] = [
    { wch: 4 },   // #
    { wch: 10 },  // Horário
    { wch: 10 },  // Término
    { wch: 14 },  // Duração
    { wch: 25 },  // Atividade
    { wch: 22 },  // Responsável
    { wch: 18 },  // Ministério
    { wch: 16 },  // Função
    { wch: 18 },  // Tipo
    { wch: 25 },  // Ação Sonoplastia
    { wch: 30 },  // Observação
  ];

  // Merge title row
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Programação');

  const nomeArquivo = `programacao-${culto.nome.replace(/\s+/g, '-').toLowerCase()}-${culto.data}.xlsx`;
  XLSX.writeFile(wb, nomeArquivo);
}
