import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();
    const { name, phone, email } = data;

    if (!name || !phone || !email) {
      return new Response(
        JSON.stringify({ message: 'Todos los campos son requeridos.' }),
        { status: 400 }
      );
    }

    const BREVO_API_KEY = import.meta.env.BREVO_API_KEY;
    const N8N_WEBHOOK_URL = import.meta.env.N8N_WEBHOOK_URL;

    if (!BREVO_API_KEY) {
      return new Response(
        JSON.stringify({ message: 'BREVO_API_KEY no configurada.' }),
        { status: 500 }
      );
    }

    if (!N8N_WEBHOOK_URL) {
      return new Response(
        JSON.stringify({ message: 'N8N_WEBHOOK_URL no configurada.' }),
        { status: 500 }
      );
    }

    const brevoHeaders = {
      'accept': 'application/json',
      'content-type': 'application/json',
      'api-key': BREVO_API_KEY
    };

    // Official Brevo API Integration (Create Contact)
    const contactRequest = fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: brevoHeaders,
      body: JSON.stringify({
        email: email,
        attributes: {
          NOMBRE: name,
          TELEFONO: phone,
          ORIGEN: 'Landing Navidad Europea 2026'
        },
        listIds: [1],
        updateEnabled: true
      })
    });

    // Send Notification Email via Brevo SMTP
    const emailRequest = fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: brevoHeaders,
      body: JSON.stringify({
        sender: { name: "Navidad Europea 2026", email: "noreply@futurite.info" },
        to: [
          { email: "dev@futurite.com", name: "Dev" },
          { email: "ventas@viajacomoyo.net", name: "Ventas" }
        ],
        subject: "¡Nuevo Lead! - Navidad Europea 2026",
        htmlContent: `
          <html>
            <body style="font-family: sans-serif; line-height: 1.6; color: #333;">
              <div style="max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
                <h2 style="color: #065f46;">Nuevo registro en la Landing Page</h2>
                <p>Se ha recibido un nuevo interesado para el viaje <strong>Navidad Europea 2026</strong>:</p>
                <hr style="border: 0; border-top: 1px solid #eee;">
                <p><strong>Nombre:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Teléfono/WhatsApp:</strong> ${phone}</p>
                <hr style="border: 0; border-top: 1px solid #eee;">
                <p style="font-size: 12px; color: #999;">Este correo fue enviado automáticamente desde el formulario de la landing page.</p>
              </div>
            </body>
          </html>
        `
      })
    });

    const webhookRequest = fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        nombre: name,
        telefono: phone,
        correo: email,
        origen: 'Navidad Europea'
      })
    });

    const responses = await Promise.allSettled([
      contactRequest,
      emailRequest,
      webhookRequest
    ]);

    const failedRequest = responses.find((response) => {
      return response.status === 'rejected' || !response.value.ok;
    });

    if (!failedRequest) {
      return new Response(
        JSON.stringify({ message: '¡Gracias! Tu lugar ha sido pre-registrado.' }),
        { status: 200 }
      );
    } else {
      return new Response(
        JSON.stringify({ message: 'No se pudieron completar todas las peticiones.' }),
        { status: 500 }
      );
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ message: 'Error procesando la solicitud.' }),
      { status: 500 }
    );
  }
};
