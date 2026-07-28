import { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { usePush } from '@/hooks/usePush';
import { useWarehouseAccess } from '@/hooks/useWarehouse';
import { useAuth } from '@/lib/auth-context';
import { colors, fonts } from '@/lib/theme';

export default function TabsLayout() {
  const router = useRouter();
  const { status } = useAuth();

  // Registra el dispositivo al entrar con sesión iniciada.
  usePush();

  // El almacén tiene su propio permiso: quien solo trabaja producción no ve la
  // pestaña. Mientras se confirma se mantiene oculta, para no mostrarla y
  // quitarla a los pocos segundos.
  const { data: canWarehouse } = useWarehouseAccess(status === 'signedIn');

  // Tocar el aviso de "pedido nuevo" abre ese pedido.
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const orderId = response.notification.request.content.data?.order_id;
      if (orderId) router.push(`/order/${String(orderId)}`);
    });
    return () => subscription.remove();
  }, [router]);

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.red },
        headerTintColor: colors.white,
        headerTitleStyle: { fontFamily: fonts.display, fontSize: 24, letterSpacing: 0.5 },
        tabBarActiveTintColor: colors.red,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontFamily: fonts.bodyBold, fontSize: 11 },
        // Sin alto fijo: en teléfonos con barra de gestos, 62 dejaba las
        // etiquetas comprimidas contra el borde inferior.
        tabBarStyle: { backgroundColor: colors.white, borderTopColor: colors.border },
        tabBarItemStyle: { paddingVertical: 6 },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Tablero',
          headerTitle: 'Panel de Producción',
          tabBarIcon: ({ color, size }) => <MaterialIcons name="dashboard" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="almacen"
        options={{
          title: 'Almacén',
          headerTitle: 'Almacén',
          href: canWarehouse ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="inventory-2" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="ajustes"
        options={{
          title: 'Ajustes',
          tabBarIcon: ({ color, size }) => <MaterialIcons name="settings" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
