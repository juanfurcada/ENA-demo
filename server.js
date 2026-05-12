const express = require('express');
const cors = require('cors');
const path = require('path');
const { Resend } = require('resend');
require('dotenv').config();

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || 'ENA Sport <onboarding@resend.dev>';

if (!RESEND_API_KEY) {
  console.warn('⚠️  RESEND_API_KEY no configurado — el envío de emails va a fallar.');
}

const resend = new Resend(RESEND_API_KEY);

const app = express();
const PORT = process.env.PORT || 3004;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory user store
const users = {
  rodrigo: {
    username: 'rodrigo',
    name: 'Rodrigo Peredo',
    email: 'juan.furcada@devrev.ai',
    role: 'Cliente ENA Sport',
    department: 'Plan Performance',
    accessEnabled: false,
    password: null,
    enrolledCourses: [
      { id: 'WHEY', name: 'TrueMade Whey Protein (2,05 Lb)', progress: 72, status: 'in-progress' },
      { id: 'CREA', name: 'Creatina Monohidrato (300 g)', progress: 100, status: 'completed' },
      { id: 'COLG', name: 'TrueMade Pure Collagen', progress: 0, status: 'not-started' },
      { id: 'MAGN', name: 'Citrato de Magnesio en Polvo', progress: 45, status: 'in-progress' },
    ],
    certifications: ['CHFI', 'CSA'],
    lastLogin: null,
  }
};

// POST /api/login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña son obligatorios.' });
  }

  const user = users[username.toLowerCase()];

  if (!user) {
    return res.status(401).json({ error: 'Credenciales inválidas. Usuario no encontrado.' });
  }

  if (!user.accessEnabled) {
    return res.status(403).json({ error: 'Tu cuenta está bloqueada. Contactá a soporte.' });
  }

  if (user.password !== password) {
    return res.status(401).json({ error: 'Credenciales inválidas. Contraseña incorrecta.' });
  }

  user.lastLogin = new Date().toISOString();

  res.json({
    success: true,
    user: {
      username: user.username,
      name: user.name,
      role: user.role,
      department: user.department,
      enrolledCourses: user.enrolledCourses,
      certifications: user.certifications,
      lastLogin: user.lastLogin,
    }
  });
});

// POST /api/enable-access — DevRev calls this
app.post('/api/enable-access', (req, res) => {
  const { username, newPassword } = req.body;

  if (!username || !newPassword) {
    return res.status(400).json({ error: 'username y newPassword son obligatorios.' });
  }

  const user = users[username.toLowerCase()];

  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado.' });
  }

  user.accessEnabled = true;
  user.password = newPassword;

  console.log(`\n✅ Acceso habilitado para ${user.name} (${username})`);
  console.log(`   Contraseña asignada: ${newPassword}\n`);

  // Respond immediately, send email in background (fire-and-forget)
  res.json({
    success: true,
    message: `Acceso habilitado para ${user.name}`,
  });

  // Send email via Resend (not awaited — fire-and-forget)
  resend.emails.send({
    from: EMAIL_FROM,
    to: user.email,
    subject: '🔓 Tu cuenta de ENA Sport fue restablecida',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;background:#0A0F08;color:#F0F5EC;padding:32px;border-radius:12px;">
        <div style="text-align:center;margin-bottom:24px;">
          <h2 style="color:#C4D82E;margin:0;letter-spacing:2px;">ENA SPORT</h2>
          <p style="color:#9AA88A;font-size:13px;">Acceso restablecido</p>
        </div>
        <p>Hola <strong>${user.name}</strong>,</p>
        <p>Reactivamos el acceso a tu cuenta. Estas son tus nuevas credenciales:</p>
        <div style="background:#16201A;border:1px solid #2A3A2A;border-radius:8px;padding:16px;margin:16px 0;">
          <p style="margin:4px 0;"><strong>Usuario:</strong> ${username}</p>
          <p style="margin:4px 0;"><strong>Contraseña:</strong> <code style="background:#C4D82E;color:#0A0F08;padding:2px 8px;border-radius:4px;font-weight:bold;">${newPassword}</code></p>
        </div>
        <p style="color:#9AA88A;font-size:12px;">Si no solicitaste este cambio, contactá a soporte inmediatamente.</p>
        <p style="color:#9AA88A;font-size:11px;margin-top:24px;text-align:center;letter-spacing:1px;">Descubrí tu potencial.</p>
      </div>
    `,
  })
    .then(({ data, error }) => {
      if (error) console.error('   ⚠️  Email failed:', error);
      else console.log(`   📧 Email enviado a ${user.email} (id ${data.id})\n`);
    })
    .catch(emailErr => console.error('   ⚠️  Email failed:', emailErr));
});

// GET /api/status/:username
app.get('/api/status/:username', (req, res) => {
  const user = users[req.params.username.toLowerCase()];

  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado.' });
  }

  res.json({
    username: user.username,
    accessEnabled: user.accessEnabled,
    hasPassword: !!user.password,
  });
});

// POST /api/exam-retake — DevRev calls this to send a voucher / reorder code
app.post('/api/exam-retake', (req, res) => {
  const { username, voucherCode } = req.body;

  if (!username || !voucherCode) {
    return res.status(400).json({ error: 'username y voucherCode son obligatorios.' });
  }

  const user = users[username.toLowerCase()];

  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado.' });
  }

  console.log(`\n🎟️  Cupón emitido para ${user.name} (${username})`);
  console.log(`   Código: ${voucherCode}\n`);

  // Respond immediately, send email in background (fire-and-forget)
  res.json({
    success: true,
    message: `Cupón enviado a ${user.name}`,
  });

  resend.emails.send({
    from: EMAIL_FROM,
    to: user.email,
    subject: '🎁 Tu cupón ENA Sport e instrucciones de uso',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;background:#0A0F08;color:#F0F5EC;padding:32px;border-radius:12px;">
        <div style="text-align:center;margin-bottom:24px;">
          <h2 style="color:#C4D82E;margin:0;letter-spacing:2px;">ENA SPORT</h2>
          <p style="color:#9AA88A;font-size:13px;">Centro de Beneficios</p>
        </div>
        <p>Hola <strong>${user.name}</strong>,</p>
        <p>Tu cupón de descuento fue aprobado. Acá tenés el código y los pasos para usarlo:</p>
        <div style="background:#16201A;border:1px solid #2A3A2A;border-radius:8px;padding:16px;margin:16px 0;text-align:center;">
          <p style="margin:0 0 4px 0;font-size:12px;color:#9AA88A;">TU CÓDIGO DE CUPÓN</p>
          <p style="margin:0;font-size:22px;font-weight:bold;letter-spacing:2px;color:#C4D82E;">${voucherCode}</p>
        </div>
        <h3 style="color:#F0F5EC;font-size:15px;margin:24px 0 12px 0;">Cómo canjearlo:</h3>
        <div style="background:#16201A;border:1px solid #2A3A2A;border-radius:8px;padding:16px;margin:0 0 16px 0;">
          <p style="margin:0 0 12px 0;color:#F0F5EC;"><strong style="color:#C4D82E;">Paso 1:</strong> Entrá a tu cuenta en <a href="https://www.enasport.com" style="color:#A8E063;">enasport.com</a></p>
          <p style="margin:0 0 12px 0;color:#F0F5EC;"><strong style="color:#C4D82E;">Paso 2:</strong> Armá tu carrito con los productos que quieras y andá a <em>Finalizar compra</em>.</p>
          <p style="margin:0 0 12px 0;color:#F0F5EC;"><strong style="color:#C4D82E;">Paso 3:</strong> Ingresá el código <strong>${voucherCode}</strong> en el campo <em>Código de descuento</em>.</p>
          <p style="margin:0;color:#F0F5EC;"><strong style="color:#C4D82E;">Paso 4:</strong> Confirmá la compra. El descuento se aplica automáticamente y recibís tu pedido en 24/72 hs hábiles.</p>
        </div>
        <p style="color:#9AA88A;font-size:12px;">El cupón es válido por 90 días. Si necesitás ayuda, escribinos por el chat del sitio.</p>
        <p style="color:#9AA88A;font-size:11px;margin-top:24px;text-align:center;letter-spacing:1px;">Descubrí tu potencial.</p>
      </div>
    `,
  })
    .then(({ data, error }) => {
      if (error) console.error('   ⚠️  Email failed:', error);
      else console.log(`   📧 Email de cupón enviado a ${user.email} (id ${data.id})\n`);
    })
    .catch(emailErr => console.error('   ⚠️  Email failed:', emailErr));
});

// POST /api/reset
app.post('/api/reset', (req, res) => {
  const user = users['rodrigo'];
  user.accessEnabled = false;
  user.password = null;
  user.lastLogin = null;

  console.log('\n🔄 Demo reiniciada — acceso de rodrigo deshabilitado\n');

  res.json({ success: true, message: 'Demo reiniciada.' });
});

app.listen(PORT, () => {
  console.log(`\n💪 ENA Sport Customer Portal corriendo en http://localhost:${PORT}`);
  console.log(`   Esperando a que DevRev habilite el acceso...\n`);
});
