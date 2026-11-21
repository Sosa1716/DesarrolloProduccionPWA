# Terreno — Bitácora de campo

PWA instalable para organizar tareas de trabajo en campo, adjuntar fotografías y guardar coordenadas. Los datos se persisten en IndexedDB, por lo que siguen disponibles sin conexión.

## Requisitos

- Node.js 18 o superior
- Visual Studio Code

## Iniciar en VS Code

1. Abre esta carpeta en VS Code.
2. Abre una terminal integrada con **Terminal → Nueva terminal**.
3. Ejecuta `npm run dev` y abre `http://localhost:5173`.

El servidor local sirve la aplicación en `localhost`, contexto seguro requerido para el Service Worker, la cámara y la geolocalización. Para probar en un teléfono, publica con HTTPS y abre la URL segura en el dispositivo.

## Funciones incluidas

- Manifest con nombre, idioma, colores, orientación, modo standalone e iconos PNG de 192 y 512 px, incluido icono maskable para Android y splash screen.
- Prompt de instalación en navegadores compatibles; Safari en iOS instala desde **Compartir → Añadir a pantalla de inicio**.
- App Shell responsiva y renderizado del lado del cliente.
- Service Worker con precaché del App Shell, caché de recursos de misma procedencia y fallback offline para navegación; limpia versiones previas al activar.
- IndexedDB asíncrono para crear, completar, eliminar, filtrar y buscar tareas con fecha y prioridad.
- Geolocation API para guardar latitud, longitud y precisión al crear una tarea.
- Cámara mediante selector de archivos con `capture="environment"`; comprime la imagen antes de guardarla en IndexedDB.
- Indicador de conexión y estado de actualización del Service Worker.

## Generar build de producción

```sh
npm run build
npm run preview
```

## Publicar en Vercel

El archivo `vercel.json` ya indica a Vercel que use el preset **Other**, ejecute `npm run build` y publique `dist/` como sitio estático. En la configuración del proyecto deja la carpeta raíz como la raíz del repositorio y usa esos mismos valores si el panel solicita sobrescribirlos. Después de guardar el cambio, crea un nuevo deployment. El servidor `server.js` es solo para desarrollo local; no hace falta ejecutar `npm run start` en Vercel.

Los registros y las fotos son locales al navegador y dispositivo donde se capturaron. El permiso de ubicación/cámara se solicita cuando el usuario toca su acción. Geolocalización y cámara requieren contexto seguro (HTTPS o localhost).
