import type { Metadata } from 'next';
import DropsClient from './DropsClient';

export const metadata: Metadata = {
  title: 'DROPS | Nakama Bordados',
  description: 'Lanzamientos programados de Nakama Bordados disponibles en preventa.',
};

export default function DropsPage() {
  return <DropsClient />;
}

