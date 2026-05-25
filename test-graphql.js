async function test() {
  const cats = ['edicion-especial', 'variedad', 'lisas'];
  for (const c of cats) {
    try {
      const res = await fetch('https://nakamabordados.com/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            query {
              products(where: { category: "${c}" }) {
                nodes {
                  name
                }
              }
            }
          `
        })
      });
      const json = await res.json();
      console.log(`Category ${c}:`, JSON.stringify(json, null, 2));
    } catch (err) {
      console.error(`Fetch Error ${c}: `, err);
    }
  }
}
test();
