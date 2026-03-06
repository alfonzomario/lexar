# Subir LexAR a GitHub y dejarlo online para que tus socios prueben

## 1. Subir el proyecto a tu GitHub

En la terminal, desde la carpeta del proyecto:

```bash
cd /Users/alfonzomario/Documents/lexar

# Si aún no hay repo git
git init

# Añadir todo (node_modules y .env ya están en .gitignore)
git add .
git commit -m "LexAR: app lista para deploy"

# Crear el repo en GitHub (necesitas tener GitHub CLI o crearlo en github.com)
# Opción A: con GitHub CLI (gh repo create)
gh repo create lexar --private --source=. --push

# Opción B: manual
# 1. En github.com → New repository → nombre "lexar" (público o privado)
# 2. No inicialices con README
# 3. Luego:
git remote add origin https://github.com/TU_USUARIO/lexar.git
git branch -M main
git push -u origin main
```

Sustituye `TU_USUARIO` por tu usuario de GitHub.

---

## 2. Deploy en Railway (link público + base de datos online)

Railway te da una URL pública (ej. `https://lexar-production.up.railway.app`) y permite usar un **disco persistente** para la base SQLite, así tus socios pueden probar y cargar datos que se mantienen.

### 2.1 Cuenta y proyecto

1. Entra en [railway.app](https://railway.app) e inicia sesión (con GitHub es rápido).
2. **New Project** → **Deploy from GitHub repo** → elige el repo `lexar`.
3. Railway clonará el repo y detectará Node.

### 2.2 Variables de entorno

En el proyecto de Railway → tu servicio → **Variables**:

- `NODE_ENV` = `production`
- `GEMINI_API_KEY` = tu clave de Gemini (la misma que en tu `.env` local)
- No hace falta poner `PORT` ni `DATABASE_PATH` todavía; los configuramos después.

### 2.3 Build y start

En **Settings** del servicio:

- **Build Command:** `npm run build`  
  (genera la carpeta `dist` del frontend)
- **Start Command:** `npm start`  
  (arranca el servidor con `tsx` y sirve el front desde `dist`)

Root directory: deja el que viene por defecto (raíz del repo).

### 2.4 Base de datos persistente (disco)

Para que la base de datos esté online y no se borre en cada deploy:

1. En tu servicio en Railway → **Resources** → **+ New** → **Volume**.
2. Crea un volumen y asígnale un path de montaje, por ejemplo: `/data`.
3. En **Variables** del mismo servicio, añade:
   - `DATABASE_PATH` = `/data/lexar.sqlite`

Así el archivo SQLite queda en el disco persistente y sobrevive a redespliegues.

### 2.5 Deploy

Haz **Deploy** (o deja que se dispare con el siguiente push a `main`). Cuando termine, en **Settings** → **Networking** → **Generate domain** obtienes la URL pública (ej. `https://lexar-production.up.railway.app`).

Ese link es el que puedes compartir con tus socios para que entren y prueben; la base de datos es la misma para todos y está online.

---

## Resumen rápido

| Qué quieres              | Dónde / Cómo |
|--------------------------|---------------|
| Código en GitHub         | Repo `lexar` (creado en el paso 1). |
| Link público para probar | URL de Railway (paso 2.5). |
| Base de datos online     | Volumen en Railway con `DATABASE_PATH=/data/lexar.sqlite` (paso 2.4). |

Si quieres, en el siguiente paso podemos revisar que el `npm run build` y `npm start` pasen en local con `NODE_ENV=production` para evitar sorpresas en Railway.
