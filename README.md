# ForcesGym

Sistema web de gestión de membresías para un gimnasio.

## Desarrollo

```bash
npm install
npm run dev
```

La aplicación queda disponible en `http://localhost:5173`.

## Variables de entorno

Copia `.env.example` a `.env` y completa:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Esas claves están en Supabase → Project Settings → API. No uses la service role key en el frontend.

Reinicia `npm run dev` después de crear o cambiar `.env`.
