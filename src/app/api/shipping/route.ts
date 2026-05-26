import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // We expect { postcode, state, city, cart }
    if (!body.postcode || !body.cart || !Array.isArray(body.cart)) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const token = 'ffdc74c1e385071b3094f4d76f5ff8a8d3ef081710858db64745b8713bd52893';
    
    // Calculate total weight based on quantity (assuming 1kg per item)
    let totalItems = 0;
    for (const item of body.cart) {
      totalItems += item.quantity || 1;
    }

    // Prepare Envia.com package payload
    const enviaPayloadTemplate = {
      "origin": {
          "name": "Nakama",
          "company": "Nakama Bordados",
          "email": "info@nakamabordados.com",
          "phone": "8180000000", // Placeholder if the user hasn't provided a specific origin phone
          "street": "Bujalance Oriente",
          "number": "7",
          "district": "Puerta Real Residencial VII",
          "city": "Hermosillo",
          "state": "SO",
          "country": "MX",
          "postalCode": "83177",
          "reference": ""
      },
      "destination": {
          "name": "Cliente",
          "company": "",
          "email": "cliente@example.com",
          "phone": "8180000000",
          "street": "Calle",
          "number": "1",
          "district": body.city || "Centro",
          "city": body.city || "Hermosillo",
          "state": body.state || "SO",
          "country": "MX",
          "postalCode": body.postcode,
          "reference": ""
      },
      "packages": [
          {
              "content": "Ropa",
              "amount": 1,
              "type": "box",
              "dimensions": {
                  "length": 30,
                  "width": 25,
                  "height": 5
              },
              "weight": totalItems, // 1 kg per item (total items * 1kg)
              "insurance": 0,
              "declaredValue": 0,
              "weightUnit": "KG",
              "lengthUnit": "CM"
          }
      ],
      "settings": {
          "printFormat": "PDF",
          "printSize": "STOCK_4X6",
          "comments": ""
      }
    };

    // We must query each carrier individually because Envia API requires specific carriers in shipment object
    const carriers = ['fedex', 'estafeta', 'dhl', 'redpack'];
    
    const ratePromises = carriers.map(async (carrier) => {
      const payload = {
        ...enviaPayloadTemplate,
        shipment: {
          carrier: carrier,
          type: 1
        }
      };
      
      const response = await fetch('https://api.envia.com/ship/rate/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) return null;
      const data = await response.json();
      if (data && data.meta === 'rate' && Array.isArray(data.data)) {
        return data.data;
      }
      return null;
    });

    const results = await Promise.all(ratePromises);
    
    // Flatten and format results to match WooCommerce GraphQL expected structure
    const formattedRates: { id: string; method_id: string; label: string; cost: string }[] = [];
    
    results.forEach((carrierRates: { carrierDescription: string; serviceDescription: string; deliveryEstimate: string; totalPrice: number; carrier: string; serviceId: number }[] | null) => {
      if (carrierRates && Array.isArray(carrierRates)) {
        carrierRates.forEach((rate) => {
          formattedRates.push({
            id: `envia_${rate.carrier}_${rate.serviceId}`,
            method_id: `envia_shipping`, // Keep consistent with plugin if possible
            label: `${rate.carrierDescription} - ${rate.serviceDescription} (${rate.deliveryEstimate})`,
            cost: rate.totalPrice.toString()
          });
        });
      }
    });
    
    // Wrap in a package structure like WooCommerce does
    const responseData = [
      {
        package: 0,
        rates: formattedRates
      }
    ];

    return NextResponse.json(responseData);
    
  } catch (error) {
    console.error("Envia Direct API Proxy Error:", error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
