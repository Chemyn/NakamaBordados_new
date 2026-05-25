const q = `query { 
  productCategories(first: 100, where: { hideEmpty: true }) { 
    nodes { 
      databaseId 
      id 
      name 
      slug 
      parent { 
        node { 
          id 
          name 
          slug
        } 
      } 
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
