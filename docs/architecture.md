# Arquitectura

PWA React con Vite. Zod valida la entrada y Dexie almacena los datos y operaciones locales por cuenta. El service worker precarga el código de interfaz. Supabase gestiona OAuth y recibe operaciones autenticadas por RPC. La sesión local explícita permite entrenar offline después del acceso inicial. Un espacio local de prueba guarda datos reales en este navegador.

La interfaz observa IndexedDB. Cada escritura genera una operación con UUID y revisión base. El servidor compara revisiones, deduplica y devuelve el dato vigente. Los conflictos conservan el cambio local hasta que la persona elija. Rutinas, planificación y sesiones son agregados independientes.
