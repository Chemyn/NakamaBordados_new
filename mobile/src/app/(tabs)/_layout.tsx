import { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { usePush } from '@/hooks/usePush';
import { colors, fonts } from '@/lib/theme';

export default function TabsLayout() {
  const router = useRouter();

  // Registra el dispositivo al entrar con sesión iniciada.
  usePush();

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
        name="pdfs"
        options={{
          title: 'Patrones',
          headerTitle: 'Patrones (PDF)',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="picture-as-pdf" size={size} color={color} />
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
