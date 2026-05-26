async function test() {
  console.log("Iniciando prueba de conexión con cabeceras de navegador...");
  try {
    const res = await fetch('https://nakamabordados.com/graphql', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Origin': 'https://nakamabordados.com',
        'Referer': 'https://nakamabordados.com/'
      },
      body: JSON.stringify({
        query: `
          query {
            products(first: 1) {
              nodes {
                name
              }
            }
          }
        `
      })
    });
    
    const text = await res.text();
    console.log("Status:", res.status);
    
    try {
      const json = JSON.parse(text);
      console.log("Resultado JSON:", JSON.stringify(json, null, 2));
    } catch (e) {
      console.log("La respuesta no es JSON. Primeros 200 caracteres:");
      console.log(text.substring(0, 200));
    }
  } catch (err) {
    console.error("Error de red:", err);
  }
}
test();
