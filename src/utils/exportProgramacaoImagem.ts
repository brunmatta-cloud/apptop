import type { Culto, MomentoProgramacao } from '@/types/culto';
import { calcularHorarioTermino, tipoMomentoLabel } from '@/types/culto';

const COLORS = {
  bg: '#0f172a',
  bgCard: '#1e293b',
  bgCardAlt: '#162032',
  bgHeader: '#0ea5e9',
  bgHeaderDark: '#0284c7',
  bgAccent: '#8b5cf6',
  text: '#f8fafc',
  textMuted: '#94a3b8',
  textDim: '#64748b',
  border: '#334155',
  white: '#ffffff',
  green: '#10b981',
  amber: '#f59e0b',
  pink: '#ec4899',
};

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 0 && ctx.measureText(t + '…').width > maxWidth) {
    t = t.slice(0, -1);
  }
  return t + '…';
}

export function exportarProgramacaoImagem(culto: Culto, momentos: MomentoProgramacao[]) {
  const W = 1200;
  const PAD = 48;
  const CONTENT_W = W - PAD * 2;

  // Group by bloco
  const blocos = momentos.reduce<Record<string, MomentoProgramacao[]>>((acc, m) => {
    const key = m.bloco || 'Geral';
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {});

  // Calculate height
  const HEADER_H = 220;
  const BLOCO_HEADER_H = 56;
  const ROW_H = 72;
  const SUMMARY_H = 140;
  const FOOTER_H = 60;
  let totalRows = 0;
  const blocoEntries = Object.entries(blocos);
  blocoEntries.forEach(([, items]) => { totalRows += items.length; });
  const H = HEADER_H + (blocoEntries.length * BLOCO_HEADER_H) + (totalRows * ROW_H) + (blocoEntries.length * 24) + SUMMARY_H + FOOTER_H + PAD * 2;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Background
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, W, H);

  // Subtle grid pattern
  ctx.strokeStyle = COLORS.border + '30';
  ctx.lineWidth = 0.5;
  for (let i = 0; i < W; i += 40) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, H); ctx.stroke();
  }
  for (let i = 0; i < H; i += 40) {
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(W, i); ctx.stroke();
  }

  let cursorY = PAD;

  // ─── HEADER ───
  const headerGrad = ctx.createLinearGradient(PAD, cursorY, PAD + CONTENT_W, cursorY + 180);
  headerGrad.addColorStop(0, COLORS.bgHeader);
  headerGrad.addColorStop(1, COLORS.bgAccent);
  roundRect(ctx, PAD, cursorY, CONTENT_W, 180, 20);
  ctx.fillStyle = headerGrad;
  ctx.fill();

  // Decorative circles
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = COLORS.white;
  ctx.beginPath(); ctx.arc(W - PAD - 60, cursorY + 40, 100, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(W - PAD - 120, cursorY + 140, 60, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;

  // Title
  ctx.fillStyle = COLORS.white;
  ctx.font = "bold 42px 'Inter', 'Segoe UI', system-ui, sans-serif";
  ctx.textAlign = 'left';
  ctx.fillText('📋  PROGRAMAÇÃO DO CULTO', PAD + 36, cursorY + 60);

  // Culto name
  ctx.font = "600 28px 'Inter', sans-serif";
  ctx.globalAlpha = 0.95;
  ctx.fillText(culto.nome, PAD + 36, cursorY + 100);
  ctx.globalAlpha = 1;

  // Date + time info
  const dataFormatada = new Date(culto.data + 'T00:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  ctx.font = "400 20px 'Inter', sans-serif";
  ctx.globalAlpha = 0.8;
  ctx.fillText(`📅  ${dataFormatada}`, PAD + 36, cursorY + 140);

  const totalDuracao = momentos.reduce((s, m) => s + m.duracao, 0);
  ctx.fillText(`🕐  ${culto.horarioInicial}  •  ${totalDuracao} min  •  ${momentos.length} momentos`, PAD + 36, cursorY + 168);
  ctx.globalAlpha = 1;

  cursorY += HEADER_H;

  // ─── BLOCOS & ROWS ───
  let globalIndex = 0;
  const accentColors = [COLORS.bgHeader, COLORS.bgAccent, COLORS.green, COLORS.amber, COLORS.pink];

  blocoEntries.forEach(([bloco, items], blocoIdx) => {
    const accentColor = accentColors[blocoIdx % accentColors.length];

    // Bloco header
    roundRect(ctx, PAD, cursorY, CONTENT_W, 44, 12);
    ctx.fillStyle = accentColor + '20';
    ctx.fill();

    // Accent bar
    roundRect(ctx, PAD, cursorY, 5, 44, 3);
    ctx.fillStyle = accentColor;
    ctx.fill();

    ctx.fillStyle = accentColor;
    ctx.font = "bold 18px 'Inter', sans-serif";
    ctx.textAlign = 'left';
    ctx.fillText(`▸  ${bloco.toUpperCase()}`, PAD + 24, cursorY + 29);

    // Item count
    ctx.fillStyle = COLORS.textDim;
    ctx.font = "400 14px 'Inter', sans-serif";
    ctx.textAlign = 'right';
    ctx.fillText(`${items.length} momento${items.length !== 1 ? 's' : ''}`, PAD + CONTENT_W - 16, cursorY + 29);
    ctx.textAlign = 'left';

    cursorY += BLOCO_HEADER_H;

    // Rows
    items.forEach((m, i) => {
      const rowY = cursorY;
      const isEven = i % 2 === 0;

      // Row background
      roundRect(ctx, PAD + 8, rowY, CONTENT_W - 16, ROW_H - 4, 10);
      ctx.fillStyle = isEven ? COLORS.bgCard : COLORS.bgCardAlt;
      ctx.fill();

      // Number badge
      const numX = PAD + 32;
      const numY = rowY + ROW_H / 2;
      ctx.beginPath();
      ctx.arc(numX, numY, 16, 0, Math.PI * 2);
      ctx.fillStyle = accentColor + '30';
      ctx.fill();
      ctx.fillStyle = accentColor;
      ctx.font = "bold 14px 'Inter', sans-serif";
      ctx.textAlign = 'center';
      ctx.fillText(`${globalIndex + 1}`, numX, numY + 5);
      ctx.textAlign = 'left';

      // Time
      const timeX = PAD + 68;
      ctx.fillStyle = COLORS.white;
      ctx.font = "bold 20px 'Inter', monospace";
      ctx.fillText(m.horarioInicio, timeX, rowY + 28);

      const termino = calcularHorarioTermino(m.horarioInicio, m.duracao);
      ctx.fillStyle = COLORS.textMuted;
      ctx.font = "400 14px 'Inter', sans-serif";
      ctx.fillText(`até ${termino}  •  ${m.duracao}min`, timeX, rowY + 50);

      // Activity
      const actX = PAD + 240;
      ctx.fillStyle = COLORS.white;
      ctx.font = "600 18px 'Inter', sans-serif";
      const actText = truncateText(ctx, m.atividade || '—', 280);
      ctx.fillText(actText, actX, rowY + 28);

      // Type pill
      if (m.tipoMomento && m.tipoMomento !== 'nenhum') {
        const typeLabel = tipoMomentoLabel(m.tipoMomento);
        ctx.font = "500 11px 'Inter', sans-serif";
        const tw = ctx.measureText(typeLabel).width + 16;
        roundRect(ctx, actX, rowY + 38, tw, 20, 10);
        ctx.fillStyle = accentColor + '25';
        ctx.fill();
        ctx.fillStyle = accentColor;
        ctx.font = "500 11px 'Inter', sans-serif";
        ctx.fillText(typeLabel, actX + 8, rowY + 53);
      }

      // Responsible
      const respX = PAD + 560;
      ctx.fillStyle = COLORS.white;
      ctx.font = "500 16px 'Inter', sans-serif";
      const respText = truncateText(ctx, m.responsavel || '—', 200);
      ctx.fillText(respText, respX, rowY + 28);

      if (m.ministerio) {
        ctx.fillStyle = COLORS.textDim;
        ctx.font = "400 13px 'Inter', sans-serif";
        ctx.fillText(truncateText(ctx, m.ministerio, 200), respX, rowY + 50);
      }

      // Funcao
      const funcX = PAD + 800;
      if (m.funcao) {
        ctx.fillStyle = COLORS.textMuted;
        ctx.font = "400 14px 'Inter', sans-serif";
        ctx.fillText(truncateText(ctx, m.funcao, 150), funcX, rowY + 28);
      }

      // Observação
      if (m.observacao) {
        ctx.fillStyle = COLORS.textDim;
        ctx.font = "italic 12px 'Inter', sans-serif";
        ctx.fillText(truncateText(ctx, `💬 ${m.observacao}`, 200), funcX, rowY + 50);
      }

      // Sonoplastia
      const sonoX = PAD + 980;
      if (m.acaoSonoplastia) {
        ctx.fillStyle = COLORS.textDim;
        ctx.font = "400 12px 'Inter', sans-serif";
        ctx.fillText(truncateText(ctx, `🎧 ${m.acaoSonoplastia}`, 140), sonoX, rowY + 36);
      }

      cursorY += ROW_H;
      globalIndex++;
    });

    cursorY += 24; // gap between blocos
  });

  // ─── SUMMARY ───
  const summaryY = cursorY;
  const summaryGrad = ctx.createLinearGradient(PAD, summaryY, PAD + CONTENT_W, summaryY);
  summaryGrad.addColorStop(0, COLORS.bgCard);
  summaryGrad.addColorStop(1, COLORS.bgCardAlt);
  roundRect(ctx, PAD, summaryY, CONTENT_W, 110, 16);
  ctx.fillStyle = summaryGrad;
  ctx.fill();

  // Border top accent
  roundRect(ctx, PAD, summaryY, CONTENT_W, 4, 2);
  ctx.fillStyle = COLORS.bgHeader;
  ctx.fill();

  const primeiroHorario = momentos.length > 0 ? momentos[0].horarioInicio : culto.horarioInicial;
  const ultimoTermino = momentos.length > 0
    ? calcularHorarioTermino(momentos[momentos.length - 1].horarioInicio, momentos[momentos.length - 1].duracao)
    : culto.horarioInicial;

  // Summary stats
  const stats = [
    { icon: '📊', label: 'Total de Momentos', value: `${momentos.length}` },
    { icon: '⏱️', label: 'Duração Total', value: `${totalDuracao} min` },
    { icon: '🟢', label: 'Início', value: primeiroHorario },
    { icon: '🔴', label: 'Término', value: ultimoTermino },
  ];

  const statW = CONTENT_W / stats.length;
  stats.forEach((s, i) => {
    const sx = PAD + i * statW + statW / 2;

    ctx.textAlign = 'center';
    ctx.fillStyle = COLORS.textDim;
    ctx.font = "400 13px 'Inter', sans-serif";
    ctx.fillText(`${s.icon}  ${s.label}`, sx, summaryY + 40);

    ctx.fillStyle = COLORS.white;
    ctx.font = "bold 28px 'Inter', sans-serif";
    ctx.fillText(s.value, sx, summaryY + 78);

    // Divider
    if (i < stats.length - 1) {
      ctx.strokeStyle = COLORS.border;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PAD + (i + 1) * statW, summaryY + 20);
      ctx.lineTo(PAD + (i + 1) * statW, summaryY + 95);
      ctx.stroke();
    }
  });

  cursorY = summaryY + SUMMARY_H;

  // ─── FOOTER ───
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.textDim;
  ctx.font = "400 13px 'Inter', sans-serif";
  ctx.fillText('Gerado por Excelência no Culto', W / 2, cursorY + 30);

  // Download
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = `programacao-${culto.nome.replace(/\s+/g, '-').toLowerCase()}-${culto.data}.png`;
  a.click();
}
