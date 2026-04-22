-- Add aprovado column (admin must approve registrations)
ALTER TABLE students ADD COLUMN IF NOT EXISTS aprovado BOOLEAN DEFAULT false;

-- Add nao_retorna column (student marks they won't return today)
ALTER TABLE students ADD COLUMN IF NOT EXISTS nao_retorna BOOLEAN DEFAULT false;

-- Update existing students to be approved (they were already active)
UPDATE students SET aprovado = true WHERE ativo = true;

-- Add index for pending approvals
CREATE INDEX IF NOT EXISTS idx_students_aprovado ON students(aprovado);
