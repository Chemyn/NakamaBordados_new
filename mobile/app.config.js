const { existsSync } = require('fs');
const { join } = require('path');

/**
 * Extiende app.json. google-services.json llega desde Firebase y no está en el
 * repo hasta que se configura el push: si falta, se omite el campo para que el
 * build no falle apuntando a un archivo inexistente.
 */
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    ...(existsSync(join(__dirname, 'google-services.json'))
      ? { googleServicesFile: './google-services.json' }
      : {}),
  },
});
