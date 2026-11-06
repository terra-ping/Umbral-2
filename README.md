# Umbral — base limpia

Proyecto inicial para Android: Capacitor 6 + TypeScript + Vite + SQLite + almacenamiento seguro de clave API.

## Compilar desde el teléfono
1. Descomprimí el ZIP.
2. Subí/reemplazá el contenido en la raíz del repositorio `terra-ping/Umbral`, incluida la carpeta `.github/workflows`.
3. Hacé commit en `main`.
4. Abrí GitHub → Actions → **Build Umbral APK** → **Run workflow**.
5. Descargá el artefacto `umbral-debug-apk` y extraé `app-debug.apk`.

## Incluye
- Interfaz oscura adaptable.
- Historias persistidas en SQLite en Android (localStorage solo como alternativa de prueba web).
- Personajes editables con personalidad, objetivo y secreto.
- Clave OpenRouter en almacenamiento seguro Android.
- Catálogo dinámico de modelos gratuitos, modelo principal y alternativas.
- Chat narrativo con tolerancia a JSON malformado y fallback a texto plano.
- Conservación del mensaje del usuario ante errores y error visible en la conversación.

## Pendiente para próximas iteraciones
Memoria por conocimiento individual, resumen automático por capas, sistema completo de relaciones, cola/reintento persistente, log técnico avanzado e imágenes bajo demanda. No se incluye ninguna clave API en el repositorio.
