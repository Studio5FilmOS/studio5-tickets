const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'dist');
const destDir = path.join(__dirname, '..', 'backend', 'public');

console.log('Iniciando copiado de build de frontend a backend/public...');

try {
  // 1. Borrar carpeta assets vieja en backend/public si existe
  const destAssets = path.join(destDir, 'assets');
  if (fs.existsSync(destAssets)) {
    console.log('Limpiando assets antiguos en backend/public/assets...');
    fs.rmSync(destAssets, { recursive: true, force: true });
  }

  // 2. Copiar todo el contenido de frontend/dist a backend/public sin borrar otras cosas (como uploads)
  fs.cpSync(srcDir, destDir, { recursive: true });
  
  console.log('¡Copiado de build completado con éxito!');
} catch (err) {
  console.error('Error al copiar el build:', err);
  process.exit(1);
}
