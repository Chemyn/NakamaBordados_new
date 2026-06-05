const query = `
  query GetSingleProduct($id: ID!) {
    product(id: $id, idType: SLUG) {
      id
      databaseId
      name
      slug
    }
  }
`;

async function test() {
  const slug = "tony-chopper-doctor-pirata"; // Use a known slug from previous tests
  console.log(`Fetching product with slug: ${slug}`);
  
  const res = await fetch("https://nakamabordados.com/graphql", {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      'Accept': 'application/json',
      'Origin': 'https://nakamabordados.com',
      'Referer': 'https://nakamabordados.com/'
    },
    body: JSON.stringify({ query, variables: { id: slug } })
  });
  
  const text = await res.text();
  try {
    const data = JSON.parse(text);
    console.log("Response:", JSON.stringify(data, null, 2));
  } catch {
    console.log("Response is not JSON. Text starts with:", text.substring(0, 500));
  }
}

test();