const query = `
  query GetCustomer {
    customer {
      id
      databaseId
      firstName
      lastName
      email
      shipping {
        address1
        address2
        city
        state
        postcode
        country
      }
      orders(first: 20) {
        nodes {
          id
          orderKey
          orderNumber
          status
          total
          date
          enviaTrackingCode
          enviaCarrier
          metaData {
            key
            value
          }
          lineItems {
            nodes {
              product {
                node {
                  name
                }
              }
              quantity
            }
          }
        }
      }
      comisiones
    }
  }
`;

async function testQuery() {
  console.log("Intentando consultar GetCustomer con un token inválido/vacío...");
  try {
    const res = await fetch("https://nakamabordados.com/graphql", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        // No enviamos auth header
      },
      body: JSON.stringify({ query })
    });
    
    const text = await res.text();
    console.log("Status:", res.status);
    console.log("Response:", text);
  } catch (error) {
    console.error("Error:", error);
  }
}

testQuery();