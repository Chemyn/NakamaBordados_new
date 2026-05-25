async function test() {
  try {
    const res = await fetch('https://nakamabordados.com/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          query GetProducts($first: Int!, $after: String) {
            products(first: $first, after: $after) {
              pageInfo {
                hasNextPage
                endCursor
              }
              nodes {
                ... on Product {
                  databaseId
                  id
                  name
                  slug
                  description
                  image {
                    sourceUrl
                    altText
                  }
                  productCategories {
                    nodes {
                      name
                      slug
                    }
                  }
                }
                ... on SimpleProduct {
                  price
                  regularPrice
                  salePrice
                }
                ... on VariableProduct {
                  price
                  regularPrice
                  salePrice
                  variations {
                    nodes {
                      id
                      databaseId
                      name
                      price
                      attributes {
                        nodes {
                          name
                          value
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        `,
        variables: { first: 1 }
      })
    });
    const json = await res.json();
    console.log(JSON.stringify(json, null, 2));
  } catch (err) {
    console.error("Fetch Error: ", err);
  }
}
test();
