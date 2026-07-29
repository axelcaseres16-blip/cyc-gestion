import { AppUser, UserRole } from '../types';

const USERS_STORAGE_KEY = 'cyc_gestion_users_v3';
const CURRENT_USER_STORAGE_KEY = 'cyc_gestion_current_user_v3';
const BOLETAS_GROUP_PHONE_KEY = 'cyc_gestion_boletas_group_phone_v1';

/**
/ Simple synchronous hashing helper with salt for local storage security
*/
export function hashPassword(plainPassword: string): string {
  let hash = 0;
  const salted = `cyc_salt_2026_${plainPassword}_secure`;
  for (let i = 0; i < salted.length; i++) {
    const char = salted.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return `pwd_hash_${Math.abs(hash).toString(36)}_${salted.length}`;
}

const DEFAULT_INITIAL_USERS: AppUser[] = [
  {
    id: 'usr_dueno_axel',
    nombre: 'Axel',
    apellido: 'Cáseres',
    username: 'axel',
    passwordHash: hashPassword('123456'),
    role: 'DUENO',
    activo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'usr_admin_martin',
    nombre: 'Martín',
    apellido: 'Gómez',
    username: 'martin',
    passwordHash: hashPassword('123456'),
    role: 'ADMINISTRADOR',
    activo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'usr_repartidor_braian',
    nombre: 'Braian',
    apellido: 'López',
    username: 'braian',
    passwordHash: hashPassword('123456'),
    role: 'REPARTIDOR',
    activo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

/**
 * Obtiene la lista completa de usuarios del sistema
 */
export function getStoredUsers(): AppUser[] {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(DEFAULT_INITIAL_USERS));
      return DEFAULT_INITIAL_USERS;
    }
    const parsed: AppUser[] = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(DEFAULT_INITIAL_USERS));
      return DEFAULT_INITIAL_USERS;
    }
    return parsed;
  } catch (err) {
    console.error('Error leyendo usuarios de localStorage:', err);
    return DEFAULT_INITIAL_USERS;
  }
}

/**
 * Guarda la lista de usuarios
 */
export function saveStoredUsers(users: AppUser[]): void {
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (err) {
    console.error('Error guardando usuarios:', err);
  }
}

/**
 * Obtiene el usuario autenticado actualmente
 */
export function getCurrentUser(): AppUser | null {
  try {
    const raw = localStorage.getItem(CURRENT_USER_STORAGE_KEY);
    if (!raw) return null;
    const user: AppUser = JSON.parse(raw);
    
    // Verificar si sigue estando activo en la lista general
    const allUsers = getStoredUsers();
    const active = allUsers.find((u) => u.id === user.id && u.activo);
    if (!active) {
      logoutUser();
      return null;
    }
    return active;
  } catch {
    return null;
  }
}

/**
 * Inicia sesión con usuario y contraseña
 */
export function loginUser(username: string, plainPassword: string): {
  success: boolean;
  user?: AppUser;
  error?: string;
} {
  const normUser = username.trim().toLowerCase();
  if (!normUser || !plainPassword) {
    return { success: false, error: 'Por favor complete usuario y contraseña.' };
  }

  const allUsers = getStoredUsers();
  const found = allUsers.find((u) => u.username.toLowerCase() === normUser);

  if (!found) {
    return { success: false, error: 'Usuario no encontrado. Verifique los datos ingresados.' };
  }

  if (!found.activo) {
    return { success: false, error: 'El usuario se encuentra inactivo. Contacte al Dueño.' };
  }

  const hashed = hashPassword(plainPassword);
  if (found.passwordHash !== hashed) {
    return { success: false, error: 'Contraseña incorrecta.' };
  }

  // Actualizar fecha de último acceso
  const nowIso = new Date().toISOString();
  const updatedUser: AppUser = {
    ...found,
    lastAccessAt: nowIso,
  };

  const updatedUsersList = allUsers.map((u) => (u.id === found.id ? updatedUser : u));
  saveStoredUsers(updatedUsersList);

  localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(updatedUser));
  return { success: true, user: updatedUser };
}

/**
 * Cierra la sesión activa
 */
export function logoutUser(): void {
  try {
    localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
  } catch (err) {
    console.error('Error al cerrar sesión:', err);
  }
}

/**
 * Crear o editar usuario (Exclusivo Dueño)
 */
export function upsertUser(
  userData: {
    id?: string;
    nombre: string;
    apellido: string;
    username: string;
    plainPassword?: string;
    role: UserRole;
    activo: boolean;
  },
  actingUserRole: UserRole
): { success: boolean; error?: string; user?: AppUser } {
  if (actingUserRole !== 'DUENO') {
    return { success: false, error: 'Acceso denegado. Solo el Dueño puede administrar usuarios.' };
  }

  const normUsername = userData.username.trim().toLowerCase();
  if (!normUsername || !userData.nombre.trim() || !userData.apellido.trim()) {
    return { success: false, error: 'Nombre, apellido y nombre de usuario son obligatorios.' };
  }

  const users = getStoredUsers();

  // Verificar username único
  const existingWithSameUsername = users.find(
    (u) => u.username.toLowerCase() === normUsername && u.id !== userData.id
  );

  if (existingWithSameUsername) {
    return { success: false, error: 'El nombre de usuario ya existe. Elija otro.' };
  }

  const nowIso = new Date().toISOString();

  if (userData.id) {
    // Editar usuario existente
    const current = users.find((u) => u.id === userData.id);
    if (!current) {
      return { success: false, error: 'Usuario no encontrado.' };
    }

    const updatedUser: AppUser = {
      ...current,
      nombre: userData.nombre.trim(),
      apellido: userData.apellido.trim(),
      username: normUsername,
      role: userData.role,
      activo: userData.activo,
      updatedAt: nowIso,
    };

    if (userData.plainPassword && userData.plainPassword.trim()) {
      updatedUser.passwordHash = hashPassword(userData.plainPassword.trim());
    }

    const newUsers = users.map((u) => (u.id === userData.id ? updatedUser : u));
    saveStoredUsers(newUsers);

    // Si edité al usuario actualmente logueado, actualizar la sesión
    const session = getCurrentUser();
    if (session && session.id === updatedUser.id) {
      localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(updatedUser));
    }

    return { success: true, user: updatedUser };
  } else {
    // Crear nuevo usuario
    if (!userData.plainPassword || !userData.plainPassword.trim()) {
      return { success: false, error: 'Debe ingresar una contraseña para el nuevo usuario.' };
    }

    const newUser: AppUser = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      nombre: userData.nombre.trim(),
      apellido: userData.apellido.trim(),
      username: normUsername,
      passwordHash: hashPassword(userData.plainPassword.trim()),
      role: userData.role,
      activo: userData.activo,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    users.push(newUser);
    saveStoredUsers(users);
    return { success: true, user: newUser };
  }
}

/**
 * Teléfono / enlace del Grupo de WhatsApp de Boletas
 */
export function getBoletasGroupPhone(): string {
  try {
    return localStorage.getItem(BOLETAS_GROUP_PHONE_KEY) || '';
  } catch {
    return '';
  }
}

export function saveBoletasGroupPhone(phone: string): void {
  try {
    localStorage.setItem(BOLETAS_GROUP_PHONE_KEY, phone.trim());
  } catch (err) {
    console.error('Error guardando grupo de boletas:', err);
  }
}
