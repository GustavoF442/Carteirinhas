'use client';

import { useEffect, useState } from 'react';
import Card from '@/components/ui/Card';
import { StatCard } from '@/components/ui/Card';
import Button from '@/components/ui/Button';

interface ComparisonRow {
  data: string;
  votaram: number;
  embarcaram: number;
  nao_vai: number;
}

interface FullReport {
  periodo: { inicio: string; fim: string; dias: number };
  total_alunos_ativos: number;
  media_votos_dia: number;
  media_embarques_dia: number;
  comparison: ComparisonRow[];
  boardings_by_ponto: Record<string, number>;
  boardings_by_curso: Record<string, number>;
  students_by_ponto: Record<string, number>;
  students_by_curso: Record<string, number>;
}

const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function fmtDate(d: string) {
  const dt = new Date(d + 'T12:00:00');
  return `${dt.getDate().toString().padStart(2, '0')}/${(dt.getMonth() + 1).toString().padStart(2, '0')}`;
}

export default function AdminRelatorios() {
  const [report, setReport] = useState<FullReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [exporting, setExporting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports?type=full&days=${days}`);
      const data = await res.json();
      setReport(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  const exportPDF = async () => {
    if (!report) return;
    setExporting(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const doc = new jsPDF();
      const pageW = doc.internal.pageSize.getWidth();
      let y = 15;

      // Header
      doc.setFillColor(26, 39, 68);
      doc.rect(0, 0, pageW, 35, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.text('Relatório de Transporte Universitário', pageW / 2, 14, { align: 'center' });
      doc.setFontSize(10);
      doc.text('Prefeitura de São João Batista - SC', pageW / 2, 22, { align: 'center' });
      doc.text(`Período: ${fmtDate(report.periodo.inicio)} a ${fmtDate(report.periodo.fim)} (${report.periodo.dias} dias)`, pageW / 2, 29, { align: 'center' });

      y = 45;
      doc.setTextColor(0, 0, 0);

      // Summary boxes
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Resumo Geral', 14, y);
      y += 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const summaryData = [
        ['Alunos Ativos', String(report.total_alunos_ativos)],
        ['Média Votos/Dia', String(report.media_votos_dia)],
        ['Média Embarques/Dia', String(report.media_embarques_dia)],
      ];
      autoTable(doc, {
        startY: y,
        head: [['Indicador', 'Valor']],
        body: summaryData,
        theme: 'grid',
        headStyles: { fillColor: [26, 39, 68] },
        margin: { left: 14, right: 14 },
        tableWidth: 80,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      y = (doc as any).lastAutoTable.finalY + 10;

      // Comparison table: Votaram vs Embarcaram
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Votaram x Embarcaram (por dia)', 14, y);
      y += 5;
      const compRows = report.comparison.map(c => {
        const dn = dayNames[new Date(c.data + 'T12:00:00').getDay()];
        const diff = c.embarcaram - c.votaram;
        return [fmtDate(c.data), dn, String(c.votaram), String(c.embarcaram), String(c.nao_vai), (diff >= 0 ? '+' : '') + diff];
      });
      autoTable(doc, {
        startY: y,
        head: [['Data', 'Dia', 'Votaram', 'Embarcaram', 'Não Vai', 'Diferença']],
        body: compRows,
        theme: 'striped',
        headStyles: { fillColor: [26, 39, 68] },
        margin: { left: 14, right: 14 },
        styles: { fontSize: 8 },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      y = (doc as any).lastAutoTable.finalY + 10;

      // Embarques por Curso
      if (y > 240) { doc.addPage(); y = 20; }
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Embarques por Curso', 14, y);
      y += 5;
      const cursoRows = Object.entries(report.boardings_by_curso)
        .sort(([, a], [, b]) => b - a)
        .map(([curso, count]) => [curso, String(count), String(report.students_by_curso[curso] || 0)]);
      autoTable(doc, {
        startY: y,
        head: [['Curso', 'Total Embarques', 'Alunos Cadastrados']],
        body: cursoRows,
        theme: 'striped',
        headStyles: { fillColor: [26, 39, 68] },
        margin: { left: 14, right: 14 },
        styles: { fontSize: 9 },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      y = (doc as any).lastAutoTable.finalY + 10;

      // Embarques por Ponto
      if (y > 240) { doc.addPage(); y = 20; }
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Embarques por Ponto de Parada', 14, y);
      y += 5;
      const pontoRows = Object.entries(report.boardings_by_ponto)
        .sort(([, a], [, b]) => b - a)
        .map(([ponto, count]) => [ponto, String(count), String(report.students_by_ponto[ponto] || 0)]);
      if (pontoRows.length > 0) {
        autoTable(doc, {
          startY: y,
          head: [['Ponto', 'Total Embarques', 'Alunos Cadastrados']],
          body: pontoRows,
          theme: 'striped',
          headStyles: { fillColor: [26, 39, 68] },
          margin: { left: 14, right: 14 },
          styles: { fontSize: 9 },
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        y = (doc as any).lastAutoTable.finalY + 10;
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text('Nenhum dado de ponto de embarque registrado ainda.', 14, y + 5);
        y += 15;
      }

      // Footer
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pdfDoc = doc as any;
      const totalPages = pdfDoc.getNumberOfPages() as number;
      for (let i = 1; i <= totalPages; i++) {
        pdfDoc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Gerado em ${new Date().toLocaleString('pt-BR')} — Página ${i}/${totalPages}`,
          pageW / 2,
          doc.internal.pageSize.getHeight() - 8,
          { align: 'center' }
        );
      }

      doc.save(`relatorio-transporte-${report.periodo.inicio}-a-${report.periodo.fim}.pdf`);
    } catch (err) {
      console.error('PDF export error:', err);
    }
    setExporting(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1a2744]" />
      </div>
    );
  }

  const maxComp = Math.max(...(report?.comparison.map(c => Math.max(c.votaram, c.embarcaram)) || [1]), 1);

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
        <div className="flex gap-2 flex-wrap">
          {[7, 14, 30, 60].map((d) => (
            <Button
              key={d}
              variant={days === d ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setDays(d)}
            >
              {d} dias
            </Button>
          ))}
          <Button onClick={exportPDF} loading={exporting} size="sm" variant="primary">
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Exportar PDF
            </span>
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatCard title="Alunos Ativos" value={report?.total_alunos_ativos || 0} color="blue" />
        <StatCard title="Média Votos/Dia" value={report?.media_votos_dia || 0} color="green" />
        <StatCard title="Média Embarques/Dia" value={report?.media_embarques_dia || 0} color="purple" />
        <StatCard title="Dias no Período" value={report?.periodo.dias || 0} color="yellow" />
      </div>

      {/* Votaram vs Embarcaram */}
      <Card className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Votaram x Embarcaram (por dia)</h2>
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {report?.comparison.map((c) => {
            const dn = dayNames[new Date(c.data + 'T12:00:00').getDay()];
            return (
              <div key={c.data} className="flex items-center gap-3">
                <div className="w-20 text-xs text-gray-600 flex-shrink-0">
                  <span className="font-medium">{dn}</span> {fmtDate(c.data)}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-16 text-[10px] text-blue-600">Votaram</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-3">
                      <div className="bg-blue-500 h-3 rounded-full transition-all" style={{ width: `${(c.votaram / maxComp) * 100}%` }} />
                    </div>
                    <span className="w-6 text-xs font-medium text-right">{c.votaram}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-16 text-[10px] text-green-600">Embarcaram</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-3">
                      <div className="bg-green-500 h-3 rounded-full transition-all" style={{ width: `${(c.embarcaram / maxComp) * 100}%` }} />
                    </div>
                    <span className="w-6 text-xs font-medium text-right">{c.embarcaram}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {(!report?.comparison || report.comparison.length === 0) && (
          <p className="text-gray-500 text-center py-4">Sem dados no período.</p>
        )}
      </Card>

      {/* Two columns: By Curso + By Ponto */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Embarques por Curso */}
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Embarques por Curso</h2>
          <div className="space-y-3">
            {report?.boardings_by_curso && Object.entries(report.boardings_by_curso)
              .sort(([, a], [, b]) => b - a)
              .map(([curso, count]) => {
                const maxC = Math.max(...Object.values(report.boardings_by_curso), 1);
                return (
                  <div key={curso}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700 truncate mr-2">{curso}</span>
                      <span className="font-medium flex-shrink-0">{count}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3">
                      <div className="bg-purple-500 h-3 rounded-full transition-all" style={{ width: `${(count / maxC) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
          </div>
          {(!report?.boardings_by_curso || Object.keys(report.boardings_by_curso).length === 0) && (
            <p className="text-gray-500 text-center py-4">Sem dados.</p>
          )}
        </Card>

        {/* Embarques por Ponto */}
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Embarques por Ponto</h2>
          <div className="space-y-3">
            {report?.boardings_by_ponto && Object.entries(report.boardings_by_ponto)
              .sort(([, a], [, b]) => b - a)
              .map(([ponto, count]) => {
                const maxP = Math.max(...Object.values(report.boardings_by_ponto), 1);
                return (
                  <div key={ponto}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700 truncate mr-2">{ponto}</span>
                      <span className="font-medium flex-shrink-0">{count}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3">
                      <div className="bg-orange-500 h-3 rounded-full transition-all" style={{ width: `${(count / maxP) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
          </div>
          {(!report?.boardings_by_ponto || Object.keys(report.boardings_by_ponto).length === 0) && (
            <p className="text-gray-500 text-center py-4">Nenhum ponto de embarque registrado.</p>
          )}
        </Card>
      </div>

      {/* Alunos cadastrados por Ponto e Curso */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Alunos por Curso</h2>
          <div className="space-y-2">
            {report?.students_by_curso && Object.entries(report.students_by_curso)
              .sort(([, a], [, b]) => b - a)
              .map(([curso, count]) => (
                <div key={curso} className="flex justify-between text-sm border-b border-gray-100 pb-1">
                  <span className="text-gray-700">{curso}</span>
                  <span className="font-medium">{count} alunos</span>
                </div>
              ))}
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Alunos por Ponto de Embarque</h2>
          <div className="space-y-2">
            {report?.students_by_ponto && Object.entries(report.students_by_ponto)
              .sort(([, a], [, b]) => b - a)
              .map(([ponto, count]) => (
                <div key={ponto} className="flex justify-between text-sm border-b border-gray-100 pb-1">
                  <span className="text-gray-700">{ponto}</span>
                  <span className="font-medium">{count} alunos</span>
                </div>
              ))}
            {(!report?.students_by_ponto || Object.keys(report.students_by_ponto).length === 0) && (
              <p className="text-gray-500 text-center py-2 text-sm">Defina o ponto padrão dos alunos em Gestão de Alunos.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
