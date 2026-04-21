'use client';

import { useRef } from 'react';
import QRCode from 'react-qr-code';
import type { Student } from '@/lib/types';
import { formatCPF, formatDate } from '@/lib/utils';
import Button from '@/components/ui/Button';

interface StudentCardProps {
  student: Student;
  showPrint?: boolean;
}

export default function StudentCard({ student, showPrint = true }: StudentCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (!cardRef.current) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Carteirinha - ${student.nome}</title>
        <style>
          @page { size: 85.6mm 54mm; margin: 0; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', system-ui, sans-serif; }
          .card { width: 85.6mm; height: 54mm; overflow: hidden; border-radius: 8px; }
          .header { background: linear-gradient(to right, #1a2744, #2d1a3e); padding: 6px 12px; display: flex; align-items: center; gap: 6px; }
          .header-logo { width: 20px; height: 20px; border-radius: 4px; object-fit: cover; }
          .header-text { color: white; }
          .header-text .title { font-size: 7px; font-weight: 600; }
          .header-text .sub { font-size: 6px; opacity: 0.8; }
          .content { background: linear-gradient(135deg, #1a2744, #8b1a2b); padding: 8px 12px; display: flex; gap: 8px; height: calc(100% - 28px); }
          .left { flex: 1; display: flex; flex-direction: column; }
          .photo { width: 50px; height: 60px; border-radius: 4px; object-fit: cover; border: 1px solid rgba(255,255,255,0.3); }
          .photo-placeholder { width: 50px; height: 60px; border-radius: 4px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); }
          .info { margin-top: 4px; flex: 1; }
          .name { color: white; font-weight: bold; font-size: 9px; line-height: 1.2; }
          .detail { color: rgba(191,219,254,0.8); font-size: 6.5px; margin-top: 1px; }
          .right { display: flex; flex-direction: column; align-items: center; justify-content: center; }
          .qr-box { background: white; padding: 4px; border-radius: 6px; }
          .qr-box svg { width: 60px; height: 60px; }
          .code { color: rgba(147,197,253,0.5); font-size: 6px; font-family: monospace; letter-spacing: 1px; margin-top: 3px; text-align: center; }
          .footer { background: rgba(255,255,255,0.05); padding: 2px 12px; text-align: center; }
          .footer p { color: rgba(147,197,253,0.5); font-size: 5px; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <img class="header-logo" src="/logo.png" alt="SJB" />
            <div class="header-text">
              <div class="title">Prefeitura de São João Batista</div>
              <div class="sub">Transporte Universitário</div>
            </div>
          </div>
          <div class="content">
            <div class="left">
              ${student.foto_url
                ? `<img class="photo" src="${student.foto_url}" alt="${student.nome}" />`
                : '<div class="photo-placeholder"></div>'
              }
              <div class="info">
                <div class="name">${student.nome}</div>
                <div class="detail">CPF: ${formatCPF(student.cpf)}</div>
                <div class="detail">${student.curso} - ${student.universidade}</div>
                ${student.matricula ? `<div class="detail">Mat: ${student.matricula}</div>` : ''}
                ${student.data_entrada ? `<div class="detail">Desde: ${formatDate(student.data_entrada)}</div>` : ''}
              </div>
            </div>
            <div class="right">
              <div class="qr-box">${cardRef.current?.querySelector('.qr-container svg')?.outerHTML || ''}</div>
              <div class="code">${student.qr_token.substring(0, 8).toUpperCase()}</div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  return (
    <div>
      <div ref={cardRef} className="w-full max-w-sm mx-auto">
        <div className="bg-gradient-to-br from-[#1a2744] to-[#8b1a2b] rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#1a2744] to-[#2d1a3e] px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="SJB" className="w-8 h-8 rounded-md object-cover" />
              <div>
                <p className="text-white text-xs font-semibold leading-tight">Prefeitura de São João Batista</p>
                <p className="text-white/60 text-[10px]">Transporte Universitário</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Photo + Info */}
            <div className="flex items-start gap-4">
              <div className="w-20 h-24 bg-white/10 rounded-lg overflow-hidden flex-shrink-0 border-2 border-white/20">
                {student.foto_url ? (
                  <img
                    src={student.foto_url}
                    alt={student.nome}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/40">
                    <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-white font-bold text-lg leading-tight truncate">
                  {student.nome}
                </h2>
                <p className="text-blue-200 text-sm mt-1">{student.curso}</p>
                <p className="text-blue-300/70 text-xs mt-0.5">{student.universidade}</p>
                {student.matricula && (
                  <p className="text-blue-300/70 text-xs mt-0.5">Mat: {student.matricula}</p>
                )}
                {student.data_entrada && (
                  <p className="text-blue-300/70 text-xs mt-0.5">Desde: {formatDate(student.data_entrada)}</p>
                )}
                <p className="text-blue-300/50 text-xs mt-0.5">CPF: {formatCPF(student.cpf)}</p>
              </div>
            </div>

            {/* QR Code */}
            <div className="flex justify-center">
              <div className="bg-white p-3 rounded-xl qr-container">
                <QRCode
                  value={student.qr_token}
                  size={160}
                  level="H"
                />
              </div>
            </div>

            {/* Token ID */}
            <p className="text-center text-blue-300/50 text-[10px] font-mono tracking-wider">
              {student.qr_token.substring(0, 8).toUpperCase()}
            </p>
          </div>

          {/* Footer */}
          <div className="bg-white/5 px-6 py-2 border-t border-white/10">
            <p className="text-blue-300/50 text-[10px] text-center">
              Carteirinha Digital - Válida com identificação
            </p>
          </div>
        </div>
      </div>

      {/* Print button */}
      {showPrint && (
        <div className="flex justify-center mt-4">
          <Button onClick={handlePrint} variant="secondary" size="sm">
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18.75 12h.008v.008h-.008V12zm-2.25 0h.008v.008H16.5V12z" />
            </svg>
            Imprimir Carteirinha
          </Button>
        </div>
      )}
    </div>
  );
}
