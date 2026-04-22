export type UserRole = 'student' | 'driver' | 'admin';
export type VoteType = 'ida_volta' | 'apenas_ida' | 'apenas_volta';
export type TripStatus = 'scheduled' | 'active' | 'completed' | 'cancelled';

export interface Profile {
  id: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Student {
  id: string;
  user_id: string;
  nome: string;
  email: string;
  cpf: string;
  telefone: string;
  curso: string;
  universidade: string;
  matricula: string;
  data_entrada: string;
  foto_url: string | null;
  endereco: string;
  ponto_embarque: string | null;
  qr_token: string;
  ativo: boolean;
  aprovado: boolean;
  nao_retorna: boolean;
  created_at: string;
  updated_at: string;
}

export interface Driver {
  id: string;
  user_id: string;
  nome: string;
  telefone: string;
  cnh: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Bus {
  id: string;
  placa: string;
  modelo: string;
  capacidade: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface RouteStop {
  nome: string;
  ordem: number;
}

export interface Route {
  id: string;
  origem: string;
  destino: string;
  descricao: string;
  paradas: RouteStop[];
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Trip {
  id: string;
  data: string;
  bus_id: string;
  driver_id: string;
  route_id: string;
  horario_saida: string | null;
  status: TripStatus;
  horario_inicio: string | null;
  horario_fim: string | null;
  feriado: boolean;
  created_at: string;
  updated_at: string;
  buses?: Bus;
  drivers?: Driver;
  routes?: Route;
  boardings?: Boarding[];
}

export interface DailyVote {
  id: string;
  student_id: string;
  data: string;
  tipo: VoteType;
  created_at: string;
}

export interface Boarding {
  id: string;
  trip_id: string;
  student_id: string;
  ponto_embarque: string | null;
  horario: string;
  created_at: string;
  students?: Student;
}

export interface ScanResponse {
  success: boolean;
  nome?: string;
  curso?: string;
  universidade?: string;
  foto_url?: string | null;
  contador_atual: number;
  capacidade: number;
  alerta_superlotacao: boolean;
  message?: string;
}

export interface DashboardStats {
  total_alunos: number;
  votaram_hoje: number;
  embarcaram_hoje: number;
  total_onibus: number;
  total_motoristas: number;
  viagens_hoje: number;
}
