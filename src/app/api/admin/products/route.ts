import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { isAdmin } from '@/lib/auth';

function slugify(text: string) {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/\s+/g, '-') // replace spaces with -
    .replace(/[^\w\-]+/g, '') // remove all non-word chars
    .replace(/\-\-+/g, '-') // replace multiple - with single -
    .replace(/^-+/, '') // trim - from start
    .replace(/-+$/, ''); // trim - from end
}

export async function POST(request: Request) {
  const connection = await pool.getConnection();
  try {
    const authorized = await isAdmin(request);
    if (!authorized) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { 
      name, 
      sku, 
      description, 
      short_description, 
      price, 
      regular_price, 
      sale_price, 
      image_url, 
      categories = [], // Array of category names or IDs
      variations = [],
      gallery = [] // Array of gallery image URLs
    } = body;

    if (!name || !sku || price === undefined) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Generate unique slug
    let baseSlug = slugify(name);
    let slug = baseSlug;
    let slugExists = true;
    let counter = 1;
    
    while (slugExists) {
      const [rows] = await connection.execute('SELECT id FROM products WHERE slug = ?', [slug]);
      if ((rows as any[]).length === 0) {
        slugExists = false;
      } else {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }
    }

    // Start database transaction to ensure ACID safety
    await connection.beginTransaction();

    // 1. Insert product record
    const [prodResult] = await connection.execute(`
      INSERT INTO products (name, slug, description, short_description, price, regular_price, sale_price, image_url, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'publish')
    `, [
      name, 
      slug, 
      description || '', 
      short_description || '', 
      parseFloat(price), 
      parseFloat(regular_price || price), 
      sale_price ? parseFloat(sale_price) : null,
      image_url || null
    ]);

    const productId = (prodResult as any).insertId;

    // 2. Insert Gallery Images
    if (gallery.length > 0) {
      for (let i = 0; i < gallery.length; i++) {
        await connection.execute(
          'INSERT INTO product_images (product_id, image_url, sort_order) VALUES (?, ?, ?)',
          [productId, gallery[i], i]
        );
      }
    } else if (image_url) {
      // Add primary image to gallery too
      await connection.execute(
        'INSERT INTO product_images (product_id, image_url, sort_order) VALUES (?, ?, 0)',
        [productId, image_url]
      );
    }

    // 3. Associate Categories
    for (const catNameOrSlug of categories) {
      // Find category ID by slug or name
      const [catRows] = await connection.execute(
        'SELECT id FROM categories WHERE name = ? OR slug = ? LIMIT 1',
        [catNameOrSlug, slugify(catNameOrSlug)]
      );
      
      let categoryId;
      const cats = catRows as any[];
      if (cats.length > 0) {
        categoryId = cats[0].id;
      } else {
        // Create new category if it doesn't exist
        const [insertCatResult] = await connection.execute(
          'INSERT INTO categories (name, slug) VALUES (?, ?)',
          [catNameOrSlug, slugify(catNameOrSlug)]
        );
        categoryId = (insertCatResult as any).insertId;
      }

      // Map product to category
      await connection.execute(
        'INSERT INTO product_category_mapping (product_id, category_id) VALUES (?, ?)',
        [productId, categoryId]
      );
    }

    // 4. Insert Variations and their Attributes
    for (let j = 0; j < variations.length; j++) {
      const v = variations[j];
      const vSku = v.sku || `${sku}-${j + 1}`;
      const vPrice = v.price || price;
      const vImage = v.image_url || image_url;
      const vStock = v.stock_quantity !== undefined ? v.stock_quantity : 10;

      const [varResult] = await connection.execute(`
        INSERT INTO product_variations (product_id, sku, price, image_url, stock_quantity)
        VALUES (?, ?, ?, ?, ?)
      `, [productId, vSku, parseFloat(vPrice), vImage, vStock]);

      const variationId = (varResult as any).insertId;

      // Insert attributes (Color, Estilo, Talla)
      if (v.attributes && typeof v.attributes === 'object') {
        for (const [attrName, attrVal] of Object.entries(v.attributes)) {
          if (attrVal) {
            await connection.execute(`
              INSERT INTO product_variation_attributes (variation_id, name, value)
              VALUES (?, ?, ?)
            `, [variationId, attrName, attrVal]);
          }
        }
      }
    }

    await connection.commit();

    return NextResponse.json({
      success: true,
      message: 'Producto creado exitosamente en la base de datos',
      productId: productId,
      slug: slug
    });

  } catch (error) {
    await connection.rollback();
    console.error('[API Create Product] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    connection.release();
  }
}
