-- Nuevos roles: ADMIN (dueño, ve/gestiona ambas sucursales) y GENERAL_SUPERVISOR
-- (ve ambas sucursales, solo lectura). SUPERVISOR/INSTRUCTOR no cambian.
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'ADMIN';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'GENERAL_SUPERVISOR';
