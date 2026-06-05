/* eslint-disable @typescript-eslint/no-require-imports */
// Note: This needs to run in a Next.js environment or mock the fetchGraphQL.
// Since I can't easily run Next.js code here, I'll use a script that manually calls the SQL handler.
const { handleLocalGraphQL } = require('./src/lib/local-graphql-handler');

async function test() {
  console.log("Probando el enrutamiento SQL local...");
  
  const query = `
    query GetProducts($first: Int!) {
      products(first: $first) {
        nodes {
          databaseId
          name
          slug
        }
      }
    }
  `;
  
  const variables = { first: 5 };

  try {
    const result = await handleLocalGraphQL(query, variables);
    if (result && result.data) {
      console.log("¡Éxito! Datos recuperados vía SQL:");
      result.data.products.nodes.forEach(p => {
        console.log(`- [${p.databaseId}] ${p.name} (${p.slug})`);
      });
    } else {
      console.log("La consulta no fue manejada localmente o no devolvió datos.");
    }
  } catch (err) {
    console.error("Error probando el handler local:", err);
  }
}

test();
