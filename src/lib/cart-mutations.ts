import { fetchGraphQL } from './graphql-client';

// We need a helper to manage the session token
export const SESSION_KEY = 'woo-session';

export function getSessionToken() {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(SESSION_KEY);
  }
  return null;
}

export function setSessionToken(token: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(SESSION_KEY, token);
  }
}

// Ensure headers include the session token
function getAuthHeaders() {
  const sessionToken = getSessionToken();
  const headers: Record<string, string> = {};
  if (sessionToken) {
    headers['woocommerce-session'] = `Session ${sessionToken}`;
  }
  // If user is logged in, we also include the auth token
  const authToken = typeof window !== 'undefined' ? localStorage.getItem('wp-jwt') : null;
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  return headers;
}

// Queries & Mutations
const GET_CART_QUERY = `
  query GetCart {
    cart {
      contents(first: 100) {
        itemCount
        nodes {
          key
          product {
            node {
              id
              databaseId
              name
              slug
              image {
                sourceUrl
              }
            }
          }
          quantity
          total
          subtotal
        }
      }
      total
      subtotal
      shippingTotal
    }
  }
`;

const ADD_TO_CART_MUTATION = `
  mutation AddToCart($productId: Int!, $variationId: Int, $quantity: Int!) {
    addToCart(input: { productId: $productId, variationId: $variationId, quantity: $quantity }) {
      cartItem {
        key
        product {
          node {
            name
          }
        }
        quantity
      }
    }
  }
`;

const REMOVE_FROM_CART_MUTATION = `
  mutation RemoveFromCart($keys: [ID!]!) {
    removeItemsFromCart(input: { keys: $keys }) {
      cart {
        contents {
          itemCount
        }
      }
    }
  }
`;

const UPDATE_ITEM_QUANTITIES_MUTATION = `
  mutation UpdateItemQuantities($items: [CartItemQuantityInput]!) {
    updateItemQuantities(input: { items: $items }) {
      cart {
        contents {
          itemCount
        }
      }
    }
  }
`;

const EMPTY_CART_MUTATION = `
  mutation EmptyCart {
    emptyCart(input: {clearPersistentCart: false}) {
      cart {
        isEmpty
      }
    }
  }
`;

const UPDATE_CUSTOMER_MUTATION = `
  mutation UpdateCustomerShipping($postcode: String!, $country: CountriesEnum!, $state: String!, $city: String!) {
    updateCustomer(input: {
      shipping: {
        postcode: $postcode,
        country: $country,
        state: $state,
        city: $city
      }
    }) {
      customer {
        shipping {
          postcode
        }
      }
    }
  }
`;

const GET_SHIPPING_RATES_QUERY = `
  query GetShippingRates {
    cart {
      availableShippingMethods {
        packageDetails
        rates {
          id
          label
          cost
        }
      }
    }
  }
`;

// Functions

export async function emptyCart() {
  const { data } = await fetchGraphQL(EMPTY_CART_MUTATION, {}, getAuthHeaders());
  return data?.emptyCart;
}

export async function fetchCart() {
  const { data, responseHeaders } = await fetchGraphQL(GET_CART_QUERY, {}, getAuthHeaders());
  
  // Try to capture session token if returned
  const sessionToken = responseHeaders.get('woocommerce-session');
  if (sessionToken) {
    setSessionToken(sessionToken);
  }

  return data?.cart;
}

export async function addToCart(productId: number, quantity: number = 1, variationId?: number) {
  const variables: Record<string, unknown> = { productId, quantity };
  if (variationId) {
    variables.variationId = variationId;
  }
  const { data, responseHeaders } = await fetchGraphQL(ADD_TO_CART_MUTATION, variables, getAuthHeaders());
  
  const sessionToken = responseHeaders.get('woocommerce-session');
  if (sessionToken) {
    setSessionToken(sessionToken);
  }

  return data?.addToCart;
}

export async function removeFromCart(key: string) {
  const { data } = await fetchGraphQL(REMOVE_FROM_CART_MUTATION, { keys: [key] }, getAuthHeaders());
  return data?.removeItemsFromCart;
}

export async function updateItemQuantity(key: string, quantity: number) {
  const { data } = await fetchGraphQL(UPDATE_ITEM_QUANTITIES_MUTATION, {
    items: [{ key, quantity }]
  }, getAuthHeaders());
  return data?.updateItemQuantities;
}

export async function updateCustomerShipping(postcode: string, country: string = 'MX', state: string = '', city: string = '') {
  const { data } = await fetchGraphQL(UPDATE_CUSTOMER_MUTATION, { postcode, country, state, city }, getAuthHeaders());
  return data?.updateCustomer;
}

export async function getShippingRates(postcode: string, state: string, city: string, cart: unknown[]) {
  try {
    const formattedCart = (cart as { product: { id: string }; variation?: { id: string }; quantity: number }[]).map(item => {
      const productId = parseInt(item.product.id.replace('WP-', '')) || parseInt(item.product.id);
      let variationId = 0;
      if (item.variation && item.variation.id) {
        const rawVarId = item.variation.id.replace('WP-VAR-', '').replace('WP-', '');
        const parsedVar = parseInt(rawVarId);
        if (!isNaN(parsedVar)) variationId = parsedVar;
      }
      return {
        product_id: productId,
        variation_id: variationId,
        quantity: item.quantity
      };
    });

    const response = await fetch('/api/shipping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postcode, state, city, cart: formattedCart })
    });
    
    if (!response.ok) return [];
    return await response.json();
  } catch (error) {
    console.error("Error fetching shipping rates:", error);
    return [];
  }
}


export async function syncCartWithServer(cart: unknown[]) {
  try {
    // 1. Clear server cart
    await emptyCart();
    
    // 2. Add each item from local cart to server
    for (const itemObj of cart) {
      const item = itemObj as { 
        product: { id: string; databaseId?: number }; 
        variation?: { id: string; databaseId?: number }; 
        quantity: number 
      };
      const productId = item.product.databaseId || parseInt(item.product.id.replace('WP-', '')) || parseInt(item.product.id);
      let variationId = undefined;
      if (item.variation) {
        variationId = item.variation.databaseId || parseInt(item.variation.id.replace('WP-VAR-', '').replace('WP-', ''));
      }
      await addToCart(productId, item.quantity, variationId);
    }
    return true;
  } catch (error) {
    console.error("Error syncing cart with server:", error);
    return false;
  }
}

export async function updateShippingMethod(shippingRateId: string) {
  const mutation = `
    mutation UpdateShippingMethod($shippingMethods: [String]!) {
      updateShippingMethod(input: { shippingMethods: $shippingMethods }) {
        cart {
          chosenShippingMethods
        }
      }
    }
  `;
  const { data } = await fetchGraphQL(mutation, { shippingMethods: [shippingRateId] }, getAuthHeaders());
  return data?.updateShippingMethod;
}
