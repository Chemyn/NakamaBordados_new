'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import {
  CatalogProduct,
  CatalogProductPreview,
  ManualCatalogProduct,
  deleteManualCatalogProduct,
  listManualCatalogProducts,
  previewCatalogProduct,
  saveManualCatalogProduct,
  searchCatalogProducts,
} from '@/lib/warehouse-api';
import styles from './ManualCatalogSkuPanel.module.css';

type Notice = { kind: 'success' | 'error'; text: string } | null;

export default function ManualCatalogSkuPanel() {
  const [managed, setManaged] = useState<ManualCatalogProduct[]>([]);
  const [loadingManaged, setLoadingManaged] = useState(true);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CatalogProduct[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<CatalogProductPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [hiddenColor, setHiddenColor] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  useEffect(() => {
    let active = true;
    void listManualCatalogProducts()
      .then(items => { if (active) setManaged(items); })
      .catch(error => {
        if (active) setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'No se pudo cargar la lista.' });
      })
      .finally(() => { if (active) setLoadingManaged(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const clean = query.trim();
    if (clean.length < 2 || selected?.product.id || loadingPreview) {
      return;
    }
    const timer = window.setTimeout(async () => {
      setSearching(true);
      setNotice(null);
      try {
        setResults(await searchCatalogProducts(clean));
      } catch (error) {
        setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'No se pudo buscar.' });
      } finally {
        setSearching(false);
      }
    }, 280);
    return () => window.clearTimeout(timer);
  }, [query, selected, loadingPreview]);

  const chooseProduct = async (product: CatalogProduct) => {
    setResults([]);
    setSearching(false);
    setQuery(product.name);
    setNotice(null);
    setLoadingPreview(true);
    try {
      setSelected(await previewCatalogProduct(product.id));
    } catch (error) {
      setSelected(null);
      setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'No se pudieron leer las variaciones.' });
    } finally {
      setLoadingPreview(false);
    }
  };

  const clearSelection = () => {
    setSelected(null);
    setQuery('');
    setHiddenColor('');
    setNotice(null);
    setSearching(false);
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected || !selected.valid || !hiddenColor.trim()) {
      setNotice({ kind: 'error', text: 'Selecciona un producto compatible y escribe el color oculto.' });
      return;
    }
    setSaving(true);
    setNotice(null);
    try {
      const saved = await saveManualCatalogProduct(selected.product.id, hiddenColor.trim());
      setManaged(current => [saved, ...current.filter(item => item.id !== saved.id)]);
      setNotice({ kind: 'success', text: `${saved.name} quedó vinculado a ${saved.variations.length} SKU base.` });
      setSelected(null);
      setQuery('');
      setHiddenColor('');
    } catch (error) {
      setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'No se pudo guardar.' });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (product: ManualCatalogProduct) => {
    const accepted = window.confirm(
      `¿Dejar de administrar “${product.name}”?\n\nSe conservará el historial. Solo se borrarán los SKU manuales que ya no tengan otras variaciones.`,
    );
    if (!accepted) return;
    setDeletingId(product.id);
    setNotice(null);
    try {
      await deleteManualCatalogProduct(product.id);
      setManaged(current => current.filter(item => item.id !== product.id));
      setNotice({ kind: 'success', text: `${product.name} dejó de usar el color oculto.` });
    } catch (error) {
      setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'No se pudo eliminar.' });
    } finally {
      setDeletingId(null);
    }
  };

  const invalidVariations = selected?.variations.filter(variation => !variation.valid) ?? [];

  return (
    <section className={styles.panel} aria-labelledby="manual-sku-title">
      <div className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Control interno · Solo administradores</p>
          <h2 id="manual-sku-title">Productos sin color</h2>
          <p>
            Toma Estilo y Talla desde WooCommerce y añade un color privado para Almacén y Producción.
            El producto público no se modifica.
          </p>
        </div>
        <span className={styles.stamp}>SKU<br />oculto</span>
      </div>

      {notice && (
        <div className={`${styles.notice} ${styles[notice.kind]}`} role="alert">
          {notice.text}
        </div>
      )}

      <form className={styles.form} onSubmit={submit}>
        <div className={styles.stepNumber} aria-hidden="true">01</div>
        <div className={styles.fieldGrow}>
          <label htmlFor="manual-catalog-search">Buscar producto en WooCommerce</label>
          <div className={styles.searchBox}>
            <input
              id="manual-catalog-search"
              type="search"
              value={query}
              onChange={event => {
                const value = event.target.value;
                setQuery(value);
                setResults([]);
                setSearching(value.trim().length >= 2);
                if (selected) setSelected(null);
              }}
              placeholder="Nombre, slug o SKU…"
              autoComplete="off"
              role="combobox"
              aria-expanded={results.length > 0}
              aria-controls="manual-catalog-results"
            />
            {query && <button type="button" className={styles.clear} onClick={clearSelection} aria-label="Limpiar producto">×</button>}
          </div>
          <span className={styles.hint}>{searching ? 'Buscando…' : 'Escribe al menos 2 caracteres.'}</span>

          {results.length > 0 && (
            <ul id="manual-catalog-results" className={styles.results} role="listbox">
              {results.map(product => (
                <li key={product.id}>
                  <button type="button" onClick={() => void chooseProduct(product)} disabled={product.managed}>
                    <ProductThumb product={product} />
                    <span><strong>{product.name}</strong><small>{product.slug} · {product.variation_count} variaciones</small></span>
                    <b>{product.managed ? 'Ya administrado' : 'Elegir'}</b>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {!searching && !loadingPreview && query.trim().length >= 2 && !selected && results.length === 0 && (
            <p className={styles.noResults}>Sin coincidencias. Prueba con el slug completo o el SKU del producto.</p>
          )}
        </div>

        <div className={styles.divider} aria-hidden="true" />

        <div className={styles.stepNumber} aria-hidden="true">02</div>
        <div className={styles.fieldColor}>
          <label htmlFor="manual-hidden-color">Color oculto</label>
          <input
            id="manual-hidden-color"
            value={hiddenColor}
            onChange={event => setHiddenColor(event.target.value)}
            placeholder="Ej. Verde botella"
            disabled={!selected || !selected.valid}
            required
          />
          <span className={styles.hint}>Un solo color para todas las tallas y estilos detectados.</span>
        </div>

        <button className={styles.primary} type="submit" disabled={saving || !selected?.valid || !hiddenColor.trim()}>
          {saving ? 'Creando SKU…' : 'Crear SKU internos'}
        </button>
      </form>

      {loadingPreview && <div className={styles.preview}>Leyendo variaciones…</div>}
      {selected && !loadingPreview && (
        <div className={styles.preview}>
          <div className={styles.previewHeader}>
            <ProductThumb product={selected.product} large />
            <div><span>Producto seleccionado</span><h3>{selected.product.name}</h3><small>#{selected.product.id} · {selected.product.slug}</small></div>
            <b className={selected.valid ? styles.ready : styles.blocked}>{selected.valid ? 'Listo' : 'Revisar'}</b>
          </div>
          {invalidVariations.length > 0 && (
            <div className={styles.validation} role="alert">
              {invalidVariations[0].problem} Variación #{invalidVariations[0].variation_id}.
            </div>
          )}
          <div className={styles.variationGrid}>
            {selected.variations.map(variation => (
              <div key={variation.variation_id} className={!variation.valid ? styles.invalid : ''}>
                <small>VAR #{variation.variation_id}</small>
                <strong>{variation.style || 'Sin estilo'}</strong>
                <span>Talla {variation.size || '—'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={styles.managedHeader}>
        <div><p className={styles.eyebrow}>Registro activo</p><h3>Productos administrados</h3></div>
        <b>{managed.length.toString().padStart(2, '0')}</b>
      </div>

      {loadingManaged ? (
        <div className={styles.empty}>Cargando productos administrados…</div>
      ) : managed.length === 0 ? (
        <div className={styles.empty}>Aún no hay productos con color oculto.</div>
      ) : (
        <div className={styles.cards}>
          {managed.map(product => (
            <article key={product.id} className={styles.card}>
              <ProductThumb product={product} large />
              <div className={styles.cardBody}>
                <small>#{product.id} · {product.slug}</small>
                <h4>{product.name}</h4>
                <div className={styles.meta}>
                  <span><i aria-hidden="true" />{product.hidden_color}</span>
                  <span>{product.variations.length} SKU internos</span>
                </div>
                <p>{product.variations.map(item => `${item.style} / ${item.size}`).join(' · ')}</p>
              </div>
              <button
                type="button"
                className={styles.remove}
                onClick={() => void remove(product)}
                disabled={deletingId === product.id}
              >
                {deletingId === product.id ? 'Eliminando…' : 'Dejar de administrar'}
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function ProductThumb({ product, large = false }: { product: CatalogProduct; large?: boolean }) {
  if (!product.image) return <span className={`${styles.thumb} ${large ? styles.thumbLarge : ''}`}>NK</span>;
  return (
    <span className={`${styles.thumb} ${large ? styles.thumbLarge : ''}`}>
      <Image src={product.image} alt="" width={large ? 72 : 44} height={large ? 72 : 44} unoptimized />
    </span>
  );
}
