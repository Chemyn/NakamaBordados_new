import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AffiliateEvidence from './AffiliateEvidence';

vi.mock('../context/LanguageContext', () => ({ useLanguage: () => ({ t: (key: string) => ({
  'affiliates.mission.evidenceKicker': 'Tu parte de la misión',
  'affiliates.mission.evidenceTitle': 'Comparte tu impacto',
  'affiliates.mission.tagReminder': 'Etiqueta en cada publicación a',
  'affiliates.mission.officialAccounts': 'las cuentas oficiales de Nakama Bordados',
  'affiliates.mission.codeReminder': 'Invita a comprar en la tienda con tu código.',
  'affiliates.mission.reel1': 'Reel 1',
  'affiliates.mission.reel2': 'Reel 2',
  'affiliates.mission.story': 'Historia',
  'affiliates.mission.bonusLabel': 'Reel o publicación bonus',
  'affiliates.mission.required': 'obligatorio',
  'affiliates.mission.optional': 'opcional',
  'affiliates.mission.bonus': 'El bonus puede darte prioridad para elegir un Drop, pero no es una garantía.',
  'affiliates.mission.sendEvidence': 'Enviar evidencias',
  'affiliates.mission.sending': 'Enviando…',
  'affiliates.mission.evidenceRequired': 'Este enlace es obligatorio.',
  'affiliates.mission.evidenceHttps': 'Usa una URL segura que empiece con https://.',
  'affiliates.mission.evidenceStatus.approved': 'Aprobada',
  'affiliates.mission.evidenceStatus.rejected': 'Rechazada',
  'affiliates.mission.evidenceStatus.pending': 'Pendiente',
}[key] || key) }) }));

describe('AffiliateEvidence', () => {
  beforeEach(() => localStorage.clear());

  it('collects two Reels and one Story, keeps bonus optional, and explains tagging', async () => {
    const submit = vi.fn().mockResolvedValue({ success: true });
    render(<AffiliateEvidence requestId={12} requestStatus="completed" items={[]} officialAccounts={['@nakamabordados']} onSubmit={submit} />);

    expect(screen.getByText(/@nakamabordados/)).toBeVisible();
    expect(screen.getByText(/prioridad.*Drop.*no.*garantía/i)).toBeVisible();
    fireEvent.change(screen.getByLabelText(/Reel 1.*obligatorio/i), { target: { value: 'https://instagram.com/reel/a' } });
    fireEvent.change(screen.getByLabelText(/Reel 2.*obligatorio/i), { target: { value: 'https://instagram.com/reel/b' } });
    fireEvent.change(screen.getByLabelText(/Historia.*obligatorio/i), { target: { value: 'https://instagram.com/stories/c' } });
    fireEvent.click(screen.getByRole('button', { name: /Enviar evidencias/i }));

    await waitFor(() => expect(submit).toHaveBeenCalledWith({
      requestId: 12,
      urls: { reel_1: 'https://instagram.com/reel/a', reel_2: 'https://instagram.com/reel/b', story_1: 'https://instagram.com/stories/c', bonus: '' },
    }));
  });

  it('shows rejection reasons and only reopens rejected positions', () => {
    render(<AffiliateEvidence requestId={12} requestStatus="completed" officialAccounts={[]} onSubmit={vi.fn()} items={[
      { id: 1, slotKey: 'reel_1', contentType: 'reel', position: 1, url: 'https://instagram.com/reel/a', status: 'approved', reviewReason: '', submittedAt: '2026-10-20', reviewedAt: '2026-10-21' },
      { id: 2, slotKey: 'story_1', contentType: 'story', position: 1, url: 'https://instagram.com/stories/c', status: 'rejected', reviewReason: 'Falta etiquetar a Nakama.', submittedAt: '2026-10-20', reviewedAt: '2026-10-21' },
    ]} />);
    expect(screen.getByLabelText(/Reel 1.*obligatorio/i)).toBeDisabled();
    expect(screen.getByLabelText(/Historia.*obligatorio/i)).toBeEnabled();
    expect(screen.getByText('Falta etiquetar a Nakama.')).toBeVisible();
  });

  it('restores URL drafts locally without treating them as submitted evidence', () => {
    localStorage.setItem('nakama-affiliate-evidence-12', JSON.stringify({ reel_1: 'https://instagram.com/reel/draft' }));
    render(<AffiliateEvidence requestId={12} requestStatus="completed" items={[]} officialAccounts={[]} onSubmit={vi.fn()} />);
    expect(screen.getByLabelText(/Reel 1.*obligatorio/i)).toHaveValue('https://instagram.com/reel/draft');
    expect(screen.getByRole('button', { name: /Enviar evidencias/i })).toBeDisabled();
  });
});
