# Activar las cuentas (correo y Google)

Todo es gratuito. Necesitas dos cosas de Supabase (una dirección y una clave pública) y, para Google, un acceso de Google Cloud.

## 1. Crear el proyecto en Supabase
1. Entra en https://supabase.com, pulsa **Start your project** e inicia sesión con tu GitHub.
2. **New project**: nombre `rutina`, región `West EU (Ireland)` o `Central EU (Frankfurt)`, y una contraseña de base de datos (guárdala; no se usa en la app). Plan **Free**.
3. Espera un par de minutos a que termine de crearse.

## 2. Crear la tabla
1. Menú izquierdo: **SQL Editor** → **New query**.
2. Pega todo el contenido de `supabase/schema.sql` y pulsa **Run**. Debe decir *Success*.

## 3. Las dos claves para la app
1. **Project Settings** (engranaje) → **API**.
2. Copia **Project URL** (`https://xxxx.supabase.co`) y la clave pública **anon** (o *publishable*). Son públicas por diseño: la seguridad la dan las reglas de la tabla.
3. Pásaselas a Claude, o pégalas en `src/config.js`.

## 4. Direcciones permitidas
**Authentication → URL Configuration**:
- *Site URL*: `https://charlymanso.github.io/rutina/`
- *Redirect URLs*: añade `http://127.0.0.1:53682/callback`

## 5. Correo y contraseña
Ya viene activado. En **Authentication → Providers → Email** puedes dejar *Confirm email* activado (recomendado): quien se registre recibe un correo para confirmar.

## 6. Google
1. https://console.cloud.google.com → proyecto nuevo (`rutina`).
2. **APIs y servicios → Pantalla de consentimiento de OAuth**: tipo *Externo*, nombre de la app `Rutina`, tu correo. Cuando termines, pulsa **Publicar aplicación** (con los permisos básicos de correo y perfil no hace falta verificación de Google).
3. **Credenciales → Crear credenciales → ID de cliente de OAuth**: tipo *Aplicación web*. En **URI de redireccionamiento autorizados** pon `https://TU-PROYECTO.supabase.co/auth/v1/callback` (cambia `TU-PROYECTO` por el de tu Project URL).
4. Copia el **ID de cliente** y el **Secreto del cliente**.
5. En Supabase: **Authentication → Providers → Google** → actívalo y pega esos dos valores → **Save**.

## Cómo funciona
- Con la cuenta, tu plan se guarda también en la nube y se sincroniza entre tus ordenadores.
- Si hay cambios en los dos sitios a la vez, la app pregunta cuál conservar; nunca pisa nada sin avisar.
- La sesión se guarda cifrada con el llavero de Windows o de Mac, aparte de tus datos.
- Las cuentas se mantienen apagadas mientras `src/config.js` tenga la dirección vacía.
