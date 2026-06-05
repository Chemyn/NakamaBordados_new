const query = `
  query GetProducts($first: Int!) {
    products(first: $first) {
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
          shortDescription
          description
          image {
            sourceUrl
            altText
          }
          galleryImages {
            nodes {
              sourceUrl
              altText
            }
          }
          productCategories {
            nodes {
              name
              slug
            }
          }
          productTags {
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
          variations(first: 100) {
            nodes {
              id
              databaseId
              name
              price
              image {
                sourceUrl
              }
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
`;

async function test() {
  console.log("Fetching...");
  const res = await fetch("https://nakamabordados.com/graphql", {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    },
    body: JSON.stringify({ query, variables: { first: 100 } })
  });
  
  console.log("Status:", res.status);
  const text = await res.text();
  console.log("Response:", text.substring(0, 500));
}

test();