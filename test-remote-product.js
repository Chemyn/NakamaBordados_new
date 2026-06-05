async function checkProduct() {
  const query = `
    query GetSingleProduct($id: ID!) {
      product(id: $id, idType: SLUG) {
        name
        slug
        databaseId
      }
    }
  `;
  
  try {
    const res = await fetch('https://nakamabordados.com/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        variables: { id: 'gorra-dodgers-x-one-piece' }
      })
    });
    
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(err);
  }
}

checkProduct();
