'use client';

import React, { useState } from 'react';
import type { AccountProfileInput, AccountShippingInput } from '@/lib/account-api';

type SaveResult = { success: boolean; error?: string };
type SaveProfile = (input: AccountProfileInput) => Promise<SaveResult>;

interface PersonalDetailsProps {
  user: {
    firstName: string;
    lastName: string;
    billingPhone?: string;
    email: string;
    username: string;
    role: string;
  };
  onSave: SaveProfile;
}

export function PersonalDetailsEditor({ user, onSave }: PersonalDetailsProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [form, setForm] = useState({ firstName: '', lastName: '', billingPhone: '' });

  const beginEditing = () => {
    setForm({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      billingPhone: user.billingPhone || '',
    });
    setMessage(null);
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setMessage(null);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const input = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      billingPhone: form.billingPhone.trim(),
    };
    if (!input.firstName) {
      setMessage({ kind: 'error', text: 'Escribe tu nombre antes de guardar.' });
      return;
    }

    setSaving(true);
    setMessage(null);
    const result = await onSave(input);
    setSaving(false);
    if (!result.success) {
      setMessage({ kind: 'error', text: result.error || 'No se pudieron guardar los cambios.' });
      return;
    }
    setEditing(false);
    setMessage({ kind: 'success', text: 'Datos personales actualizados.' });
  };

  return (
    <>
      <div className="nk-section-heading">
        <div>
          <h2 className="nk-section-title">Detalles de la Cuenta</h2>
          <p className="nk-section-caption">Actualiza tus datos de contacto cuando lo necesites.</p>
        </div>
        {!editing && (
          <button type="button" className="nk-edit-trigger" onClick={beginEditing}>
            <span className="material-icons-outlined" aria-hidden="true">edit</span>
            Editar datos personales
          </button>
        )}
      </div>

      <div className="nk-info-box nk-manga-border">
        {editing ? (
          <form className="nk-account-edit-form" onSubmit={save}>
            <fieldset disabled={saving}>
              <div className="nk-account-form-grid">
                <label className="nk-account-field">
                  <span>Nombre</span>
                  <input
                    autoComplete="given-name"
                    className="nk-manga-input"
                    value={form.firstName}
                    onChange={(event) => setForm(current => ({ ...current, firstName: event.target.value }))}
                  />
                </label>
                <label className="nk-account-field">
                  <span>Apellidos</span>
                  <input
                    autoComplete="family-name"
                    className="nk-manga-input"
                    value={form.lastName}
                    onChange={(event) => setForm(current => ({ ...current, lastName: event.target.value }))}
                  />
                </label>
                <label className="nk-account-field nk-account-field-wide">
                  <span>Teléfono</span>
                  <input
                    type="tel"
                    autoComplete="tel"
                    inputMode="tel"
                    className="nk-manga-input"
                    value={form.billingPhone}
                    onChange={(event) => setForm(current => ({ ...current, billingPhone: event.target.value }))}
                  />
                </label>
              </div>
              <div className="nk-account-form-actions">
                <button type="submit" className="nk-btn nk-save-profile" disabled={saving}>
                  {saving ? 'Guardando…' : 'Guardar datos'}
                </button>
                <button type="button" className="nk-account-secondary-action" onClick={cancelEditing} disabled={saving}>
                  Cancelar edición de datos
                </button>
              </div>
            </fieldset>
          </form>
        ) : (
          <dl className="nk-profile-grid">
            <div className="nk-profile-item">
              <dt>Nombre Completo</dt>
              <dd>{user.firstName} {user.lastName || ''}</dd>
            </div>
            <div className="nk-profile-item">
              <dt>Teléfono</dt>
              <dd>{user.billingPhone || 'Sin teléfono registrado'}</dd>
            </div>
          </dl>
        )}

        <dl className="nk-profile-grid nk-protected-profile-grid">
          <div className="nk-profile-item">
            <dt>Correo electrónico</dt>
            <dd>{user.email}</dd>
          </div>
          <div className="nk-profile-item">
            <dt>Usuario</dt>
            <dd>{user.username}</dd>
          </div>
          <div className="nk-profile-item">
            <dt>Rol</dt>
            <dd className="nk-role-tag">{user.role?.toUpperCase() || 'NAKAMA'}</dd>
          </div>
        </dl>
        <p className="nk-protected-note">
          <span className="material-icons-outlined" aria-hidden="true">verified_user</span>
          El correo, el usuario y el rol están protegidos y no se pueden editar aquí.
        </p>
        {message && (
          <p className={`nk-account-save-message is-${message.kind}`} role={message.kind === 'error' ? 'alert' : 'status'}>
            {message.text}
          </p>
        )}
      </div>
    </>
  );
}

interface ShippingAddressProps {
  shipping: AccountShippingInput;
  onSave: SaveProfile;
}

export function ShippingAddressEditor({ shipping, onSave }: ShippingAddressProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [form, setForm] = useState<AccountShippingInput>(shipping);

  const beginEditing = () => {
    setForm({ ...shipping, country: shipping.country || 'MX' });
    setMessage(null);
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setMessage(null);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalized = Object.fromEntries(
      Object.entries(form).map(([key, value]) => [key, value.trim()]),
    ) as unknown as AccountShippingInput;
    if (!normalized.address1 || !normalized.city || !normalized.state || !normalized.postcode || !normalized.country) {
      setMessage({ kind: 'error', text: 'Completa calle, ciudad, estado, código postal y país.' });
      return;
    }

    setSaving(true);
    setMessage(null);
    const result = await onSave({ shipping: normalized });
    setSaving(false);
    if (!result.success) {
      setMessage({ kind: 'error', text: result.error || 'No se pudo guardar la dirección.' });
      return;
    }
    setEditing(false);
    setMessage({ kind: 'success', text: 'Dirección de envío actualizada.' });
  };

  return (
    <>
      <div className="nk-section-heading">
        <div>
          <h2 className="nk-section-title">Direcciones</h2>
          <p className="nk-section-caption">Usaremos esta dirección como destino principal de tus pedidos.</p>
        </div>
        {!editing && (
          <button type="button" className="nk-edit-trigger" onClick={beginEditing}>
            <span className="material-icons-outlined" aria-hidden="true">edit_location_alt</span>
            Editar dirección de envío
          </button>
        )}
      </div>

      <div className="nk-manga-border nk-address-box">
        {editing ? (
          <form className="nk-account-edit-form" onSubmit={save}>
            <fieldset disabled={saving}>
              <div className="nk-account-form-grid">
                <label className="nk-account-field nk-account-field-wide">
                  <span>Calle y número</span>
                  <input autoComplete="shipping address-line1" className="nk-manga-input" value={form.address1} onChange={(event) => setForm(current => ({ ...current, address1: event.target.value }))} />
                </label>
                <label className="nk-account-field nk-account-field-wide">
                  <span>Interior o referencia</span>
                  <input autoComplete="shipping address-line2" className="nk-manga-input" value={form.address2} onChange={(event) => setForm(current => ({ ...current, address2: event.target.value }))} />
                </label>
                <label className="nk-account-field">
                  <span>Ciudad</span>
                  <input autoComplete="shipping address-level2" className="nk-manga-input" value={form.city} onChange={(event) => setForm(current => ({ ...current, city: event.target.value }))} />
                </label>
                <label className="nk-account-field">
                  <span>Estado</span>
                  <input autoComplete="shipping address-level1" className="nk-manga-input" value={form.state} onChange={(event) => setForm(current => ({ ...current, state: event.target.value }))} />
                </label>
                <label className="nk-account-field">
                  <span>Código postal</span>
                  <input autoComplete="shipping postal-code" inputMode="numeric" className="nk-manga-input" value={form.postcode} onChange={(event) => setForm(current => ({ ...current, postcode: event.target.value }))} />
                </label>
                <label className="nk-account-field">
                  <span>País</span>
                  <input autoComplete="shipping country" maxLength={2} className="nk-manga-input" value={form.country} onChange={(event) => setForm(current => ({ ...current, country: event.target.value.toUpperCase() }))} />
                </label>
              </div>
              <div className="nk-account-form-actions">
                <button type="submit" className="nk-btn nk-save-profile" disabled={saving}>
                  {saving ? 'Guardando…' : 'Guardar dirección'}
                </button>
                <button type="button" className="nk-account-secondary-action" onClick={cancelEditing} disabled={saving}>
                  Cancelar edición de dirección
                </button>
              </div>
            </fieldset>
          </form>
        ) : (
          <>
            <p className="nk-address-title">Dirección de Envío Principal</p>
            <p className="nk-address-text">
              {shipping.address1 ? (
                <>
                  {shipping.address1}<br />
                  {shipping.address2 && <>{shipping.address2}<br /></>}
                  {shipping.city}, {shipping.state}<br />
                  CP: {shipping.postcode}<br />
                  {shipping.country}
                </>
              ) : 'No has configurado una dirección de envío aún.'}
            </p>
          </>
        )}
        {message && (
          <p className={`nk-account-save-message is-${message.kind}`} role={message.kind === 'error' ? 'alert' : 'status'}>
            {message.text}
          </p>
        )}
      </div>
    </>
  );
}
