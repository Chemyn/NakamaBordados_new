import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { isAdmin } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    // 1. Check if user is administrator
    const authorized = await isAdmin(request);
    if (!authorized) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'month'; // 'day', 'month', 'year'

    // We specify 'o.created_at' to prevent ambiguity in JOIN queries
    let dateCondition = '';
    if (filter === 'day') {
      dateCondition = 'AND DATE(o.created_at) = CURDATE()';
    } else if (filter === 'month') {
      dateCondition = 'AND MONTH(o.created_at) = MONTH(CURDATE()) AND YEAR(o.created_at) = YEAR(CURDATE())';
    } else if (filter === 'year') {
      dateCondition = 'AND YEAR(o.created_at) = YEAR(CURDATE())';
    }

    // 1. Fetch Net Sales for current filter
    const [salesRows] = await pool.execute(`
      SELECT COALESCE(SUM(o.total), 0) as netSales, COUNT(*) as orderCount 
      FROM orders o
      WHERE o.status = 'completed' ${dateCondition}
    `);
    const { netSales, orderCount } = (salesRows as any[])[0];

    // 2. Fetch Net Sales grouped by period for comparison chart
    let timeGroupSql = '';
    if (filter === 'day') {
      // Group by hour
      timeGroupSql = `
        SELECT HOUR(o.created_at) as label, SUM(o.total) as value 
        FROM orders o 
        WHERE o.status = 'completed' AND DATE(o.created_at) = CURDATE() 
        GROUP BY HOUR(o.created_at) 
        ORDER BY HOUR(o.created_at) ASC`;
    } else if (filter === 'month') {
      // Group by day of month
      timeGroupSql = `
        SELECT DAY(o.created_at) as label, SUM(o.total) as value 
        FROM orders o 
        WHERE o.status = 'completed' AND MONTH(o.created_at) = MONTH(CURDATE()) AND YEAR(o.created_at) = YEAR(CURDATE()) 
        GROUP BY DAY(o.created_at) 
        ORDER BY DAY(o.created_at) ASC`;
    } else {
      // Group by month of year
      timeGroupSql = `
        SELECT MONTH(o.created_at) as label, SUM(o.total) as value 
        FROM orders o 
        WHERE o.status = 'completed' AND YEAR(o.created_at) = YEAR(CURDATE()) 
        GROUP BY MONTH(o.created_at) 
        ORDER BY MONTH(o.created_at) ASC`;
    }
    const [chartRows] = await pool.execute(timeGroupSql);

    // 3. Best Sellers (Most sold products)
    const [bestSellersRows] = await pool.execute(`
      SELECT oi.product_name as name, SUM(oi.quantity) as salesCount, SUM(oi.price * oi.quantity) as totalRevenue
      FROM order_items oi
      INNER JOIN orders o ON oi.order_id = o.id
      WHERE o.status = 'completed' ${dateCondition}
      GROUP BY oi.product_name
      ORDER BY salesCount DESC
      LIMIT 5
    `);

    // 4. Worst Sellers (Least sold products)
    const [worstSellersRows] = await pool.execute(`
      SELECT p.name, COALESCE(SUM(oi.quantity), 0) as salesCount
      FROM products p
      LEFT JOIN order_items oi ON p.id = oi.product_id
      LEFT JOIN orders o ON oi.order_id = o.id AND o.status = 'completed' ${dateCondition}
      GROUP BY p.id, p.name
      ORDER BY salesCount ASC
      LIMIT 5
    `);

    // 5. Overall Sales Summary
    const [overallSummaryRows] = await pool.execute(`
      SELECT 
        (SELECT COALESCE(SUM(o.total), 0) FROM orders o WHERE o.status = 'completed' AND DATE(o.created_at) = CURDATE()) as salesToday,
        (SELECT COALESCE(SUM(o.total), 0) FROM orders o WHERE o.status = 'completed' AND MONTH(o.created_at) = MONTH(CURDATE()) AND YEAR(o.created_at) = YEAR(CURDATE())) as salesThisMonth,
        (SELECT COALESCE(SUM(o.total), 0) FROM orders o WHERE o.status = 'completed' AND YEAR(o.created_at) = YEAR(CURDATE())) as salesThisYear
    `);
    const summary = (overallSummaryRows as any[])[0];

    return NextResponse.json({
      success: true,
      data: {
        filter,
        netSales: parseFloat(netSales),
        orderCount,
        summary: {
          today: parseFloat(summary.salesToday),
          month: parseFloat(summary.salesThisMonth),
          year: parseFloat(summary.salesThisYear)
        },
        chartData: chartRows,
        bestSellers: bestSellersRows,
        worstSellers: worstSellersRows
      }
    });

  } catch (error) {
    console.error('[API Admin Sales] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
