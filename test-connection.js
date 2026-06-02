async function test() {
  console.log("Iniciando prueba de conexión con cabeceras de navegador...");
  try {
      query: `
        query GetCategories {
          productCategories(first: 100) {
            nodes {
              name
              slug
              parent {
                node {
                  slug
                }
              }
            }
          }
        }
      `
    
    const text = await res.text();
    console.log("Status:", res.status);
    
    try {
      const json = JSON.parse(text);
      console.log("Resultado JSON:", JSON.stringify(json, null, 2));
    } catch {
      console.log("La respuesta no es JSON. Primeros 200 caracteres:");
      console.log(text.substring(0, 200));
    }
  } catch (err) {
    console.error("Error de red:", err);
  }
}
test();
