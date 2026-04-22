import { v4 as uuidv4 } from 'uuid';

export function generateQRToken(): string {
  return uuidv4().replace(/-/g, '') + Date.now().toString(36);
}

export function formatCPF(cpf: string): string {
  const cleaned = cpf.replace(/\D/g, '');
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('pt-BR');
}

export function formatDateTime(date: string): string {
  return new Date(date).toLocaleString('pt-BR');
}

export function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

// Sanitize input for ilike queries — escape SQL wildcards
export function sanitizeForLike(input: string): string {
  return input.replace(/[%_\\]/g, '\\$&');
}

// Sanitize generic string input — strip control chars, limit length
export function sanitizeInput(input: string, maxLength = 500): string {
  // eslint-disable-next-line no-control-regex
  return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim().slice(0, maxLength);
}
