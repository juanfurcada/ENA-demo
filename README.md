# ENA Sport — Customer Portal Demo

Demo del portal de clientes de ENA Sport con integración a DevRev (chatbot + skill que habilita el acceso y dispara un mail con la nueva contraseña).

## Setup local

```bash
npm install
cp .env.example .env
# editá .env con tus credenciales de Gmail (app password)
npm start
```

Abrí http://localhost:3004

## Variables de entorno

| Variable          | Descripción                                                           |
|-------------------|-----------------------------------------------------------------------|
| `RESEND_API_KEY`  | API key de Resend (resend.com → API Keys)                             |
| `EMAIL_FROM`      | Remitente (default: `ENA Sport <onboarding@resend.dev>`)              |
| `PORT`            | Puerto del server (default: 3004)                                     |

## Flujo de la demo

1. Usuario `rodrigo` intenta loguearse → recibe **403 "cuenta bloqueada"**
2. En el error, link abre el widget de chat de DevRev
3. El agente de DevRev llama al endpoint:
   ```
   POST /api/enable-access
   { "username": "rodrigo", "newPassword": "<generada>" }
   ```
4. El server marca la cuenta como habilitada, guarda la contraseña, y envía un mail al usuario con las credenciales
5. Usuario vuelve al login y entra al dashboard

Botón **Reiniciar** arriba a la derecha vuelve al estado bloqueado.

## Endpoints

| Método | Path                   | Quién lo llama       | Qué hace                              |
|--------|------------------------|----------------------|---------------------------------------|
| POST   | `/api/login`           | Frontend             | Login con username + password         |
| POST   | `/api/enable-access`   | DevRev skill         | Habilita acceso + manda mail          |
| POST   | `/api/exam-retake`     | DevRev skill         | Manda mail con cupón de descuento     |
| GET    | `/api/status/:user`    | Debug                | Estado de la cuenta                   |
| POST   | `/api/reset`           | Botón "Reiniciar"    | Vuelve al estado bloqueado            |
