import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pedido confirmado | Nakama Bordados',
  description: 'Confirmación y próximos pasos de tu pedido en Nakama Bordados.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function PedidoConfirmadoLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
