import type { Metadata } from 'next';
import AffiliateDashboard from './AffiliateDashboard';

export const metadata: Metadata = {
  title: 'Panel de Afiliados | Nakama Bordados',
  description: 'Panel privado del programa de afiliados Nakama Bordados.',
  robots: { index: false, follow: false },
};

export default function AffiliatePage() {
  return <AffiliateDashboard />;
}
