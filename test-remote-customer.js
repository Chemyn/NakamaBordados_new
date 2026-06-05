async function testCustomer() {
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
        orders(first: 5) {
          nodes {
            id
            orderNumber
            status
          }
        }
      }
    }
  `;
  
  try {
    const res = await fetch('https://nakamabordados.com/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(err);
  }
}

testCustomer();
