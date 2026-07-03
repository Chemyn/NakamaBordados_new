import mysql from 'mysql2/promise';

export const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// El prefijo detectado en los logs es 'wpr8_'
const PREFIX = 'wpr8_';

export interface SQLProduct {
  databaseId: number;
  post_title: string;
  post_name: string;
  post_content: string;
  post_excerpt: string;
  price?: string;
  regular_price?: string;
  sale_price?: string;
  image_url?: string;
  categories?: { name: string; slug: string }[];
  tags?: { name: string; slug: string }[];
}

export interface GetProductsOptions {
  limit?: number;
  offset?: number;
  category?: string;
  search?: string;
  tag?: string;
  include?: number[];
}

export async function getProductsSQL(options: GetProductsOptions = {}): Promise<SQLProduct[] | null> {
  const { limit = 20, offset = 0, category, search, tag, include } = options;
  
  try {
    const whereClauses = ["p.post_type = 'product'", "p.post_status = 'publish'"];
    const params: (string | number)[] = [];
// ... (omitted parts for brevity in my thought, but I'll provide full replacement)

    if (include && include.length > 0) {
      whereClauses.push(`p.ID IN (${include.map(() => '?').join(',')})`);
      params.push(...include);
    }

    if (search) {
      whereClauses.push(`(
        p.post_title LIKE ? 
        OR p.post_content LIKE ?
        OR p.ID IN (
          SELECT tr.object_id 
          FROM ${PREFIX}term_relationships tr
          INNER JOIN ${PREFIX}term_taxonomy tt ON tr.term_taxonomy_id = tt.term_taxonomy_id
          INNER JOIN ${PREFIX}terms t ON tt.term_id = t.term_id
          WHERE t.name LIKE ? OR t.slug LIKE ?
        )
      )`);
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    if (category) {
      // Recursive subquery to get products in this category OR any of its children
      whereClauses.push(`p.ID IN (
        SELECT DISTINCT tr.object_id 
        FROM ${PREFIX}term_relationships tr
        INNER JOIN ${PREFIX}term_taxonomy tt ON tr.term_taxonomy_id = tt.term_taxonomy_id
        WHERE tt.term_id IN (
          WITH RECURSIVE cat_tree AS (
            SELECT term_id FROM ${PREFIX}term_taxonomy WHERE term_id IN (SELECT term_id FROM ${PREFIX}terms WHERE slug = ?)
            UNION ALL
            SELECT tt_child.term_id FROM ${PREFIX}term_taxonomy tt_child INNER JOIN cat_tree ct ON tt_child.parent = ct.term_id
          )
          SELECT term_id FROM cat_tree
        )
      )`);
      params.push(category);
    }

    if (tag) {
      whereClauses.push(`p.ID IN (
        SELECT DISTINCT tr.object_id 
        FROM ${PREFIX}term_relationships tr
        INNER JOIN ${PREFIX}term_taxonomy tt ON tr.term_taxonomy_id = tt.term_taxonomy_id
        INNER JOIN ${PREFIX}terms t ON tt.term_id = t.term_id
        WHERE tt.taxonomy = 'product_tag' AND t.slug = ?
      )`);
      params.push(tag);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    
    // Improved sorting: if specific IDs are provided (e.g. from search), keep that order
    let orderSql = 'ORDER BY p.post_date DESC, p.ID DESC';
    if (include && include.length > 0 && !search && !category && !tag) {
       const safeIds = include.map(Number).filter(n => !isNaN(n));
       if (safeIds.length > 0) {
         orderSql = `ORDER BY FIELD(p.ID, ${safeIds.join(',')})`;
       }
    }

    const sql = `
      SELECT DISTINCT
        p.ID as databaseId, 
        p.post_title, 
        p.post_name, 
        p.post_content, 
        p.post_excerpt,
        (SELECT meta_value FROM ${PREFIX}postmeta WHERE post_id = p.ID AND meta_key = '_price' LIMIT 1) as price,
        (SELECT meta_value FROM ${PREFIX}postmeta WHERE post_id = p.ID AND meta_key = '_regular_price' LIMIT 1) as regular_price,
        (SELECT meta_value FROM ${PREFIX}postmeta WHERE post_id = p.ID AND meta_key = '_sale_price' LIMIT 1) as sale_price,
        (SELECT guid FROM ${PREFIX}posts WHERE ID = (SELECT meta_value FROM ${PREFIX}postmeta WHERE post_id = p.ID AND meta_key = '_thumbnail_id' LIMIT 1)) as image_url
      FROM ${PREFIX}posts p
      ${whereSql}
      ${orderSql}
      LIMIT ? OFFSET ?
    `;

    // Ensure parameters are numbers
    params.push(Number(limit), Number(offset));

    const [rows] = await pool.execute(sql, params);
    const products = rows as SQLProduct[];

    // Add categories to each product
    for (const product of products) {
      const catSql = `
        SELECT t.name, t.slug
        FROM ${PREFIX}terms t
        INNER JOIN ${PREFIX}term_taxonomy tt ON t.term_id = tt.term_id
        INNER JOIN ${PREFIX}term_relationships tr ON tt.term_taxonomy_id = tr.term_taxonomy_id
        WHERE tr.object_id = ? AND tt.taxonomy = 'product_cat'
      `;
      const [cats] = await pool.execute(catSql, [product.databaseId.toString()]);
      product.categories = cats as { name: string; slug: string }[];
    }

    return products;
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    if (err.code === 'ECONNREFUSED' || err.message?.includes('ECONNREFUSED')) {
      console.log('💡 INFO: Base de datos local no disponible. Usando respaldo.');
    } else {
      console.error('SQL Error Detail:', error);
    }
    return null; // Always return null on error to trigger fallback
  }
}

export async function getProductBySlugSQL(slug: string): Promise<SQLProduct | null> {
  try {
    const sql = `
      SELECT 
        p.ID as databaseId, 
        p.post_title, 
        p.post_name, 
        p.post_content, 
        p.post_excerpt,
        (SELECT meta_value FROM ${PREFIX}postmeta WHERE post_id = p.ID AND meta_key = '_price' LIMIT 1) as price,
        (SELECT meta_value FROM ${PREFIX}postmeta WHERE post_id = p.ID AND meta_key = '_regular_price' LIMIT 1) as regular_price,
        (SELECT meta_value FROM ${PREFIX}postmeta WHERE post_id = p.ID AND meta_key = '_sale_price' LIMIT 1) as sale_price,
        (SELECT guid FROM ${PREFIX}posts WHERE ID = (SELECT meta_value FROM ${PREFIX}postmeta WHERE post_id = p.ID AND meta_key = '_thumbnail_id' LIMIT 1)) as image_url
      FROM ${PREFIX}posts p
      WHERE p.post_name = ? AND p.post_type = 'product' AND p.post_status = 'publish'
      LIMIT 1
    `;

    const [rows] = await pool.execute(sql, [slug]);
    const products = rows as SQLProduct[];
    if (products.length === 0) return null;

    const product = products[0];
    
    // Add categories
    const catSql = `
      SELECT t.name, t.slug
      FROM ${PREFIX}terms t
      INNER JOIN ${PREFIX}term_taxonomy tt ON t.term_id = tt.term_id
      INNER JOIN ${PREFIX}term_relationships tr ON tt.term_taxonomy_id = tr.term_taxonomy_id
      WHERE tr.object_id = ? AND tt.taxonomy = 'product_cat'
    `;
    const [cats] = await pool.execute(catSql, [product.databaseId.toString()]);
    product.categories = cats as { name: string; slug: string }[];

    // Add variations
    const varSql = `
      SELECT 
        v.ID as databaseId,
        (SELECT meta_value FROM ${PREFIX}postmeta WHERE post_id = v.ID AND meta_key = '_price' LIMIT 1) as price,
        (SELECT guid FROM ${PREFIX}posts WHERE ID = (SELECT meta_value FROM ${PREFIX}postmeta WHERE post_id = v.ID AND meta_key = '_thumbnail_id' LIMIT 1)) as image_url
      FROM ${PREFIX}posts v
      WHERE v.post_parent = ? AND v.post_type = 'product_variation' AND v.post_status = 'publish'
    `;
    const [vars] = await pool.execute(varSql, [product.databaseId.toString()]);
    const sqlVars = vars as any[];
    
    const formattedVars = [];
    for (const v of sqlVars) {
      // Fetch variation attributes
      const metaSql = `SELECT meta_key, meta_value FROM ${PREFIX}postmeta WHERE post_id = ? AND meta_key LIKE 'attribute_pa_%'`;
      const [meta] = await pool.execute(metaSql, [v.databaseId.toString()]);
      const attributes: Record<string, string> = {};
      (meta as any[]).forEach(m => {
        const name = m.meta_key.replace('attribute_pa_', '');
        attributes[name] = m.meta_value;
      });

      formattedVars.push({
        databaseId: v.databaseId,
        price: v.price,
        image_url: v.image_url,
        attributes
      });
    }
    
    (product as any).sql_variations = formattedVars;

    return product;
  } catch (error: unknown) {
    console.log('💡 INFO: Producto local no disponible. Usando respaldo.');
    return null;
  }
}

export async function getCategoriesSQL(): Promise<any[] | null> {
  try {
    const sql = `
      SELECT 
        t.term_id as databaseId, 
        t.name, 
        t.slug, 
        tt.parent,
        (SELECT slug FROM ${PREFIX}terms WHERE term_id = tt.parent) as parent_slug
      FROM ${PREFIX}terms t
      INNER JOIN ${PREFIX}term_taxonomy tt ON t.term_id = tt.term_id
      WHERE tt.taxonomy = 'product_cat'
      ORDER BY t.name ASC
    `;
    const [rows] = await pool.execute(sql);
    return rows as any[];
  } catch (error: unknown) {
    console.log('💡 INFO: Categorías locales no disponibles. Usando respaldo.');
    return null;
  }
}

export async function searchProductIdsBySQL(query: string): Promise<number[] | null> {
  try {
    const searchTerm = `%${query}%`;

    const sql = `
      SELECT DISTINCT p.ID
      FROM ${PREFIX}posts p
      LEFT JOIN ${PREFIX}term_relationships tr ON p.ID = tr.object_id
      LEFT JOIN ${PREFIX}term_taxonomy tt ON tr.term_taxonomy_id = tt.term_taxonomy_id
      LEFT JOIN ${PREFIX}terms t ON tt.term_id = t.term_id
      WHERE p.post_type = 'product'
        AND p.post_status = 'publish'
        AND (
          p.post_title LIKE ? 
          OR p.post_content LIKE ?
          OR t.name LIKE ?
          OR t.slug LIKE ?
        )
      LIMIT 100
    `;

    const [rows] = await pool.execute(sql, [searchTerm, searchTerm, searchTerm, searchTerm]);
    
    const ids = (rows as { ID: number }[]).map(row => row.ID);
    return ids;
  } catch (error: unknown) {
    console.log('💡 INFO: Búsqueda local no disponible. Usando respaldo.');
    return null;
  }
}

export async function searchTaxonomyBySQL(query: string): Promise<{ categories: any[], tags: any[] } | null> {
  try {
    const searchTerm = `%${query}%`;
    const sql = `
      SELECT t.term_id, t.name, t.slug, tt.taxonomy
      FROM ${PREFIX}terms t
      INNER JOIN ${PREFIX}term_taxonomy tt ON t.term_id = tt.term_id
      WHERE (tt.taxonomy = 'product_cat' OR tt.taxonomy = 'product_tag')
        AND (t.name LIKE ? OR t.slug LIKE ?)
      LIMIT 50
    `;

    const [rows] = await pool.execute(sql, [searchTerm, searchTerm]);
    const results = rows as { term_id: number; name: string; slug: string; taxonomy: string }[];

    return {
      categories: results.filter(r => r.taxonomy === 'product_cat').map(r => ({
        id: r.term_id,
        name: r.name,
        slug: r.slug
      })),
      tags: results.filter(r => r.taxonomy === 'product_tag').map(r => ({
        databaseId: r.term_id,
        name: r.name,
        slug: r.slug
      }))
    };
  } catch (error: unknown) {
    console.log('💡 INFO: Taxonomía local no disponible. Usando respaldo.');
    return null;
  }
}

// ============================================================
//  USUARIOS (tabla local `users`, post-decomisión de WordPress)
// ============================================================
export interface SQLUser {
  id: number;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  role: string | null;
  created_at: string | null;
  orders_count: number;
  total_spent: string; // decimal serializado
}

export interface GetUsersOptions {
  limit?: number;
  offset?: number;
  search?: string;
}

/**
 * Lee los usuarios registrados desde la base de datos local, enriquecidos
 * con el número de pedidos y el total gastado (pedidos completados).
 * NUNCA expone el hash de la contraseña.
 */
export async function getUsersSQL(options: GetUsersOptions = {}): Promise<SQLUser[] | null> {
  const { limit = 100, offset = 0, search } = options;
  try {
    const params: (string | number)[] = [];
    let whereSql = '';
    if (search && search.trim()) {
      const pattern = `%${search.trim()}%`;
      whereSql = `WHERE (u.email LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ? OR u.phone LIKE ?)`;
      params.push(pattern, pattern, pattern, pattern);
    }

    const safeLimit = Math.max(1, Math.min(Number(limit) || 100, 500));
    const safeOffset = Math.max(0, Number(offset) || 0);

    const sql = `
      SELECT
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.phone,
        u.role,
        u.created_at,
        COUNT(o.id) AS orders_count,
        COALESCE(SUM(CASE WHEN o.status = 'completed' THEN o.total ELSE 0 END), 0) AS total_spent
      FROM users u
      LEFT JOIN orders o ON o.user_id = u.id
      ${whereSql}
      GROUP BY u.id, u.email, u.first_name, u.last_name, u.phone, u.role, u.created_at
      ORDER BY u.created_at DESC, u.id DESC
      LIMIT ${safeLimit} OFFSET ${safeOffset}
    `;

    const [rows] = await pool.execute(sql, params);
    return rows as SQLUser[];
  } catch (error) {
    const err = error as { code?: string; message?: string };
    console.error('[getUsersSQL] Error:', err.code, err.message);
    return null;
  }
}
