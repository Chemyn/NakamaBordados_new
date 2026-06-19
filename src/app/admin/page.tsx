'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

// Types
interface Coupon {
  id: number;
  code: string;
  type: string;
  amount: string;
  status: string;
  expiration_date: string | null;
  created_at: string;
}

interface MediaFile {
  name: string;
  url: string;
  uploadedAt: string | null;
}

interface SalesReportData {
  filter: string;
  netSales: number;
  orderCount: number;
  summary: {
    today: number;
    month: number;
    year: number;
  };
  chartData: { label: number; value: string }[];
  bestSellers: { name: string; salesCount: number; totalRevenue: string }[];
  worstSellers: { name: string; salesCount: number }[];
}

export default function AdminDashboardPage() {
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Tabs
  const [activeTab, setActiveTab] = useState<'sales' | 'products' | 'coupons' | 'media' | 'maintenance'>('sales');

  // Sales State
  const [salesFilter, setSalesFilter] = useState<'day' | 'month' | 'year'>('month');
  const [salesData, setSalesData] = useState<SalesReportData | null>(null);
  const [salesLoading, setSalesLoading] = useState(true);

  // Coupons State
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [couponsLoading, setCouponsLoading] = useState(true);
  const [newCoupon, setNewCoupon] = useState({
    code: '',
    type: 'percent',
    amount: '',
    expiration_date: ''
  });

  // Media State
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [mediaLoading, setMediaLoading] = useState(true);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  // Maintenance Settings State
  const [maintenanceSettings, setMaintenanceSettings] = useState({
    maintenance_mode: 'false',
    maintenance_message: '',
    maintenance_image: '',
    instagram: '',
    facebook: '',
    tiktok: ''
  });
  const [maintenanceLoading, setMaintenanceLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  // Product Creation State
  const [productForm, setProductForm] = useState({
    name: '',
    sku: '',
    description: '',
    short_description: '',
    price: '',
    regular_price: '',
    sale_price: '',
    image_url: '',
    categoriesInput: '', // comma separated categories
    galleryInput: '', // comma separated image URLs
  });
  const [productVariations, setProductVariations] = useState<{ sku: string; price: number; attributes: Record<string, string>; stock_quantity: number }[]>([]);
  const [newVariation, setNewVariation] = useState({
    color: '',
    estilo: '',
    talla: '',
    price: '',
    stock: '10'
  });
  const [creatingProduct, setCreatingProduct] = useState(false);

  // Category constants helper
  const AVAILABLE_CATEGORIES = ['Anime', 'Bordados', 'Estampados', 'Sudaderas', 'Hoodies', 'One Piece', 'Gorras', 'Lisas', 'Variedad', 'Lo más vendido'];
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Authentication Guard
  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      router.push('/mi-cuenta');
    }
  }, [user, isAdmin, authLoading, router]);

  // Fetch Sales analytics
  const fetchSalesReport = async (filter: 'day' | 'month' | 'year') => {
    setSalesLoading(true);
    try {
      const res = await fetch(`/api/admin/sales-report?filter=${filter}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('wp-jwt')}` }
      });
      if (res.ok) {
        const body = await res.json();
        setSalesData(body.data);
      }
    } catch (e) {
      console.error('Error fetching sales data:', e);
    } finally {
      setSalesLoading(false);
    }
  };

  // Fetch Coupons list
  const fetchCoupons = async () => {
    setCouponsLoading(true);
    try {
      const res = await fetch('/api/admin/coupons', {
        headers: { Authorization: `Bearer ${localStorage.getItem('wp-jwt')}` }
      });
      if (res.ok) {
        const body = await res.json();
        setCoupons(body.coupons);
      }
    } catch (e) {
      console.error('Error fetching coupons:', e);
    } finally {
      setCouponsLoading(false);
    }
  };

  // Fetch Media list
  const fetchMedia = async () => {
    setMediaLoading(true);
    try {
      const res = await fetch('/api/admin/media', {
        headers: { Authorization: `Bearer ${localStorage.getItem('wp-jwt')}` }
      });
      if (res.ok) {
        const body = await res.json();
        setMediaFiles(body.files);
      }
    } catch (e) {
      console.error('Error fetching media:', e);
    } finally {
      setMediaLoading(false);
    }
  };

  // Fetch Maintenance settings
  const fetchMaintenanceSettings = async () => {
    setMaintenanceLoading(true);
    try {
      const res = await fetch('/api/admin/settings', {
        headers: { Authorization: `Bearer ${localStorage.getItem('wp-jwt')}` }
      });
      if (res.ok) {
        const body = await res.json();
        const s = body.settings || {};
        let social = { facebook: '', instagram: '', tiktok: '' };
        try {
          if (s.social_links) social = JSON.parse(s.social_links);
        } catch (e) { }

        setMaintenanceSettings({
          maintenance_mode: s.maintenance_mode || 'false',
          maintenance_message: s.maintenance_message || '',
          maintenance_image: s.maintenance_image || '',
          instagram: social.instagram || '',
          facebook: social.facebook || '',
          tiktok: social.tiktok || ''
        });
      }
    } catch (e) {
      console.error('Error fetching settings:', e);
    } finally {
      setMaintenanceLoading(false);
    }
  };

  // Fetch Tab Specific Data
  useEffect(() => {
    if (user && isAdmin) {
      if (activeTab === 'sales') fetchSalesReport(salesFilter);
      if (activeTab === 'coupons') fetchCoupons();
      if (activeTab === 'media') fetchMedia();
      if (activeTab === 'maintenance') fetchMaintenanceSettings();
    }
  }, [activeTab, user, isAdmin]);

  // Handle sales filter change
  useEffect(() => {
    if (user && isAdmin && activeTab === 'sales') {
      fetchSalesReport(salesFilter);
    }
  }, [salesFilter]);

  // Create Coupon submit
  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCoupon.code || !newCoupon.amount) return;

    try {
      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('wp-jwt')}`
        },
        body: JSON.stringify({
          code: newCoupon.code,
          type: newCoupon.type,
          amount: parseFloat(newCoupon.amount),
          expiration_date: newCoupon.expiration_date || null
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        alert('Cupón creado con éxito');
        setNewCoupon({ code: '', type: 'percent', amount: '', expiration_date: '' });
        fetchCoupons();
      } else {
        alert(data.error || 'Error al crear cupón');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión');
    }
  };

  // Delete Coupon
  const handleDeleteCoupon = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este cupón?')) return;
    try {
      const res = await fetch(`/api/admin/coupons?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('wp-jwt')}` }
      });
      if (res.ok) {
        alert('Cupón eliminado');
        fetchCoupons();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Save Settings / Maintenance
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('wp-jwt')}`
        },
        body: JSON.stringify({
          maintenance_mode: maintenanceSettings.maintenance_mode,
          maintenance_message: maintenanceSettings.maintenance_message,
          maintenance_image: maintenanceSettings.maintenance_image,
          social_links: {
            facebook: maintenanceSettings.facebook,
            instagram: maintenanceSettings.instagram,
            tiktok: maintenanceSettings.tiktok
          }
        })
      });

      if (res.ok) {
        alert('Configuración guardada correctamente');
      } else {
        alert('Error al guardar configuración');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión');
    } finally {
      setSavingSettings(false);
    }
  };

  // Media File Upload handler
  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingMedia(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/admin/media', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('wp-jwt')}` },
        body: formData
      });

      const body = await res.json();
      if (res.ok && body.success) {
        alert('Archivo subido con éxito!');
        fetchMedia();
      } else {
        alert(body.error || 'Error al subir archivo');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión');
    } finally {
      setUploadingMedia(false);
    }
  };

  // Copy URL to Clipboard
  const handleCopyUrl = (url: string) => {
    const fullUrl = `${window.location.origin}${url}`;
    navigator.clipboard.writeText(fullUrl);
    alert('¡Enlace de archivo copiado al portapapeles!');
  };

  // Category checkbox handler
  const handleCategoryCheckbox = (categoryName: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryName)
        ? prev.filter(c => c !== categoryName)
        : [...prev, categoryName]
    );
  };

  // Add Product Variation to array
  const handleAddVariation = () => {
    if (!newVariation.price) {
      alert('Por favor ingresa un precio para la variante');
      return;
    }

    const attrs: Record<string, string> = {};
    if (newVariation.color) attrs.Color = newVariation.color;
    if (newVariation.estilo) attrs.Estilo = newVariation.estilo;
    if (newVariation.talla) attrs.Talla = newVariation.talla;

    if (Object.keys(attrs).length === 0) {
      alert('Por favor especifica al menos un atributo (Color, Estilo o Talla)');
      return;
    }

    const variationSku = `${productForm.sku || 'PROD'}-${newVariation.estilo || 'VAR'}-${newVariation.color || 'COL'}-${newVariation.talla || 'SZ'}`.toUpperCase();

    setProductVariations(prev => [
      ...prev,
      {
        sku: variationSku,
        price: parseFloat(newVariation.price),
        attributes: attrs,
        stock_quantity: parseInt(newVariation.stock) || 10
      }
    ]);

    // reset var inputs
    setNewVariation({
      color: '',
      estilo: '',
      talla: '',
      price: '',
      stock: '10'
    });
  };

  // Remove Product Variation from array
  const handleRemoveVariation = (idx: number) => {
    setProductVariations(prev => prev.filter((_, i) => i !== idx));
  };

  // Create Product Submit
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name || !productForm.sku || !productForm.price) {
      alert('Nombre, SKU y Precio son requeridos');
      return;
    }

    setCreatingProduct(true);
    
    // Format categories
    const categoriesArray = [...selectedCategories];
    if (productForm.categoriesInput) {
      productForm.categoriesInput.split(',').forEach(c => {
        const trimmed = c.trim();
        if (trimmed && !categoriesArray.includes(trimmed)) categoriesArray.push(trimmed);
      });
    }

    // Format gallery images
    const galleryArray = productForm.galleryInput
      ? productForm.galleryInput.split(',').map(img => img.trim()).filter(Boolean)
      : [];

    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('wp-jwt')}`
        },
        body: JSON.stringify({
          name: productForm.name,
          sku: productForm.sku,
          description: productForm.description,
          short_description: productForm.short_description,
          price: parseFloat(productForm.price),
          regular_price: parseFloat(productForm.regular_price || productForm.price),
          sale_price: productForm.sale_price ? parseFloat(productForm.sale_price) : null,
          image_url: productForm.image_url,
          categories: categoriesArray,
          variations: productVariations,
          gallery: galleryArray
        })
      });

      const body = await res.json();
      if (res.ok && body.success) {
        alert(`¡Producto creado exitosamente! Slug generado: ${body.slug}`);
        
        // Reset product form
        setProductForm({
          name: '',
          sku: '',
          description: '',
          short_description: '',
          price: '',
          regular_price: '',
          sale_price: '',
          image_url: '',
          categoriesInput: '',
          galleryInput: ''
        });
        setProductVariations([]);
        setSelectedCategories([]);
      } else {
        alert(body.error || 'Error al crear producto');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión');
    } finally {
      setCreatingProduct(false);
    }
  };

  if (authLoading) {
    return (
      <div className="nk-loading-container" style={{ padding: '150px', textAlign: 'center' }}>
        <div className="nk-spinner" style={{ margin: '0 auto 20px' }}></div>
        <p style={{ fontFamily: 'Teko', fontSize: '1.5rem' }}>Cargando administrador...</p>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null; // Guard redirect in useEffect
  }

  return (
    <div className="nk-admin-dashboard" style={{ padding: '80px 0', background: 'var(--nk-bg-body)' }}>
      <style>{`
        .nk-admin-dashboard button.nk-tab-btn {
          color: var(--nk-text-main) !important;
        }
        .nk-admin-dashboard button.nk-tab-btn.active {
          color: #ffffff !important;
          background-color: var(--nk-primary) !important;
        }
        .nk-admin-dashboard button.nk-tab-btn span {
          color: inherit !important;
        }
      `}</style>
      <div className="nk-container">
        
        {/* Header Block */}
        <div className="nk-admin-header nk-manga-border" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '30px',
          background: 'var(--nk-bg-card)',
          marginBottom: '40px'
        }}>
          <div>
            <h1 style={{ fontFamily: 'Teko, sans-serif', fontSize: '3.5rem', lineHeight: '0.9', color: 'var(--nk-primary)', margin: 0, textTransform: 'uppercase' }}>
              Panel de Control Nakama
            </h1>
            <p style={{ opacity: 0.7, margin: '5px 0 0 0' }}>Administración centralizada • Decomisión WP/WC</p>
          </div>
          <Link href="/mi-cuenta" className="nk-btn" style={{ padding: '10px 20px' }}>
            Volver a mi Cuenta
          </Link>
        </div>

        {/* Bento Grid Admin layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '30px', alignItems: 'start' }}>
          
          {/* Left Menu Sidebar */}
          <aside className="nk-admin-sidebar nk-manga-border" style={{
            background: 'var(--nk-bg-card)',
            padding: '20px'
          }}>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button 
                onClick={() => setActiveTab('sales')} 
                className={`nk-tab-btn ${activeTab === 'sales' ? 'active' : ''}`}
                style={sidebarBtnStyle(activeTab === 'sales')}
              >
                <span className="material-icons-outlined">query_stats</span>
                Dashboard de Ventas
              </button>

              <button 
                onClick={() => setActiveTab('products')} 
                className={`nk-tab-btn ${activeTab === 'products' ? 'active' : ''}`}
                style={sidebarBtnStyle(activeTab === 'products')}
              >
                <span className="material-icons-outlined">add_business</span>
                Crear Producto
              </button>

              <button 
                onClick={() => setActiveTab('coupons')} 
                className={`nk-tab-btn ${activeTab === 'coupons' ? 'active' : ''}`}
                style={sidebarBtnStyle(activeTab === 'coupons')}
              >
                <span className="material-icons-outlined">confirmation_number</span>
                Cupones
              </button>

              <button 
                onClick={() => setActiveTab('media')} 
                className={`nk-tab-btn ${activeTab === 'media' ? 'active' : ''}`}
                style={sidebarBtnStyle(activeTab === 'media')}
              >
                <span className="material-icons-outlined">perm_media</span>
                Gestor de Medios
              </button>

              <button 
                onClick={() => setActiveTab('maintenance')} 
                className={`nk-tab-btn ${activeTab === 'maintenance' ? 'active' : ''}`}
                style={sidebarBtnStyle(activeTab === 'maintenance')}
              >
                <span className="material-icons-outlined">construction</span>
                Modo Mantenimiento
              </button>
            </nav>
          </aside>

          {/* Right Main Content Block */}
          <main className="nk-admin-content nk-manga-border" style={{
            background: 'var(--nk-bg-card)',
            padding: '30px',
            minHeight: '500px'
          }}>
            
            {/* =================================================================
                TAB 1: SALES ANALYTICS DASHBOARD
                ================================================================= */}
            {activeTab === 'sales' && (
              <div className="nk-admin-tab-pane">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                  <h2 style={{ fontFamily: 'Teko, sans-serif', fontSize: '2.5rem', margin: 0, textTransform: 'uppercase' }}>Análisis de Ventas</h2>
                  
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button 
                      onClick={() => setSalesFilter('day')} 
                      className="nk-btn" 
                      style={filterBtnStyle(salesFilter === 'day')}
                    >
                      Día
                    </button>
                    <button 
                      onClick={() => setSalesFilter('month')} 
                      className="nk-btn" 
                      style={filterBtnStyle(salesFilter === 'month')}
                    >
                      Mes
                    </button>
                    <button 
                      onClick={() => setSalesFilter('year')} 
                      className="nk-btn" 
                      style={filterBtnStyle(salesFilter === 'year')}
                    >
                      Año
                    </button>
                  </div>
                </div>

                {salesLoading ? (
                  <div style={{ padding: '60px', textAlign: 'center' }}>
                    <div className="nk-spinner" style={{ margin: '0 auto' }}></div>
                  </div>
                ) : salesData ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                    
                    {/* KPI Bento Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                      <div className="nk-kpi-card nk-manga-border" style={{ padding: '20px', background: 'var(--nk-bg-body)', textAlign: 'center' }}>
                        <p style={{ textTransform: 'uppercase', fontSize: '0.8rem', fontWeight: '800', opacity: 0.7, marginBottom: '5px' }}>
                          Ventas Netas ({salesFilter === 'day' ? 'Hoy' : salesFilter === 'month' ? 'Este Mes' : 'Este Año'})
                        </p>
                        <h3 style={{ fontFamily: 'Teko', fontSize: '3rem', color: 'var(--nk-primary)', margin: 0 }}>
                          ${salesData.netSales.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
                        </h3>
                      </div>
                      
                      <div className="nk-kpi-card nk-manga-border" style={{ padding: '20px', background: 'var(--nk-bg-body)', textAlign: 'center' }}>
                        <p style={{ textTransform: 'uppercase', fontSize: '0.8rem', fontWeight: '800', opacity: 0.7, marginBottom: '5px' }}>
                          Pedidos Totales
                        </p>
                        <h3 style={{ fontFamily: 'Teko', fontSize: '3rem', margin: 0 }}>
                          {salesData.orderCount}
                        </h3>
                      </div>

                      <div className="nk-kpi-card nk-manga-border" style={{ padding: '20px', background: 'var(--nk-bg-body)', textAlign: 'center' }}>
                        <p style={{ textTransform: 'uppercase', fontSize: '0.8rem', fontWeight: '800', opacity: 0.7, marginBottom: '5px' }}>
                          Ticket Promedio
                        </p>
                        <h3 style={{ fontFamily: 'Teko', fontSize: '3rem', margin: 0 }}>
                          ${salesData.orderCount > 0 ? (salesData.netSales / salesData.orderCount).toLocaleString('es-MX', { maximumFractionDigits: 2 }) : '0.00'} MXN
                        </h3>
                      </div>
                    </div>

                    {/* Comparative KPI Blocks */}
                    <div style={{ background: 'var(--nk-bg-body)', padding: '20px', border: '1px dashed var(--nk-border)' }}>
                      <h4 style={{ fontFamily: 'Teko', fontSize: '1.5rem', marginBottom: '10px', textTransform: 'uppercase' }}>Comparativa Histórica General</h4>
                      <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '15px' }}>
                        <div>
                          <p style={{ fontSize: '0.8rem', opacity: 0.7, margin: 0 }}>VENTAS HOY</p>
                          <p style={{ fontSize: '1.2rem', fontWeight: '850', color: 'var(--nk-primary)' }}>${salesData.summary.today.toLocaleString()} MXN</p>
                        </div>
                        <div>
                          <p style={{ fontSize: '0.8rem', opacity: 0.7, margin: 0 }}>VENTAS MES</p>
                          <p style={{ fontSize: '1.2rem', fontWeight: '850' }}>${salesData.summary.month.toLocaleString()} MXN</p>
                        </div>
                        <div>
                          <p style={{ fontSize: '0.8rem', opacity: 0.7, margin: 0 }}>VENTAS AÑO</p>
                          <p style={{ fontSize: '1.2rem', fontWeight: '850' }}>${salesData.summary.year.toLocaleString()} MXN</p>
                        </div>
                      </div>
                    </div>

                    {/* Best and Worst Sold Products Tables */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                      
                      {/* Best Sellers */}
                      <div className="nk-best-sellers-card nk-manga-border" style={{ padding: '20px', background: 'var(--nk-bg-body)' }}>
                        <h3 style={{ fontFamily: 'Teko', fontSize: '1.8rem', textTransform: 'uppercase', marginBottom: '15px', borderBottom: '2px solid var(--nk-border)', paddingBottom: '5px' }}>
                          🔥 Productos Más Vendidos
                        </h3>
                        {salesData.bestSellers.length === 0 ? (
                          <p style={{ fontSize: '0.9rem', opacity: 0.6 }}>No hay datos para este periodo.</p>
                        ) : (
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                            <thead>
                              <tr style={{ borderBottom: '1px solid var(--nk-border)', textAlign: 'left', fontWeight: 'bold' }}>
                                <th style={{ padding: '8px 5px' }}>Producto</th>
                                <th style={{ padding: '8px 5px', textAlign: 'center' }}>Cant.</th>
                                <th style={{ padding: '8px 5px', textAlign: 'right' }}>Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {salesData.bestSellers.map((prod, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                                  <td style={{ padding: '10px 5px', fontWeight: '800' }}>{prod.name}</td>
                                  <td style={{ padding: '10px 5px', textAlign: 'center' }}>{prod.salesCount}</td>
                                  <td style={{ padding: '10px 5px', textAlign: 'right', fontFamily: 'Teko', fontSize: '1.2rem' }}>
                                    ${parseFloat(prod.totalRevenue).toLocaleString()}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>

                      {/* Worst Sellers */}
                      <div className="nk-worst-sellers-card nk-manga-border" style={{ padding: '20px', background: 'var(--nk-bg-body)' }}>
                        <h3 style={{ fontFamily: 'Teko', fontSize: '1.8rem', textTransform: 'uppercase', marginBottom: '15px', borderBottom: '2px solid var(--nk-border)', paddingBottom: '5px' }}>
                          💀 Menos Vendidos / Sin Ventas
                        </h3>
                        {salesData.worstSellers.length === 0 ? (
                          <p style={{ fontSize: '0.9rem', opacity: 0.6 }}>No hay datos para este periodo.</p>
                        ) : (
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                            <thead>
                              <tr style={{ borderBottom: '1px solid var(--nk-border)', textAlign: 'left', fontWeight: 'bold' }}>
                                <th style={{ padding: '8px 5px' }}>Producto</th>
                                <th style={{ padding: '8px 5px', textAlign: 'center' }}>Unidades Vendidas</th>
                              </tr>
                            </thead>
                            <tbody>
                              {salesData.worstSellers.map((prod, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                                  <td style={{ padding: '10px 5px', fontWeight: '800' }}>{prod.name}</td>
                                  <td style={{ padding: '10px 5px', textAlign: 'center', color: prod.salesCount === 0 ? 'var(--nk-primary)' : 'inherit' }}>
                                    {prod.salesCount}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>

                  </div>
                ) : (
                  <p>Error al cargar el reporte de ventas.</p>
                )}
              </div>
            )}

            {/* =================================================================
                TAB 2: PRODUCT VISUAL CREATION PANEL
                ================================================================= */}
            {activeTab === 'products' && (
              <div className="nk-admin-tab-pane">
                <h2 style={{ fontFamily: 'Teko, sans-serif', fontSize: '2.5rem', marginBottom: '20px', textTransform: 'uppercase' }}>Cargar Nuevo Producto</h2>
                
                <form onSubmit={handleCreateProduct} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  {/* Name and SKU */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div className="nk-form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontWeight: '800', fontSize: '0.85rem', textTransform: 'uppercase' }}>Nombre del Producto*</label>
                      <input 
                        type="text" 
                        required
                        value={productForm.name}
                        onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                        className="nk-manga-input"
                        placeholder="Ej: Hoodie Monkey D. Luffy"
                        style={inputStyle}
                      />
                    </div>
                    <div className="nk-form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontWeight: '800', fontSize: '0.85rem', textTransform: 'uppercase' }}>SKU Padre (Base)*</label>
                      <input 
                        type="text" 
                        required
                        value={productForm.sku}
                        onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                        className="nk-manga-input"
                        placeholder="Ej: OP-LUFFY"
                        style={inputStyle}
                      />
                    </div>
                  </div>

                  {/* Pricing */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                    <div className="nk-form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontWeight: '800', fontSize: '0.85rem', textTransform: 'uppercase' }}>Precio Venta ($)*</label>
                      <input 
                        type="number" 
                        required
                        step="0.01"
                        value={productForm.price}
                        onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                        className="nk-manga-input"
                        placeholder="589.00"
                        style={inputStyle}
                      />
                    </div>
                    <div className="nk-form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontWeight: '800', fontSize: '0.85rem', textTransform: 'uppercase' }}>Precio Regular ($)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        value={productForm.regular_price}
                        onChange={(e) => setProductForm({ ...productForm, regular_price: e.target.value })}
                        className="nk-manga-input"
                        placeholder="589.00"
                        style={inputStyle}
                      />
                    </div>
                    <div className="nk-form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontWeight: '800', fontSize: '0.85rem', textTransform: 'uppercase' }}>Precio Oferta ($)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        value={productForm.sale_price}
                        onChange={(e) => setProductForm({ ...productForm, sale_price: e.target.value })}
                        className="nk-manga-input"
                        placeholder="499.00 (Opcional)"
                        style={inputStyle}
                      />
                    </div>
                  </div>

                  {/* Descriptions */}
                  <div className="nk-form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontWeight: '800', fontSize: '0.85rem', textTransform: 'uppercase' }}>Descripción Corta (Ficha)</label>
                    <input 
                      type="text" 
                      value={productForm.short_description}
                      onChange={(e) => setProductForm({ ...productForm, short_description: e.target.value })}
                      className="nk-manga-input"
                      placeholder="Resumen del producto para listados rápidos"
                      style={inputStyle}
                    />
                  </div>

                  <div className="nk-form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontWeight: '800', fontSize: '0.85rem', textTransform: 'uppercase' }}>Descripción Detallada</label>
                    <textarea 
                      rows={4}
                      value={productForm.description}
                      onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                      className="nk-manga-input"
                      placeholder="Descripción completa del producto..."
                      style={{ ...inputStyle, fontFamily: 'inherit', resize: 'vertical' }}
                    />
                  </div>

                  {/* Image URLs */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div className="nk-form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontWeight: '800', fontSize: '0.85rem', textTransform: 'uppercase' }}>Imagen Principal URL</label>
                      <input 
                        type="text" 
                        value={productForm.image_url}
                        onChange={(e) => setProductForm({ ...productForm, image_url: e.target.value })}
                        className="nk-manga-input"
                        placeholder="/uploads/1718816400-luffy.jpg o URL externa"
                        style={inputStyle}
                      />
                    </div>
                    <div className="nk-form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontWeight: '800', fontSize: '0.85rem', textTransform: 'uppercase' }}>Galería de Imágenes (URLs separadas por comas)</label>
                      <input 
                        type="text" 
                        value={productForm.galleryInput}
                        onChange={(e) => setProductForm({ ...productForm, galleryInput: e.target.value })}
                        className="nk-manga-input"
                        placeholder="/uploads/img1.png, /uploads/img2.png"
                        style={inputStyle}
                      />
                    </div>
                  </div>

                  {/* Categories checkboxes */}
                  <div className="nk-form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontWeight: '800', fontSize: '0.85rem', textTransform: 'uppercase' }}>Categorías</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', background: 'var(--nk-bg-body)', padding: '15px', border: '1px solid var(--nk-border)' }}>
                      {AVAILABLE_CATEGORIES.map(cat => (
                        <label key={cat} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem' }}>
                          <input 
                            type="checkbox" 
                            checked={selectedCategories.includes(cat)}
                            onChange={() => handleCategoryCheckbox(cat)}
                          />
                          {cat}
                        </label>
                      ))}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '5px' }}>
                      <label style={{ fontSize: '0.75rem', opacity: 0.7 }}>¿Otras Categorías? Escríbelas separadas por comas:</label>
                      <input 
                        type="text"
                        value={productForm.categoriesInput}
                        onChange={(e) => setProductForm({ ...productForm, categoriesInput: e.target.value })}
                        className="nk-manga-input"
                        placeholder="Ej: Acid Wash, Gorras"
                        style={inputStyle}
                      />
                    </div>
                  </div>

                  {/* Variation Generator Sub-section */}
                  <div className="nk-manga-border" style={{ padding: '20px', background: 'var(--nk-bg-body)', marginTop: '10px' }}>
                    <h3 style={{ fontFamily: 'Teko', fontSize: '1.8rem', textTransform: 'uppercase', marginBottom: '15px', borderBottom: '1px dashed var(--nk-border)', paddingBottom: '5px' }}>
                      🧵 Constructor de Variantes
                    </h3>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '15px', alignItems: 'end', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Color</label>
                        <input 
                          type="text"
                          value={newVariation.color}
                          onChange={(e) => setNewVariation({ ...newVariation, color: e.target.value })}
                          className="nk-manga-input"
                          placeholder="Negro"
                          style={inputStyle}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Estilo</label>
                        <input 
                          type="text"
                          value={newVariation.estilo}
                          onChange={(e) => setNewVariation({ ...newVariation, estilo: e.target.value })}
                          className="nk-manga-input"
                          placeholder="Hoodie"
                          style={inputStyle}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Talla</label>
                        <input 
                          type="text"
                          value={newVariation.talla}
                          onChange={(e) => setNewVariation({ ...newVariation, talla: e.target.value })}
                          className="nk-manga-input"
                          placeholder="M"
                          style={inputStyle}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Precio variante*</label>
                        <input 
                          type="number"
                          value={newVariation.price}
                          onChange={(e) => setNewVariation({ ...newVariation, price: e.target.value })}
                          className="nk-manga-input"
                          placeholder="589"
                          style={inputStyle}
                        />
                      </div>
                      <button 
                        type="button" 
                        onClick={handleAddVariation}
                        className="nk-btn" 
                        style={{ padding: '8px 10px', height: '38px', fontSize: '0.9rem' }}
                      >
                        Añadir
                      </button>
                    </div>

                    {/* Staging variations list */}
                    {productVariations.length > 0 && (
                      <div style={{ border: '1px solid var(--nk-border)', maxHeight: '200px', overflowY: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                          <thead>
                            <tr style={{ background: '#eee', textAlign: 'left', fontWeight: 'bold', borderBottom: '1px solid var(--nk-border)' }}>
                              <th style={{ padding: '8px' }}>SKU Variante</th>
                              <th style={{ padding: '8px' }}>Atributos</th>
                              <th style={{ padding: '8px' }}>Precio</th>
                              <th style={{ padding: '8px' }}>Stock</th>
                              <th style={{ padding: '8px', textAlign: 'center' }}>Eliminar</th>
                            </tr>
                          </thead>
                          <tbody>
                            {productVariations.map((v, idx) => (
                              <tr key={idx} style={{ borderBottom: '1px solid #ddd' }}>
                                <td style={{ padding: '8px', fontWeight: 'bold' }}>{v.sku}</td>
                                <td style={{ padding: '8px' }}>{Object.entries(v.attributes).map(([n, val]) => `${n}:${val}`).join(' / ')}</td>
                                <td style={{ padding: '8px' }}>${v.price}</td>
                                <td style={{ padding: '8px' }}>{v.stock_quantity}</td>
                                <td style={{ padding: '8px', textAlign: 'center' }}>
                                  <button 
                                    type="button" 
                                    onClick={() => handleRemoveVariation(idx)}
                                    style={{ background: 'none', border: 'none', color: 'var(--nk-primary)', fontSize: '1.2rem', cursor: 'pointer' }}
                                  >
                                    ×
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Form Submission */}
                  <button 
                    type="submit" 
                    disabled={creatingProduct}
                    className="nk-btn" 
                    style={{ padding: '15px 30px', fontSize: '1.3rem', width: '100%', marginTop: '10px' }}
                  >
                    {creatingProduct ? 'Creando Producto...' : '🚀 Registrar Producto en Base de Datos'}
                  </button>

                </form>
              </div>
            )}

            {/* =================================================================
                TAB 3: COUPONS GENERATOR
                ================================================================= */}
            {activeTab === 'coupons' && (
              <div className="nk-admin-tab-pane">
                <h2 style={{ fontFamily: 'Teko, sans-serif', fontSize: '2.5rem', marginBottom: '20px', textTransform: 'uppercase' }}>Elaboración de Cupones</h2>
                
                {/* Create Coupon Form */}
                <div className="nk-manga-border" style={{ padding: '25px', background: 'var(--nk-bg-body)', marginBottom: '30px' }}>
                  <h3 style={{ fontFamily: 'Teko', fontSize: '1.8rem', textTransform: 'uppercase', marginBottom: '15px' }}>Nuevo Cupón</h3>
                  <form onSubmit={handleCreateCoupon} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr) auto', gap: '15px', alignItems: 'end' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Código*</label>
                      <input 
                        type="text" 
                        required
                        value={newCoupon.code}
                        onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value })}
                        className="nk-manga-input"
                        placeholder="CREADOR10"
                        style={inputStyle}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Tipo*</label>
                      <select 
                        value={newCoupon.type}
                        onChange={(e) => setNewCoupon({ ...newCoupon, type: e.target.value })}
                        className="nk-manga-input"
                        style={inputStyle}
                      >
                        <option value="percent">Porcentaje (%)</option>
                        <option value="fixed">Monto Fijo ($)</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Valor*</label>
                      <input 
                        type="number" 
                        required
                        step="0.01"
                        value={newCoupon.amount}
                        onChange={(e) => setNewCoupon({ ...newCoupon, amount: e.target.value })}
                        className="nk-manga-input"
                        placeholder="0.10 o 50"
                        style={inputStyle}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Vencimiento (Opcional)</label>
                      <input 
                        type="date" 
                        value={newCoupon.expiration_date}
                        onChange={(e) => setNewCoupon({ ...newCoupon, expiration_date: e.target.value })}
                        className="nk-manga-input"
                        style={inputStyle}
                      />
                    </div>
                    <button type="submit" className="nk-btn" style={{ padding: '8px 20px', height: '38px' }}>
                      Crear
                    </button>
                  </form>
                </div>

                {/* List Coupons */}
                <h3 style={{ fontFamily: 'Teko', fontSize: '1.8rem', textTransform: 'uppercase', marginBottom: '15px' }}>Cupones Activos</h3>
                {couponsLoading ? (
                  <div style={{ textAlign: 'center', padding: '30px' }}>
                    <div className="nk-spinner" style={{ margin: '0 auto' }}></div>
                  </div>
                ) : coupons.length === 0 ? (
                  <p style={{ opacity: 0.6 }}>No hay cupones activos registrados.</p>
                ) : (
                  <div className="nk-manga-border" style={{ overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                      <thead>
                        <tr style={{ background: '#eee', fontWeight: 'bold', borderBottom: '2px solid var(--nk-border)' }}>
                          <th style={{ padding: '12px' }}>Código</th>
                          <th style={{ padding: '12px' }}>Tipo</th>
                          <th style={{ padding: '12px' }}>Monto/Porcentaje</th>
                          <th style={{ padding: '12px' }}>Vencimiento</th>
                          <th style={{ padding: '12px', textAlign: 'center' }}>Eliminar</th>
                        </tr>
                      </thead>
                      <tbody>
                        {coupons.map(coupon => (
                          <tr key={coupon.id} style={{ borderBottom: '1px solid #eee' }}>
                            <td style={{ padding: '12px', fontWeight: '800' }}>{coupon.code}</td>
                            <td style={{ padding: '12px' }}>{coupon.type === 'percent' ? 'Porcentaje' : 'Monto Fijo'}</td>
                            <td style={{ padding: '12px', fontFamily: 'Teko', fontSize: '1.2rem' }}>
                              {coupon.type === 'percent' ? `${parseFloat(coupon.amount) * 100}%` : `$${coupon.amount} MXN`}
                            </td>
                            <td style={{ padding: '12px', fontSize: '0.85rem' }}>
                              {coupon.expiration_date ? new Date(coupon.expiration_date).toLocaleDateString() : 'Nunca'}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'center' }}>
                              <button 
                                onClick={() => handleDeleteCoupon(coupon.id)}
                                className="nk-btn"
                                style={{
                                  padding: '5px 10px',
                                  fontSize: '0.8rem',
                                  background: 'var(--nk-primary)',
                                  boxShadow: 'none'
                                }}
                              >
                                Eliminar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* =================================================================
                TAB 4: MEDIA MANAGER
                ================================================================= */}
            {activeTab === 'media' && (
              <div className="nk-admin-tab-pane">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h2 style={{ fontFamily: 'Teko, sans-serif', fontSize: '2.5rem', margin: 0, textTransform: 'uppercase' }}>Cargar Medios</h2>
                  
                  {/* File Upload Input */}
                  <label className="nk-btn" style={{ padding: '10px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="material-icons-outlined">upload_file</span>
                    {uploadingMedia ? 'Subiendo...' : 'Subir Imagen/Video'}
                    <input 
                      type="file" 
                      accept="image/*,video/*"
                      onChange={handleMediaUpload}
                      disabled={uploadingMedia}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>

                {mediaLoading ? (
                  <div style={{ textAlign: 'center', padding: '30px' }}>
                    <div className="nk-spinner" style={{ margin: '0 auto' }}></div>
                  </div>
                ) : mediaFiles.length === 0 ? (
                  <p style={{ opacity: 0.6 }}>No hay archivos multimedia cargados.</p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                    {mediaFiles.map((file, i) => {
                      const isVideo = file.name.endsWith('.mp4') || file.name.endsWith('.webm');
                      return (
                        <div key={i} className="nk-media-card nk-manga-border" style={{
                          background: 'var(--nk-bg-body)',
                          padding: '10px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                          position: 'relative'
                        }}>
                          {/* File preview */}
                          <div style={{ position: 'relative', width: '100%', height: '120px', overflow: 'hidden', background: '#333' }}>
                            {isVideo ? (
                              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'white' }}>
                                <span className="material-icons-outlined" style={{ fontSize: '3rem' }}>movie</span>
                              </div>
                            ) : (
                              <Image 
                                src={file.url} 
                                alt={file.name} 
                                fill 
                                style={{ objectFit: 'cover' }} 
                              />
                            )}
                          </div>
                          
                          {/* Info */}
                          <div style={{ fontSize: '0.75rem' }}>
                            <p style={{ fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: '0 0 5px 0' }} title={file.name}>
                              {file.name.substring(13)} {/* Skip timestamp prefix */}
                            </p>
                            <p style={{ opacity: 0.6, margin: 0 }}>
                              {file.uploadedAt ? new Date(file.uploadedAt).toLocaleDateString() : 'Fecha desconocida'}
                            </p>
                          </div>

                          {/* Copy URL action */}
                          <button 
                            onClick={() => handleCopyUrl(file.url)}
                            className="nk-btn"
                            style={{
                              padding: '5px 8px',
                              fontSize: '0.7rem',
                              width: '100%',
                              boxShadow: 'none'
                            }}
                          >
                            Copiar Enlace URL
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* =================================================================
                TAB 5: MAINTENANCE MODE CONFIGURATION
                ================================================================= */}
            {activeTab === 'maintenance' && (
              <div className="nk-admin-tab-pane">
                <h2 style={{ fontFamily: 'Teko, sans-serif', fontSize: '2.5rem', marginBottom: '20px', textTransform: 'uppercase' }}>Configuración del Sitio</h2>
                
                {maintenanceLoading ? (
                  <div style={{ textAlign: 'center', padding: '30px' }}>
                    <div className="nk-spinner" style={{ margin: '0 auto' }}></div>
                  </div>
                ) : (
                  <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                    
                    {/* Maintenance toggle switch */}
                    <div className="nk-manga-border" style={{
                      padding: '20px',
                      background: maintenanceSettings.maintenance_mode === 'true' ? 'rgba(227, 0, 15, 0.1)' : 'var(--nk-bg-body)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <div>
                        <h3 style={{ fontFamily: 'Teko', fontSize: '1.8rem', textTransform: 'uppercase', margin: 0 }}>
                          Modo Mantenimiento
                        </h3>
                        <p style={{ fontSize: '0.85rem', opacity: 0.8, margin: '5px 0 0 0' }}>
                          Si está activo, sólo administradores logueados pueden navegar en el sitio web. Los usuarios verán una pantalla de mantenimiento.
                        </p>
                      </div>
                      
                      {/* Toggle Input */}
                      <label style={{ position: 'relative', display: 'inline-block', width: '60px', height: '34px', cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={maintenanceSettings.maintenance_mode === 'true'}
                          onChange={(e) => setMaintenanceSettings({ 
                            ...maintenanceSettings, 
                            maintenance_mode: e.target.checked ? 'true' : 'false' 
                          })}
                          style={{ opacity: 0, width: 0, height: 0 }}
                        />
                        <span style={{
                          position: 'absolute',
                          cursor: 'pointer',
                          inset: 0,
                          backgroundColor: maintenanceSettings.maintenance_mode === 'true' ? 'var(--nk-primary)' : '#ccc',
                          transition: '0.4s',
                          borderRadius: '34px'
                        }}>
                          <span style={{
                            position: 'absolute',
                            content: '""',
                            height: '26px',
                            width: '26px',
                            left: maintenanceSettings.maintenance_mode === 'true' ? '28px' : '4px',
                            bottom: '4px',
                            backgroundColor: 'white',
                            transition: '0.4s',
                            borderRadius: '50%'
                          }}></span>
                        </span>
                      </label>
                    </div>

                    {/* Maintenance assets content layout */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <div className="nk-form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <label style={{ fontWeight: '800', fontSize: '0.85rem', textTransform: 'uppercase' }}>Mensaje para Usuarios</label>
                          <textarea 
                            rows={4}
                            value={maintenanceSettings.maintenance_message}
                            onChange={(e) => setMaintenanceSettings({ ...maintenanceSettings, maintenance_message: e.target.value })}
                            className="nk-manga-input"
                            placeholder="Estamos mejorando nuestro sitio. ¡Volveremos pronto!"
                            style={{ ...inputStyle, fontFamily: 'inherit', resize: 'vertical' }}
                          />
                        </div>
                        <div className="nk-form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <label style={{ fontWeight: '800', fontSize: '0.85rem', textTransform: 'uppercase' }}>Imagen de Mantenimiento URL</label>
                          <input 
                            type="text" 
                            value={maintenanceSettings.maintenance_image}
                            onChange={(e) => setMaintenanceSettings({ ...maintenanceSettings, maintenance_image: e.target.value })}
                            className="nk-manga-input"
                            placeholder="/uploads/imagen-mante.png o URL de Unsplash"
                            style={inputStyle}
                          />
                        </div>
                      </div>

                      {/* Social link configurations */}
                      <div className="nk-manga-border" style={{ padding: '20px', background: 'var(--nk-bg-body)', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <h3 style={{ fontFamily: 'Teko', fontSize: '1.5rem', textTransform: 'uppercase', margin: 0, borderBottom: '1px dashed var(--nk-border)', paddingBottom: '5px' }}>
                          🔗 Enlaces de Redes Sociales
                        </h3>
                        <div className="nk-form-group" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                          <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Instagram URL</label>
                          <input 
                            type="text" 
                            value={maintenanceSettings.instagram}
                            onChange={(e) => setMaintenanceSettings({ ...maintenanceSettings, instagram: e.target.value })}
                            className="nk-manga-input"
                            placeholder="https://instagram.com/nakama"
                            style={inputStyle}
                          />
                        </div>
                        <div className="nk-form-group" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                          <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Facebook URL</label>
                          <input 
                            type="text" 
                            value={maintenanceSettings.facebook}
                            onChange={(e) => setMaintenanceSettings({ ...maintenanceSettings, facebook: e.target.value })}
                            className="nk-manga-input"
                            placeholder="https://facebook.com/nakama"
                            style={inputStyle}
                          />
                        </div>
                        <div className="nk-form-group" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                          <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>TikTok URL</label>
                          <input 
                            type="text" 
                            value={maintenanceSettings.tiktok}
                            onChange={(e) => setMaintenanceSettings({ ...maintenanceSettings, tiktok: e.target.value })}
                            className="nk-manga-input"
                            placeholder="https://tiktok.com/@nakama"
                            style={inputStyle}
                          />
                        </div>
                      </div>
                    </div>

                    <button 
                      type="submit" 
                      disabled={savingSettings}
                      className="nk-btn" 
                      style={{ padding: '15px 30px', fontSize: '1.3rem', width: '100%' }}
                    >
                      {savingSettings ? 'Guardando Configuración...' : '💾 Guardar Ajustes de Mantenimiento'}
                    </button>
                  </form>
                )}
              </div>
            )}

          </main>
        </div>

      </div>
    </div>
  );
}

// Styling Helpers
const sidebarBtnStyle = (isActive: boolean) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  width: '100%',
  padding: '12px 15px',
  textAlign: 'left' as const,
  fontFamily: 'Teko, sans-serif',
  fontSize: '1.4rem',
  textTransform: 'uppercase' as const,
  background: isActive ? 'var(--nk-primary)' : 'none',
  color: isActive ? 'white' : 'var(--nk-text-main)',
  border: isActive ? '2px solid var(--nk-border)' : '2px solid transparent',
  boxShadow: isActive ? '2px 2px 0px var(--nk-border)' : 'none',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  borderRadius: '0'
});

const filterBtnStyle = (isActive: boolean) => ({
  padding: '6px 15px',
  fontSize: '0.9rem',
  background: isActive ? 'var(--nk-accent)' : 'none',
  color: isActive ? 'var(--nk-bg-body)' : 'var(--nk-text-main)',
  border: '2px solid var(--nk-border)',
  boxShadow: isActive ? '2px 2px 0px var(--nk-border)' : 'none',
  borderRadius: '0'
});

const inputStyle = {
  padding: '10px 15px',
  fontSize: '0.9rem',
  width: '100%',
  borderRadius: '0',
  backgroundColor: 'var(--nk-bg-body)',
  color: 'var(--nk-text-main)'
};
