const q = `query { 
  products(first: 2) { 
    nodes { 
      ... on Product {
        databaseId 
        id 
        name 
        slug 
        description 
        image { sourceUrl altText } 
        productCategories { nodes { name slug } } 
      }
      ... on SimpleProduct { price regularPrice salePrice } 
      ... on VariableProduct { price regularPrice salePrice } 
    } 
  } 
}`;

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

fetch('https://nakamabordados.com/graphql', { 
  method: 'POST', 
  headers: { 'Content-Type': 'application/json' }, 
  body: JSON.stringify({ query: q }) 
})
.then(res => res.json())
.then(data => console.log(JSON.stringify(data, null, 2)))
.catch(console.error);
