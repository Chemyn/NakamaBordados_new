'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'es' | 'en';

interface LanguageContextProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  es: {
    // Nav
    'nav.home': 'Inicio',
    'nav.store': 'Tienda',
    'nav.embroidery': 'Bordados',
    'nav.combo': 'C/Estampado',
    'nav.prints': 'Estampado',
    'nav.special': 'Especial',
    'nav.plain': 'Lisas',
    'nav.variety': 'Variedad',
    'nav.caps': 'Gorras',
    'nav.account': 'Tripulación',
    'nav.all': 'Ver Todo',
    'nav.language': 'Idioma',
    'nav.currency': 'Moneda',
    
    // Home
    'hero.title': 'Bordados Épicos',
    'hero.subtitle': 'Vístete como un verdadero Nakama',
    'hero.scrolly.badge': 'Nueva Colección',
    'hero.scrolly.title': 'Domina el Grand Line',
    'marquee.join': 'ÚNETE A LA TRIPULACIÓN',
    'marquee.shipping': 'ENVÍO GRATIS DESDE $1,200 MXN',
    'marquee.msi': '3 MSI CON TARJETAS PARTICIPANTES',
    'marquee.quality': 'CALIDAD PREMIUM GRAND LINE',
    'marquee.limited': 'PIEZAS LIMITADAS DE COLECCIÓN',
    'marquee.high_density': 'BORDADOS DE ALTA DENSIDAD',
    'home.intro.badge': 'Estilo Streetwear Anime',
    'home.intro.title': 'Tu Próximo Tesoro',
    'home.intro.text': 'En Nakama Bordados no solo hacemos ropa, forjamos el equipo para tu próxima aventura. Bordados de alta densidad y diseños exclusivos con la calidad que un futuro Rey de los Piratas merece. Moda anime hecha por fans para fans.',
    'home.intro.btn': 'Explorar Catálogo',
    'home.bestsellers.title': 'LOS MÁS BUSCADOS',
    'home.bestsellers.reward': 'RECOMPENSA: CALIDAD MÁXIMA',
    'home.explore_cats.title': 'EXPLORA POR CATEGORÍA',
    'home.explore_cats.view': 'Ver Colección',
    
    // Store
    'store.loading': 'Cargando Catálogo...',
    'store.hero.badge': 'Catálogo Nakama',
    'store.hero.subtitle': 'Bordados de alta densidad y streetwear premium diseñado para la tripulación.',
    'store.search.results': 'Buscando: {query}',
    'store.tag.results': 'Etiqueta: {tag}',
    'store.load_more': 'CARGAR MÁS PRODUCTOS',
    'store.loading_more': 'EXPLORANDO...',
    'store.end': '🏴‍☠️ Has llegado al final de la colección 🏴‍☠️',
    'store.no_results': 'No encontramos tesoros',
    'store.no_results_text': 'Intenta con otros términos o navega por las categorías.',
    
    // Product
    'product.official': 'Colección Oficial Nakama',
    'product.premium': 'Calidad Premium Grand Line',
    'product.free_shipping_badge': '¡ENVÍO GRATIS!*',
    'product.select': 'Seleccionar',
    'product.size_guide': 'Ver Guía de Tallas',
    'product.add_to_cart': '¡Lo Quiero!',
    'product.secure_payment': 'Pago 100% Seguro',
    'product.guaranteed_shipping': 'Envío Garantizado',
    'product.desc_tab': 'Descripción',
    'product.care_tab': 'Cuidado',
    'product.care_title': '¡Cuida tu equipo como un verdadero pirata!',
    'product.care_1': 'Lavar a mano o ciclo delicado (agua fría).',
    'product.care_2': 'Al revés para proteger el bordado/estampado.',
    'product.care_3': 'Sin blanqueadores químicos.',
    'product.care_4': 'Secar a la sombra (el sol es para navegar, no para secar).',
    'product.care_5': 'No planchar sobre el diseño directamente.',
    'product.related': 'También te puede gustar',
    'product.view': 'Ver Producto',
    'product.added': '¡{name} agregado al carrito!',
    'product.warning.luffy.title': '¡OI, NAKAMA!',
    'product.warning.luffy.phrase': '¡Elige tu estilo antes de zarpar al Grand Line!',
    'product.warning.zoro.title': '¡ZORO SE PERDIÓ!',
    'product.warning.zoro.phrase': 'Y tú también si no eliges una talla primero...',
    'product.warning.sanji.title': '¡SANJI ESTÁ FURIOSO!',
    'product.warning.sanji.phrase': '¡No puedes ordenar sin elegir los ingredientes (variaciones)!',
    'product.warning.chopper.title': '¡CHOPPER ESTÁ ASUSTADO!',
    'product.warning.chopper.phrase': '¡Doctor! ¡Doctor! ¡Falta seleccionar el color!',
    'product.warning.close': '¡Entendido!',

    // Checkout & Cart
    'cart.page_title': 'Valida tu Botín',
    'cart.item_table.product': 'Producto',
    'cart.item_table.price': 'Precio',
    'cart.item_table.qty': 'Cant.',
    'cart.item_table.total': 'Subtotal',
    'cart.finalize_btn': 'Finalizar Compra en el Barco Principal',
    'cart.continue_btn': 'Seguir Buscando Tesoros',
    'checkout.title': 'Finalizar Pedido',
    'checkout.billing': 'Datos de Envío',
    'checkout.email': 'Correo Electrónico',
    'checkout.first_name': 'Nombre',
    'checkout.last_name': 'Apellidos',
    'checkout.phone': 'Teléfono',
    'checkout.address': 'Dirección (Calle y Número)',
    'checkout.apartment': 'Depto / Suite / Referencias',
    'checkout.city': 'Ciudad',
    'checkout.state': 'Estado',
    'checkout.postcode': 'Código Postal',
    'checkout.country': 'País',
    'checkout.summary': 'Resumen del Tesoro',
    'checkout.shipping_method': 'Método de Envío',
    'checkout.payment_method': 'Método de Pago',
    'checkout.place_order': 'Zarpar Pedido',
    'checkout.processing': 'Procesando...',
    'checkout.coupon.placeholder': 'Código de Cupón',
    'checkout.coupon.apply': 'Aplicar',
    'checkout.subtotal': 'Subtotal',
    'checkout.shipping': 'Envío',
    'checkout.discount': 'Descuento',
    'checkout.total': 'Total',
    'checkout.empty': 'Tu barco está vacío',
    'checkout.back': 'Volver a la tienda',
    'checkout.free': '¡GRATIS!',

    // Account
    'account.title': 'Centro de Mando',
    'account.welcome': '¡Bienvenido a bordo, {name}!',
    'account.logout': 'Abandonar Barco',
    'account.orders': 'Mis Pedidos',
    'account.no_orders': 'Aún no tienes botines registrados.',
    'account.profile': 'Perfil Nakama',
    'account.email': 'Email',
    'account.member_since': 'Miembro desde',
    'account.login.title': 'Acceso a la Tripulación',
    'account.login.user': 'Usuario o Email',
    'account.login.pass': 'Contraseña',
    'account.login.btn': 'Entrar al Barco',
    'account.login.error': 'Credenciales piratas inválidas',
    
    // FAQ
    'faq.title': 'Preguntas Frecuentes',
    'faq.subtitle': 'Todo lo que necesitas saber para tu próxima misión.',
    'faq.still_doubts': '¿Aún tienes dudas?',
    'faq.contact': 'Contáctanos por WhatsApp',
    'faq.q1': '¿Cuánto tiempo tarda en llegar mi pedido?',
    'faq.a1': 'El tiempo de elaboración es de 7 a 15 días hábiles, ya que cada pieza se fabrica bajo pedido para asegurar la máxima calidad. Una vez enviado, el tiempo de entrega depende de la paquetería (Estafeta o FedEx), usualmente de 2 a 5 días.',
    'faq.q2': '¿Hacen envíos a todo México?',
    'faq.a2': 'Sí, realizamos envíos a toda la República Mexicana a través de Envia.com con las mejores paqueterías del país.',
    'faq.q3': '¿Cómo puedo rastrear mi paquete?',
    'faq.a3': 'Puedes rastrearlo directamente en nuestra sección \'Mi Cuenta\' si estás registrado, o ingresando el número de guía que te enviaremos por correo en el portal oficial de la paquetería correspondiente.',
    'faq.q4': '¿Tienen tienda física?',
    'faq.a4': 'Actualmente operamos exclusivamente de manera online para poder ofrecer la mayor variedad de diseños a nakamas de todo México.',
    'faq.q5': '¿Qué cuidados debo tener con mi prenda bordada?',
    'faq.a5': 'Recomendamos lavar la prenda al revés con agua fría, no usar secadora y nunca planchar directamente sobre el bordado para preservar la densidad y el color de los hilos.',

    // Size Guide
    'sizes.title': 'Guía de Tallas',
    'sizes.subtitle': 'Asegúrate de que tu equipo te quede perfecto antes de zarpar.',
    'sizes.badge': 'Guía',
    'sizes.pro_tip': '💡 Pro-Tip Nakama',
    'sizes.pro_tip_text': 'Nuestras tallas son estándar mexicanas. Si buscas un estilo más relajado o \'baggy\', te recomendamos pedir una talla más arriba de lo habitual, especialmente en nuestras piezas bordadas.',
    'sizes.cat.tshirts': 'Playeras',
    'sizes.cat.oversize': 'Oversize',
    'sizes.cat.sweatshirts': 'Sudaderas',
    'sizes.cat.hoodies': 'Hoodies',
    'sizes.cat.acid': 'Acid Wash',
    'sizes.cat.shorts': 'Shorts',
    'sizes.cat.chroma': 'Cromas',

    // Legal
    'privacy.title': 'Aviso de Privacidad',
    'privacy.subtitle': 'Protegiendo tus datos como el One Piece.',
    'terms.title': 'Términos y Condiciones',
    'terms.subtitle': 'Las reglas de este barco para una navegación segura.',

    // Bot
    'bot.welcome': '¡Oi, Nakama! 🍖 Soy Luffy, el guardián de este barco. ¡No pierdas tiempo escribiendo, mejor pícale a los botones para encontrar tu tesoro! 🏴‍☠️',
    'bot.status': '● NAVEGANDO POR EL MENÚ',
    'bot.hint': '¿A dónde zarpamos, Nakama?',
    'bot.btn.all': '🔥 Ver Todo el Catálogo',
    'bot.btn.embroidery': '🪡 Ver Bordados',
    'bot.btn.prints': '👕 Ver Estampados',
    'bot.btn.special': '✨ Edición Especial',
    'bot.btn.sizes': '📐 Guía de Tallas',
    'bot.btn.tracking': '🔍 Rastreo de Pedido',
    'bot.btn.faq': '❓ Preguntas Frecuentes',
    'bot.btn.privacy': '📄 Aviso de Privacidad',
    'bot.btn.crew': '🏴‍☠️ Hablar con Tripulación',
    
    // Global & UI
    'cart.title': 'Tu Botín',
    'cart.empty': 'Tu carrito está vacío',
    'checkout.button': 'Ir a la Caja',
    'theme.dark': 'Modo Oscuro',
    'theme.light': 'Modo Claro',
    
    // Footer
    'footer.description': 'Forjando el equipo de los próximos Reyes de los Piratas. Streetwear anime de alta densidad.',
    'footer.support': 'Soporte',
    'footer.legal': 'Legal',
    'footer.secure_payment': 'Pago Seguro',
    'footer.rights': 'Todos los derechos reservados.',
    'footer.faq': 'Preguntas Frecuentes',
    'footer.size_guide': 'Guía de Tallas',
    'footer.terms': 'Términos y Condiciones',
    'footer.privacy': 'Aviso de Privacidad',
    'footer.dev': 'Diseño y Desarrollo',
  },
  en: {
    // Nav
    'nav.home': 'Home',
    'nav.store': 'Store',
    'nav.embroidery': 'Embroidery',
    'nav.combo': 'W/Prints',
    'nav.prints': 'Prints',
    'nav.special': 'Special',
    'nav.plain': 'Plain',
    'nav.variety': 'Variety',
    'nav.caps': 'Caps',
    'nav.account': 'Crew',
    'nav.all': 'View All',
    'nav.language': 'Language',
    'nav.currency': 'Currency',
    
    // Home
    'hero.title': 'Epic Embroidery',
    'hero.subtitle': 'Dress like a true Nakama',
    'hero.scrolly.badge': 'New Collection',
    'hero.scrolly.title': 'Master the Grand Line',
    'marquee.join': 'JOIN THE CREW',
    'marquee.shipping': 'FREE SHIPPING FROM $1,200 MXN',
    'marquee.msi': '3 MONTHS INTEREST FREE',
    'marquee.quality': 'GRAND LINE PREMIUM QUALITY',
    'marquee.limited': 'LIMITED COLLECTOR PIECES',
    'marquee.high_density': 'HIGH DENSITY EMBROIDERY',
    'home.intro.badge': 'Anime Streetwear Style',
    'home.intro.title': 'Your Next Treasure',
    'home.intro.text': 'At Nakama Bordados we don\'t just make clothes, we forge the gear for your next adventure. High-density embroidery and exclusive designs with the quality a future Pirate King deserves. Anime fashion made by fans for fans.',
    'home.intro.btn': 'Explore Catalog',
    'home.bestsellers.title': 'MOST WANTED',
    'home.bestsellers.reward': 'REWARD: MAXIMUM QUALITY',
    'home.explore_cats.title': 'EXPLORE BY CATEGORY',
    'home.explore_cats.view': 'View Collection',
    
    // Store
    'store.loading': 'Loading Catalog...',
    'store.hero.badge': 'Nakama Catalog',
    'store.hero.subtitle': 'High-density embroidery and premium streetwear designed for the crew.',
    'store.search.results': 'Searching: {query}',
    'store.tag.results': 'Tag: {tag}',
    'store.load_more': 'LOAD MORE PRODUCTS',
    'store.loading_more': 'EXPLORING...',
    'store.end': '🏴‍☠️ You have reached the end of the collection 🏴‍☠️',
    'store.no_results': 'No treasures found',
    'store.no_results_text': 'Try other terms or navigate through the categories.',
    
    // Product
    'product.official': 'Official Nakama Collection',
    'product.premium': 'Grand Line Premium Quality',
    'product.free_shipping_badge': 'FREE SHIPPING!*',
    'product.select': 'Select',
    'product.size_guide': 'View Size Guide',
    'product.add_to_cart': 'I Want It!',
    'product.secure_payment': '100% Secure Payment',
    'product.guaranteed_shipping': 'Guaranteed Shipping',
    'product.desc_tab': 'Description',
    'product.care_tab': 'Care',
    'product.care_title': 'Take care of your gear like a true pirate!',
    'product.care_1': 'Hand wash or delicate cycle (cold water).',
    'product.care_2': 'Inside out to protect embroidery/print.',
    'product.care_3': 'No chemical bleaches.',
    'product.care_4': 'Dry in shade (sun is for sailing, not drying).',
    'product.care_5': 'Do not iron directly on the design.',
    'product.related': 'You may also like',
    'product.view': 'View Product',
    'product.added': '{name} added to cart!',
    'product.warning.luffy.title': 'OI, NAKAMA!',
    'product.warning.luffy.phrase': 'Choose your style before sailing to the Grand Line!',
    'product.warning.zoro.title': 'ZORO GOT LOST!',
    'product.warning.zoro.phrase': 'And so will you if you don\'t choose a size first...',
    'product.warning.sanji.title': 'SANJI IS FURIOUS!',
    'product.warning.sanji.phrase': 'You can\'t order without choosing the ingredients (variations)!',
    'product.warning.chopper.title': 'CHOPPER IS SCARED!',
    'product.warning.chopper.phrase': 'Doctor! Doctor! Color selection is missing!',
    'product.warning.close': 'Understood!',

    // Checkout & Cart
    'checkout.title': 'Checkout',
    'checkout.billing': 'Shipping Details',
    'checkout.email': 'Email',
    'checkout.first_name': 'First Name',
    'checkout.last_name': 'Last Name',
    'checkout.phone': 'Phone',
    'checkout.address': 'Address (Street and Number)',
    'checkout.apartment': 'Apartment / Suite / References',
    'checkout.city': 'City',
    'checkout.state': 'State',
    'checkout.postcode': 'Postcode',
    'checkout.country': 'Country',
    'checkout.summary': 'Treasure Summary',
    'checkout.shipping_method': 'Shipping Method',
    'checkout.payment_method': 'Payment Method',
    'checkout.place_order': 'Sail Order',
    'checkout.processing': 'Processing...',
    'checkout.coupon.placeholder': 'Coupon Code',
    'checkout.coupon.apply': 'Apply',
    'checkout.subtotal': 'Subtotal',
    'checkout.shipping': 'Shipping',
    'checkout.discount': 'Discount',
    'checkout.total': 'Total',
    'checkout.empty': 'Your ship is empty',
    'checkout.back': 'Back to Store',
    'checkout.free': 'FREE!',

    // Account
    'account.title': 'Command Center',
    'account.welcome': 'Welcome aboard, {name}!',
    'account.logout': 'Leave Ship',
    'account.orders': 'My Orders',
    'account.no_orders': 'No loot recorded yet.',
    'account.profile': 'Nakama Profile',
    'account.email': 'Email',
    'account.member_since': 'Member since',
    'account.login.title': 'Crew Access',
    'account.login.user': 'Username or Email',
    'account.login.pass': 'Password',
    'account.login.btn': 'Enter Ship',
    'account.login.error': 'Invalid pirate credentials',
    
    // FAQ
    'faq.title': 'Frequently Asked Questions',
    'faq.subtitle': 'Everything you need to know for your next mission.',
    'faq.still_doubts': 'Still have questions?',
    'faq.contact': 'Contact us via WhatsApp',
    'faq.q1': 'How long does my order take to arrive?',
    'faq.a1': 'Processing time is 7 to 15 business days, as each piece is made to order to ensure maximum quality. Once shipped, delivery time depends on the carrier (Estafeta or FedEx), usually 2 to 5 days.',
    'faq.q2': 'Do you ship all over Mexico?',
    'faq.a2': 'Yes, we ship to all of Mexico through Envia.com with the best couriers in the country.',
    'faq.q3': 'How can I track my package?',
    'faq.a3': 'You can track it directly in our \'My Account\' section if you are registered, or by entering the tracking number we will send you by email in the corresponding carrier\'s official portal.',
    'faq.q4': 'Do you have a physical store?',
    'faq.a4': 'Currently we operate exclusively online to offer the widest variety of designs to nakamas across Mexico.',
    'faq.q5': 'What care should I take with my embroidered garment?',
    'faq.a5': 'We recommend washing the garment inside out with cold water, do not use a dryer, and never iron directly on the embroidery to preserve thread density and color.',

    // Size Guide
    'sizes.title': 'Size Guide',
    'sizes.subtitle': 'Make sure your gear fits perfectly before sailing.',
    'sizes.badge': 'Guide',
    'sizes.pro_tip': '💡 Nakama Pro-Tip',
    'sizes.pro_tip_text': 'Our sizes are standard Mexican sizes. If you are looking for a more relaxed or \'baggy\' style, we recommend ordering one size up from your usual, especially for our embroidered pieces.',
    'sizes.cat.tshirts': 'T-Shirts',
    'sizes.cat.oversize': 'Oversize',
    'sizes.cat.sweatshirts': 'Sweatshirts',
    'sizes.cat.hoodies': 'Hoodies',
    'sizes.cat.acid': 'Acid Wash',
    'sizes.cat.shorts': 'Shorts',
    'sizes.cat.chroma': 'Chroma',

    // Legal
    'privacy.title': 'Privacy Policy',
    'privacy.subtitle': 'Protecting your data like the One Piece.',
    'terms.title': 'Terms & Conditions',
    'terms.subtitle': 'The rules of this ship for a safe navigation.',

    // Bot
    'bot.welcome': 'Oi, Nakama! 🍖 I\'m Luffy, the guardian of this ship. Don\'t waste time typing, just tap the buttons to find your treasure! 🏴‍☠️',
    'bot.status': '● NAVIGATING THE MENU',
    'bot.hint': 'Where are we sailing, Nakama?',
    'bot.btn.all': '🔥 View Full Catalog',
    'bot.btn.embroidery': '🪡 View Embroidery',
    'bot.btn.prints': '👕 View Prints',
    'bot.btn.special': '✨ Special Edition',
    'bot.btn.sizes': '📐 Size Guide',
    'bot.btn.tracking': '🔍 Order Tracking',
    'bot.btn.faq': '❓ FAQ',
    'bot.btn.privacy': '📄 Privacy Policy',
    'bot.btn.crew': '🏴‍☠️ Talk to Crew',
    
    // Global & UI
    'cart.title': 'Your Loot',
    'cart.empty': 'Your cart is empty',
    'checkout.button': 'Go to Checkout',
    'theme.dark': 'Dark Mode',
    'theme.light': 'Light Mode',
    
    // Footer
    'footer.description': 'Forging the gear for the next Pirate Kings. High density anime streetwear.',
    'footer.support': 'Support',
    'footer.legal': 'Legal',
    'footer.secure_payment': 'Secure Payment',
    'footer.rights': 'All rights reserved.',
    'footer.faq': 'FAQ',
    'footer.size_guide': 'Size Guide',
    'footer.terms': 'Terms & Conditions',
    'footer.privacy': 'Privacy Policy',
    'footer.dev': 'Design & Development',
  }
};

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>('es');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const saved = localStorage.getItem('user-language') as Language;
    if (saved && translations[saved]) {
      setLanguageState(saved);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('user-language', lang);
  };

  const t = (key: string) => {
    if (!isClient) return translations['es'][key] || key;
    return translations[language][key] || translations['es'][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within a LanguageProvider');
  return context;
};
