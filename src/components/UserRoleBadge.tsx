import { clsx } from 'clsx';

interface UserRoleBadgeProps {
  role: string;
  className?: string;
}

export function UserRoleBadge({ role, className }: UserRoleBadgeProps) {
  if (!role) return null;
  const cleanRole = role.trim();

  let badgeClass = "bg-stone-100 text-stone-600 border border-stone-200";
  if (cleanRole === 'Estudiante') {
    badgeClass = "bg-blue-50 text-blue-700 border border-blue-150";
  } else if (cleanRole === 'Abogado') {
    badgeClass = "bg-emerald-600 text-white font-medium border border-emerald-750";
  } else if (cleanRole === 'Profesor') {
    badgeClass = "bg-amber-100 text-amber-800 border border-amber-200 font-medium";
  } else if (cleanRole === 'Profesor y Abogado') {
    badgeClass = "bg-orange-500 text-white font-medium border border-orange-600";
  } else if (cleanRole === 'Juez' || cleanRole === 'Magistrado') {
    badgeClass = "bg-red-800 text-white font-medium border border-red-950";
  }

  return (
    <span className={clsx("text-[10px] px-2 py-0.5 rounded-full inline-flex items-center tracking-wider uppercase font-bold shadow-sm select-none", badgeClass, className)}>
      {cleanRole}
    </span>
  );
}
