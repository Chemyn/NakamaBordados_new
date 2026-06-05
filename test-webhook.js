// Usando fetch nativo de Node.js 18+
async function simulateWebhook() {
  const url = 'https://nakamabordados.com/wp-json/nakama/v1/envia-webhook';
  
  // Reemplaza esto con el secreto que configuraste en el plugin
  const webhookSecret = '6f2656ab48a0eb24c62f3a9664195520c4511a832f3e42eef52c538892c4577a'; 
  
  // Reemplaza esto con un ID de pedido real que tengas en tu WooCommerce
  const orderId = '100303'; 
  
  // Reemplaza con un número de rastreo de prueba (ej. de FedEx, DHL, etc.)
  const trackingNumber = '1055910227610700042072'; 
  const carrier = 'Estafeta';

  const payload = {
    data: [{
      trackingNumber: trackingNumber,
      carrier: carrier,
      order: orderId
    }]
  };

  console.log(`Enviando Webhook simulado a ${url}...`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${webhookSecret}`
      },
      body: JSON.stringify(payload)
    });

    const result = await response.text();
    console.log('Status Code:', response.status);
    console.log('Respuesta:', result);
    
    if (response.ok) {
      console.log('✅ Webhook procesado exitosamente por WordPress.');
      console.log('Ahora ve a tu entorno local (http://localhost:3000/mi-cuenta), inicia sesión y revisa la pestaña de Rastreo.');
    } else {
      console.log('❌ Error al procesar el Webhook. Revisa que el ID del pedido exista y el secreto coincida.');
    }
  } catch (error) {
    console.error('Error de conexión:', error);
  }
}

simulateWebhook();
