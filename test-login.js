const query = `
  mutation LoginUser($username: String!, $password: String!) {
    login(input: {
      clientMutationId: "uniqueId",
      username: $username,
      password: $password
    }) {
      authToken
      user {
        id
        databaseId
        name
      }
    }
  }
`;

async function testLogin() {
  console.log("Intentando iniciar sesión con credenciales de prueba...");
  try {
    const res = await fetch("https://nakamabordados.com/graphql", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      },
      // Usaremos un usuario dummy para ver qué responde el servidor
      body: JSON.stringify({ query, variables: { username: "testuser", password: "testpassword" } })
    });
    
    const text = await res.text();
    console.log("Status:", res.status);
    console.log("Response:", text);
  } catch (error) {
    console.error("Error:", error);
  }
}

testLogin();