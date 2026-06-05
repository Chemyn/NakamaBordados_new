async function test() {
  console.log("Iniciando prueba de pasarelas de pago...");
  try {
    const res = await fetch('https://nakamabordados.com/graphql', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
      },
      body: JSON.stringify({
        query: `
          query {
            paymentGateways {
              nodes {
                id
                title
                description
              }
            }
            cart {
              total
            }
          }
        `
      })
    });
    
    const json = await res.json();
    console.log("Resultado JSON:", JSON.stringify(json, null, 2));
  } catch (err) {
    console.error("Error:", err);
  }
}
test();
