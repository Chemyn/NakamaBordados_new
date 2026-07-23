/**
 * URLs para el inicio de sesión con Google/Facebook (plugin Nextend Social
 * Login en WordPress).
 *
 * Flujo: wp-login.php?loginSocial=<proveedor> -> OAuth -> cookie de WordPress
 * -> bridge nk_bridge=social-login (emite el JWT del frontend) -> vuelta a
 * <back>#nk_jwt=<token>, que AuthContext detecta al montar.
 */

import { apiOrigin } from './api-host';

export type SocialProvider = 'google' | 'facebook';

export function socialLoginUrl(provider: SocialProvider, backPath: string): string {
  const origin = apiOrigin();
  const bridge = `${origin}/index.php?nk_bridge=social-login&back=${encodeURIComponent(backPath)}`;
  const target = encodeURIComponent(bridge);
  // 'redirect' es el parámetro propio de Nextend y 'redirect_to' el estándar de
  // wp-login; se mandan los dos porque según la versión respeta uno u otro.
  return `${origin}/wp-login.php?loginSocial=${provider}&redirect=${target}&redirect_to=${target}`;
}
